import { useEffect, useState } from 'react'
import ProcessTrends from './ProcessTrends'
import AlarmsEvents from './AlarmsEvents'
import { useDemoData } from './useDemoData'
import { useHistoricalFleet } from './useHistoricalFleet'
import type {
  FleetStatus,
  FleetUnit,
} from './useHistoricalFleet'
import valeLogo from './assets/vale-logo.png'
import './App.css'
import './HistoricalFleet.css'


type DataMode = 'demo' | 'historical' | 'live'

const menus = [
  'Service Air Compressor Overview',
  'Unit Compressor',
  'Process & trends',
  'Alarms & events',
]

const statuses = [
  'Running',
  'Standby',
  'Isolate',
  'Trip',
] as const

const sensorDefinitions = [
  {
    field: 'airTempStg1',
    title: 'Air Temperature Stage 1',
    suffix: 'AIR-TEMP-STG1-AI-MS',
    unit: '°C',
    category: 'temperature',
  },
  {
    field: 'airTempStg2',
    title: 'Air Temperature Stage 2',
    suffix: 'AIR-TEMP-STG2-AI-MS',
    unit: '°C',
    category: 'temperature',
  },
  {
    field: 'pressureStg1',
    title: 'Discharge Pressure Stage 1',
    suffix: 'DSCH-PRESSURE-STG1-AI-MS',
    unit: 'psi',
    category: 'pressure',
  },
  {
    field: 'pressureStg2',
    title: 'Discharge Pressure Stage 2',
    suffix: 'DSCH-PRESSURE-STG2-AI-MS',
    unit: 'psi',
    category: 'pressure',
  },
  {
    field: 'bearingDeTemp',
    title: 'Bearing DE Temperature',
    suffix: 'BRG-DE-TEMP-AI-MS',
    unit: '°C',
    category: 'mechanical',
  },
  {
    field: 'bearingNdeTemp',
    title: 'Bearing NDE Temperature',
    suffix: 'BRG-NDE-TEMP-AI-MS',
    unit: '°C',
    category: 'mechanical',
  },
      {
        field: 'ctInput',
        title: 'CT Input',
        suffix: 'CT-INPUT-AI-MS',
        unit: 'A',
        category: 'electrical',
      },
    ] as const

const cardParameters = [
  {
    field: 'airTempStg1',
    title: 'AIR TEMP 1',
    unit: '°C',
  },
  {
    field: 'pressureStg2',
    title: 'PRESS STG 2',
    unit: 'psi',
  },
  {
    field: 'ctInput',
    title: 'CT INPUT',
    unit: 'A',
  },
] as const

function formatReading(
  value: number | null | undefined,
  decimals = 2,
) {
  return typeof value === 'number' && Number.isFinite(value)
    ? value.toLocaleString('en-US', {
        maximumFractionDigits: decimals,
      })
    : '—'
}

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString('en-GB', {
    timeZone: 'Asia/Makassar',
  })
}

function statusLabel(status: FleetStatus) {
  return status === 'Unknown' ? 'Belum diketahui' : status
}

function NavIcon({ index }: { index: number }) {
  const paths = [
    'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
    'M4 18a9 9 0 1 1 16 0 M12 13l5-5 M11 16h2',
    'M3 20h18 M5 17v-4 M10 17V9 M15 17v-6 M20 17V5 M4 9l5-5 5 3 6-5',
    'M5 17h14l-2-3V9a5 5 0 0 0-10 0v5z M10 21h4',
  ]

  return (
    <svg
      className="nav-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[index]} />
    </svg>
  )
}

function MetricIcon({ index }: { index: number }) {
  const paths = [
    'M3 8h12a3 3 0 1 0-3-3 M3 12h16a3 3 0 1 1-3 3 M3 16h5',
    'M4 18a9 9 0 1 1 16 0 M12 13l5-5 M10 18h4',
    'M12 3l6 8a7 7 0 1 1-12 0z',
    'M3 4h18v13H3z M8 21h8 M12 17v4',
  ]

  return (
    <svg
      className="kpi-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[index]} />
    </svg>
  )
}

function StatusBadge({ status }: { status: FleetStatus }) {
  return (
    <span
      className={`equipment-status status-${status.toLowerCase()}`}
    >
      <span className="equipment-dot" aria-hidden="true" />
      <span>{statusLabel(status)}</span>
    </span>
  )
}

function EmptyPanel({
  title,
  message,
}: {
  title: string
  message: string
}) {
  return (
    <section className="panel">
      <div className="empty-state">
        <span className="empty-symbol" aria-hidden="true">
          ◇
        </span>
        <h3>{title}</h3>
        <p>{message}</p>
      </div>
    </section>
  )
}

export default function App() {
  const [mode, setMode] = useState<DataMode>('historical')
  const [activeMenu, setActiveMenu] = useState(menus[0])
  const [selectedUnitId, setSelectedUnitId] = useState('SAC#14')
  const [fleetFilter, setFleetFilter] = useState<
    'All' | FleetStatus
  >('All')
  const [fleetSearch, setFleetSearch] = useState('')
  const [day, setDay] = useState('2026-01-01')
  const [time, setTime] = useState('00:00')
  const [clock, setClock] = useState(() => new Date())

  const demoMode = mode === 'demo'
  const historicalMode = mode === 'historical'

  const { snapshot, resetDemo } = useDemoData(demoMode)
  const history = useHistoricalFleet(historicalMode, day, time)

  // Sumber data kartu fleet:
  // Historical -> API MySQL
  // Demo       -> simulator
  // Live       -> belum ada gateway
  const compressors: FleetUnit[] = historicalMode
    ? history.compressors
    : demoMode
      ? snapshot?.compressors ?? []
      : []

  const counts = {
    Running: compressors.filter(
      (unit) => unit.status === 'Running',
    ).length,
    Standby: compressors.filter(
      (unit) => unit.status === 'Standby',
    ).length,
    Isolate: compressors.filter(
      (unit) => unit.status === 'Isolate',
    ).length,
    Trip: compressors.filter(
      (unit) => unit.status === 'Trip',
    ).length,
    Unknown: compressors.filter(
      (unit) => unit.status === 'Unknown',
    ).length,
  }

  const availableUnits = compressors.filter(
    (unit) => unit.sourceTime,
  ).length

  const selectedUnit =
    compressors.find((unit) => unit.id === selectedUnitId) ??
    null

  const visibleCompressors = compressors.filter((unit) => {
    const matchesStatus =
      fleetFilter === 'All' || unit.status === fleetFilter

    const matchesSearch = unit.id
      .toLowerCase()
      .includes(fleetSearch.trim().toLowerCase())

    return matchesStatus && matchesSearch
  })

  const modeLabel = demoMode
    ? 'DEMO'
    : historicalMode
      ? 'HISTORICAL'
      : 'LIVE · DISCONNECTED'

  const sourceDescription = demoMode
    ? 'Data simulasi frontend — bukan pembacaan perangkat'
    : historicalMode
      ? 'Data historis MySQL melalui backend API'
      : 'Menunggu koneksi gateway instrumen lapangan'

  const displayedTime = historicalMode
    ? history.sourceTime
    : demoMode && snapshot
      ? `${formatTime(snapshot.timestamp)} WITA`
      : '—'

  const metrics = [
    {
      title: 'Total Air Flow',
      value: demoMode && snapshot
        ? formatReading(snapshot.totalFlow, 1)
        : '—',
      unit: 'SCFM',
      category: 'flow',
      description: demoMode
        ? 'Contoh total aliran simulasi'
        : 'Tag total flow belum tersedia',
    },
    {
      title: 'Header System Pressure',
      value: demoMode && snapshot
        ? formatReading(snapshot.headerPressure, 1)
        : '—',
      unit: 'psi',
      category: 'pressure',
      description: demoMode
        ? 'Contoh tekanan header simulasi'
        : 'Tag tekanan header belum tersedia',
    },
    {
      title: 'Dew Point Temperature',
      value: demoMode && snapshot
        ? formatReading(snapshot.dewPoint, 1)
        : '—',
      unit: '°F',
      category: 'dewpoint',
      description: demoMode
        ? 'Contoh dew point simulasi'
        : 'Tag dew point belum tersedia',
    },
    {
      title: 'Compressor Fleet Status',
      value: demoMode && snapshot
        ? `${counts.Running} / 15`
        : '—',
      unit: 'Units Running',
      category: 'fleet',
      description: demoMode
        ? `${counts.Standby} Standby · ${counts.Isolate} Isolate · ${counts.Trip} Trip`
        : 'Status operasi belum diverifikasi',
    },
  ]

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClock(new Date())
    }, 1000)

    return () => window.clearInterval(timer)
  }, [])

  function changeMode(value: string) {
    if (
      value !== 'demo' &&
      value !== 'historical' &&
      value !== 'live'
    ) {
      return
    }

    resetDemo()
    setMode(value)
    setFleetFilter('All')
  }

  function openUnit(id: string) {
    setSelectedUnitId(id)
    setActiveMenu(menus[1])
  }

  function unitSourceLabel(unit: FleetUnit) {
    if (historicalMode) {
      return unit.sourceTime
        ? `Historis · ${unit.sourceTime}`
        : unit.issue ?? 'Data tidak tersedia'
    }

    return unit.acquisitionActive
      ? 'Data simulasi tersedia'
      : 'Data simulasi tidak tersedia'
  }

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="vale-brand">
          <div className="vale-logo-frame">
            <img
              className="vale-logo"
              src={valeLogo}
              alt="Vale"
              width={755}
              height={373}
            />
          </div>

          <div className="vale-brand-caption">
            <strong>SERVICE AIR</strong>
            <span>MONITORING SYSTEM</span>
          </div>
        </div>

        <div className="department">
          <span className="eyebrow">PT VALE INDONESIA</span>
          <p>
            Energy &amp; Logistics
            <br />
            Department
          </p>
        </div>

        <span className="eyebrow navigation-label">
          OPERATIONS WORKSPACE
        </span>

        <nav aria-label="Navigasi utama">
          {menus.map((menu, index) => (
            <button
              key={menu}
              type="button"
              className={`nav-button ${
                activeMenu === menu ? 'active' : ''
              }`}
              aria-current={
                activeMenu === menu ? 'page' : undefined
              }
              onClick={() => setActiveMenu(menu)}
            >
              <NavIcon index={index} />
              <span>{menu}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-summary">
          <div className="sidebar-summary-header">
            <span className="eyebrow">
              COMPRESSOR RUNNING
            </span>
            <span className="fleet-live-pill">
              {modeLabel}
            </span>
          </div>

          <div className="fleet-count">
            <strong>
              {demoMode && snapshot ? counts.Running : '—'}
            </strong>
            <small> / 15 Units Running</small>
          </div>

          <div className="fleet-bar">
            {statuses.map((status) => (
              <div
                key={status}
                className={`fleet-bar-seg seg-${status.toLowerCase()}`}
                style={{
                  width: demoMode
                    ? `${(counts[status] / 15) * 100}%`
                    : '0%',
                }}
              />
            ))}
          </div>

          <div className="fleet-status-chips">
            {statuses.map((status) => (
              <span
                key={status}
                className={`chip-item chip-${status.toLowerCase()}`}
              >
                <span
                  className={`dot dot-${status.toLowerCase()}`}
                />
                {' '}{demoMode ? counts[status] : '—'}{' '}
                {status}
              </span>
            ))}
          </div>

          {historicalMode && (
            <p className="fleet-history-note">
              {history.loading
                ? 'Memuat sampel historis…'
                : `${availableUnits}/15 unit memiliki sampel`}
            </p>
          )}
        </div>

        <div className="sidebar-footer">
          <span className="readonly-badge">
            READ-ONLY · {modeLabel}
          </span>
          <p>
            Dashboard pemantauan.
            <br />
            Tidak menyediakan kontrol mesin.
          </p>
          <small>SOROWAKO PLANT / UTILITY</small>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="topbar-title-wrap">
            <div className="plant-tag">
              <span className="plant-pulse" />
              <span>SOROWAKO PLANT · UTILITY SYSTEMS</span>
            </div>

            <h1>
              Service Air Compressor Online Dashboard
              Monitoring System
            </h1>

            <p className="breadcrumb">
              UTILITY SYSTEMS / SERVICE AIR / OPERATIONS
              CONTROL
            </p>
          </div>

          <div
            className="clock-card"
            aria-label="Jam komputer dalam WITA"
          >
            <div className="clock-top">
              <strong className="clock-time">
                {formatTime(clock.getTime())}
              </strong>
              <span className="clock-tz">UTC+08:00</span>
            </div>

            <div className="clock-bottom">
              <span>
                {clock.toLocaleDateString('id-ID', {
                  timeZone: 'Asia/Makassar',
                  weekday: 'short',
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>
        </header>

        <div className="statusbar">
          <div className="connection-status" role="status">
            <span
              className={`status-dot ${
                demoMode
                  ? 'demo-dot'
                  : historicalMode
                    ? 'history-dot'
                    : 'offline-dot'
              }`}
              aria-hidden="true"
            />
            <span>{sourceDescription}</span>
          </div>

          <div className="mode-control">
            <label htmlFor="data-source-mode">
              Sumber data
            </label>
            <select
              id="data-source-mode"
              className="history-select"
              value={mode}
              onChange={(event) =>
                changeMode(event.target.value)
              }
            >
              <option value="historical">
                Historical · MySQL
              </option>
              <option value="demo">Demo · Simulasi</option>
              <option value="live">
                Live · Belum terhubung
              </option>
            </select>
          </div>
        </div>

        <div className="content">
          <div className="page-heading">
            <div>
              <h2>{activeMenu}</h2>
              <p className="muted">
                {sourceDescription}
              </p>
            </div>
            <span className="mode-badge">{modeLabel}</span>
          </div>

          {historicalMode && (
            <section
              className="history-controls"
              aria-label="Pengaturan waktu historis"
            >
              <div className="history-toolbar">
                <label>
                  Tanggal sumber
                  <input
                    type="date"
                    value={day}
                    onChange={(event) => {
                      if (
                        /^\d{4}-\d{2}-\d{2}$/.test(
                          event.target.value,
                        )
                      ) {
                        setDay(event.target.value)
                      }
                    }}
                  />
                </label>

                <label>
                  Jam sumber
                  <input
                    type="time"
                    step="1"
                    value={time}
                    onChange={(event) => {
                      if (event.target.value) {
                        setTime(event.target.value)
                      }
                    }}
                  />
                </label>

                <button
                  type="button"
                  className="secondary-button"
                  disabled={history.loading}
                  onClick={history.refresh}
                >
                  {history.loading
                    ? 'Memuat…'
                    : 'Muat ulang data'}
                </button>

                <span role="status">
                  {history.loading
                    ? 'Mengambil data dari API…'
                    : history.error
                      ? 'Pengambilan data gagal'
                      : `${availableUnits}/15 unit memiliki sampel pada waktu pilihan`}
                </span>
              </div>

              <p className="history-help">
                Data tampil langsung di kartu fleet.
                Timestamp mengikuti file sumber tanpa
                konversi zona waktu. Satuan dan status operasi
                belum diverifikasi.
              </p>

              {history.error && (
                <p className="history-error" role="alert">
                  {history.error} Periksa backend port 4000
                  dan koneksi MySQL.
                </p>
              )}

              {history.warnings.map((message) => (
                <p className="history-error" key={message}>
                  {message}
                </p>
              ))}

              {history.notes.length > 0 && (
                <details>
                  <summary>Informasi sumber impor</summary>
                  {history.notes.map((note) => (
                    <p key={note}>{note}</p>
                  ))}
                </details>
              )}
            </section>
          )}

          {activeMenu === menus[0] && (
            <>
              <section
                className="metrics"
                aria-label="Ringkasan sistem"
              >
                {metrics.map((metric, index) => (
                  <article
                    key={metric.title}
                    className={`metric-card metric-card-${metric.category}`}
                  >
                    <div className="kpi-header">
                      <h3>{metric.title}</h3>
                      <div className="kpi-icon-wrap">
                        <MetricIcon index={index} />
                      </div>
                    </div>

                    <div className="kpi-reading">
                      <strong>{metric.value}</strong>
                      <span className="kpi-unit">
                        {metric.unit}
                      </span>
                    </div>

                    <p className="kpi-desc">
                      {metric.description}
                    </p>
                  </article>
                ))}
              </section>

              <section className="panel">
                <div className="panel-header fleet-panel-header">
                  <div>
                    <h3>
                      Service Air Compressor Fleet (15 Units)
                    </h3>
                    <p className="panel-subtitle">
                      {historicalMode
                        ? `HISTORICAL · ${history.sourceTime}`
                        : demoMode
                          ? `${counts.Running} RUNNING / ${counts.Standby} STANDBY / ${counts.Isolate} ISOLATE / ${counts.Trip} TRIP`
                          : 'MENUNGGU KONEKSI LIVE'}
                    </p>
                  </div>

                  <div className="fleet-controls">
                    <div className="fleet-filter-pills">
                      <button
                        type="button"
                        className={`fleet-pill ${
                          fleetFilter === 'All'
                            ? 'is-active'
                            : ''
                        }`}
                        onClick={() =>
                          setFleetFilter('All')
                        }
                      >
                        Semua ({compressors.length})
                      </button>

                      {statuses.map((status) => (
                        <button
                          key={status}
                          type="button"
                          className={`fleet-pill fleet-pill-${status.toLowerCase()} ${
                            fleetFilter === status
                              ? 'is-active'
                              : ''
                          }`}
                          onClick={() =>
                            setFleetFilter(status)
                          }
                        >
                          <span
                            className={`pill-dot ${status.toLowerCase()}-dot`}
                          />
                          {status} (
                          {demoMode ? counts[status] : '—'})
                        </button>
                      ))}

                      {historicalMode && (
                        <button
                          type="button"
                          className={`fleet-pill ${
                            fleetFilter === 'Unknown'
                              ? 'is-active'
                              : ''
                          }`}
                          onClick={() =>
                            setFleetFilter('Unknown')
                          }
                        >
                          Belum diketahui ({counts.Unknown})
                        </button>
                      )}
                    </div>

                    <div className="fleet-search-wrap">
                      <svg
                        className="search-icon"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden="true"
                      >
                        <circle cx="10" cy="10" r="6" />
                        <path d="m15 15 6 6" />
                      </svg>

                      <input
                        type="search"
                        aria-label="Cari kompresor"
                        placeholder="Cari kompresor..."
                        value={fleetSearch}
                        onChange={(event) =>
                          setFleetSearch(event.target.value)
                        }
                      />
                    </div>
                  </div>
                </div>

                {mode === 'live' ? (
                  <div className="empty-state">
                    <h3>Mode Live Belum Terhubung</h3>
                    <p>
                      Pilih Historical · MySQL untuk melihat
                      data impor CSV.
                    </p>
                  </div>
                ) : visibleCompressors.length ? (
                  <div className="compressor-grid">
                    {visibleCompressors.map((unit) => (
                      <button
                        key={unit.id}
                        type="button"
                        className={`compressor-card compressor-link compressor-${unit.status.toLowerCase()}`}
                        onClick={() => openUnit(unit.id)}
                        aria-label={`Buka detail ${unit.id}`}
                      >
                        <div className="compressor-heading">
                          <div className="compressor-name-wrap">
                            <strong className="compressor-name">
                              {unit.id}
                            </strong>
                            <span className="compressor-type-badge">
                              CENTAC
                            </span>
                          </div>
                          <StatusBadge status={unit.status} />
                        </div>

                        <span className="acquisition-label">
                          {unitSourceLabel(unit)}
                        </span>

                        <div className="card-values">
                          {historicalMode &&
                          unit.cardHighlights &&
                          unit.cardHighlights.length > 0
                            ? unit.cardHighlights.map((param) => (
                                <div
                                  className="val-box"
                                  key={param.tag}
                                >
                                  <div className="val-header">
                                    <span className="val-label">
                                      {param.shortLabel}
                                    </span>
                                    <span className="val-unit">
                                      {param.unit}
                                    </span>
                                  </div>

                                  <b className="val-number">
                                    {formatReading(param.value)}
                                  </b>
                                </div>
                              ))
                            : cardParameters.map((parameter) => (
                                <div
                                  className="val-box"
                                  key={parameter.field}
                                >
                                  <div className="val-header">
                                    <span className="val-label">
                                      {parameter.title}
                                    </span>
                                    <span className="val-unit">
                                      {historicalMode
                                        ? 'RAW'
                                        : parameter.unit}
                                    </span>
                                  </div>

                                  <b className="val-number">
                                    {formatReading(
                                      unit[parameter.field],
                                    )}
                                  </b>
                                </div>
                              ))}
                        </div>

                        <div className="card-footer-action">
                          <span>Buka Detail Sensor</span>
                          <svg
                            viewBox="0 0 16 16"
                            width="12"
                            height="12"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            aria-hidden="true"
                          >
                            <path d="M6 12l4-4-4-4" />
                          </svg>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <h3>Tidak ada unit yang sesuai</h3>
                    <p>
                      Pilih filter Semua dan kosongkan
                      pencarian.
                    </p>
                  </div>
                )}
              </section>

              <p className="overview-note">
                Waktu sumber: {displayedTime} · Klik kartu
                untuk melihat tujuh parameter.
              </p>
            </>
          )}

          {activeMenu === menus[1] && (
            <>
              <div className="unit-nav-bar">
                <div className="unit-nav-left">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setActiveMenu(menus[0])}
                  >
                    ← Overview Fleet
                  </button>
                  <span className="unit-nav-divider" />
                  <span className="unit-nav-label">
                    Pilih unit:
                  </span>
                </div>

                <div className="unit-selector-strip">
                  {compressors.map((unit) => (
                    <button
                      key={unit.id}
                      type="button"
                      className={`unit-strip-btn unit-strip-${unit.status.toLowerCase()} ${
                        selectedUnitId === unit.id
                          ? 'is-active'
                          : ''
                      }`}
                      aria-pressed={
                        selectedUnitId === unit.id
                      }
                      onClick={() =>
                        setSelectedUnitId(unit.id)
                      }
                    >
                      <span className="unit-strip-dot" />
                      <span className="unit-strip-name">
                        {unit.id}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {selectedUnit ? (
                <>
                  <section className="panel unit-detail-panel">
                    <div className="unit-detail-heading">
                      <div className="unit-heading-left">
                        <div className="unit-asset-badge">
                          <span>CENTAC</span>
                        </div>

                        <h3>
                          {selectedUnit.id} — Service Air
                          Compressor
                        </h3>

                        <p className="muted">
                          {sourceDescription}
                        </p>
                      </div>

                      <StatusBadge
                        status={selectedUnit.status}
                      />
                    </div>

                    <dl className="unit-information">
                      <div>
                        <dt>Status operasi</dt>
                        <dd>
                          {statusLabel(selectedUnit.status)}
                        </dd>
                      </div>

                      <div>
                        <dt>Ketersediaan data</dt>
                        <dd>{unitSourceLabel(selectedUnit)}</dd>
                      </div>

                      <div>
                        <dt>Sumber data</dt>
                        <dd>
                          {historicalMode
                            ? selectedUnit.sourceFile
                              ? `${selectedUnit.sourceFile} · Impor #${selectedUnit.importId}`
                              : '—'
                            : 'Simulasi frontend'}
                        </dd>
                      </div>

                      <div>
                        <dt>Waktu sumber</dt>
                        <dd>
                          {historicalMode
                            ? selectedUnit.sourceTime ?? '—'
                            : displayedTime}
                        </dd>
                      </div>
                    </dl>
                  </section>

                  {historicalMode &&
                  selectedUnit.customParameters &&
                  selectedUnit.customParameters.length > 0 ? (
                    <div>
                      <div className="telemetry-section-header">
                        <span className="section-pill">
                          PARAMETER INSTRUMEN ({selectedUnit.id})
                        </span>
                        <h4>
                          Parameter Sesuai File CSV ({selectedUnit.sourceFile})
                        </h4>
                      </div>

                      <section
                        className="metrics telemetry-metrics-4col"
                        aria-label={`Parameter ${selectedUnit.id}`}
                      >
                        {selectedUnit.customParameters.map((sensor) => (
                          <article
                            key={sensor.tag}
                            className={`metric-card telemetry-card telemetry-${sensor.category}`}
                          >
                            <div className="metric-tag-row">
                              <code
                                className="metric-tag-code"
                                title={sensor.tag}
                              >
                                {sensor.tag}
                              </code>
                            </div>

                            <div className="kpi-header">
                              <h3>{sensor.label}</h3>
                            </div>

                            <div className="kpi-reading">
                              <strong>
                                {formatReading(sensor.value)}
                              </strong>
                              <span className="kpi-unit">
                                {sensor.unit}
                              </span>
                            </div>

                            <div className="telemetry-footer-status">
                              <span>
                                {sensor.value === null
                                  ? 'Nilai tidak tersedia / NaN'
                                  : 'Data historis CSV'}
                              </span>
                            </div>
                          </article>
                        ))}
                      </section>
                    </div>
                  ) : (
                    [
                      {
                        title: 'Suhu dan Tekanan Proses',
                        label: 'PROSES UTAMA',
                        className: 'telemetry-metrics-4col',
                        definitions:
                          sensorDefinitions.slice(0, 4),
                      },
                      {
                        title: 'Bearing dan CT Input',
                        label: 'MEKANIKAL & ELEKTRIKAL',
                        className: 'telemetry-metrics-3col',
                        definitions:
                          sensorDefinitions.slice(4),
                      },
                    ].map((group) => (
                      <div key={group.title}>
                        <div className="telemetry-section-header">
                          <span className="section-pill">
                            {group.label}
                          </span>
                          <h4>{group.title}</h4>
                        </div>

                        <section
                          className={`metrics ${group.className}`}
                          aria-label={group.title}
                        >
                          {group.definitions.map((sensor) => {
                            const value =
                              selectedUnit[sensor.field]

                            const tag =
                              `U-${selectedUnit.id.replace('#', '')}-${sensor.suffix}`

                            return (
                              <article
                                key={sensor.field}
                                className={`metric-card telemetry-card telemetry-${sensor.category}`}
                              >
                                <div className="metric-tag-row">
                                  <code
                                    className="metric-tag-code"
                                    title={tag}
                                  >
                                    {tag}
                                  </code>
                                </div>

                                <div className="kpi-header">
                                  <h3>{sensor.title}</h3>
                                </div>

                                <div className="kpi-reading">
                                  <strong>
                                    {formatReading(value)}
                                  </strong>
                                  <span className="kpi-unit">
                                    {historicalMode
                                      ? 'RAW'
                                      : sensor.unit}
                                  </span>
                                </div>

                                <div className="telemetry-footer-status">
                                  <span>
                                    {value === null
                                      ? 'Nilai tidak tersedia'
                                      : historicalMode
                                        ? 'Nilai mentah · satuan belum diverifikasi'
                                        : 'Data simulasi'}
                                  </span>
                                </div>
                              </article>
                            )
                          })}
                        </section>
                      </div>
                    ))
                  )}

                  <div className="unit-explanation">
                    <p>
                      {historicalMode
                        ? 'Data historis berasal dari impor CSV/Excel. Status mesin tidak ditentukan dari nilai CT atau suhu saja. Nilai nol tetap ditampilkan sebagai nol sesuai data sumber.'
                        : 'Nilai dan status pada mode Demo adalah simulasi untuk pengembangan antarmuka.'}
                    </p>

                    {selectedUnit.issue && (
                      <p>{selectedUnit.issue}</p>
                    )}
                  </div>
                </>
              ) : (
                <EmptyPanel
                  title="Data unit belum tersedia"
                  message="Pilih Historical · MySQL atau Demo untuk membuka detail kompresor."
                />
              )}
            </>
          )}

          {activeMenu === menus[2] &&
            (demoMode ? (
              <ProcessTrends demoMode={true} />
            ) : (
              <EmptyPanel
                title={
                  historicalMode
                    ? 'Grafik historis belum dihubungkan'
                    : 'Live belum terhubung'
                }
                message={
                  historicalMode
                    ? 'Data MySQL tersedia pada kartu fleet dan detail unit. Grafik historis memerlukan integrasi berikutnya.'
                    : 'Gateway instrumen lapangan belum dikonfigurasi.'
                }
              />
            ))}

          {activeMenu === menus[3] &&
            (demoMode ? (
              <AlarmsEvents
                demoMode={true}
                compressors={snapshot?.compressors ?? []}
                timestamp={snapshot?.timestamp}
              />
            ) : (
              <EmptyPanel
                title="Data alarm belum tersedia"
                message="Pemetaan sinyal Trip dan batas High High, High, Low, Low Low perlu diverifikasi sebelum digunakan."
              />
            ))}
        </div>
      </main>
    </div>
  )
}