import cors from 'cors'
import express from 'express'
import { pool } from './db.js'

const app = express()

app.disable('x-powered-by')

const allowedOrigins = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
])

if (process.env.FRONTEND_ORIGIN) {
  allowedOrigins.add(process.env.FRONTEND_ORIGIN.replace(/\/$/, ''))
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Izinkan request tanpa origin (seperti curl atau direct browser tab) atau yang terdaftar
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true)
      }
      return callback(null, true)
    },
    methods: ['GET'],
  }),
)

app.get('/', (_req, res) => {
  res.json({
    name: 'Service Air Compressor Backend API',
    status: 'online',
    message:
      'Backend API sedang berjalan dengan baik. Silakan buka tampilan dashboard di Frontend (http://localhost:5173).',
    endpoints: {
      health: '/api/health',
      imports: '/api/history/imports',
    },
  })
})

const MAX_DAILY_SAMPLES = 1440

const parameterDefinitions = [
  ['AIR-TEMP-STG1-AI-MS', 'Air Temperature Stage 1'],
  ['AIR-TEMP-STG2-AI-MS', 'Air Temperature Stage 2'],
  ['BRG-DE-TEMP-AI-MS', 'Bearing Temperature DE'],
  ['BRG-NDE-TEMP-AI-MS', 'Bearing Temperature NDE'],
  ['DSCH-PRESSURE-STG1-AI-MS', 'Discharge Pressure Stage 1'],
  ['DSCH-PRESSURE-STG2-AI-MS', 'Discharge Pressure Stage 2'],
  ['CT-INPUT-AI-MS', 'CT Input'],
]

function parseJson(value) {
  return typeof value === 'string' ? JSON.parse(value) : value
}

function isValidIsoDate(value) {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  )
}

// 1. Pemeriksaan kesehatan layanan & koneksi database
app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1')
    res.json({
      status: 'ok',
      database: 'connected',
    })
  } catch (error) {
    res.status(503).json({
      status: 'error',
      database: 'disconnected',
      message: error.message,
    })
  }
})

// 2. Daftar file historis yang sudah diimpor (dipakai oleh useHistoricalFleet & DatabaseStatus)
app.get('/api/history/imports', async (_req, res) => {
  const [rows] = await pool.query(`
    SELECT
      id,
      file_name AS fileName,
      asset_name AS assetName,
      row_count AS rowCount,
      tags
    FROM historical_imports
    ORDER BY id DESC
  `)

  const data = rows.map((row) => {
    const parsedTags = parseJson(row.tags)

    return {
      id: Number(row.id),
      fileName: row.fileName,
      assetName: row.assetName,
      rowCount: Number(row.rowCount),
      tags: Array.isArray(parsedTags) ? parsedTags : [],
    }
  })

  res.json({ data })
})

// 3. Sampel historis per tanggal (dipakai oleh useHistoricalFleet & DatabaseStatus)
app.get('/api/history/:id/samples', async (req, res) => {
  const id = Number(req.params.id)
  const day = typeof req.query.day === 'string' ? req.query.day.trim() : ''

  if (!Number.isSafeInteger(id) || id < 1) {
    return res.status(400).json({
      message: 'ID impor tidak valid.',
    })
  }

  if (!isValidIsoDate(day)) {
    return res.status(400).json({
      message: 'Parameter tanggal (day) harus berformat YYYY-MM-DD yang valid.',
    })
  }

  const [imports] = await pool.execute(
    `SELECT
       id,
       file_name AS fileName,
       asset_name AS assetName,
       tags
     FROM historical_imports
     WHERE id = ?`,
    [id],
  )

  if (imports.length === 0) {
    return res.status(404).json({
      message: 'File impor tidak ditemukan.',
    })
  }

  const imported = imports[0]
  const tags = parseJson(imported.tags)

  if (!Array.isArray(tags) || !tags.every((tag) => typeof tag === 'string')) {
    throw new Error('Struktur kolom tags pada database tidak valid.')
  }

  const [samples] = await pool.execute(
    `SELECT
       DATE_FORMAT(source_time, '%Y-%m-%d %H:%i:%s') AS sourceTime,
       raw_values AS rawValues
     FROM historical_samples
     WHERE import_id = ?
       AND source_time >= ?
       AND source_time < DATE_ADD(?, INTERVAL 1 DAY)
     ORDER BY source_time ASC
     LIMIT ${MAX_DAILY_SAMPLES + 1}`,
    [id, day, day],
  )

  const truncated = samples.length > MAX_DAILY_SAMPLES
  const visibleSamples = truncated
    ? samples.slice(0, MAX_DAILY_SAMPLES)
    : samples

  const data = visibleSamples.map((sample) => {
    const rawValues = parseJson(sample.rawValues)

    if (!Array.isArray(rawValues) || rawValues.length !== tags.length) {
      throw new Error('Panjang raw_values tidak sesuai dengan jumlah tag.')
    }

    const values = rawValues.map((value) => {
      const num =
        typeof value === 'string' && value.trim() !== ''
          ? Number(value)
          : value
      return typeof num === 'number' && Number.isFinite(num) ? num : null
    })

    return {
      sourceTime: sample.sourceTime,
      values,
    }
  })

  res.json({
    importId: Number(imported.id),
    fileName: imported.fileName,
    assetName: imported.assetName,
    day,
    tags,
    truncated,
    data,
  })
})

// 4. Endpoint kompatibilitas (/api/dashboard/imports & /:id/latest)
app.get('/api/dashboard/imports', async (_req, res) => {
  const [rows] = await pool.query(`
    SELECT
      id,
      file_name AS fileName,
      asset_name AS assetName
    FROM historical_imports
    ORDER BY id DESC
  `)

  res.json({
    data: rows.map((row) => ({
      id: Number(row.id),
      fileName: row.fileName,
      assetName: row.assetName,
    })),
  })
})

app.get('/api/dashboard/imports/:id/latest', async (req, res) => {
  const id = Number(req.params.id)

  if (!Number.isSafeInteger(id) || id < 1) {
    return res.status(400).json({
      message: 'ID impor tidak valid.',
    })
  }

  const [imports] = await pool.execute(
    `SELECT
       id,
       file_name AS fileName,
       asset_name AS assetName,
       tags
     FROM historical_imports
     WHERE id = ?`,
    [id],
  )

  if (imports.length === 0) {
    return res.status(404).json({
      message: 'File impor tidak ditemukan.',
    })
  }

  const [samples] = await pool.execute(
    `SELECT
       DATE_FORMAT(source_time, '%Y-%m-%d %H:%i:%s') AS sourceTime,
       raw_values AS rawValues
     FROM historical_samples
     WHERE import_id = ?
     ORDER BY source_time DESC
     LIMIT 1`,
    [id],
  )

  if (samples.length === 0) {
    return res.status(404).json({
      message: 'File impor ini belum memiliki sampel data.',
    })
  }

  const imported = imports[0]
  const sample = samples[0]
  const tags = parseJson(imported.tags)
  const values = parseJson(sample.rawValues)

  if (
    !Array.isArray(tags) ||
    !Array.isArray(values) ||
    tags.length !== values.length ||
    !tags.every((tag) => typeof tag === 'string')
  ) {
    throw new Error('Struktur tags/raw_values tidak sesuai format importer.')
  }

  const parameters = parameterDefinitions.map(([suffix, label]) => {
    const index = tags.findIndex((tag) =>
      tag.toUpperCase().endsWith(`-${suffix}`),
    )

    const rawValue = index >= 0 ? values[index] : null
    const isNumeric =
      typeof rawValue === 'number' && Number.isFinite(rawValue)

    return {
      key: suffix,
      label,
      tag: index >= 0 ? tags[index] : null,
      value: isNumeric ? rawValue : null,
      unit: null,
      quality:
        index < 0
          ? 'unavailable'
          : isNumeric
            ? 'unverified'
            : 'invalid',
    }
  })

  res.json({
    mode: 'historical',
    importId: Number(imported.id),
    assetName: imported.assetName,
    fileName: imported.fileName,
    sourceTime: sample.sourceTime,
    timezone: 'unconfirmed',
    operatingStatus: null,
    parameters,
  })
})

app.use((_req, res) => {
  res.status(404).json({
    message: 'Endpoint tidak ditemukan.',
  })
})

app.use((error, _req, res, _next) => {
  console.error('API error:', error.code || error.message)

  res.status(500).json({
    message: 'Backend gagal membaca database. Periksa terminal backend.',
  })
})

const host = process.env.HOST || '127.0.0.1'
const port = Number(process.env.PORT || 4000)
const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173'

const server = app.listen(port, host, () => {
  console.log(`Service Air Compressor API berjalan.`)
  console.log(`Alamat API : http://${host}:${port}`)
  console.log(`Health     : http://${host}:${port}/api/health`)
  console.log(`Frontend   : ${frontendOrigin}`)
  console.log(`Sumber data: database historis, bukan data Live.`)
})

server.on('error', (error) => {
  console.error('Server gagal berjalan:', error.code || error.message)
  void pool.end()
  process.exitCode = 1
})
