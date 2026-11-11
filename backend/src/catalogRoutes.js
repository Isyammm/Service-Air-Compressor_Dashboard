import { Router } from 'express'
import { pool } from './db.js'

const router = Router()

// GET /api/catalog
// GET /api/catalog?unit=15
router.get('/', async (req, res) => {
  const rawUnit = req.query.unit
  let unit = null

  if (rawUnit !== undefined) {
    if (
      typeof rawUnit !== 'string' ||
      !/^(?:[1-9]|1[0-5])$/.test(rawUnit)
    ) {
      return res.status(400).json({
        message: 'Unit harus berupa angka 1 sampai 15.',
      })
    }

    unit = Number(rawUnit)
  }

  try {
    const columns = `
      SELECT
        tag_name AS tag,
        unit_number AS unitNumber,
        description,
        engineering_unit AS engineeringUnit,
        source_file AS sourceFile
      FROM instrument_catalog
    `

    const [rows] = unit === null
      ? await pool.execute(
          `${columns} ORDER BY unit_number, tag_name`,
        )
      : await pool.execute(
          `${columns}
           WHERE unit_number = ?
           ORDER BY tag_name`,
          [unit],
        )

    res.setHeader('Cache-Control', 'no-store')

    return res.json({
      source: 'PIMS',
      count: rows.length,
      data: rows.map((row) => ({
        tag: row.tag,
        unitNumber: Number(row.unitNumber),
        description: row.description,
        engineeringUnit: row.engineeringUnit || null,
        sourceFile: row.sourceFile,
      })),
    })
  } catch (error) {
    console.error(
      'Gagal membaca katalog PIMS:',
      error instanceof Error ? error.message : error,
    )

    return res.status(500).json({
      message:
        'Katalog PIMS belum dapat dibaca. ' +
        'Periksa tabel instrument_catalog dan akses sac_reader.',
    })
  }
})

export default router