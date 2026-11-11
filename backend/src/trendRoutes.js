import { Router } from 'express'
import { pool } from './db.js'

const router = Router()

const MAX_ROWS = 120000
const MAX_RANGE_MS = 7 * 24 * 60 * 60 * 1000

function parseJson(value) {
  return typeof value === 'string' ? JSON.parse(value) : value
}

function parseUnit(value) {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    return null
  }

  const unit = Number(value)

  return Number.isInteger(unit) && unit >= 1 && unit <= 15
    ? unit
    : null
}

function parseSourceTime(value) {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}$/.test(value)
  ) {
    return null
  }

  const iso = value.replace(' ', 'T')
  const timestamp = Date.parse(`${iso}Z`)

  if (
    !Number.isFinite(timestamp) ||
    new Date(timestamp).toISOString().slice(0, 19) !== iso
  ) {
    return null
  }

  // UTC dipakai hanya untuk perhitungan rentang.
  // Timestamp database tidak dikonversi zona waktunya.
  return {
    timestamp,
    sql: iso.replace('T', ' '),
  }
}

function identifyUnit(tags) {
  const units = new Set()

  for (const tag of tags) {
    const match = /^U-SAC(\d+)-/i.exec(tag.trim())

    if (match) {
      units.add(Number(match[1]))
    }
  }

  if (units.size !== 1) return null

  return [...units][0]
}

async function findImports(unit) {
  const [rows] = await pool.query(`
    SELECT id, tags
    FROM historical_imports
    ORDER BY id DESC
  `)

  const imports = []

  for (const row of rows) {
    const tags = parseJson(row.tags)

    if (
      !Array.isArray(tags) ||
      !tags.every((tag) => typeof tag === 'string')
    ) {
      throw new Error(`Struktur tags impor #${row.id} tidak valid.`)
    }

    if (identifyUnit(tags) !== unit) continue

    const id = Number(row.id)

    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new Error('ID impor di database tidak valid.')
    }

    imports.push({
      id,
      tags: tags.map((tag) => tag.trim().toUpperCase()),
    })
  }

  return imports
}

function normalizeValues(raw, expectedLength) {
  const values = parseJson(raw)

  if (
    !Array.isArray(values) ||
    values.length !== expectedLength
  ) {
    throw new Error(
      'Jumlah nilai sampel tidak sesuai dengan jumlah tag.',
    )
  }

  return values.map((value) => {
    const number =
      typeof value === 'string' && value.trim() !== ''
        ? Number(value)
        : value

    return typeof number === 'number' && Number.isFinite(number)
      ? number
      : null
  })
}

router.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store')
  next()
})

// Waktu paling awal, waktu paling akhir, dan daftar tag satu unit.
//
// Contoh:
// GET /api/trends/2/bounds
router.get('/:unit/bounds', async (req, res, next) => {
  try {
    const unit = parseUnit(req.params.unit)

    if (unit === null) {
      return res.status(400).json({
        message: 'Nomor unit harus berupa angka 1 sampai 15.',
      })
    }

    const imports = await findImports(unit)

    if (imports.length === 0) {
      return res.json({
        unit,
        first: null,
        last: null,
        tags: [],
      })
    }

    const ids = imports.map((item) => item.id)
    const placeholders = ids.map(() => '?').join(', ')

    const [rows] = await pool.execute(
      `
        SELECT
          DATE_FORMAT(
            MIN(source_time),
            '%Y-%m-%d %H:%i:%s'
          ) AS first,
          DATE_FORMAT(
            MAX(source_time),
            '%Y-%m-%d %H:%i:%s'
          ) AS last
        FROM historical_samples
        WHERE import_id IN (${placeholders})
      `,
      ids,
    )

    const tags = [
      ...new Set(imports.flatMap((item) => item.tags)),
    ]

    return res.json({
      unit,
      first: rows[0]?.first ?? null,
      last: rows[0]?.last ?? null,
      tags,
    })
  } catch (error) {
    next(error)
  }
})

// Sampel dalam rentang [from, to).
// Waktu awal termasuk, waktu akhir tidak termasuk.
//
// Contoh:
// GET /api/trends/2/range
//   ?from=2026-01-01T00:00:00
//   &to=2026-01-02T00:00:00
router.get('/:unit/range', async (req, res, next) => {
  try {
    const unit = parseUnit(req.params.unit)
    const from = parseSourceTime(req.query.from)
    const to = parseSourceTime(req.query.to)

    if (unit === null) {
      return res.status(400).json({
        message: 'Nomor unit harus berupa angka 1 sampai 15.',
      })
    }

    if (!from || !to) {
      return res.status(400).json({
        message:
          'from dan to harus berupa tanggal valid dengan format YYYY-MM-DDTHH:mm:ss.',
      })
    }

    const duration = to.timestamp - from.timestamp

    if (duration <= 0 || duration > MAX_RANGE_MS) {
      return res.status(400).json({
        message:
          'Waktu akhir harus setelah waktu awal. Rentang maksimal 7 hari.',
      })
    }

    const imports = await findImports(unit)

    if (imports.length === 0) {
      return res.json({
        unit,
        from: from.sql,
        to: to.sql,
        sources: [],
      })
    }

    const ids = imports.map((item) => item.id)
    const placeholders = ids.map(() => '?').join(', ')

    const [rows] = await pool.execute(
      `
        SELECT
          import_id AS importId,
          DATE_FORMAT(
            source_time,
            '%Y-%m-%d %H:%i:%s'
          ) AS sourceTime,
          raw_values AS rawValues
        FROM historical_samples
        WHERE import_id IN (${placeholders})
          AND source_time >= ?
          AND source_time < ?
        ORDER BY source_time ASC, import_id DESC
        LIMIT ${MAX_ROWS + 1}
      `,
      [...ids, from.sql, to.sql],
    )

    if (rows.length > MAX_ROWS) {
      return res.status(422).json({
        message:
          'Jumlah sampel terlalu besar. Pilih rentang waktu yang lebih pendek.',
      })
    }

    const byImport = new Map(
      imports.map((item) => [
        item.id,
        {
          id: item.id,
          tags: item.tags,
          data: [],
        },
      ]),
    )

    for (const row of rows) {
      const source = byImport.get(Number(row.importId))

      if (!source) {
        throw new Error('Sumber impor sampel tidak ditemukan.')
      }

      source.data.push({
        sourceTime: row.sourceTime,
        values: normalizeValues(
          row.rawValues,
          source.tags.length,
        ),
      })
    }

    return res.json({
      unit,
      from: from.sql,
      to: to.sql,
      sources: [...byImport.values()],
    })
  } catch (error) {
    next(error)
  }
})

export default router