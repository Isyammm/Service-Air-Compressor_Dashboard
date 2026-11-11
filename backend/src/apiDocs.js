import swaggerUi from 'swagger-ui-express'
import { importDocsPaths } from './importRoutes.js'

const importId = {
  name: 'id',
  in: 'path',
  required: true,
  description: 'ID impor dari GET /api/history/imports, bukan nomor kompresor.',
  schema: {
    type: 'integer',
    minimum: 1,
  },
}

const day = {
  name: 'day',
  in: 'query',
  required: true,
  description: 'Tanggal pembacaan pada CSV dalam format YYYY-MM-DD.',
  schema: {
    type: 'string',
    format: 'date',
  },
  example: '2026-01-01',
}

const spec = {
  openapi: '3.0.3',

  info: {
    title: 'Service Air Compressor API',
    version: '1.0.0',
    description:
      'Impor CSV dan akses data historis kompresor Centac. ' +
      'Untuk mengimpor, gunakan Preview CSV terlebih dahulu, ' +
      'kemudian Simpan CSV ke MySQL.',
  },

  servers: [{ url: '/' }],

  tags: [
    {
      name: 'Impor CSV',
      description: 'Periksa file CSV dan simpan data kompresor ke MySQL.',
    },
    {
      name: 'Sistem',
      description: 'Informasi API dan koneksi MySQL.',
    },
    {
      name: 'Data Historis',
      description: 'Daftar file impor dan sampel sensor berdasarkan tanggal.',
    },
    {
      name: 'Dashboard',
      description: 'Data historis untuk tampilan dashboard.',
    },
  ],

  paths: {
    // Mengambil definisi POST /preview dan POST /commit dari importRoutes.js.
    // Definisi tersebut juga menyediakan tombol Choose File di Swagger.
    ...importDocsPaths,

    '/': {
      get: {
        tags: ['Sistem'],
        summary: 'Informasi backend',
        responses: {
          200: {
            description: 'Informasi Service Air Compressor API.',
          },
        },
      },
    },

    '/api/health': {
      get: {
        tags: ['Sistem'],
        summary: 'Periksa koneksi backend dan MySQL',
        responses: {
          200: {
            description: 'Backend berhasil terhubung ke database.',
            content: {
              'application/json': {
                example: {
                  status: 'ok',
                  database: 'connected',
                  serverTime: '2026-01-01T00:00:00.000Z',
                },
              },
            },
          },
          default: {
            description: 'Pemeriksaan koneksi database gagal.',
          },
        },
      },
    },

    '/api/history/imports': {
      get: {
        tags: ['Data Historis'],
        summary: 'Lihat daftar file Centac yang sudah diimpor',
        description:
          'Cari assetName kompresor yang diinginkan. Gunakan id dari hasilnya ' +
          'untuk membaca sampel sensor.',
        responses: {
          200: {
            description: 'Daftar impor, nama kompresor, jumlah baris, dan tag.',
          },
          default: {
            description: 'Daftar impor gagal dimuat.',
          },
        },
      },
    },

    '/api/history/{id}/samples': {
      get: {
        tags: ['Data Historis'],
        summary: 'Lihat sampel sensor untuk satu tanggal',
        description:
          'Masukkan ID impor dan tanggal yang tersedia di CSV. ' +
          'Urutan values pada setiap sampel mengikuti urutan tags.',
        parameters: [importId, day],
        responses: {
          200: {
            description: 'Daftar tag dan sampel pada tanggal pilihan.',
          },
          400: {
            description: 'ID impor atau format tanggal tidak valid.',
          },
          404: {
            description: 'Impor tidak ditemukan.',
          },
          default: {
            description: 'Sampel gagal dimuat.',
          },
        },
      },
    },

    '/api/dashboard/imports': {
      get: {
        tags: ['Dashboard'],
        summary: 'Lihat daftar impor untuk dashboard',
        responses: {
          200: {
            description: 'Daftar impor yang tersedia.',
          },
          default: {
            description: 'Data dashboard gagal dimuat.',
          },
        },
      },
    },

    '/api/dashboard/imports/{id}/latest': {
      get: {
        tags: ['Dashboard'],
        summary: 'Lihat pembacaan terakhir dari satu impor',
        description: 'Menampilkan sampel terakhir dari file historis.',
        parameters: [importId],
        responses: {
          200: {
            description: 'Pembacaan terakhir dari impor yang dipilih.',
          },
          default: {
            description: 'Pembacaan terakhir gagal dimuat.',
          },
        },
      },
    },
  },
}

export function registerApiDocs(app) {
  app.get('/openapi.json', (_req, res) => {
    res.set('Cache-Control', 'no-store')
    res.json(spec)
  })

  app.use(
    '/docs',
    swaggerUi.serve,
    swaggerUi.setup(spec, {
      customSiteTitle: 'Service Air Compressor | API Docs',
      swaggerOptions: {
        deepLinking: true,
        docExpansion: 'list',
        displayRequestDuration: true,
        defaultModelsExpandDepth: -1,
      },
    }),
  )
}