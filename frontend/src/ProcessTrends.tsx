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
    color: '#007f65',
    decimals: 1,
  },
  flow: {
    label: 'Total Air Flow',
    unit: 'SCFM',
    color: '#2563eb',
    decimals: 0,
  },
  dewPoint: {
    label: 'Dew Point Temperature',
    unit: '°F',
    color: '#946200',
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

  const left = 84
  const right = 24
  const top = 24
  const bottom = 52

  const plotWidth = width - left - right
  const plotHeight = height - top - bottom

  const values = samples.map((sample) => sample[parameter])

  const smallest = Math.min(...values)
  const largest = Math.max(...values)

  const minimumPadding = parameter === 'flow' ? 100 : 0.5
  const padding = Math.max((largest - smallest) * 0.2, minimumPadding)

  const yMin = smallest - padding
  const yMax = largest + padding

  // Sumbu waktu menampilkan jendela 120 detik.
  const endTime = samples[samples.length - 1].timestamp
  const startTime = endTime - 120_000

  const getX = (timestamp: number) =>
    left + ((timestamp - startTime) / 120_000) * plotWidth

  const getY = (value: number) =>
    top + plotHeight - ((value - yMin) / (yMax - yMin)) * plotHeight

  const points = samples
    .map((sample) => {
      return `${getX(sample.timestamp)},${getY(sample[parameter])}`
    })
    .join(' ')

  const lastSample = samples[samples.length - 1]

  return (
    <div className="trend-chart-scroll">
      <svg
        className="trend-chart-svg"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Grafik simulasi ${config.label} dalam ${config.unit}`}
      >
        <title>
          {config.label} — Data simulasi, bukan pembacaan perangkat
        </title>

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
                stroke="#dce4ed"
                strokeDasharray="4 5"
              />

              <text
                x={left - 12}
                y={y + 4}
                textAnchor="end"
                fill="#52647a"
                fontSize="12"
              >
                {formatValue(value, config.decimals)}
              </text>
            </g>
          )
        })}

        {Array.from({ length: 5 }, (_, index) => {
          const fraction = index / 4
          const timestamp = startTime + fraction * 120_000
          const x = left + fraction * plotWidth

          return (
            <g key={`x-${index}`}>
              <line
                x1={x}
                y1={top}
                x2={x}
                y2={top + plotHeight}
                stroke="#edf1f6"
              />

              <text
                x={x}
                y={height - 22}
                textAnchor={
                  index === 0
                    ? 'start'
                    : index === 4
                      ? 'end'
                      : 'middle'
                }
                fill="#52647a"
                fontSize="11"
              >
                {formatTime(timestamp)}
              </text>
            </g>
          )
        })}

        <polyline
          points={points}
          fill="none"
          stroke={config.color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <circle
          cx={getX(lastSample.timestamp)}
          cy={getY(lastSample[parameter])}
          r="5"
          fill={config.color}
          stroke="#ffffff"
          strokeWidth="2"
        />
      </svg>
    </div>
  )
}

function DemoTrends() {
  const [samples, setSamples] = useState<Sample[]>([])
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
    // Mulai segmen baru setelah jeda agar garis tidak
    // menghubungkan waktu ketika simulator tidak merekam.
    if (paused) setSamples([])
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
            onClick={() => setSamples([])}
          >
            Bersihkan grafik
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
              Jendela 120 detik · interval target 2 detik · WITA
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

          <span>{samples.length} / 60 sampel</span>
        </div>

        <TrendChart samples={samples} parameter={parameter} />

        <div className="trend-bottom">
          <span>
            Sampel terakhir:{' '}
            {latest ? `${formatTime(latest.timestamp)} WITA` : '—'}
          </span>

          <span>
            {paused
              ? 'Nilai ditahan selama jeda; lanjutkan untuk sesi baru.'
              : 'Hanya data simulasi — bukan data perangkat.'}
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
          <h3>Process & trends</h3>
          <span className="eyebrow">LIVE / BELUM TERHUBUNG</span>
        </div>

        <div className="empty-state">
          <span className="empty-symbol" aria-hidden="true">◇</span>
          <h3>Belum ada data tren Live</h3>
          <p>
            Hubungkan sumber data aktual melalui backend.
            Aktifkan Mode Demo untuk mencoba grafik simulasi.
          </p>
        </div>
      </section>
    )
  }

  // Komponen simulator dilepas saat Demo OFF,
  // sehingga timer dan seluruh riwayatnya dibersihkan.
  return <DemoTrends />
}