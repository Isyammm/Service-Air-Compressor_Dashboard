import 'dotenv/config'
import mysql from 'mysql2/promise'
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import path from 'node:path'

const EXPECTED_TAGS = [
  'U-SAC2-AIR-TEMP-STG1-AI-MS',
  'U-SAC2-AIR-TEMP-STG2-AI-MS',
  'U-SAC2-ANY-COMPRESSOR-TRIP-DI-MS',
  'U-SAC2-BRG-DE-TEMP-AI-MS',
  'U-SAC2-BRG-NDE-TEMP-AI-MS',
  'U-SAC2-CT-INPUT-AI-MS',
  'U-SAC2-DSCH-PRESSURE-STG1-AI-MS',
  'U-SAC2-DSCH-PRESSURE-STG2-AI-MS',
]

function cleanCell(value) {
  return value
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .trim()
}

function parseHtmlTable(html) {
  const rows = []

  for (const rowMatch of html.matchAll(
    /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi,
  )) {
    const cells = []

    for (const cellMatch of rowMatch[1].matchAll(
      /<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi,
    )) {
      cells.push(cleanCell(cellMatch[1]))
    }

    if (cells.length > 0) {
      rows.push(cells)
    }
  }

  if (rows.length < 2) {
    throw new Error(
      'Tabel tidak ditemukan atau tidak memiliki data. ' +
      'Gunakan file ekspor HTML .xls Centac 2 yang sesuai.',
    )
  }

  return rows
}

function parseSourceTime(value, rowNumber) {
  // Format sumber: MM/DD/YYYY HH:mm:ss
  const match = value.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})$/,
  )

  if (!match) {
    throw new Error(
      `Baris ${rowNumber}: format waktu tidak valid: "${value}".`,
    )
  }

  const [, monthText, dayText, yearText, hourText, minuteText, secondText] =
    match

  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
  const hour = Number(hourText)
  const minute = Number(minuteText)
  const second = Number(secondText)

  // UTC hanya untuk memvalidasi kalender, bukan mengubah zona waktu.
  const date = new Date(
    Date.UTC(year, month - 1, day, hour, minute, second),
  )

  if (
    year < 1000 ||
    year > 9999 ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day ||
    date.getUTCHours() !== hour ||
    date.getUTCMinutes() !== minute ||
    date.getUTCSeconds() !== second
  ) {
    throw new Error(
      `Baris ${rowNumber}: tanggal atau jam tidak valid: "${value}".`,
    )
  }

  const pad = (number) => String(number).padStart(2, '0')

  // Simpan waktu persis seperti sumber tanpa konversi zona waktu.
  return (
    `${year}-${pad(month)}-${pad(day)} ` +
    `${pad(hour)}:${pad(minute)}:${pad(second)}`
  )
}

function validateRows(rows) {
  const [header, ...dataRows] = rows

  const expectedHeader = ['TimeStamp', ...EXPECTED_TAGS]

  if (
    header.length !== expectedHeader.length ||
    header.some((column, index) => column !== expectedHeader[index])
  ) {
    throw new Error(
      'Header file tidak sesuai dengan format Centac 2 yang diharapkan. ' +
      `Header ditemukan: ${JSON.stringify(header)}`,
    )
  }

  const seenTimes = new Set()
  const samples = []

  for (let index = 0; index < dataRows.length; index += 1) {
    const row = dataRows[index]
    const rowNumber = index + 2

    if (row.length !== expectedHeader.length) {
      throw new Error(
        `Baris ${rowNumber}: jumlah kolom ${row.length}, seharusnya 9.`,
      )
    }

    const sourceTime = parseSourceTime(row[0], rowNumber)

    if (seenTimes.has(sourceTime)) {
      throw new Error(
        `Baris ${rowNumber}: timestamp duplikat ${sourceTime}.`,
      )
    }

    seenTimes.add(sourceTime)

    const values = row.slice(1).map((cell, columnIndex) => {
      if (!/^[+-]?\d+(?:\.\d+)?$/.test(cell)) {
        throw new Error(
          `Baris ${rowNumber}, tag ${EXPECTED_TAGS[columnIndex]}: ` +
          `nilai bukan angka yang valid: "${cell}".`,
        )
      }

      const value = Number(cell)

      if (!Number.isFinite(value)) {
        throw new Error(
          `Baris ${rowNumber}: nilai angka tidak valid.`,
        )
      }

      return value
    })

    samples.push({
      sourceTime,
      rawValues: JSON.stringify(values),
    })
  }

  if (samples.length === 0) {
    throw new Error('Tidak ada data yang dapat diimpor.')
  }

  return samples
}

async function main() {
  let connection
  let transactionStarted = false

  try {
    console.log('Memulai impor historis Centac 2...')

    const inputFile = process.argv[2]

    if (!inputFile) {
      throw new Error(
        'Lokasi file belum diberikan. Jalankan: ' +
        'node src/import-centac2.js data/sac2_pt1.xls',
      )
    }

    const requiredEnv = [
      'DB_HOST',
      'DB_NAME',
      'IMPORT_DB_USER',
      'IMPORT_DB_PASSWORD',
    ]

    for (const name of requiredEnv) {
      if (!process.env[name]) {
        throw new Error(
          `${name} belum diisi dalam backend/.env. ` +
          'Jalankan script dari folder backend.',
        )
      }
    }

    const filePath = path.resolve(inputFile)
    const fileName = path.basename(filePath)

    console.log(`Membaca file: ${filePath}`)

    const buffer = await readFile(filePath)
    const fileHash = createHash('sha256').update(buffer).digest('hex')
    const html = buffer.toString('utf8')

    const rows = parseHtmlTable(html)
    const samples = validateRows(rows)

    console.log(
      `Validasi struktur berhasil: ${samples.length.toLocaleString('id-ID')} baris.`,
    )
    console.log(
      'Nilai disimpan sebagai data mentah; satuan, zona waktu, ' +
      'dan arti status trip belum diverifikasi.',
    )

    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.IMPORT_DB_USER,
      password: process.env.IMPORT_DB_PASSWORD,
      database: process.env.DB_NAME,
      connectTimeout: 10000,
      charset: 'utf8mb4',
    })

    console.log(`Terhubung ke database: ${process.env.DB_NAME}`)

    const [existing] = await connection.execute(
      `SELECT id, row_count
       FROM historical_imports
       WHERE file_sha256 = ?`,
      [fileHash],
    )

    if (existing.length > 0) {
      console.log('File yang sama sudah pernah diimpor.')
      console.log(`ID impor: ${existing[0].id}`)
      console.log(`Jumlah baris: ${existing[0].row_count}`)
      console.log('Tidak ada data baru yang ditambahkan.')
      return
    }

    await connection.beginTransaction()
    transactionStarted = true

    const [result] = await connection.execute(
      `INSERT INTO historical_imports
        (file_sha256, file_name, asset_name, tags, row_count)
       VALUES (?, ?, ?, ?, ?)`,
      [
        fileHash,
        fileName,
        'Centac 2',
        JSON.stringify(EXPECTED_TAGS),
        samples.length,
      ],
    )

    const importId = result.insertId
    const batchSize = 500

    for (let start = 0; start < samples.length; start += batchSize) {
      const batch = samples.slice(start, start + batchSize)
      const placeholders = batch.map(() => '(?, ?, ?)').join(', ')
      const parameters = batch.flatMap((sample) => [
        importId,
        sample.sourceTime,
        sample.rawValues,
      ])

      await connection.execute(
        `INSERT INTO historical_samples
          (import_id, source_time, raw_values)
         VALUES ${placeholders}`,
        parameters,
      )

      const processed = start + batch.length

      if (processed % 5000 === 0 || processed === samples.length) {
        console.log(
          `Memproses ${processed.toLocaleString('id-ID')} / ` +
          `${samples.length.toLocaleString('id-ID')} baris...`,
        )
      }
    }

    const [counts] = await connection.execute(
      `SELECT COUNT(*) AS total
       FROM historical_samples
       WHERE import_id = ?`,
      [importId],
    )

    if (Number(counts[0].total) !== samples.length) {
      throw new Error(
        'Jumlah baris tersimpan tidak sama dengan jumlah baris sumber.',
      )
    }

    await connection.commit()
    transactionStarted = false

    console.log('')
    console.log('IMPOR BERHASIL')
    console.log(`ID impor       : ${importId}`)
    console.log(`File           : ${fileName}`)
    console.log(`Unit           : Centac 2`)
    console.log(`Jumlah baris   : ${samples.length.toLocaleString('id-ID')}`)
    console.log('Jenis data     : HISTORICAL')
    console.log('Data telah tersimpan di database.')
  } catch (error) {
    if (connection && transactionStarted) {
      try {
        await connection.rollback()
        console.error('Transaksi dibatalkan; impor ini tidak disimpan.')
      } catch (rollbackError) {
        console.error('Rollback gagal:', rollbackError.message)
      }
    }

    console.error('')
    console.error('IMPOR GAGAL')
    console.error('Kode:', error.code || 'VALIDATION_ERROR')
    console.error('Pesan:', error.message)
    process.exitCode = 1
  } finally {
    if (connection) {
      await connection.end()
    }
  }
}

main().catch((error) => {
  console.error('Kesalahan saat menutup proses:', error.message)
  process.exitCode = 1
})