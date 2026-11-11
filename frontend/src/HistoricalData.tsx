import { useState } from 'react'
import './HistoricalData.css'

const API = (
  import.meta.env.VITE_API_BASE_URL ||
  'http://127.0.0.1:4000'
).replace(/\/$/, '')

type Order = 'mdy' | 'dmy'

type Preview = {
  assetName: string
  rowCount: number
  firstTime: string
  lastTime: string
  tags: string[]
}

type Prepared = {
  file: File
  order: Order
  preview: Preview
}

function cleanCell(value: string): string {
  return value
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/^\uFEFF/, '')
    .trim()
}

function csvCells(line: string): string[] {
  const result: string[] = []
  let value = ''
  let quoted = false

  for (let i = 0; i < line.length; i++) {
    const character = line[i]

    if (character === '"') {
      if (quoted && line[i + 1] === '"') {
        value += '"'
        i++
      } else {
        quoted = !quoted
      }
    } else if (character === ',' && !quoted) {
      result.push(value.trim())
      value = ''
    } else {
      value += character
    }
  }

  if (quoted) {
    throw new Error(
      'Tanda kutip pada baris CSV tidak lengkap.',
    )
  }

  result.push(value.trim())
  return result
}

function* readRows(
  text: string,
  filename: string,
): Generator<string[]> {
  if (/\.xls$/i.test(filename)) {
    if (!/<table\b/i.test(text.slice(0, 8192))) {
      throw new Error(
        `${filename}: format XLS ini belum didukung. ` +
        'Simpan sebagai CSV UTF-8 terlebih dahulu.',
      )
    }

    for (
      const row of text.matchAll(
        /<tr\b[^>]*>([\s\S]*?)<\/tr\s*>/gi,
      )
    ) {
      const cells = Array.from(
        row[1].matchAll(
          /<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]\s*>/gi,
        ),
        (match) => cleanCell(match[1]),
      )

      if (cells.length) yield cells
    }

    return
  }

  if (!/\.csv$/i.test(filename)) {
    throw new Error(
      `${filename}: pilih CSV atau XLS hasil ekspor Centac.`,
    )
  }

  for (const line of text.matchAll(/[^\r\n]+/g)) {
    if (line[0].trim()) {
      yield csvCells(line[0].replace(/^\uFEFF/, ''))
    }
  }
}

async function mergeFiles(files: File[]): Promise<File> {
  const tags: string[] = []
  const tagIndexes = new Map<string, number>()
  const samples = new Map<
    string,
    (number | null | undefined)[]
  >()

  let unit = ''

  for (const file of files) {
    const text = await file.text()
    let columns: number[] | undefined
    let count = 0

    for (const cells of readRows(text, file.name)) {
      if (!columns) {
        if (cells[0]?.toLowerCase() !== 'timestamp') {
          continue
        }

        const names = cells
          .slice(1)
          .map((tag) => tag.trim().toUpperCase())

        if (
          !names.length ||
          new Set(names).size !== names.length
        ) {
          throw new Error(
            `${file.name}: daftar sensor kosong atau terdapat tag ganda.`,
          )
        }

                    columns = names.map((tag) => {
                      const systemTags = new Set([
              'U-AIR-FLOW-AI',
              'U-AIR-PRESS-AI',
              'U-PPAC-THERMALCADEWPOINT-B-AI',
            ])

            let id: string

            if (systemTags.has(tag)) {
              id = 'SYSTEM'
            } else {
            const match = /^U-SAC(\d+)-.+$/.exec(tag)
            const number = Number(match?.[1])

            if (!match || number < 1 || number > 15) {
              throw new Error(
                `${file.name}: tag tidak dikenali: ${tag}`,
              )
            }

            id = `SAC${number}`
          }

          if (unit && unit !== id) {
            throw new Error(
              'Pilih file dari satu Centac atau parameter sistem saja. ' +
              'Jangan campurkan keduanya dalam satu impor.',
            )
          }

          unit = id

          let index = tagIndexes.get(tag)

          if (index === undefined) {
            index = tags.length
            tagIndexes.set(tag, index)
            tags.push(tag)
          }

          return index
        })

        continue
      }

      const timestamp = cells[0]

      if (
        !timestamp ||
        cells.length !== columns.length + 1
      ) {
        throw new Error(
          `${file.name}: jumlah kolom salah pada baris data ${count + 1}.`,
        )
      }

      const values = samples.get(timestamp) ?? []

      for (let i = 0; i < columns.length; i++) {
        const raw = cells[i + 1]

        const next =
          /^(?:|N\/A|NA|NULL|NAN|#N\/A)$/i.test(raw)
            ? null
            : Number(raw)

        if (next !== null && !Number.isFinite(next)) {
          throw new Error(
            `${file.name} · ${timestamp}: nilai bukan angka: ${raw}`,
          )
        }

        const column = columns[i]
        const previous = values[column]

        if (
          previous != null &&
          next != null &&
          previous !== next
        ) {
          throw new Error(
            `Nilai berbeda untuk ${tags[column]} pada ${timestamp}: ` +
            `${previous} dan ${next}. Periksa file sumber.`,
          )
        }

        if (next !== null || previous === undefined) {
          values[column] = next
        }
      }

      samples.set(timestamp, values)
      count++
    }

    if (!columns || count === 0) {
      throw new Error(
        `${file.name}: tidak ditemukan data setelah header TimeStamp.`,
      )
    }
  }

  const indexes = tags
    .map((_, index) => index)
    .sort((a, b) =>
      tags[a] < tags[b] ? -1 : tags[a] > tags[b] ? 1 : 0,
    )

  const lines = [
    ['TimeStamp', ...indexes.map((i) => tags[i])].join(',') +
      '\n',
  ]

  for (const timestamp of [...samples.keys()].sort()) {
    const values = samples.get(timestamp)!

    lines.push(
      [
        timestamp,
        ...indexes.map((i) => values[i] ?? ''),
      ].join(',') + '\n',
    )
  }

  return new File(
    lines,
    `${unit}_historical.csv`,
    { type: 'text/csv' },
  )
}

async function send(
  action: 'preview' | 'commit',
  file: File,
  order: Order,
) {
  const body = new FormData()
  body.append('file', file)
  body.append('dateOrder', order)

  const response = await fetch(
    `${API}/api/imports/${action}`,
    {
      method: 'POST',
      body,
    },
  )

  const result = await response.json().catch(() => null)

  if (!response.ok || !result) {
    throw new Error(
      result?.message ||
      `Backend mengembalikan HTTP ${response.status}.`,
    )
  }

  return result
}

function sizeLabel(bytes: number) {
  if (bytes < 1024) return `${bytes} B`

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function HistoricalData({
  onImported,
}: {
  onImported?: () => void
}) {
  const [files, setFiles] = useState<File[]>([])
  const [order, setOrder] = useState<Order>('mdy')
  const [prepared, setPrepared] =
    useState<Prepared | null>(null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [dragging, setDragging] = useState(false)

  const totalBytes = files.reduce(
    (total, file) => total + file.size,
    0,
  )

  const currentStep = message ? 3 : prepared ? 2 : 1

  function clearPreview() {
    setPrepared(null)
    setMessage('')
    setError('')
  }

  function addFiles(incoming: File[]) {
    if (busy || !incoming.length) return

    if (
      incoming.some(
        (file) => !/\.(csv|xls)$/i.test(file.name),
      )
    ) {
      setError(
        'Pilih file .csv atau .xls hasil ekspor Centac.',
      )
      return
    }

    clearPreview()

    setFiles((previous) => {
      const next = [...previous]

      for (const file of incoming) {
        const alreadySelected = next.some(
          (item) =>
            item.name === file.name &&
            item.size === file.size &&
            item.lastModified === file.lastModified,
        )

        if (!alreadySelected) next.push(file)
      }

      return next
    })
  }

  function removeFile(index: number) {
    if (busy) return

    clearPreview()
    setFiles((previous) =>
      previous.filter((_, i) => i !== index),
    )
  }

  async function preview() {
    if (!files.length || busy) return

    clearPreview()
    setBusy('Menggabungkan file dan mencocokkan sensor…')

    try {
      const file = await mergeFiles(files)

      setBusy('Memeriksa data melalui backend…')

      const summary: Preview = await send(
        'preview',
        file,
        order,
      )

      setPrepared({
        file,
        order,
        preview: summary,
      })
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Preview gagal.',
      )
    } finally {
      setBusy('')
    }
  }

  async function save() {
    if (!prepared || busy || message) return

    setError('')
    setBusy('Menyimpan data historis ke MySQL…')

    try {
      const result = await send(
        'commit',
        prepared.file,
        prepared.order,
      )

      setMessage(
        result.duplicate
          ? `Data ini sudah tersimpan sebagai impor #${result.id}. Tidak dibuat duplikat.`
          : `${result.assetName} berhasil disimpan sebagai impor #${result.id}.`,
      )

      onImported?.()
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Penyimpanan gagal.',
      )
    } finally {
      setBusy('')
    }
  }

  function exportCsv() {
    if (!prepared) return

    const url = URL.createObjectURL(prepared.file)
    const link = document.createElement('a')

    link.href = url
    link.download = prepared.file.name

    document.body.appendChild(link)
    link.click()
    link.remove()

    window.setTimeout(
      () => URL.revokeObjectURL(url),
      1000,
    )
  }

  return (
    <div className="hd-page" aria-busy={!!busy}>
      <ol className="hd-steps" aria-label="Tahapan impor">
        {[
          'Pilih file',
          'Periksa data',
          'Simpan data',
        ].map((label, index) => (
          <li
            key={label}
            className={
              currentStep >= index + 1 ? 'is-active' : ''
            }
            aria-current={
              currentStep === index + 1
                ? 'step'
                : undefined
            }
          >
            <span>
              {currentStep > index + 1 ? '✓' : index + 1}
            </span>
            {label}
          </li>
        ))}
      </ol>

      <div className="hd-layout">
        <section
          className="hd-card"
          aria-labelledby="hd-upload-title"
        >
          <header className="hd-card-header">
            <div>
              <span className="hd-eyebrow">
                SUMBER DATA
              </span>
              <h3 id="hd-upload-title">
                Impor data kompresor
              </h3>
              <p>
                Pilih satu atau beberapa bagian file dari
                unit Centac yang sama.
              </p>
            </div>
            <span className="hd-badge">CSV / XLS</span>
          </header>

          <div className="hd-card-body">
            <label
              className={`hd-dropzone ${
                dragging ? 'is-dragging' : ''
              } ${busy ? 'is-disabled' : ''}`}
              onDragOver={(event) => {
                event.preventDefault()
                if (!busy) setDragging(true)
              }}
              onDragLeave={(event) => {
                if (
                  !event.currentTarget.contains(
                    event.relatedTarget as Node | null,
                  )
                ) {
                  setDragging(false)
                }
              }}
              onDrop={(event) => {
                event.preventDefault()
                setDragging(false)
                addFiles(
                  Array.from(event.dataTransfer.files),
                )
              }}
            >
              <input
                className="hd-file-input"
                type="file"
                accept=".csv,.xls"
                multiple
                disabled={!!busy}
                aria-label="Pilih file data Centac"
                onChange={(event) => {
                  addFiles(
                    Array.from(event.target.files ?? []),
                  )
                  event.target.value = ''
                }}
              />

              <span
                className="hd-upload-icon"
                aria-hidden="true"
              >
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 16V3m-5 5 5-5 5 5M4 16v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" />
                </svg>
              </span>

              <strong>Tarik file ke sini</strong>
              <span>
                atau klik untuk memilih file dari komputer
              </span>

              <span className="hd-select-file">
                {files.length
                  ? '+ Tambah file'
                  : 'Pilih file'}
              </span>

              <small>
                CSV atau XLS tabel HTML hasil ekspor Centac
              </small>
            </label>

            {files.length > 0 && (
              <div className="hd-file-section">
                <div className="hd-file-heading">
                  <strong>
                    {files.length} file dipilih
                    <span>
                      {' '}· {sizeLabel(totalBytes)}
                    </span>
                  </strong>

                  <button
                    type="button"
                    className="hd-text-button"
                    disabled={!!busy}
                    onClick={() => {
                      setFiles([])
                      clearPreview()
                    }}
                  >
                    Kosongkan pilihan
                  </button>
                </div>

                <ul
                  className="hd-file-list"
                  aria-label="File yang akan diimpor"
                >
                  {files.map((file, index) => (
                    <li
                      key={`${file.name}-${file.size}-${file.lastModified}`}
                    >
                      <span className="hd-file-type">
                        {file.name
                          .split('.')
                          .pop()
                          ?.toUpperCase()}
                      </span>

                      <div className="hd-file-info">
                        <strong title={file.name}>
                          {file.name}
                        </strong>
                        <small>
                          {sizeLabel(file.size)}
                        </small>
                      </div>

                      <button
                        type="button"
                        className="hd-remove"
                        disabled={!!busy}
                        aria-label={`Keluarkan ${file.name} dari pilihan`}
                        title="Keluarkan dari pilihan"
                        onClick={() => removeFile(index)}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="hd-date-field">
              <label htmlFor="hd-date-order">
                Format tanggal pada file
              </label>

              <select
                id="hd-date-order"
                value={order}
                disabled={!!busy}
                aria-describedby="hd-date-example"
                onChange={(event) => {
                  setOrder(event.target.value as Order)
                  clearPreview()
                }}
              >
                <option value="mdy">
                  Bulan / Hari / Tahun (MDY)
                </option>
                <option value="dmy">
                  Hari / Bulan / Tahun (DMY)
                </option>
              </select>

              <small id="hd-date-example">
                {order === 'mdy'
                  ? 'Contoh: 10/01/2026 dibaca sebagai 1 Oktober 2026.'
                  : 'Contoh: 10/01/2026 dibaca sebagai 10 Januari 2026.'}
              </small>
            </div>

            <div className="hd-actions">
              <p>
                Periksa hasil terlebih dahulu sebelum
                menyimpan.
              </p>

              <button
                type="button"
                className="hd-button hd-primary"
                disabled={!files.length || !!busy}
                onClick={preview}
              >
                {busy
                  ? 'Sedang diproses…'
                  : 'Periksa data →'}
              </button>
            </div>
          </div>
        </section>

        <aside
          className="hd-card hd-guide"
          aria-labelledby="hd-guide-title"
        >
          <span className="hd-eyebrow">
            PANDUAN SINGKAT
          </span>
          <h3 id="hd-guide-title">
            Satu unit, beberapa file
          </h3>
          <p>
            Data yang terbagi menjadi beberapa bagian
            dapat dipilih sekaligus.
          </p>

          <div className="hd-example">
            <strong>Contoh: Centac 15</strong>
            <span>sac15_pt1.xls</span>
            <span>sac15_pt2.xls</span>
            <span>sac15_pt3.xls</span>
            <small>
              Digabungkan berdasarkan waktu dan tag sensor.
            </small>
          </div>

          <ul>
            <li>
              Pilih file dari satu kompresor untuk setiap
              proses impor.
            </li>
            <li>
              Sesuaikan format tanggal dengan isi file
              sumber.
            </li>
            <li>
              Periksa unit, periode, dan daftar sensor
              sebelum menyimpan.
            </li>
          </ul>

          <div className="hd-guide-note">
            <strong>
              Kapan data masuk ke dashboard?
            </strong>
            <p>
              Setelah disimpan, buka Overview atau Process
              &amp; trends dan pilih tanggal sesuai periode
              data.
            </p>
          </div>
        </aside>
      </div>

      {busy && (
        <div
          className="hd-notice hd-notice-info"
          role="status"
        >
          <span
            className="hd-spinner"
            aria-hidden="true"
          />
          <div>
            <strong>{busy}</strong>
            <p>
              Tunggu hingga selesai. File besar membutuhkan
              waktu lebih lama.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div
          className="hd-notice hd-notice-error"
          role="alert"
        >
          <div>
            <strong>Proses belum berhasil</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      {message && (
        <div
          className="hd-notice hd-notice-success"
          role="status"
        >
          <span aria-hidden="true">✓</span>
          <div>
            <strong>Data tersedia di database</strong>
            <p>{message}</p>
          </div>
        </div>
      )}

      {prepared && (
        <section
          className="hd-card"
          aria-labelledby="hd-preview-title"
        >
          <header className="hd-card-header">
            <div>
              <span className="hd-eyebrow">
                HASIL PEMERIKSAAN
              </span>
              <h3 id="hd-preview-title">
                Ringkasan data impor
              </h3>
              <p>
                {message
                  ? 'Data sudah tersedia di MySQL.'
                  : 'Periksa ringkasan berikut. Data belum disimpan ke MySQL.'}
              </p>
            </div>

            <span className="hd-badge hd-badge-green">
              {message ? 'Tersimpan' : 'Siap disimpan'}
            </span>
          </header>

          <div className="hd-card-body">
            <dl className="hd-summary">
              <div>
                <dt>Unit kompresor</dt>
                <dd>{prepared.preview.assetName}</dd>
              </div>
              <div>
                <dt>File sumber</dt>
                <dd>
                  {files.length}
                  <small>file</small>
                </dd>
              </div>
              <div>
                <dt>Parameter sensor</dt>
                <dd>
                  {prepared.preview.tags.length}
                  <small>tag</small>
                </dd>
              </div>
              <div>
                <dt>Waktu pembacaan</dt>
                <dd>
                  {prepared.preview.rowCount.toLocaleString(
                    'id-ID',
                  )}
                  <small>baris</small>
                </dd>
              </div>
            </dl>

            <div className="hd-period">
              <div>
                <span>Awal periode</span>
                <strong>
                  {prepared.preview.firstTime}
                </strong>
              </div>

              <span
                className="hd-period-arrow"
                aria-hidden="true"
              >
                →
              </span>

              <div>
                <span>Akhir periode</span>
                <strong>
                  {prepared.preview.lastTime}
                </strong>
              </div>
            </div>

            <details className="hd-sensors">
              <summary>
                Lihat {prepared.preview.tags.length}{' '}
                parameter sensor
              </summary>
              <ul>
                {prepared.preview.tags.map((tag) => (
                  <li key={tag}>
                    <code>{tag}</code>
                  </li>
                ))}
              </ul>
            </details>

            <div className="hd-actions">
              <p>
                Ekspor CSV mengunduh hasil gabungan dari
                file pilihan ini.
              </p>

              <div className="hd-button-group">
                <button
                  type="button"
                  className="hd-button hd-secondary"
                  disabled={!!busy}
                  onClick={exportCsv}
                >
                  Ekspor CSV gabungan
                </button>

                <button
                  type="button"
                  className="hd-button hd-primary"
                  disabled={!!busy || !!message}
                  onClick={save}
                >
                  {message
                    ? '✓ Sudah tersimpan'
                    : 'Simpan ke MySQL'}
                </button>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}