import { useState } from 'react'

type Severity = 'Critical' | 'Warning' | 'Info'
type EventStatus = 'Active' | 'Cleared' | 'Recorded'

type AlarmEvent = {
  id: string
  timestamp: string
  unit: string
  tag: string
  message: string
  severity: Severity
  status: EventStatus
}

type SeverityFilter = 'All' | Severity
type StatusFilter = 'All' | EventStatus

const demoEvents: AlarmEvent[] = [
  {
    id: 'DEMO-001',
    timestamp: '2026-10-26T10:02:30+08:00',
    unit: 'SAC#12',
    tag: 'SAC12.TRIP',
    message: 'Contoh kondisi compressor trip.',
    severity: 'Critical',
    status: 'Active',
  },
  {
    id: 'DEMO-002',
    timestamp: '2026-10-26T10:01:10+08:00',
    unit: 'SAC#14',
    tag: 'SAC14.COMM',
    message: 'Contoh gangguan akuisisi; data unit tidak tersedia.',
    severity: 'Warning',
    status: 'Active',
  },
  {
    id: 'DEMO-003',
    timestamp: '2026-10-26T10:00:45+08:00',
    unit: 'SAC#15',
    tag: 'SAC15.COMM',
    message: 'Contoh gangguan akuisisi; data unit tidak tersedia.',
    severity: 'Warning',
    status: 'Active',
  },
  {
    id: 'DEMO-004',
    timestamp: '2026-10-26T09:58:20+08:00',
    unit: 'SAC#5',
    tag: 'SAC05.STATE',
    message: 'Contoh perubahan status operasi menjadi Unloaded.',
    severity: 'Info',
    status: 'Recorded',
  },
  {
    id: 'DEMO-005',
    timestamp: '2026-10-26T09:56:10+08:00',
    unit: 'SAC#8',
    tag: 'SAC08.COMM',
    message: 'Contoh gangguan komunikasi sebelumnya telah pulih.',
    severity: 'Warning',
    status: 'Cleared',
  },
  {
    id: 'DEMO-006',
    timestamp: '2026-10-26T09:54:00+08:00',
    unit: 'SAC#1',
    tag: 'SAC01.STATE',
    message: 'Contoh perubahan status operasi menjadi Loaded.',
    severity: 'Info',
    status: 'Recorded',
  },
]

function formatEventTime(timestamp: string) {
  const date = new Date(timestamp)

  return {
    date: date.toLocaleDateString('id-ID', {
      timeZone: 'Asia/Makassar',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }),
    time: date.toLocaleTimeString('en-GB', {
      timeZone: 'Asia/Makassar',
    }),
  }
}

function DemoAlarms() {
  const [severityFilter, setSeverityFilter] =
    useState<SeverityFilter>('All')

  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>('All')

  const [search, setSearch] = useState('')

  // Urutkan dari kejadian terbaru.
  const sortedEvents = [...demoEvents].sort(
    (first, second) =>
      Date.parse(second.timestamp) - Date.parse(first.timestamp),
  )

  const query = search.trim().toLowerCase()

  const filteredEvents = sortedEvents.filter((event) => {
    const severityMatches =
      severityFilter === 'All' ||
      event.severity === severityFilter

    const statusMatches =
      statusFilter === 'All' ||
      event.status === statusFilter

    const searchableText = [
      event.id,
      event.unit,
      event.tag,
      event.message,
    ]
      .join(' ')
      .toLowerCase()

    const searchMatches = searchableText.includes(query)

    return severityMatches && statusMatches && searchMatches
  })

  // Ringkasan selalu dihitung dari seluruh data demo,
  // bukan hanya baris yang lolos filter tabel.
  const summary = {
    active: demoEvents.filter(
      (event) =>
        event.status === 'Active' &&
        event.severity !== 'Info',
    ).length,

    critical: demoEvents.filter(
      (event) =>
        event.status === 'Active' &&
        event.severity === 'Critical',
    ).length,

    warning: demoEvents.filter(
      (event) =>
        event.status === 'Active' &&
        event.severity === 'Warning',
    ).length,

    recorded: demoEvents.filter(
      (event) => event.status === 'Recorded',
    ).length,
  }

  function resetFilters() {
    setSeverityFilter('All')
    setStatusFilter('All')
    setSearch('')
  }

  return (
    <>
      <section
        className="metrics"
        aria-label="Ringkasan alarm dan event demo"
      >
        {[
          {
            title: 'Active Alarms',
            value: summary.active,
            tone: 'alarm-value-warning',
            description: 'Critical dan warning yang masih aktif',
          },
          {
            title: 'Critical Active',
            value: summary.critical,
            tone: 'alarm-value-critical',
            description: 'Contoh alarm tingkat critical',
          },
          {
            title: 'Warning Active',
            value: summary.warning,
            tone: 'alarm-value-warning',
            description: 'Contoh alarm tingkat warning',
          },
          {
            title: 'Recorded Events',
            value: summary.recorded,
            tone: 'alarm-value-info',
            description: 'Catatan informasi operasi',
          },
        ].map((metric) => (
          <article className="metric-card" key={metric.title}>
            <h3>{metric.title}</h3>

            <div className="metric-reading">
              <strong className={metric.tone}>
                {metric.value}
              </strong>
              <span>records</span>
            </div>

            <p className="muted">{metric.description}</p>
          </article>
        ))}
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>Event & alarm log</h3>
            <p className="alarm-subtitle">
              Data contoh statis · waktu ditampilkan dalam WITA
            </p>
          </div>

          <span className="mode-badge demo">
            DEMO RECORDS
          </span>
        </div>

        <div className="alarm-filters">
          <div className="alarm-field">
            <label htmlFor="alarm-severity">
              Severity
            </label>

            <select
              id="alarm-severity"
              value={severityFilter}
              onChange={(event) =>
                setSeverityFilter(
                  event.target.value as SeverityFilter,
                )
              }
            >
              <option value="All">Semua severity</option>
              <option value="Critical">Critical</option>
              <option value="Warning">Warning</option>
              <option value="Info">Info</option>
            </select>
          </div>

          <div className="alarm-field">
            <label htmlFor="alarm-status">
              Status
            </label>

            <select
              id="alarm-status"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as StatusFilter,
                )
              }
            >
              <option value="All">Semua status</option>
              <option value="Active">Active</option>
              <option value="Cleared">Cleared</option>
              <option value="Recorded">Recorded</option>
            </select>
          </div>

          <div className="alarm-field alarm-search">
            <label htmlFor="alarm-search">
              Cari unit, tag, atau pesan
            </label>

            <input
              id="alarm-search"
              type="search"
              value={search}
              placeholder="Contoh: SAC#12 atau COMM"
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />
          </div>

          <button
            type="button"
            className="secondary-button alarm-reset"
            onClick={resetFilters}
          >
            Reset filter
          </button>
        </div>

        <div className="alarm-result-count" role="status">
          Menampilkan {filteredEvents.length} dari{' '}
          {demoEvents.length} catatan demo.
        </div>

        <div
          className="alarm-table-scroll"
          role="region"
          aria-label="Tabel alarm dan event, dapat digeser horizontal"
          tabIndex={0}
        >
          <table className="alarm-table">
            <caption className="visually-hidden">
              Catatan alarm dan event simulasi.
              Seluruh waktu menggunakan zona WITA.
            </caption>

            <thead>
              <tr>
                <th scope="col">Time / WITA</th>
                <th scope="col">Unit</th>
                <th scope="col">Tag ID</th>
                <th scope="col">Message</th>
                <th scope="col">Severity</th>
                <th scope="col">Status</th>
              </tr>
            </thead>

            <tbody>
              {filteredEvents.map((event) => {
                const displayTime =
                  formatEventTime(event.timestamp)

                return (
                  <tr key={event.id}>
                    <td>
                      <time
                        className="alarm-time"
                        dateTime={event.timestamp}
                      >
                        <strong>{displayTime.time}</strong>
                        <span>{displayTime.date}</span>
                      </time>
                    </td>

                    <td className="alarm-unit">
                      {event.unit}
                    </td>

                    <td>
                      <code className="alarm-tag">
                        {event.tag}
                      </code>
                    </td>

                    <td className="alarm-message">
                      {event.message}
                    </td>

                    <td>
                      <span
                        className={`severity-badge severity-${event.severity.toLowerCase()}`}
                      >
                        <span
                          className="equipment-dot"
                          aria-hidden="true"
                        />
                        {event.severity}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`event-status event-${event.status.toLowerCase()}`}
                      >
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
            <h3>Tidak ada catatan yang sesuai</h3>
            <p>
              Ubah kata pencarian atau reset filter
              untuk melihat seluruh data demo.
            </p>
          </div>
        )}

        <div className="alarm-table-footer">
          <span>
            Urutan: kejadian terbaru terlebih dahulu
          </span>
          <span>
            Ringkasan di atas tidak mengikuti filter tabel
          </span>
        </div>
      </section>

      <p className="alarm-note">
        Active berarti kondisi alarm pada contoh masih aktif.
        Cleared berarti kondisi pada contoh telah pulih.
        Recorded merupakan catatan event.
        Status Cleared tidak berarti alarm sudah di-acknowledge.
      </p>

      <p className="alarm-note">
        Tag dan kejadian di halaman ini merupakan ilustrasi.
        Data belum terhubung ke sensor, grafik tren,
        maupun histori MySQL.
      </p>
    </>
  )
}

export default function AlarmsEvents({
  demoMode,
}: {
  demoMode: boolean
}) {
  if (!demoMode) {
    return (
      <>
        <section
          className="metrics"
          aria-label="Ringkasan alarm Live belum tersedia"
        >
          {[
            'Active Alarms',
            'Critical Active',
            'Warning Active',
            'Recorded Events',
          ].map((title) => (
            <article className="metric-card" key={title}>
              <h3>{title}</h3>

              <div className="metric-reading">
                <strong>—</strong>
                <span>records</span>
              </div>

              <p className="muted">
                Menunggu data aktual
              </p>
            </article>
          ))}
        </section>

        <section className="panel">
          <div className="panel-header">
            <h3>Event & alarm log</h3>
            <span className="eyebrow">
              LIVE / BELUM TERHUBUNG
            </span>
          </div>

          <div className="empty-state">
            <span
              className="empty-symbol"
              aria-hidden="true"
            >
              ◇
            </span>

            <h3>Status alarm belum tersedia</h3>

            <p>
              Backend belum terhubung. Jumlah alarm
              belum diketahui dan tidak ditampilkan
              sebagai nol.
            </p>
          </div>
        </section>
      </>
    )
  }

  return <DemoAlarms />
}