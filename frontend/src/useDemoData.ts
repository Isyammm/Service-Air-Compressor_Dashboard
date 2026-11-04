import { useEffect, useState } from 'react'

export type CompressorStatus =
  | 'Running'
  | 'Standby'
  | 'Isolate'
  | 'Trip'

export type Compressor = {
  id: string
  status: CompressorStatus
  acquisitionActive: boolean
  // 7 Parameter Standar Ingersoll Rand Centac:
  pressureStg1: number | null   // U-SACxx-DSCH-PRESSURE-STG1-AI-MS (psi)
  pressureStg2: number | null   // U-SACxx-DSCH-PRESSURE-STG2-AI-MS (psi)
  airTempStg1: number | null    // U-SACxx-AIR-TEMP-STG1-AI-MS (°C)
  airTempStg2: number | null    // U-SACxx-AIR-TEMP-STG2-AI-MS (°C)
  bearingDeTemp: number | null  // U-SACxx-BEARING-DE-TEMP-AI-MS (°C)
  bearingNdeTemp: number | null // U-SACxx-BEARING-NDE-TEMP-AI-MS (°C)
  ctInput: number | null        // U-SACxx-CT-INPUT-AI-MS (A)
  // Aliran udara per unit untuk kalkulasi header flow:
  flow: number | null
}

export type TrendSample = {
  timestamp: number
  headerPressure: number
  totalFlow: number
  dewPoint: number
}

export type DemoSnapshot = TrendSample & {
  compressors: Compressor[]
}

type DemoSession = {
  snapshot: DemoSnapshot
  history: TrendSample[]
}

const SAMPLE_INTERVAL_MS = 2000
const HISTORY_WINDOW_MS = 120_000
const MAX_HISTORY_SAMPLES = 60

function round(value: number, decimals = 1) {
  return Number(value.toFixed(decimals))
}

function createSnapshot(timestamp: number): DemoSnapshot {
  const seconds = timestamp / 1000

  const compressors: Compressor[] = Array.from(
    { length: 15 },
    (_, index) => {
      const number = index + 1

      // 4 Status Operasional Armada (Running, Standby, Isolate, Trip)
      // Ditempatkan agar seluruh 4 status langsung terlihat jelas di baris 1, 2, dan 3:
      // SAC#3 & SAC#13 = Standby (Merah)
      // SAC#5 & SAC#12 = Trip (Kuning)
      // SAC#7 & SAC#15 = Isolate (Putih)
      // Sisanya = Running (Hijau) (SAC#14 aktif terkalibrasi centac14.csv)
      const status: CompressorStatus =
        number === 3 || number === 13
          ? 'Standby'
          : number === 5 || number === 12
            ? 'Trip'
            : number === 7 || number === 15
              ? 'Isolate'
              : 'Running'

      const running = status === 'Running'
      const isSac14 = number === 14

      return {
        id: `SAC#${number}`,
        status,

        // Status komunikasi terpisah dari status operasi.
        acquisitionActive: true,

        // 7 Parameter Centac (Dikalibrasi dengan data aktual centac14.csv):
        pressureStg1: running
          ? isSac14
            ? round(15.3 + Math.sin(seconds / 7) * 0.2)
            : round(15.5 + (index % 4) * 0.4 + Math.sin(seconds / 7 + index) * 0.3)
          : 0,

        pressureStg2: running
          ? isSac14
            ? round(45.2 + Math.sin(seconds / 8) * 0.7)
            : round(44.8 + (index % 3) * 0.6 + Math.sin(seconds / 8 + index) * 0.5)
          : 0,

        airTempStg1: running
          ? isSac14
            ? round(97.5 + Math.sin(seconds / 11) * 0.5)
            : round(96.8 + (index % 5) * 0.4 + Math.sin(seconds / 11 + index) * 0.4)
          : round(30.2 + (index % 3) * 0.4),

        airTempStg2: running
          ? isSac14
            ? round(84.6 + Math.sin(seconds / 12) * 0.4)
            : round(84.2 + (index % 4) * 0.5 + Math.sin(seconds / 12 + index) * 0.4)
          : round(30.5 + (index % 3) * 0.4),

        bearingDeTemp: running
          ? isSac14
            ? 0
            : round(56.4 + (index % 3) * 1.1 + Math.sin(seconds / 14 + index) * 0.8)
          : round(32.1 + (index % 3) * 0.5),

        bearingNdeTemp: running
          ? isSac14
            ? 0
            : round(52.8 + (index % 3) * 0.9 + Math.sin(seconds / 15 + index) * 0.7)
          : round(31.4 + (index % 3) * 0.5),

        ctInput: running
          ? isSac14
            ? Math.round(188 + Math.sin(seconds / 6) * 2)
            : Math.round(186 + (index % 6) * 3 + Math.sin(seconds / 6 + index) * 2)
          : 0,

        flow: running
          ? round(2450 + index * 25 + Math.sin(seconds / 8 + index) * 35)
          : 0,
      }
    },
  )

  return {
    timestamp,

    headerPressure: round(
      85.3 + Math.sin(seconds / 9) * 0.8,
    ),

    totalFlow: round(
      compressors.reduce(
        (total, unit) => total + (unit.flow ?? 0),
        0,
      ),
    ),

    dewPoint: round(
      57.2 + Math.sin(seconds / 13) * 0.5,
    ),

    compressors,
  }
}

function toTrendSample(snapshot: DemoSnapshot): TrendSample {
  return {
    timestamp: snapshot.timestamp,
    headerPressure: snapshot.headerPressure,
    totalFlow: snapshot.totalFlow,
    dewPoint: snapshot.dewPoint,
  }
}

function createSession(): DemoSession {
  const snapshot = createSnapshot(Date.now())

  return {
    snapshot,
    history: [toTrendSample(snapshot)],
  }
}

export function useDemoData(enabled: boolean) {
  const [session, setSession] = useState<DemoSession>(createSession)

  // Mode Simulasi / Demo Generator
  useEffect(() => {
    if (!enabled) return

    const timer = window.setInterval(() => {
      const snapshot = createSnapshot(Date.now())
      const sample = toTrendSample(snapshot)

      setSession((previous) => ({
        snapshot,
        history: [...previous.history, sample]
          .filter(
            (item) =>
              snapshot.timestamp - item.timestamp <= HISTORY_WINDOW_MS,
          )
          .slice(-MAX_HISTORY_SAMPLES),
      }))
    }, SAMPLE_INTERVAL_MS)

    return () => window.clearInterval(timer)
  }, [enabled])

  function resetDemo() {
    setSession(createSession())
  }

  return {
    snapshot: enabled ? session.snapshot : null,
    history: enabled ? session.history : [],
    resetDemo,
  }
}
