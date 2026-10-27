import { useEffect, useState } from 'react'
import ProcessTrends from './ProcessTrends'
import AlarmsEvents from './AlarmsEvents'
import { useDemoData } from './useDemoData'
import type {
  CompressorStatus,
  TrendSample,
} from './useDemoData'
import valeLogo from './assets/vale-logo.png'
import './App.css'

const menus = [
  'Fleet & plant overview',
  'Unit telemetry',
  'Process & trends',
  'Alarms & events',
]

const statusDescriptions: Record<CompressorStatus, string> = {
  Loaded:
    'Contoh kondisi Loaded. Nilai diperbarui oleh simulator frontend setiap sekitar dua detik.',
  Unloaded:
    'Contoh kondisi Unloaded. Status ini tidak otomatis menunjukkan alarm kerusakan.',
  Trip:
    'Contoh kondisi Trip. Penyebab aktual harus diperoleh dari sistem proteksi perangkat.',
  Unknown:
    'Akuisisi tidak aktif. Kondisi mesin tidak dapat disimpulkan dan parameter ditampilkan sebagai —.',
}

function formatReading(value: number | null, decimals = 1) {
  return value === null ? '—' : value.toFixed(decimals)
}

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString('en-GB', {
    timeZone: 'Asia/Makassar',
  })
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

function StatusBadge({
  status,
}: {
  status: CompressorStatus
}) {
  return (
    <span
      className={`equipment-status status-${status.toLowerCase()}`}
    >
      <span className="equipment-dot" aria-hidden="true" />
      {status}
    </span>
  )
}

function EmptyLive() {
  return (
    <div className="empty-state">
      <span className="empty-symbol" aria-hidden="true">
        ◇
      </span>

      <h3>Belum ada data Live</h3>

      <p>
        Sumber data aktual belum terhubung. Aktifkan Mode Demo
        untuk melihat contoh dashboard.
      </p>
    </div>
  )
}

function FlowSparkline({
  history,
}: {
  history: TrendSample[]
}) {
  if (history.length < 2) return null

  const samples = history.slice(-30)
  const values = samples.map((sample) => sample.totalFlow)

  const minimum = Math.min(...values)
  const range = Math.max(
    Math.max(...values) - minimum,
    100,
  )

  const start = samples[0].timestamp
  const duration = Math.max(
    samples[samples.length - 1].timestamp - start,
    1,
  )

  const segments: TrendSample[][] = []

  samples.forEach((sample, index) => {
    const isNewSegment =
      index === 0 ||
      sample.timestamp - samples[index - 1].timestamp > 6000

    if (isNewSegment) {
      segments.push([sample])
    } else {
      segments[segments.length - 1].push(sample)
    }
  })

  return (
    <svg
      className="flow-sparkline"
      viewBox="0 0 100 38"
      role="img"
      aria-label="Tren Total Air Flow simulasi"
    >
      {segments.map((segment) => (
        <polyline
          key={segment[0].timestamp}
          points={segment
            .map((sample) => {
              const x =
                3 + ((sample.timestamp - start) / duration) * 94

              const y =
                34 - ((sample.totalFlow - minimum) / range) * 28

              return `${x},${y}`
            })
            .join(' ')}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ))}
    </svg>
  )
}

function App() {
  const [demoMode, setDemoMode] = useState(false)
  const [activeMenu, setActiveMenu] = useState(menus[0])
  const [selectedUnitId, setSelectedUnitId] = useState('SAC#1')
  const [clock, setClock] = useState(() => new Date())

  const { snapshot, history, resetDemo } = useDemoData(demoMode)

  const compressors = snapshot?.compressors ?? []

  const selectedUnit =
    compressors.find((unit) => unit.id === selectedUnitId) ?? null

  const fleet = {
    active: compressors.filter(
      (unit) => unit.acquisitionActive,
    ).length,
    inactive: compressors.filter(
      (unit) => !unit.acquisitionActive,
    ).length,
    loaded: compressors.filter(
      (unit) => unit.status === 'Loaded',
    ).length,
    unloaded: compressors.filter(
      (unit) => unit.status === 'Unloaded',
    ).length,
    trip: compressors.filter(
      (unit) => unit.status === 'Trip',
    ).length,
  }

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClock(new Date())
    }, 1000)

    return () => window.clearInterval(timer)
  }, [])

  function toggleDemo() {
    resetDemo()
    setDemoMode((previous) => !previous)
    setSelectedUnitId('SAC#1')
  }

  function openUnit(id: string) {
    setSelectedUnitId(id)
    setActiveMenu(menus[1])
  }

  const metrics = [
    {
      title: 'Total Air Flow',
      value: snapshot
        ? snapshot.totalFlow.toLocaleString('en-US')
        : '—',
      unit: 'SCFM',
    },
    {
      title: 'Header System Pressure',
      value: snapshot
        ? snapshot.headerPressure.toFixed(1)
        : '—',
      unit: 'psi',
    },
    {
      title: 'Dew Point Temperature',
      value: snapshot
        ? snapshot.dewPoint.toFixed(1)
        : '—',
      unit: '°F',
    },
    {
      title: 'Data Acquisition',
      value: snapshot ? String(fleet.active) : '—',
      unit: 'Units Active',
    },
  ]

  const unitMetrics = selectedUnit
    ? [
        {
          title: 'Discharge Pressure',
          value: formatReading(selectedUnit.dischargePressure),
          unit: 'psi',
        },
        {
          title: 'Oil Pressure',
          value: formatReading(selectedUnit.oilPressure),
          unit: 'psi',
        },
        {
          title: 'Motor Current',
          value: formatReading(selectedUnit.motorCurrent, 0),
          unit: 'Amp',
        },
      ]
    : []

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
          <span className="eyebrow">
            PT VALE INDONESIA
          </span>

          <p>
            Energy & Logistic
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
          <span className="eyebrow">
            {demoMode ? 'SAMPLE FLEET' : 'LIVE FLEET'}
          </span>

          <p className="fleet-count">
            {snapshot ? fleet.active : '—'}

            <small>
              {snapshot
                ? ` / ${compressors.length} communicating`
                : ' / —'}
            </small>
          </p>

          <p className="fleet-detail">
            {snapshot
              ? `${fleet.loaded} loaded · ${fleet.unloaded} unloaded · ${fleet.trip} trip`
              : 'Menunggu sumber data'}
          </p>

          <p className="fleet-detail">
            {snapshot
              ? `${fleet.inactive} unit tanpa data simulasi`
              : 'Tidak ada koneksi Live'}
          </p>
        </div>

        <div className="sidebar-footer">
          <span className="readonly-badge">
            {demoMode ? 'READ-ONLY DEMO' : 'READ-ONLY LIVE'}
          </span>

          <p>
            Dashboard pemantauan.
            <br />
            Tidak menyediakan kontrol mesin.
          </p>

          <small>SERVICE AIR / OPERATIONS</small>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <h1>
              Service Air Compressor Online Dashboard Monitoring System
            </h1>

            <p className="breadcrumb">
              UTILITY SYSTEMS / SERVICE AIR / OPERATIONS CONTROL
            </p>
          </div>

          <div className="clock">
            <div>
              <strong>{formatTime(clock.getTime())}</strong>
              <span>WITA · UTC+08:00</span>
            </div>

            <small>
              {clock.toLocaleDateString('en-GB', {
                timeZone: 'Asia/Makassar',
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </small>
          </div>
        </header>

        <div className="statusbar">
          <div className="connection-status" role="status">
            <span
              className={`status-dot ${
                demoMode ? 'demo-dot' : 'offline-dot'
              }`}
              aria-hidden="true"
            />

            <span>
              {demoMode
                ? 'Demo / Sample telemetry — not connected'
                : 'Live / Belum terhubung ke sumber data'}
            </span>
          </div>

          <div
            className="status-summary"
            aria-label="Status akuisisi"
          >
            <span className="summary-active">
              ● {snapshot ? fleet.active : '—'} acquisition active
            </span>

            <span>
              ○ {snapshot ? fleet.inactive : '—'} inactive
            </span>

            <span className="summary-trip">
              ● {snapshot ? fleet.trip : '—'} trip
              {demoMode ? ' (demo)' : ''}
            </span>
          </div>

          <div className="mode-control">
            <span id="demo-label">Demo</span>

            <button
              type="button"
              role="switch"
              aria-checked={demoMode}
              aria-labelledby="demo-label"
              className={`mode-switch ${
                demoMode ? 'enabled' : ''
              }`}
              onClick={toggleDemo}
            >
              <span className="switch-thumb" />
            </button>
          </div>
        </div>

        <div className="content">
          <div className="page-heading">
            <div>
              <h2>{activeMenu}</h2>

              <p className="muted">
                {demoMode
                  ? 'Macro plant monitoring / 15-unit demo fleet · Data ilustrasi'
                  : 'Mode Live / Data aktual belum tersedia'}
              </p>
            </div>

            <span className="mode-badge">
              {demoMode
                ? 'DEMO / OPERATOR VIEW'
                : 'LIVE / NO CONNECTION'}
            </span>
          </div>

          {activeMenu === menus[0] && (
            <>
              <section
                className="metrics"
                aria-label="Ringkasan sistem"
              >
                {metrics.map((metric, index) => (
                  <article
                    className="metric-card"
                    key={metric.title}
                  >
                    <h3>{metric.title}</h3>

                    <div className="metric-value-row">
                      <div className="metric-reading">
                        <strong>{metric.value}</strong>
                        <span>{metric.unit}</span>
                      </div>

                      {index === 0 && demoMode && (
                        <FlowSparkline history={history} />
                      )}
                    </div>

                    <p className={demoMode ? 'demo-text' : 'muted'}>
                      {demoMode
                        ? 'Sample telemetry · Simulasi frontend'
                        : 'Menunggu data aktual'}
                    </p>
                  </article>
                ))}
              </section>

              <section className="panel">
                <div className="panel-header">
                  <h3>Service air compressor fleet</h3>

                  <span className="fleet-status-summary">
                    {snapshot
                      ? `${fleet.loaded} LOADED / ${fleet.unloaded} UNLOADED / ${fleet.trip} TRIP / ${fleet.inactive} INACTIVE`
                      : 'MENUNGGU DATA AKTUAL'}
                  </span>
                </div>

                {snapshot ? (
                  <div className="compressor-grid">
                    {compressors.map((unit) => (
                      <button
                        key={unit.id}
                        type="button"
                        className="compressor-card compressor-link"
                        aria-label={`Lihat telemetry ${unit.id}`}
                        onClick={() => openUnit(unit.id)}
                      >
                        <span className="compressor-heading">
                          <strong className="compressor-name">
                            {unit.id}
                          </strong>

                          <StatusBadge status={unit.status} />
                        </span>

                        <span className="acquisition-label">
                          {unit.acquisitionActive
                            ? 'Sample telemetry · ACQ active'
                            : 'ACQ inactive · Data tidak tersedia'}
                        </span>

                        <span className="card-values">
                          <span>
                            <small>Disch. (psi)</small>
                            <b>
                              {formatReading(unit.dischargePressure)}
                            </b>
                          </span>

                          <span>
                            <small>Oil (psi)</small>
                            <b>
                              {formatReading(unit.oilPressure)}
                            </b>
                          </span>

                          <span>
                            <small>Motor (Amp)</small>
                            <b>
                              {formatReading(unit.motorCurrent, 0)}
                            </b>
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <EmptyLive />
                )}
              </section>

              <p className="overview-note">
                {snapshot
                  ? `Pembaruan simulasi: ${formatTime(snapshot.timestamp)} WITA · Klik kartu untuk membuka telemetry.`
                  : 'Aktifkan Demo untuk melihat contoh 15 unit kompresor.'}
              </p>
            </>
          )}

          {activeMenu === menus[1] && (
            <>
              <div className="telemetry-toolbar">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setActiveMenu(menus[0])}
                >
                  ← Kembali ke Overview
                </button>

                <div className="unit-picker">
                  <label htmlFor="unit-select">
                    Pilih kompresor
                  </label>

                  <select
                    id="unit-select"
                    value={snapshot ? selectedUnitId : ''}
                    disabled={!snapshot}
                    onChange={(event) => {
                      setSelectedUnitId(event.target.value)
                    }}
                  >
                    {!snapshot && (
                      <option value="">
                        Belum ada unit Live
                      </option>
                    )}

                    {compressors.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.id} — {unit.status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedUnit && snapshot ? (
                <>
                  <section className="panel unit-detail-panel">
                    <div className="unit-detail-heading">
                      <div>
                        <span className="eyebrow">
                          SELECTED COMPRESSOR
                        </span>

                        <h3>{selectedUnit.id}</h3>

                        <p className="muted">
                          Service air compressor · Contoh unit
                        </p>
                      </div>

                      <StatusBadge status={selectedUnit.status} />
                    </div>

                    <dl className="unit-information">
                      <div>
                        <dt>Data source</dt>
                        <dd>Demo / Simulasi frontend</dd>
                      </div>

                      <div>
                        <dt>Acquisition</dt>
                        <dd>
                          {selectedUnit.acquisitionActive
                            ? 'Active (demo)'
                            : 'Inactive (demo)'}
                        </dd>
                      </div>

                      <div>
                        <dt>Ketersediaan data</dt>
                        <dd>
                          {selectedUnit.acquisitionActive
                            ? 'Nilai contoh tersedia'
                            : 'Tidak tersedia'}
                        </dd>
                      </div>

                      <div>
                        <dt>Pembaruan nilai</dt>
                        <dd>
                          {selectedUnit.acquisitionActive
                            ? `${formatTime(snapshot.timestamp)} WITA`
                            : '—'}
                        </dd>
                      </div>
                    </dl>
                  </section>

                  <section
                    className="metrics telemetry-metrics"
                    aria-label={`Parameter ${selectedUnit.id}`}
                  >
                    {unitMetrics.map((metric) => (
                      <article
                        className="metric-card"
                        key={metric.title}
                      >
                        <h3>{metric.title}</h3>

                        <div className="metric-reading">
                          <strong>{metric.value}</strong>
                          <span>{metric.unit}</span>
                        </div>

                        <p className="muted">
                          {selectedUnit.acquisitionActive
                            ? 'Nilai simulasi'
                            : 'Akuisisi tidak aktif'}
                        </p>
                      </article>
                    ))}
                  </section>

                  <section className="panel">
                    <div className="panel-header">
                      <h3>Keterangan status unit</h3>
                    </div>

                    <div className="unit-explanation">
                      <p>
                        {statusDescriptions[selectedUnit.status]}
                      </p>
                    </div>
                  </section>
                </>
              ) : (
                <section className="panel">
                  <EmptyLive />
                </section>
              )}
            </>
          )}

          {activeMenu === menus[2] && (
            <ProcessTrends demoMode={demoMode} />
          )}

          {activeMenu === menus[3] && (
            <AlarmsEvents demoMode={demoMode} />
          )}
        </div>

        <footer className="main-footer">
          <span>
            {demoMode
              ? 'Data simulasi untuk pengembangan antarmuka.'
              : 'Sumber data aktual belum dikonfigurasi.'}
          </span>

          <span>READ-ONLY / NO DEVICE CONTROL</span>
        </footer>
      </main>
    </div>
  )
}

export default App