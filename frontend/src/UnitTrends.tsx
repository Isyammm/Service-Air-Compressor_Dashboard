import { useEffect, useMemo, useState } from 'react'
import { ACTIVE_UNIT_NUMBERS } from './fleetConfig'
import InteractiveTrendChart from './InteractiveTrendChart'
import {
  getInstrumentMeta,
  useInstrumentCatalog,
} from './instrument-catalog'
import './UnitTrends.css'

type Props = {
  unitId: string
  day: string
  initialTag?: string
  onUnitChange: (id: string) => void
  onDetail: () => void
  mode?: 'historical' | 'live'

  // Tetap menerima properti lama dari App.tsx.
  demo?: boolean
  imports?: unknown
  snapshots?: unknown
  loading?: boolean
  error?: string
}

type Bounds = {
  unit: number
  first: string | null
  last: string | null
  tags: string[]
}

type Source = {
  id: number
  tags: string[]
  data: {
    sourceTime: string
    values: (number | null)[]
  }[]
}

type RangeResponse = {
  sources: Source[]
}

type Point = {
  time: number
  label: string
  values: Record<string, number | null>
}

type RangeState = {
  key: string
  loading: boolean
  error: string
  sources: Source[]
}

const API = (
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:4000'
).replace(/\/$/, '')

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

const COLORS = [
  '#38bdf8',
  '#a78bfa',
  '#34d399',
  '#fbbf24',
  '#fb7185',
  '#22d3ee',
]

const RANGES = [
  { hours: 1, label: '1 H' },
  { hours: 6, label: '6 H' },
  { hours: 24, label: '24 H' },
  { hours: 168, label: '7 D' },
]

function parseTime(value: string | null): number | null {
  if (!value) return null

  const normalized = value.replace(' ', 'T')
  const result = Date.parse(`${normalized}Z`)

  if (!Number.isFinite(result)) return null

  return new Date(result).toISOString().slice(0, 19) === normalized
    ? result
    : null
}

function sourceTime(value: number): string {
  return new Date(value)
    .toISOString()
    .slice(0, 19)
    .replace('T', ' ')
}

function dateEnd(day: string): number | null {
  const start = parseTime(`${day} 00:00:00`)
  return start === null ? null : start + DAY
}

async function request<T>(
  path: string,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    signal,
    cache: 'no-store',
  })

  const body = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(
      body?.message ||
        `Permintaan gagal: HTTP ${response.status}.`,
    )
  }

  if (!body) {
    throw new Error('Respons API tidak valid.')
  }

  return body as T
}

export default function UnitTrends(props: Props) {
  if (props.mode === 'live') {
    return (
      <section className="panel sac-trends">
        <h3>Process & Trends · Live</h3>
        <p className="muted">
          Grafik Live belum terhubung ke sumber data.
        </p>
      </section>
    )
  }

  return (
    <HistoricalTrends
      key={`${props.unitId}:${props.day}`}
      {...props}
    />
  )
}

function HistoricalTrends({
  unitId,
  day,
  initialTag = '',
  onUnitChange,
  onDetail,
}: Props) {
  const unit = Number(unitId.replace(/\D/g, ''))
  const catalog = useInstrumentCatalog(true)

  const [hours, setHours] = useState(24)
  const [end, setEnd] = useState<number | null>(() => dateEnd(day))
  const [bounds, setBounds] = useState<Bounds | null>(null)
  const [boundsLoading, setBoundsLoading] = useState(true)
  const [boundsError, setBoundsError] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [hidden, setHidden] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [revision, setRevision] = useState(0)
  const [latestLoading, setLatestLoading] = useState(false)
  const [actionError, setActionError] = useState('')

  const [range, setRange] = useState<RangeState>({
    key: '',
    loading: false,
    error: '',
    sources: [],
  })

  const duration = hours * HOUR
  const start = end === null ? null : end - duration

  const rangeKey =
    start === null || end === null
      ? ''
      : `${unit}:${start}:${end}:${revision}`

  useEffect(() => {
    const controller = new AbortController()

    async function loadBounds() {
      setBoundsLoading(true)
      setBoundsError('')

      try {
        const result = await request<Bounds>(
          `/api/trends/${unit}/bounds`,
          controller.signal,
        )

        if (
          !Array.isArray(result.tags) ||
          !result.tags.every((tag) => typeof tag === 'string')
        ) {
          throw new Error('Daftar tag dari API tidak valid.')
        }

        if (controller.signal.aborted) return

        setBounds(result)

        const preferred = initialTag.trim().toUpperCase()
        const fullTag = preferred.startsWith('U-SAC')
          ? preferred
          : `U-SAC${unit}-${preferred}`

        setSelected(
          result.tags.includes(fullTag)
            ? [fullTag]
            : result.tags.slice(0, 1),
        )

        const latest = parseTime(result.last)

        if (latest !== null) {
          setEnd((current) => current ?? latest + 1000)
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setBoundsError(
            error instanceof Error
              ? error.message
              : 'Gagal membaca rentang data.',
          )
        }
      } finally {
        if (!controller.signal.aborted) {
          setBoundsLoading(false)
        }
      }
    }

    void loadBounds()
    return () => controller.abort()
  }, [unit, initialTag])

  useEffect(() => {
    if (start === null || end === null || !rangeKey) return

    const controller = new AbortController()
    const params = new URLSearchParams({
      from: sourceTime(start).replace(' ', 'T'),
      to: sourceTime(end).replace(' ', 'T'),
    })

    setRange({
      key: rangeKey,
      loading: true,
      error: '',
      sources: [],
    })

    async function loadRange() {
      try {
        const result = await request<RangeResponse>(
          `/api/trends/${unit}/range?${params}`,
          controller.signal,
        )

        if (!Array.isArray(result.sources)) {
          throw new Error('Struktur sampel dari API tidak valid.')
        }

        if (!controller.signal.aborted) {
          setRange({
            key: rangeKey,
            loading: false,
            error: '',
            sources: result.sources,
          })
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setRange({
            key: rangeKey,
            loading: false,
            error:
              error instanceof Error
                ? error.message
                : 'Gagal memuat sampel.',
            sources: [],
          })
        }
      }
    }

    void loadRange()
    return () => controller.abort()
  }, [unit, start, end, rangeKey])

  const currentRange = range.key === rangeKey

  const loading =
    boundsLoading ||
    (Boolean(rangeKey) && (!currentRange || range.loading))

  const points = useMemo(() => {
    if (!currentRange) return []

    const merged = new Map<number, Point>()
    const sources = [...range.sources].sort(
      (a, b) => b.id - a.id,
    )

    for (const source of sources) {
      for (const sample of source.data) {
        const time = parseTime(sample.sourceTime)
        if (time === null) continue

        let point = merged.get(time)

        if (!point) {
          point = {
            time,
            label: sample.sourceTime,
            values: {},
          }

          merged.set(time, point)
        }

        source.tags.forEach((rawTag, index) => {
          const tag = rawTag.trim().toUpperCase()

          // Prioritas impor terbaru diterapkan per tag.
          if (
            Object.prototype.hasOwnProperty.call(
              point.values,
              tag,
            )
          ) {
            return
          }

          const raw = sample.values[index]

          point.values[tag] =
            typeof raw === 'number' &&
            Number.isFinite(raw) &&
            raw > -9000
              ? raw
              : null
        })
      }
    }

    return [...merged.values()].sort(
      (a, b) => a.time - b.time,
    )
  }, [range.sources, currentRange])

  function meta(tag: string) {
    return getInstrumentMeta(tag, catalog.catalog)
  }

  const visible = selected.filter(
    (tag) => !hidden.includes(tag),
  )

  const groups = new Map<string, string[]>()

  for (const tag of visible) {
    const info = meta(tag)

    const unknown =
      !info.unit ||
      info.unit === 'RAW' ||
      info.unit === 'Belum ditentukan'

    const key = unknown ? `unknown:${tag}` : info.unit

    groups.set(key, [...(groups.get(key) ?? []), tag])
  }

  const filteredTags = (bounds?.tags ?? []).filter((tag) => {
    const text = `${tag} ${meta(tag).label}`.toLowerCase()
    return text.includes(search.trim().toLowerCase())
  })

  const first = parseTime(bounds?.first ?? null)
  const last = parseTime(bounds?.last ?? null)
  const latestEnd = last === null ? null : last + 1000

  const canBack =
    !loading &&
    !latestLoading &&
    start !== null &&
    first !== null &&
    start > first

  const canForward =
    !loading &&
    !latestLoading &&
    end !== null &&
    latestEnd !== null &&
    end < latestEnd

  const rangeLabel =
    hours === 168 ? '7 hari' : `${hours} jam`

  async function goLatest() {
    setLatestLoading(true)
    setActionError('')

    try {
      const result = await request<Bounds>(
        `/api/trends/${unit}/bounds`,
      )

      if (!Array.isArray(result.tags)) {
        throw new Error('Daftar tag dari API tidak valid.')
      }

      const latest = parseTime(result.last)
      setBounds(result)

      if (latest === null) {
        setActionError(
          'Belum ada sampel tersimpan untuk unit ini.',
        )
        return
      }

      setEnd(latest + 1000)
      setRevision((value) => value + 1)
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : 'Gagal membaca data terbaru.',
      )
    } finally {
      setLatestLoading(false)
    }
  }

  function toggleTag(tag: string) {
    setSelected((previous) =>
      previous.includes(tag)
        ? previous.filter((item) => item !== tag)
        : previous.length < 6
          ? [...previous, tag]
          : previous,
    )

    setHidden((previous) =>
      previous.filter((item) => item !== tag),
    )
  }

  function toggleLegend(tag: string) {
  setHidden((previous) => {
    // Tampilkan kembali kurva yang disembunyikan.
    if (previous.includes(tag)) {
      return previous.filter((item) => item !== tag)
    }

    // Pertahankan setidaknya satu kurva tetap terlihat.
    const visibleCount = selected.filter(
      (item) => !previous.includes(item),
    ).length

    if (visibleCount <= 1) return previous

    return [...previous, tag]
  })
}

  return (
    <section className="panel sac-trends">
      <div className="panel-header">
        <div>
          <h3>Process & Trends · {unitId}</h3>
          <p className="muted">
            Data historis · {rangeLabel} ·{' '}
            {selected.length}/6 parameter
          </p>
        </div>

        <button
          type="button"
          className="secondary-button"
          onClick={onDetail}
        >
          Detail unit
        </button>
      </div>

      <div className="history-toolbar">
        <label>
          Kompresor
          <select
            className="history-select"
            value={unitId}
            onChange={(event) =>
              onUnitChange(event.target.value)
            }
          >
            {ACTIVE_UNIT_NUMBERS.map((number) => (
              <option key={number} value={`SAC#${number}`}>
                SAC#{number}
              </option>
            ))}
          </select>
        </label>

        <label>
          Tanggal akhir rentang
          <input
            type="date"
            className="history-select"
            value={
              end === null
                ? ''
                : sourceTime(end - 1).slice(0, 10)
            }
            onChange={(event) => {
              const next = dateEnd(event.target.value)
              if (next !== null) setEnd(next)
            }}
          />
        </label>

        <div className="trend-range-tabs">
          {RANGES.map((item) => (
            <button
              key={item.hours}
              type="button"
              className="secondary-button"
              aria-pressed={hours === item.hours}
              onClick={() => setHours(item.hours)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {start !== null && end !== null && (
        <p className="muted">
          {sourceTime(start)} sampai sebelum{' '}
          {sourceTime(end)}. Waktu mengikuti sumber data.
        </p>
      )}

      <details className="trend-picker">
        <summary>
          Parameter grafik · {selected.length} dipilih
        </summary>

        <input
          className="history-select"
          type="search"
          placeholder="Cari nama parameter atau tag…"
          aria-label="Cari parameter"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <div className="trend-parameter-grid">
          {filteredTags.map((tag) => {
            const info = meta(tag)
            const checked = selected.includes(tag)

            return (
              <label
                key={tag}
                title={tag}
                style={{
                  display: 'flex',
                  cursor: 'pointer',
                  border: '1px solid #304357',
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={!checked && selected.length >= 6}
                  onChange={() => toggleTag(tag)}
                />

                <span style={{ overflowWrap: 'anywhere' }}>
                  {info.label}
                  <small style={{ display: 'block' }}>
                    {info.unit}
                  </small>
                </span>
              </label>
            )
          })}
        </div>

        {!boundsLoading && filteredTags.length === 0 && (
          <p className="muted">
            Tidak ada parameter yang cocok.
          </p>
        )}
      </details>

      <div className="trend-legend">
        {selected.map((tag, index) => (
          <button
            key={tag}
            type="button"
            className="secondary-button"
            aria-pressed={!hidden.includes(tag)}
            onClick={() => toggleLegend(tag)}
            title={tag}
            style={{
              color: COLORS[index],
              opacity: hidden.includes(tag) ? 0.4 : 1,
            }}
          >
            {index % 2 ? '┄' : '━'} {meta(tag).label}
          </button>
        ))}
      </div>

      {boundsError && <p role="alert">{boundsError}</p>}
      {catalog.error && <p role="alert">{catalog.error}</p>}
      {actionError && <p role="alert">{actionError}</p>}

      {loading ? (
        <p role="status">Memuat grafik historis…</p>
      ) : currentRange && range.error ? (
        <p role="alert">{range.error}</p>
      ) : selected.length === 0 ? (
        <p role="status">
          Pilih setidaknya satu parameter.
        </p>
      ) : visible.length === 0 ? (
        <p role="status">
          Semua kurva disembunyikan. Klik legenda untuk
          menampilkan kembali.
        </p>
      ) : points.length === 0 ? (
        <p role="status">
          Tidak ada sampel pada rentang ini. Gunakan Ke Data
          Terbaru atau pilih tanggal lain.
        </p>
      ) : start !== null && end !== null ? (
        <>
          {[...groups.entries()].map(([group, tags]) => (
            <InteractiveTrendChart
              key={group}
              points={points}
              start={start}
              end={end}
              title={
                group.startsWith('unknown:')
                  ? 'Satuan belum ditentukan'
                  : group
              }
              series={tags.map((tag) => {
                const index = selected.indexOf(tag)
                const info = meta(tag)

                return {
                  tag,
                  label: info.label,
                  unit: info.unit,
                  color: COLORS[index],
                  dashed: index % 2 !== 0,
                }
              })}
            />
          ))}
        </>
      ) : null}

      <div
        className="trend-navigation"
        style={{
          display: 'flex',
          justifyContent: 'center',
          flexWrap: 'wrap',
          borderTop: '1px solid #2a3c50',
        }}
      >
        <button
          type="button"
          className="secondary-button"
          disabled={!canBack}
          onClick={() => {
            if (end !== null) setEnd(end - duration)
          }}
        >
          ← Mundur {rangeLabel}
        </button>

        <button
          type="button"
          className="secondary-button"
          disabled={!canForward}
          onClick={() => {
            if (end !== null && latestEnd !== null) {
              setEnd(Math.min(end + duration, latestEnd))
            }
          }}
        >
          Maju {rangeLabel} →
        </button>

        <button
          type="button"
          className="secondary-button"
          disabled={latestLoading || loading}
          onClick={() => void goLatest()}
        >
          {latestLoading
            ? 'Memeriksa…'
            : 'Ke Data Terbaru'}
        </button>
      </div>

      <p
        className="muted"
        style={{ textAlign: 'center', marginTop: 12 }}
      >
        Data terbaru mengacu pada sampel terakhir di database.
        Pemilihan tanggal menetapkan akhir rentang pada
        pukul 00:00 hari berikutnya.
      </p>
    </section>
  )
}