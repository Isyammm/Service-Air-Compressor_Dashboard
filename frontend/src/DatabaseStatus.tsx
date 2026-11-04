import { useEffect, useState } from 'react'

type ImportItem = {
  id: number
  assetName: string
  fileName: string
  rowCount: number
}

type Sample = {
  sourceTime: string
  values: (number | null)[]
}

type HistoryResponse = {
  importId: number
  assetName: string
  day: string
  tags: string[]
  truncated: boolean
  data: Sample[]
}

const API_BASE = 'http://127.0.0.1:4000'

const parameters = [
  ['AIR-TEMP-STG1-AI-MS', 'Air Temperature Stage 1'],
  ['AIR-TEMP-STG2-AI-MS', 'Air Temperature Stage 2'],
  ['BRG-DE-TEMP-AI-MS', 'Bearing Temperature DE'],
  ['BRG-NDE-TEMP-AI-MS', 'Bearing Temperature NDE'],
  ['DSCH-PRESSURE-STG1-AI-MS', 'Discharge Pressure Stage 1'],
  ['DSCH-PRESSURE-STG2-AI-MS', 'Discharge Pressure Stage 2'],
  ['CT-INPUT-AI-MS', 'CT Input'],
]

async function readApi<T>(
  path: string,
  signal: AbortSignal,
): Promise<T> {
  const response = await fetch(API_BASE + path, {
    signal,
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`API gagal merespons: HTTP ${response.status}`)
  }

  return response.json() as Promise<T>
}

function getMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Gagal mengambil data.'
}

export default function DatabaseStatus() {
  const [imports, setImports] = useState<ImportItem[]>([])
  const [importId, setImportId] = useState('')
  const [day, setDay] = useState('2026-01-01')
  const [history, setHistory] = useState<HistoryResponse | null>(null)
  const [sampleIndex, setSampleIndex] = useState(0)

  const [listLoading, setListLoading] = useState(true)
  const [dataLoading, setDataLoading] = useState(false)
  const [listError, setListError] = useState('')
  const [dataError, setDataError] = useState('')
  const [reload, setReload] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    setListLoading(true)
    setListError('')

    readApi<{ data: ImportItem[] }>(
      '/api/history/imports',
      controller.signal,
    )
      .then((result) => {
        if (controller.signal.aborted) return

        if (!Array.isArray(result.data)) {
          throw new Error('Format daftar impor tidak sesuai.')
        }

        setImports(result.data)

        setImportId((previous) =>
          result.data.some((item) => String(item.id) === previous)
            ? previous
            : result.data[0]
              ? String(result.data[0].id)
              : '',
        )
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setListError(getMessage(error))
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setListLoading(false)
        }
      })

    return () => controller.abort()
  }, [reload])

  useEffect(() => {
    const controller = new AbortController()

    setHistory(null)
    setSampleIndex(0)
    setDataError('')

    if (!importId || !day) {
      setDataLoading(false)
      return () => controller.abort()
    }

    setDataLoading(true)

    const path =
      `/api/history/${encodeURIComponent(importId)}/samples` +
      `?day=${encodeURIComponent(day)}`

    readApi<HistoryResponse>(path, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return

        const valid =
          Array.isArray(result.tags) &&
          result.tags.every((tag) => typeof tag === 'string') &&
          Array.isArray(result.data) &&
          result.data.every(
            (sample) =>
              sample !== null &&
              typeof sample.sourceTime === 'string' &&
              Array.isArray(sample.values) &&
              sample.values.length === result.tags.length &&
              sample.values.every(
                (value) =>
                  value === null ||
                  (typeof value === 'number' && Number.isFinite(value)),
              ),
          )

        if (!valid) {
          throw new Error('Susunan tag dan nilai sensor tidak sesuai.')
        }

        setHistory(result)
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setDataError(getMessage(error))
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setDataLoading(false)
        }
      })

    return () => controller.abort()
  }, [importId, day, reload])

  const current =
    history &&
    String(history.importId) === importId &&
    history.day === day
      ? history
      : null

  const sample = current?.data[sampleIndex] ?? null
  const loading = listLoading || dataLoading
  const error = listError || dataError

  return (
    <section className="panel database-panel">
      <div className="panel-header">
        <div>
          <h3>Data Historis Kompresor</h3>
          <p className="muted">Sumber: MySQL melalui backend API</p>
        </div>

        <button
          type="button"
          className="secondary-button"
          disabled={loading}
          onClick={() => setReload((value) => value + 1)}
        >
          {loading ? 'Memuat...' : 'Muat ulang'}
        </button>
      </div>

      <div className="database-body">
        <p className="database-notice">
          HISTORICAL — data hasil impor, bukan pembacaan Live.
          Panel ini tidak mengikuti sakelar Demo.
        </p>

        <div className="database-filters">
          <label>
            Kompresor / file impor

            <select
              value={importId}
              disabled={listLoading || imports.length === 0}
              onChange={(event) => setImportId(event.target.value)}
            >
              <option value="" disabled>
                Pilih file
              </option>

              {imports.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.assetName} — {item.fileName} — ID {item.id}
                </option>
              ))}
            </select>
          </label>

          <label>
            Tanggal data

            <input
              type="date"
              value={day}
              onChange={(event) => setDay(event.target.value)}
            />
          </label>
        </div>

        {loading && (
          <p role="status">Memuat data dari database...</p>
        )}

        {error && (
          <p className="database-error" role="alert">
            {error}
          </p>
        )}

        {!listLoading && !listError && imports.length === 0 && (
          <p>Belum ada file impor di database.</p>
        )}

        {!day && <p>Pilih tanggal terlebih dahulu.</p>}

        {!loading && !error && current && (
          <>
            <p className="database-summary">
              <strong>{current.assetName}</strong>
              {' · '}
              {current.data.length.toLocaleString('id-ID')} sampel dimuat
              {' · '}Status operasi belum tersedia
            </p>

            {current.truncated && (
              <p className="database-notice">
                Respons API dibatasi. Belum semua sampel pada tanggal
                ini ditampilkan.
              </p>
            )}

            {current.data.length === 0 ? (
              <p>Tidak ada data pada tanggal yang dipilih.</p>
            ) : (
              <>
                <label className="database-time">
                  Waktu pembacaan dari file sumber

                  <select
                    value={sampleIndex}
                    onChange={(event) =>
                      setSampleIndex(Number(event.target.value))
                    }
                  >
                    {current.data.map((item, index) => (
                      <option
                        key={`${item.sourceTime}-${index}`}
                        value={index}
                      >
                        {item.sourceTime}
                      </option>
                    ))}
                  </select>
                </label>

                {sample && (
                  <div className="database-grid">
                    {parameters.map(([suffix, label]) => {
                      const tagIndex = current.tags.findIndex((tag) =>
                        tag.toUpperCase().endsWith(`-${suffix}`),
                      )

                      const value =
                        tagIndex >= 0 ? sample.values[tagIndex] : null

                      return (
                        <article className="database-reading" key={suffix}>
                          <span>{label}</span>

                          <strong>
                            {typeof value === 'number'
                              ? value.toLocaleString('en-US', {
                                  maximumFractionDigits: 2,
                                })
                              : '—'}
                          </strong>

                          <small>
                            {tagIndex < 0
                              ? 'Tag tidak tersedia'
                              : value === null
                                ? 'Nilai tidak tersedia'
                                : 'Nilai mentah'}
                          </small>
                        </article>
                      )
                    })}
                  </div>
                )}

                <p className="muted database-footnote">
                  Satuan, zona waktu, dan kualitas nilai belum
                  diverifikasi. Nilai nol tetap ditampilkan sebagai nol.
                </p>
              </>
            )}
          </>
        )}
      </div>
    </section>
  )
}