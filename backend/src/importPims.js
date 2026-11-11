import ExcelJS from 'exceljs'
import dotenv from 'dotenv'
import mysql from 'mysql2/promise'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

dotenv.config({
  path: fileURLToPath(new URL('../.env', import.meta.url)),
  quiet: true,
})

function normalizeUnit(value) {
  const text = value.trim()

  if (!text) return null

  const aliases = {
    degc: '°C',
    '°c': '°C',
    degf: '°F',
    '°f': '°F',
    psi: 'psi',
    scfm: 'SCFM',
  }

  return aliases[text.toLowerCase()] ?? text
}

async function readCatalog(filename) {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(filename)

  const catalog = new Map()
  let matchedSheets = 0

  for (const sheet of workbook.worksheets) {
    const columns = new Map()

    sheet.getRow(1).eachCell((cell, columnNumber) => {
      columns.set(
        cell.text.replace(/^\uFEFF/, '').trim().toLowerCase(),
        columnNumber,
      )
    })

    const nameColumn = columns.get('name')
    const descriptionColumn = columns.get('description')
    const unitColumn = columns.get('engunits')

    if (!nameColumn || !descriptionColumn || !unitColumn) {
      continue
    }

    matchedSheets++

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return

      const tag = row.getCell(nameColumn).text.trim().toUpperCase()
      const match = /^U-SAC(\d+)-.+$/.exec(tag)

      if (!match) return

      const unitNumber = Number(match[1])

      if (unitNumber < 1 || unitNumber > 15) return

      if (tag.length > 191 || !/^[\x20-\x7E]+$/.test(tag)) {
        throw new Error(
          `${sheet.name}, baris ${rowNumber}: tag tidak valid.`,
        )
      }

      const description = row
        .getCell(descriptionColumn)
        .text
        .trim()

      const engineeringUnit = normalizeUnit(
        row.getCell(unitColumn).text,
      )

      if (engineeringUnit && engineeringUnit.length > 100) {
        throw new Error(
          `${tag}: teks satuan terlalu panjang.`,
        )
      }

      const item = {
        tag,
        unitNumber,
        description,
        engineeringUnit,
      }

      const previous = catalog.get(tag)

      if (
        previous &&
        (
          previous.description !== item.description ||
          previous.engineeringUnit !== item.engineeringUnit
        )
      ) {
        throw new Error(
          `Metadata berbeda ditemukan untuk tag ${tag}. ` +
          'Periksa duplikat pada file PIMS.',
        )
      }

      catalog.set(tag, item)
    })
  }

  if (!matchedSheets) {
    throw new Error(
      'Kolom Name, Description, dan engunits tidak ditemukan ' +
      'pada baris pertama workbook.',
    )
  }

  if (!catalog.size) {
    throw new Error(
      'Tidak ditemukan tag U-SAC1 sampai U-SAC15.',
    )
  }

  return [...catalog.values()]
}

async function main() {
  const argumentsList = process.argv.slice(2)
  const dryRun = argumentsList.includes('--dry-run')

  const unknownOption = argumentsList.find(
    (argument) =>
      argument.startsWith('--') &&
      argument !== '--dry-run',
  )

  if (unknownOption) {
    throw new Error(`Opsi tidak dikenal: ${unknownOption}`)
  }

  const filenames = argumentsList.filter(
    (argument) => !argument.startsWith('--'),
  )

  if (filenames.length > 1) {
    throw new Error('Gunakan satu file PIMS dalam satu perintah.')
  }

  const filename = filenames[0]
    ? path.resolve(filenames[0])
    : fileURLToPath(
        new URL(
          '../../data/PIMS_Directory_22102026.xlsx',
          import.meta.url,
        ),
      )

  console.log(`Membaca: ${path.basename(filename)}`)

  const rows = await readCatalog(filename)
  const missingUnits = rows.filter(
    (row) => !row.engineeringUnit,
  ).length

  const counts = new Map()

  for (const row of rows) {
    counts.set(
      row.unitNumber,
      (counts.get(row.unitNumber) ?? 0) + 1,
    )
  }

  console.log(`Tag ditemukan: ${rows.length}`)
  console.log(`Satuan tersedia: ${rows.length - missingUnits}`)
  console.log(`Satuan belum tersedia: ${missingUnits}`)

  console.table(
    [...counts.entries()]
      .sort(([a], [b]) => a - b)
      .map(([unit, count]) => ({
        unit: `SAC#${unit}`,
        jumlahTag: count,
      })),
  )

  if (dryRun) {
    console.log(
      'Pemeriksaan selesai. Belum ada perubahan pada database.',
    )
    return
  }

  const user =
    process.env.IMPORT_DB_USER || process.env.DB_USER

  const password =
    process.env.IMPORT_DB_PASSWORD ??
    process.env.DB_PASSWORD

  if (
    !process.env.DB_HOST ||
    !process.env.DB_NAME ||
    !user ||
    password === undefined
  ) {
    throw new Error(
      'Konfigurasi koneksi database belum lengkap di backend/.env.',
    )
  }

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    database: process.env.DB_NAME,
    user,
    password,
    charset: 'utf8mb4',
    connectTimeout: 10000,
  })

  let transactionStarted = false

  try {
    await connection.beginTransaction()
    transactionStarted = true

    const sql = `
      INSERT INTO instrument_catalog (
        tag_name,
        unit_number,
        description,
        engineering_unit,
        source_file
      )
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        unit_number = VALUES(unit_number),
        description = VALUES(description),
        engineering_unit = VALUES(engineering_unit),
        source_file = VALUES(source_file)
    `

    for (const row of rows) {
      await connection.execute(sql, [
        row.tag,
        row.unitNumber,
        row.description,
        row.engineeringUnit,
        path.basename(filename),
      ])
    }

    await connection.commit()
    transactionStarted = false

    console.log('')
    console.log(`BERHASIL: ${rows.length} tag katalog diproses.`)
    console.log('Nama dan satuan tersimpan di instrument_catalog.')
    console.log('Data historis tidak diubah.')
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback()
    }

    throw error
  } finally {
    await connection.end()
  }
}

main().catch((error) => {
  console.error(
    'IMPOR PIMS GAGAL:',
    error instanceof Error ? error.message : String(error),
  )
  process.exitCode = 1
})