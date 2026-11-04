import { pool } from './db.js'

async function checkDatabase() {
  try {
    const [server] = await pool.query(`
      SELECT
        DATABASE() AS databaseName,
        VERSION() AS serverVersion,
        CURRENT_USER() AS account
    `)

    const [tables] = await pool.query('SHOW TABLES')

    console.log('Koneksi database berhasil.')
    console.table(server)
    console.log('Tabel yang tersedia:')
    console.table(tables)
  } catch (error) {
    console.error('Koneksi database gagal.')
    console.error('Kode:', error.code)
    console.error('Pesan:', error.message)
    process.exitCode = 1
  } finally {
    await pool.end()
  }
}

void checkDatabase()