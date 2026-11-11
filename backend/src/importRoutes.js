import { Router } from 'express'
import multer from 'multer'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { validateCsv, persistImport } from './importHistorical.js'

const router = Router()

// Satu file CSV per permintaan, tanpa batas fileSize dari Multer.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 1,
    fields: 1,
    parts: 3,
  },
}).single('file')

function receiveCsv(req, res, next) {
  const origin = req.get('origin')
  const frontend = (process.env.FRONTEND_ORIGIN || 'http://localhost:5173').replace(/\/$/, '')
  const swagger = req.protocol + '://' + req.get('host')

  if (origin && origin !== frontend && origin !== swagger) {
    return res.status(403).json({
      message: 'Alamat dashboard tidak sesuai dengan FRONTEND_ORIGIN di backend/.env.',
    })
  }

  upload(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        message: 'Unggah satu file CSV pada kolom file dan satu pilihan dateOrder.',
        code: error.code || 'UPLOAD_ERROR',
      })
    }

    next()
  })
}

function importCsv(saveToDatabase) {
  return async (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        message: 'Pilih file CSV terlebih dahulu.',
      })
    }

    const fileName = path.win32.basename(req.file.originalname)

    if (path.extname(fileName).toLowerCase() !== '.csv') {
      return res.status(400).json({
        message: 'Format file harus .csv.',
      })
    }

    const dateOrder = req.body?.dateOrder || 'mdy'

    if (dateOrder !== 'mdy' && dateOrder !== 'dmy') {
      return res.status(400).json({
        message: 'Format tanggal harus mdy atau dmy.',
      })
    }

    let csv

    try {
      const text = req.file.buffer.toString('utf8').replace(/^\uFEFF/, '')
      csv = validateCsv(text, dateOrder)
    } catch (error) {
      return res.status(422).json({
        message: error.message || 'Isi CSV tidak valid.',
      })
    }

    const firstSample = csv.samples[0]
    let firstTime = firstSample.sourceTime
    let lastTime = firstSample.sourceTime

    for (const sample of csv.samples) {
      if (sample.sourceTime < firstTime) firstTime = sample.sourceTime
      if (sample.sourceTime > lastTime) lastTime = sample.sourceTime
    }

    const summary = {
      fileName,
      assetName: csv.assetName,
      rowCount: csv.samples.length,
      firstTime,
      lastTime,
      tags: csv.tags,
    }

    // Preview hanya memeriksa CSV dan tidak menulis ke MySQL.
    if (!saveToDatabase) {
      return res.status(200).json({
        message: 'CSV valid. Data belum disimpan.',
        ...summary,
        sample: {
          time: firstSample.sourceTime,
          values: JSON.parse(firstSample.rawValues),
        },
      })
    }

    try {
      const fileHash = createHash('sha256')
        .update(req.file.buffer)
        .digest('hex')

      const result = await persistImport(
        csv,
        fileName,
        fileHash,
        csv.tags.slice(0, 3),
      )

      return res.status(result.duplicate ? 200 : 201).json({
        message: result.duplicate
          ? 'File yang sama sudah ada di MySQL. Data tidak diimpor ulang.'
          : 'Data historis berhasil disimpan ke MySQL.',
        id: result.id,
        duplicate: result.duplicate,
        ...summary,
      })
    } catch (error) {
      console.error('Gagal menyimpan impor CSV:', {
  code: error.code,
  message: error.sqlMessage || error.message,
})

      return res.status(500).json({
        message:
          'CSV valid, tetapi gagal disimpan ke MySQL. ' +
          'Periksa pesan pada terminal backend.',
      })
    }
  }
}

router.post('/preview', receiveCsv, importCsv(false))
router.post('/commit', receiveCsv, importCsv(true))

export default router

function uploadOperation(summary, description, commit = false) {
  return {
    tags: ['Impor CSV'],
    summary,
    description,

    requestBody: {
      required: true,
      content: {
        'multipart/form-data': {
          schema: {
            type: 'object',
            required: ['file'],
            properties: {
              file: {
                type: 'string',
                format: 'binary',
                description: 'Pilih satu file CSV Centac.',
              },
              dateOrder: {
                type: 'string',
                enum: ['mdy', 'dmy'],
                default: 'mdy',
                description:
                  'mdy = bulan/hari/tahun. dmy = hari/bulan/tahun.',
              },
            },
          },
        },
      },
    },

    responses: {
      200: {
        description: commit
          ? 'File identik sudah pernah diimpor.'
          : 'CSV valid. Hasil pemeriksaan tersedia.',
      },
      ...(commit
        ? { 201: { description: 'Data baru berhasil disimpan ke MySQL.' } }
        : {}),
      400: { description: 'File atau pilihan format tanggal tidak sesuai.' },
      403: { description: 'Unggahan dari origin browser ini tidak diizinkan.' },
      422: { description: 'Isi CSV gagal divalidasi.' },
      ...(commit
        ? { 500: { description: 'Gagal menyimpan data ke MySQL.' } }
        : {}),
    },
  }
}

export const importDocsPaths = {
  '/api/imports/preview': {
    post: uploadOperation(
      '1. Preview CSV',
      'Periksa unit Centac, jumlah baris, rentang tanggal, dan tag sensor sebelum menyimpan.',
    ),
  },

  '/api/imports/commit': {
    post: uploadOperation(
      '2. Simpan CSV ke MySQL',
      'Pilih file dan format tanggal yang sama dengan preview untuk menyimpan data historis.',
      true,
    ),
  },
}