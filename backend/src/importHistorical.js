import dotenv from 'dotenv'
import mysql from 'mysql2/promise'
import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

dotenv.config({
  path: fileURLToPath(new URL('../.env', import.meta.url)),
  quiet: true,
})

const TAG_PATTERN = /^U-SAC(\d+)-[A-Z0-9_ /-]+$/i

function pad2(value) {
  return String(value).padStart(2, '0')
}

function validateCalendarDate(year, month, day, hour, minute, second, rowNumber, rawValue) {
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second))

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
      `Baris ${rowNumber}: tanggal atau jam tidak valid: "${rawValue}".`,
    )
  }

  return (
    `${year}-${pad2(month)}-${pad2(day)} ` +
    `${pad2(hour)}:${pad2(minute)}:${pad2(second)}`
  )
}

export function parseSourceTime(value, rowNumber, order = 'mdy') {
  const trimmed = String(value ?? '').trim()

  // Format ISO: YYYY-MM-DD HH:mm[:ss]
  const isoMatch = trimmed.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/,
  )

  if (isoMatch) {
    const [, yearText, monthText, dayText, hourText, minuteText, secondText = '0'] =
      isoMatch

    return validateCalendarDate(
      Number(yearText),
      Number(monthText),
      Number(dayText),
      Number(hourText),
      Number(minuteText),
      Number(secondText),
      rowNumber,
      trimmed,
    )
  }

  // Format Slash: M/D/YYYY HH:mm[:ss] atau D/M/YYYY HH:mm[:ss]
  const slashMatch = trimmed.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/,
  )

  if (!slashMatch) {
    throw new Error(
      `Baris ${rowNumber}: format waktu tidak valid: "${trimmed}".`,
    )
  }

  const [, firstText, secondPartText, yearText, hourText, minuteText, secondText = '0'] =
    slashMatch

  const first = Number(firstText)
  const secondPart = Number(secondPartText)
  const month = order === 'dmy' ? secondPart : first
  const day = order === 'dmy' ? first : secondPart

  return validateCalendarDate(
    Number(yearText),
    month,
    day,
    Number(hourText),
    Number(minuteText),
    Number(secondText),
    rowNumber,
    trimmed,
  )
}

export function validateCsv(csvText, order = 'mdy') {
  if (typeof csvText !== 'string' || !csvText.trim()) {
    throw new Error('File CSV kosong atau tidak dapat dibaca.')
  }

  if (!['mdy', 'dmy'].includes(order)) {
    throw new Error('Format urutan tanggal harus "mdy" atau "dmy".')
  }

  const rawLines = csvText
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !/^,+$/.test(line))

  if (rawLines.length < 2) {
    throw new Error('File CSV tidak memiliki header dan baris data.')
  }

  let headerIndex = 0
  if (/^total\s+rows\b/i.test(rawLines[0])) {
    headerIndex = 1
  }

  if (rawLines.length <= headerIndex + 1) {
    throw new Error('File CSV tidak memiliki baris data setelah header.')
  }

  const headerCells = rawLines[headerIndex]
    .split(',')
    .map((cell) => cell.trim())

  if (
    headerCells.length < 2 ||
    headerCells[0].toLowerCase() !== 'timestamp'
  ) {
    throw new Error(
      'Kolom pertama header CSV harus berupa "TimeStamp" diikuti tag sensor.',
    )
  }

const tags = headerCells
  .slice(1)
  .map((tag) => tag.trim().toUpperCase())

if (new Set(tags).size !== tags.length) {
  throw new Error('Terdapat nama tag duplikat pada header CSV.')
}

const systemTags = new Set([
  'U-AIR-FLOW-AI',
  'U-AIR-PRESS-AI',
  'U-PPAC-THERMALCADEWPOINT-B-AI',
])

const assets = new Set()

for (const tag of tags) {
  if (systemTags.has(tag)) {
    assets.add('SYSTEM')
    continue
  }

  const match = TAG_PATTERN.exec(tag)
  const number = Number(match?.[1])

  if (!match || number < 1 || number > 15) {
    throw new Error(`Tag tidak dikenali: "${tag}".`)
  }

  assets.add(`SAC#${number}`)
}

if (assets.size !== 1) {
  throw new Error(
    'Satu file harus berisi satu Centac atau parameter sistem saja.',
  )
}

const [assetName] = [...assets]

const unitNumber =
  assetName === 'SYSTEM'
    ? null
    : Number(assetName.slice(4))
  const expectedColumns = headerCells.length
  const seenTimes = new Set()
  const samples = []
  let emptyValues = 0

  for (let i = headerIndex + 1; i < rawLines.length; i += 1) {
    const rowNumber = i + 1
    const cells = rawLines[i].split(',').map((cell) => cell.trim())

    if (cells.length !== expectedColumns) {
      throw new Error(
        `Baris ${rowNumber}: jumlah kolom ${cells.length}, seharusnya ${expectedColumns}.`,
      )
    }

    const sourceTime = parseSourceTime(cells[0], rowNumber, order)

    if (seenTimes.has(sourceTime)) {
      throw new Error(
        `Baris ${rowNumber}: timestamp duplikat ${sourceTime}.`,
      )
    }

    seenTimes.add(sourceTime)

    const values = cells.slice(1).map((cell, columnIndex) => {
      if (
        cell === '' ||
        /^(n\/a|na|null|-)$/i.test(cell)
      ) {
        emptyValues += 1
        return null
      }

      if (!/^[+-]?\d+(?:\.\d+)?$/.test(cell)) {
        throw new Error(
          `Baris ${rowNumber}, tag ${tags[columnIndex]}: nilai bukan angka yang valid: "${cell}".`,
        )
      }

      const numericValue = Number(cell)

      if (!Number.isFinite(numericValue)) {
        throw new Error(
          `Baris ${rowNumber}, tag ${tags[columnIndex]}: nilai angka tidak valid.`,
        )
      }

      return numericValue
    })

    samples.push({
      sourceTime,
      rawValues: JSON.stringify(values),
    })
  }

  if (samples.length === 0) {
    throw new Error('Tidak ada sampel data yang dapat diimpor.')
  }

  return {
    unitNumber,
    assetName,
    tags,
    samples,
    emptyValues,
  }
}

export async function persistImport(csv, fileName, fileHash, cardTags = []) {
  const dbUser = process.env.IMPORT_DB_USER || process.env.DB_USER
  const dbPassword = process.env.IMPORT_DB_PASSWORD || process.env.DB_PASSWORD

  if (!process.env.DB_HOST || !process.env.DB_NAME || !dbUser || !dbPassword) {
    throw new Error(
      'Konfigurasi database impor (DB_HOST, DB_NAME, IMPORT_DB_USER, IMPORT_DB_PASSWORD) belum lengkap di backend/.env.',
    )
  }

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: dbUser,
    password: dbPassword,
    database: process.env.DB_NAME,
    connectTimeout: 10000,
    charset: 'utf8mb4',
  })

  let transactionStarted = false

  try {
    const [existing] = await connection.execute(
      `SELECT id, row_count AS rowCount
       FROM historical_imports
       WHERE file_sha256 = ?`,
      [fileHash],
    )

    if (existing.length > 0) {
      return {
        duplicate: true,
        id: Number(existing[0].id),
        count: Number(existing[0].rowCount),
        rowCount: Number(existing[0].rowCount),
      }
    }

    await connection.beginTransaction()
    transactionStarted = true

    const [insertResult] = await connection.execute(
      `INSERT INTO historical_imports
        (file_sha256, file_name, asset_name, tags, row_count)
       VALUES (?, ?, ?, ?, ?)`,
      [
        fileHash,
        fileName,
        csv.assetName,
        JSON.stringify(csv.tags),
        csv.samples.length,
      ],
    )

    const importId = Number(insertResult.insertId)
    const batchSize = 500

    for (let start = 0; start < csv.samples.length; start += batchSize) {
      const batch = csv.samples.slice(start, start + batchSize)
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
    }

    const [counts] = await connection.execute(
      `SELECT COUNT(*) AS total
       FROM historical_samples
       WHERE import_id = ?`,
      [importId],
    )

    if (Number(counts[0].total) !== csv.samples.length) {
      throw new Error(
        'Jumlah baris tersimpan tidak sama dengan jumlah baris sumber.',
      )
    }

    if (Array.isArray(cardTags) && cardTags.length > 0) {
      try {
        await connection.execute(
          `INSERT INTO historical_display (import_id, card_tags, note)
           VALUES (?, ?, '')
           ON DUPLICATE KEY UPDATE card_tags = VALUES(card_tags)`,
          [importId, JSON.stringify(cardTags)],
        )
      } catch (displayError) {
        // Jika tabel historical_display belum dimigrasikan, jangan gagalkan transaksi utama
        if (
          displayError.code !== 'ER_NO_SUCH_TABLE' &&
          displayError.code !== 'ER_BAD_FIELD_ERROR'
        ) {
          throw displayError
        }
      }
    }

    await connection.commit()
    transactionStarted = false

    return {
      duplicate: false,
      id: importId,
      count: csv.samples.length,
      rowCount: csv.samples.length,
    }
  } catch (error) {
    if (transactionStarted) {
      try {
        await connection.rollback()
      } catch {
        // Abaikan error rollback sekunder
      }
    }
    throw error
  } finally {
    await connection.end()
  }
}

async function resolveTargetFiles(inputArg) {
  const defaultDataDir = fileURLToPath(new URL('../../data', import.meta.url))

  if (inputArg) {
    const directPath = path.resolve(inputArg)
    try {
      await readFile(directPath)
      return [directPath]
    } catch {
      const fallbackPath = path.join(defaultDataDir, inputArg)
      return [fallbackPath]
    }
  }

  const entries = await readdir(defaultDataDir)
  const csvFiles = entries
    .filter((name) => name.toLowerCase().endsWith('.csv'))
    .sort()
    .map((name) => path.join(defaultDataDir, name))

  if (csvFiles.length === 0) {
    throw new Error(
      'Tidak ada file .csv di folder data/. Jalankan: npm run import -- ../data/centac14.csv',
    )
  }

  return csvFiles
}

async function runCli() {
  try {
    const args = process.argv.slice(2)
    const orderArg = args.find((arg) => arg === 'mdy' || arg === 'dmy') || 'mdy'
    const fileArg = args.find((arg) => arg !== 'mdy' && arg !== 'dmy')

    const files = await resolveTargetFiles(fileArg)

    for (const filePath of files) {
      const fileName = path.basename(filePath)
      console.log(`Membaca file: ${filePath}`)

      const buffer = await readFile(filePath)
      const fileHash = createHash('sha256').update(buffer).digest('hex')
      const csv = validateCsv(buffer.toString('utf8'), orderArg)

      console.log(
        `Validasi struktur berhasil: ${csv.samples.length.toLocaleString('id-ID')} baris (${csv.assetName}).`,
      )

      const defaultCards = csv.tags.slice(0, 3)
      const result = await persistImport(csv, fileName, fileHash, defaultCards)

      if (result.duplicate) {
        console.log(`File "${fileName}" sudah pernah diimpor (ID impor: ${result.id}, ${result.rowCount.toLocaleString('id-ID')} baris).`)
      } else {
        console.log('IMPOR BERHASIL')
        console.log(`ID impor       : ${result.id}`)
        console.log(`File           : ${fileName}`)
        console.log(`Unit           : ${csv.assetName}`)
        console.log(`Rentang waktu  : ${csv.samples[0].sourceTime} s/d ${csv.samples.at(-1).sourceTime}`)
        console.log(`Jumlah baris   : ${result.rowCount.toLocaleString('id-ID')}`)
      }
    }
  } catch (error) {
    console.error('IMPOR GAGAL')
    console.error('Kode :', error.code || 'VALIDATION_ERROR')
    console.error('Pesan:', error.message)
    process.exitCode = 1
  }
}

const isDirectExecution =
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href

if (isDirectExecution) {
  void runCli()
}