import { useState } from 'react'
import type { Compressor } from './useDemoData'

const categories = [
  'Trip',
  'High High',
  'High',
  'Low Low',
  'Low',
] as const

type Category = (typeof categories)[number]
type EventStatus = 'Active' | 'Cleared'

type AlarmEvent = {
  id: string
  timestamp: number
  unit: string
  tag: string
  message: string
  category: Category
  status: EventStatus
}

type AlarmsEventsProps = {
  demoMode: boolean
  compressors?: Compressor[]
  timestamp?: number
}

function categoryClass(category: Category) {
  return `alarm-category-${category.toLowerCase().replace(/ /g, '-')}`
}

function formatEventTime(timestamp: number) {
  const date = new Date(timestamp)

  return {
    time: date.toLocaleTimeString('en-GB', {
      timeZone: 'Asia/Makassar',
    }),
    date: date.toLocaleDateString('id-ID', {
      timeZone: 'Asia/Makassar',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }),
  }
}

function AlarmCategoryIcon({ category }: { category: Category }) {
  if (category === 'Trip') {
    return (
      <svg className="alarm-cat-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    )
  }
  if (category === 'High High') {
    return (
      <svg className="alarm-cat-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="17 11 12 6 7 11" />
        <polyline points="17 18 12 13 7 18" />
      </svg>
    )
  }
  if (category === 'High') {
    return (
      <svg className="alarm-cat-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="18 15 12 9 6 15" />
      </svg>
    )
  }
  if (category === 'Low Low') {
    return (
      <svg className="alarm-cat-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="7 13 12 18 17 13" />
        <polyline points="7 6 12 11 17 6" />
      </svg>
    )
  }
  // Low
  return (
    <svg className="alarm-cat-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function DemoAlarms({
  compressors,
  timestamp,
}: {
  compressors: Compressor[]
  timestamp?: number
}) {
  const [startedAt] = useState(() => timestamp ?? Date.now())
  const [category, setCategory] = useState<'All' | Category>('All')
  const [status, setStatus] = useState<'All' | EventStatus>('All')
  const [search, setSearch] = useState('')

  // Trip aktif mengikuti status fleet.
  const tripEvents: AlarmEvent[] = compressors
    .filter((unit) => unit.status === 'Trip')
    .map((unit) => ({
      id: `${unit.id}-trip`,
      timestamp: startedAt,
      unit: unit.id,
      tag: `${unit.id.replace('#', '')}.TRIP`,
      message: 'Unit Trip pada proteksi kompresor. Periksa panel lokal & reset.',
      category: 'Trip',
      status: 'Active',
    }))

  // Riwayat ilustrasi untuk menunjukkan kategori alarm.
  // Bukan hasil evaluasi nilai sensor atau ambang perusahaan.
  const limitEvents: AlarmEvent[] = (
    ['High High', 'High', 'Low Low', 'Low'] as const
  ).map((item, index) => ({
    id: `DEMO-LIMIT-${index}`,
    timestamp: startedAt - (index + 1) * 60_000,
    unit: `SAC#${index + 1}`,
    tag: `DEMO.SAC${index + 1}.LIMIT`,
    message:
      `Riwayat kejadian ambang batas ${item}; parameter telah kembali normal. ` +
      'Kondisi pulih.',
    category: item,
    status: 'Cleared',
  }))

  const events = [...tripEvents, ...limitEvents].sort(
    (first, second) => second.timestamp - first.timestamp,
  )

  const query = search.trim().toLowerCase()

  const filteredEvents = events.filter((event) => {
    const categoryMatches =
      category === 'All' || event.category === category

    const statusMatches =
      status === 'All' || event.status === status

    const searchableText = [
      event.unit,
      event.tag,
      event.message,
      event.category,
    ]
      .join(' ')
      .toLowerCase()

    return (
      categoryMatches &&
      statusMatches &&
      searchableText.includes(query)
    )
  })

  function resetFilters() {
    setCategory('All')
    setStatus('All')
    setSearch('')
  }

  function handleCategoryCardClick(cat: Category) {
    setCategory((prev) => (prev === cat ? 'All' : cat))
  }

  return (
    <>
      {/* 5 ALARM SEVERITY / CATEGORY KPI CARDS */}
      <section
        className="metrics alarm-category-metrics"
        aria-label="Jumlah alarm aktif per kategori"
      >
        {categories.map((item) => {
          const activeCount = events.filter(
            (event) =>
              event.category === item && event.status === 'Active',
          ).length

          const clearedCount = events.filter(
            (event) =>
              event.category === item && event.status === 'Cleared',
          ).length

          const isSelected = category === item
          const hasActive = activeCount > 0

          return (
            <article
              className={`metric-card alarm-card alarm-card-${item.toLowerCase().replace(/ /g, '-')} ${isSelected ? 'is-selected' : ''
                } ${hasActive ? 'has-active-alarm' : ''}`}
              key={item}
              onClick={() => handleCategoryCardClick(item)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleCategoryCardClick(item)
                }
              }}
              title={`Klik untuk filter tabel ke kategori ${item}`}
              role="button"
              tabIndex={0}
            >
              <div className="alarm-card-header">
                <span className="alarm-card-title">{item}</span>
                <span className="alarm-cat-icon-wrap" aria-hidden="true">
                  <AlarmCategoryIcon category={item} />
                </span>
              </div>

              <div className="alarm-card-body">
                <div className="alarm-count-row">
                  <strong className={`alarm-number ${hasActive ? 'alarm-active-num' : 'alarm-zero-num'}`}>
                    {activeCount}
                  </strong>
                  <span className={`alarm-pill ${hasActive ? 'alarm-pill-active' : 'alarm-pill-idle'}`}>
                    {hasActive && <span className="alarm-pulse-dot" aria-hidden="true" />}
                    {hasActive ? 'Active' : 'Normal'}
                  </span>
                </div>
              </div>

              <div className="alarm-card-footer">
                <span className="alarm-cleared-text">
                  <svg className="cleared-check-icon" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                    <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z" />
                  </svg>
                  <span>{clearedCount} Cleared</span>
                </span>
                {isSelected && <span className="filter-active-hint">Filtering</span>}
              </div>
            </article>
          )
        })}
      </section>

      {/* EVENT & ALARM LOG TABLE */}
      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>Event & Alarm Log</h3>
            <p className="alarm-subtitle">
              Riwayat kejadian alarm proteksi dan ambang batas sensor kompresor
            </p>
          </div>
          <span className="mode-badge demo">SIMULASI / DEMO</span>
        </div>

        <div className="alarm-filters">
          <div className="alarm-field">
            <label htmlFor="alarm-category">Filter Kategori</label>

            <select
              id="alarm-category"
              value={category}
              onChange={(event) =>
                setCategory(event.target.value as 'All' | Category)
              }
            >
              <option value="All">Semua Kategori (5)</option>
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="alarm-field">
            <label htmlFor="alarm-status">Status Kejadian</label>

            <select
              id="alarm-status"
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as 'All' | EventStatus)
              }
            >
              <option value="All">Semua Status</option>
              <option value="Active">Active (Aktif)</option>
              <option value="Cleared">Cleared (Pulih)</option>
            </select>
          </div>

          <div className="alarm-field alarm-search">
            <label htmlFor="alarm-search">
              Cari Unit, Tag, atau Pesan
            </label>

            <input
              id="alarm-search"
              type="search"
              value={search}
              placeholder="Contoh: SAC#12, TRIP, atau Pressure..."
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <button
            type="button"
            className="secondary-button alarm-reset"
            onClick={resetFilters}
          >
            Reset Filter
          </button>
        </div>

        <div className="alarm-result-count" role="status">
          Menampilkan <strong>{filteredEvents.length}</strong> dari {events.length} kejadian
          {category !== 'All' ? ` (Kategori: ${category})` : ''}
          {status !== 'All' ? ` (Status: ${status})` : ''}.
        </div>

        <div
          className="alarm-table-scroll"
          role="region"
          aria-label="Tabel alarm dan event"
          tabIndex={0}
        >
          <table className="alarm-table">
            <caption className="visually-hidden">
              Catatan alarm demo.
            </caption>

            <thead>
              <tr>
                <th scope="col">Time</th>
                <th scope="col">Unit</th>
                <th scope="col">Tag ID</th>
                <th scope="col">Message</th>
                <th scope="col">Category</th>
                <th scope="col">Status</th>
              </tr>
            </thead>

            <tbody>
              {filteredEvents.map((event) => {
                const displayTime = formatEventTime(event.timestamp)

                return (
                  <tr key={event.id}>
                    <td>
                      <time
                        className="alarm-time"
                        dateTime={new Date(event.timestamp).toISOString()}
                      >
                        <strong>{displayTime.time}</strong>
                        <span>{displayTime.date}</span>
                      </time>
                    </td>

                    <td className="alarm-unit">
                      <strong>{event.unit}</strong>
                    </td>

                    <td>
                      <code className="alarm-tag">{event.tag}</code>
                    </td>

                    <td className="alarm-message">{event.message}</td>

                    <td>
                      <span
                        className={`severity-badge ${categoryClass(
                          event.category,
                        )}`}
                      >
                        {event.category}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`event-status event-${event.status.toLowerCase()}`}
                      >
                        <span className="equipment-dot" aria-hidden="true" />
                        {event.status}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {filteredEvents.length === 0 && (
          <div className="empty-state alarm-empty">
            <span className="empty-symbol" aria-hidden="true">◇</span>
            <h3>Tidak ada kejadian yang sesuai</h3>
            <p>Ubah kata kunci pencarian atau klik tombol Reset Filter di atas.</p>
          </div>
        )}

        <div className="alarm-table-footer">
          <span>Urutan: kejadian terbaru terlebih dahulu</span>
          <span>
            Kartu ringkasan atas menghitung seluruh alarm aktif terlepas dari filter tabel di bawah.
          </span>
        </div>
      </section>

      <p className="alarm-note">
        <strong>Catatan SCADA:</strong> Alarm kategori Trip aktif mencerminkan status unit kompresor di armada plant.
        Status Cleared menandakan parameter telah pulih kembali dalam ambang batas aman operasional.
      </p>
    </>
  )
}

export default function AlarmsEvents({
  demoMode,
  compressors = [],
  timestamp,
}: AlarmsEventsProps) {
  if (demoMode || compressors.length > 0) {
    return (
      <DemoAlarms
        compressors={compressors}
        timestamp={timestamp}
      />
    )
  }

  return (
    <>
      <section
        className="metrics alarm-category-metrics"
        aria-label="Status alarm belum tersedia"
      >
        {categories.map((item) => (
          <article
            className={`metric-card alarm-card alarm-card-${item.toLowerCase().replace(/ /g, '-')}`}
            key={item}
          >
            <div className="alarm-card-header">
              <span className="alarm-card-title">{item}</span>
              <span className="alarm-cat-icon-wrap" aria-hidden="true">
                <AlarmCategoryIcon category={item} />
              </span>
            </div>

            <div className="alarm-card-body">
              <div className="alarm-count-row">
                <strong className="alarm-number alarm-zero-num">—</strong>
                <span className="alarm-pill alarm-pill-idle">ACTIVE</span>
              </div>
            </div>

            <div className="alarm-card-footer">
              <span className="alarm-cleared-text">Menunggu data aktual</span>
            </div>
          </article>
        ))}
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>Event & Alarm Log</h3>
            <span className="eyebrow">LIVE / BELUM TERHUBUNG</span>
          </div>
        </div>

        <div className="empty-state">
          <span className="empty-symbol" aria-hidden="true">◇</span>
          <h3>Status alarm belum tersedia</h3>
          <p>
            Sumber Live belum dikonfigurasi.
            Jumlah alarm belum diketahui.
          </p>
        </div>
      </section>
    </>
  )
}
