import express from 'express'
import cors from 'cors'
import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import { fileURLToPath } from 'node:url'

dotenv.config({
  path: fileURLToPath(new URL('../.env', import.meta.url)),
})

const required = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD']

for (const name of required) {
  if (!process.env[name]) {
    throw new Error(`${name} belum diisi di backend/.env`)
  }
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 50,
  dateStrings: true,
})

const app = express()

app.disable('x-powered-by')

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
    methods: ['GET'],
  }),
)

function parseJson(value) {
  return typeof value === 'string' ? JSON.parse(value) : value
}

// Urutan parameter pada dashboard.
const parameterDefinitions = [
  ['AIR-TEMP-STG1-AI-MS', 'Air Temperature Stage 1'],
  ['AIR-TEMP-STG2-AI-MS', 'Air Temperature Stage 2'],
  ['BRG-DE-TEMP-AI-MS', 'Bearing Temperature DE'],
  ['BRG-NDE-TEMP-AI-MS', 'Bearing Temperature NDE'],
  ['DSCH-PRESSURE-STG1-AI-MS', 'Discharge Pressure Stage 1'],
  ['DSCH-PRESSURE-STG2-AI-MS', 'Discharge Pressure Stage 2'],
  ['CT-INPUT-AI-MS', 'CT Input'],
]

// Memeriksa koneksi database.
app.get('/api/health', async (_req, res) => {
  await pool.query('SELECT 1')

  res.json({
    status: 'ok',
    database: 'connected',
  })
})

// Daftar file historis yang sudah diimpor.
app.get('/api/dashboard/imports', async (_req, res) => {
  const [rows] = await pool.query(`
    SELECT
      id,
      file_name AS fileName,
      asset_name AS assetName
    FROM historical_imports
    ORDER BY id DESC
  `)

  res.json({ data: rows })
})

// Pembacaan terakhir dalam satu file impor.
// "Terakhir" berarti waktu terakhir pada file, bukan data live.
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

  // Sesuai format importer: tags dan raw_values berupa array
  // dengan urutan yang berpasangan.
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
    importId: imported.id,
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
    message:
      'Backend gagal membaca database. Periksa terminal backend.',
  })
})

const host = process.env.HOST || '127.0.0.1'
const port = Number(process.env.PORT || 4000)

const server = app.listen(port, host, () => {
  console.log(`Dashboard API: http://${host}:${port}`)
})

server.on('error', (error) => {
  console.error('Server gagal berjalan:', error.code)
  void pool.end()
  process.exitCode = 1
})