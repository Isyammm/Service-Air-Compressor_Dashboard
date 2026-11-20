import dotenv from 'dotenv'
import {fileURLToPath} from 'node:url'
dotenv.config({path:fileURLToPath(new URL('../.env', import.meta.url))})
import mysql from 'mysql2/promise'

const requiredVariables = [
  'DB_HOST',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
]

for (const name of requiredVariables) {
  if (!process.env[name]) {
    throw new Error(`${name} belum diisi di file .env`)
  }
}

export const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 50,
  connectTimeout: 10000,

  timezone: 'Z',
  decimalNumbers: true,
  supportBigNumbers: true,
  bigNumberStrings: true,
})
