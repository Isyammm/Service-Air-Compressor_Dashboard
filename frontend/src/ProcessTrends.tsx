import { useEffect, useState } from 'react'

type Sample = {
  timestamp: number
  pressure: number
  flow: number
  dewPoint: number
}

type Parameter = 'pressure' | 'flow' | 'dewPoint'

const parameters: Record<
  Parameter,
  {
    label: string
    unit: string
    color: string
    decimals: number
  }
> = {
  pressure: {
    label: 'Header System Pressure',
    unit: 'psi',
    color: '#00a66c',
    decimals: 1,
  },
  flow: {
    label: 'Total Air Flow',
    unit: 'SCFM',
    color: '#0079A1',
    decimals: 0,
  },
  dewPoint: {
    label: 'Dew Point Temperature',
    unit: '°F',
    color: '#A4C8E1',
    decimals: 1,
  },
}

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString('en-GB', {
    timeZone: 'Asia/Makassar',
  })
}

function formatValue(value: number, decimals: number) {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

function generateInitialSamples(count = 60): Sample[] {
  const now = Date.now()
  return Array.from({ length: count }, (_, index) => {
    const timestamp = now - (count - 1 - index) * 2000
    const phase = timestamp / 1000
    return {
      timestamp,
      pressure: Number((85.3 + Math.sin(phase / 7) * 1.1).toFixed(1)),
      flow: Math.round(32000 + Math.sin(phase / 9) * 550),
      dewPoint: Number((57.2 + Math.sin(phase / 12) * 0.7).toFixed(1)),
    }
  })
}

function TrendChart({
  samples,
  parameter,
}: {
  samples: Sample[]
  parameter: Parameter
}) {
  const config = parameters[parameter]

  if (samples.length === 0) {
    return (
      <div className="empty-state trend-empty">
        <span className="empty-symbol" aria-hidden="true">
          ◇
        </span>
        <h3>Menunggu sampel pertama</h3>
        <p>Simulasi mulai mengisi grafik dalam sekitar 2 detik.</p>
      </div>
    )
  }

  const width = 960
  const height = 310

  const left = 80
  const right = 28
  const top = 24
  const bottom = 48

  const plotWidth = width - left - right
  const plotHeight = height - top - bottom

  const values = samples.map((sample) => sample[parameter])

  const smallest = Math.min(...values)
  const largest = Math.max(...values)

  // Span minimum agar variasi sensor normal tidak tampak seperti lonjakan tajam ekstrem
  const minSpan =
    parameter === 'flow' ? 2400 : parameter === 'pressure' ? 6 : 4
  const center = (smallest + largest) / 2
  const currentSpan = Math.max(largest - smallest, minSpan)
  const padding = currentSpan * 0.15

  const yMin = center - (currentSpan / 2 + padding)
  const yMax = center + (currentSpan / 2 + padding)

  // Sumbu waktu jendela 120 detik (rolling window)
  const windowDuration = 120_000
  const lastTime = samples[samples.length - 1].timestamp
  const firstTime = samples[0].timestamp
  const elapsed = lastTime - firstTime

  // Jika sampel belum mencapai 120s, mulai dari sampel pertama agar garis tumbuh dari kiri ke kanan
  const startTime =
    elapsed < windowDuration ? firstTime : lastTime - windowDuration

  const getX = (timestamp: number) =>
    left + ((timestamp - startTime) / windowDuration) * plotWidth

  const getY = (value: number) =>
    top + plotHeight - ((value - yMin) / (yMax - yMin)) * plotHeight

  const points = samples
    .map((sample) => `${getX(sample.timestamp)},${getY(sample[parameter])}`)
    .join(' ')

  const lastSample = samples[samples.length - 1]
  const lastX = getX(lastSample.timestamp)
  const lastY = getY(lastSample[parameter])
  const firstX = getX(samples[0].timestamp)
  const areaPoints = `${firstX},${top + plotHeight} ${points} ${lastX},${top + plotHeight}`

  return (
    <div className="trend-chart-scroll">
      <svg
        className="trend-chart-svg"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Grafik simulasi ${config.label} dalam ${config.unit}`}
      >
        <title>
          {config.label} — Data tren pemantauan
        </title>

        <defs>
          <linearGradient
            id={`trend-gradient-${parameter}`}
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop
              offset="0%"
              stopColor={config.color}
              stopOpacity="0.28"
            />
            <stop
              offset="70%"
              stopColor={config.color}
              stopOpacity="0.04"
            />
            <stop
              offset="100%"
              stopColor={config.color}
              stopOpacity="0"
            />
          </linearGradient>
        </defs>

        {/* Latar area plot */}
        <rect
          x={left}
          y={top}
          width={plotWidth}
          height={plotHeight}
          className="trend-plot-bg"
          rx="4"
        />

        {/* Garis grid horizontal dan nilai sumbu Y */}
        {Array.from({ length: 5 }, (_, index) => {
          const fraction = index / 4
          const value = yMax - fraction * (yMax - yMin)
          const y = top + fraction * plotHeight

          return (
            <g key={`y-${index}`}>
              <line
                x1={left}
                y1={y}
                x2={width - right}
                y2={y}
                className="trend-grid-h"
                strokeDasharray="4 4"
              />

              <text
                x={left - 10}
                y={y + 4}
                textAnchor="end"
                className="trend-axis-text"
                fontSize="11"
              >
                {formatValue(value, config.decimals)}
              </text>
            </g>
          )
        })}

        {/* Garis grid vertikal dan label waktu sumbu X */}
        {Array.from({ length: 5 }, (_, index) => {
          const fraction = index / 4
          const timestamp = startTime + fraction * windowDuration
          const x = left + fraction * plotWidth

          return (
            <g key={`x-${index}`}>
              <line
                x1={x}
                y1={top}
                x2={x}
                y2={top + plotHeight}
                className="trend-grid-v"
                strokeDasharray="2 3"
              />

              <line
                x1={x}
                y1={top + plotHeight}
                x2={x}
                y2={top + plotHeight + 5}
                className="trend-tick"
                strokeWidth="1.5"
              />

              <text
                x={x}
                y={height - 18}
                textAnchor={
                  index === 0
                    ? 'start'
                    : index === 4
                      ? 'end'
                      : 'middle'
                }
                className="trend-axis-text"
                fontSize="11"
              >
                {formatTime(timestamp)}
              </text>
            </g>
          )
        })}

        {/* Area gradien di bawah kurva tren */}
        {samples.length > 1 && (
          <polygon
            points={areaPoints}
            fill={`url(#trend-gradient-${parameter})`}
          />
        )}

        {/* Garis kurva tren */}
        <polyline
          points={points}
          fill="none"
          stroke={config.color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Lingkaran pembacaan titik terakhir */}
        <circle
          cx={lastX}
          cy={lastY}
          r="8"
          fill={config.color}
          opacity="0.3"
        />

        <circle
          cx={lastX}
          cy={lastY}
          r="4.5"
          fill="#ffffff"
          stroke={config.color}
          strokeWidth="2.5"
        />

        {/* Badge angka nilai langsung melayang pada titik terakhir */}
        <g
          transform={`translate(${Math.min(
            Math.max(lastX - 42, left + 4),
            width - right - 86,
          )}, ${Math.max(lastY - 26, top + 4)})`}
        >
          <rect
            width="82"
            height="20"
            rx="4"
            fill="#0f1926"
            stroke={config.color}
            strokeWidth="1"
            opacity="0.95"
          />
          <text
            x="41"
            y="14"
            textAnchor="middle"
            fill="#ffffff"
            fontSize="10"
            fontFamily="Consolas, monospace"
            fontWeight="600"
          >
            {formatValue(lastSample[parameter], config.decimals)} {config.unit}
          </text>
        </g>
      </svg>
    </div>
  )
}

function DemoTrends() {
  const [samples, setSamples] = useState<Sample[]>(() =>
    generateInitialSamples(60),
  )
  const [parameter, setParameter] = useState<Parameter>('pressure')
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused) return

    const timer = window.setInterval(() => {
      const timestamp = Date.now()
      const phase = timestamp / 1000

      // Angka ilustrasi; bukan model fisik kompresor.
      const sample: Sample = {
        timestamp,
        pressure: Number(
          (85.3 + Math.sin(phase / 7) * 1.1).toFixed(1),
        ),
        flow: Math.round(
          32000 + Math.sin(phase / 9) * 550,
        ),
        dewPoint: Number(
          (57.2 + Math.sin(phase / 12) * 0.7).toFixed(1),
        ),
      }

      setSamples((previous) =>
        [...previous, sample]
          .filter((item) => timestamp - item.timestamp <= 120_000)
          .slice(-60),
      )
    }, 2000)

    return () => window.clearInterval(timer)
  }, [paused])

  const config = parameters[parameter]
  const latest = samples[samples.length - 1]

  const values = samples.map((sample) => sample[parameter])

  const stats = values.length
    ? {
      minimum: Math.min(...values),
      maximum: Math.max(...values),
      average:
        values.reduce((total, value) => total + value, 0) /
        values.length,
    }
    : null

  function togglePause() {
    setPaused((previous) => !previous)
  }

  return (
    <>
      <div className="trend-toolbar">
        <div className="unit-picker">
          <label htmlFor="trend-parameter">Parameter</label>

          <select
            id="trend-parameter"
            value={parameter}
            onChange={(event) =>
              setParameter(event.target.value as Parameter)
            }
          >
            <option value="pressure">Header Pressure — psi</option>
            <option value="flow">Total Air Flow — SCFM</option>
            <option value="dewPoint">Dew Point — °F</option>
          </select>
        </div>

        <div className="trend-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={togglePause}
          >
            {paused ? 'Lanjutkan simulasi' : 'Jeda simulasi'}
          </button>

          <button
            type="button"
            className="secondary-button"
            onClick={() => setSamples(generateInitialSamples(60))}
          >
            Reset grafik
          </button>
        </div>
      </div>

      <section className="metrics" aria-label="Statistik tren">
        {[
          {
            title: 'Nilai terakhir',
            value: latest ? latest[parameter] : null,
          },
          {
            title: 'Minimum sesi',
            value: stats?.minimum ?? null,
          },
          {
            title: 'Maksimum sesi',
            value: stats?.maximum ?? null,
          },
          {
            title: 'Rata-rata sesi',
            value: stats?.average ?? null,
          },
        ].map((metric) => (
          <article className="metric-card" key={metric.title}>
            <h3>{metric.title}</h3>

            <div className="metric-reading">
              <strong>
                {metric.value === null
                  ? '—'
                  : formatValue(metric.value, config.decimals)}
              </strong>
              <span>{config.unit}</span>
            </div>

            <p className="demo-text">Berdasarkan sampel simulasi tersimpan</p>
          </article>
        ))}
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>{config.label}</h3>
            <p className="trend-subtitle">
              Jendela 120 detik · interval target 2 detik
            </p>
          </div>

          <span className={`trend-state ${paused ? 'paused' : ''}`}>
            <span className="equipment-dot" aria-hidden="true" />
            {paused ? 'SIMULASI DIJEDA' : 'SIMULASI AKTIF'}
          </span>
        </div>

        <div className="trend-chart-heading">
          <span>
            <i
              className="trend-legend"
              style={{ backgroundColor: config.color }}
            />
            {config.label} ({config.unit})
          </span>

          <span className="trend-sample-info">
            {samples.length} / 60 sampel · Jendela 2 menit
          </span>
        </div>

        <TrendChart samples={samples} parameter={parameter} />

        <div className="trend-bottom">
          <span>
            Sampel terakhir:{' '}
            <strong>{latest ? formatTime(latest.timestamp) : '—'}</strong>
          </span>

          <span>
            {paused
              ? 'Nilai ditahan selama jeda — klik "Lanjutkan simulasi" untuk melanjutkan.'
              : 'Hanya data simulasi waktu nyata — bukan data perangkat aktual.'}
          </span>
        </div>
      </section>

      <p className="trend-note">
        Riwayat hanya disimpan selama halaman ini terbuka.
        Pindah halaman atau matikan Demo akan menghapus sesi.
        Grafik belum mengambil histori dari MySQL.
      </p>
    </>
  )
}

export default function ProcessTrends({
  demoMode,
}: {
  demoMode: boolean
}) {
  if (!demoMode) {
    return (
      <section className="panel">
        <div className="panel-header">
          <h3>Process &amp; Trends</h3>
          <span className="eyebrow">LIVE / STANDBY</span>
        </div>

        <div className="empty-state">
          <span className="empty-symbol" aria-hidden="true">◇</span>
          <h3>Data Tren Live Belum Terhubung</h3>
          <p>
            Aktifkan sakelar <strong>Simulasi Aktif</strong> di status bar atas untuk melihat grafik tren dinamika proses
            (Header Pressure, Total Air Flow, dan Dew Point Temperature).
          </p>
        </div>
      </section>
    )
  }

  return <DemoTrends />
}
