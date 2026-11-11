import { useEffect, useState } from 'react'

export type CompressorStatus = 'Running' | 'Standby' | 'Isolate' | 'Trip'

export type Compressor = {
  id: string
  status: CompressorStatus
  acquisitionActive: boolean
  pressureStg1: number | null
  pressureStg2: number | null
  airTempStg1: number | null
  airTempStg2: number | null
  bearingDeTemp: number | null
  bearingNdeTemp: number | null
  ctInput: number | null
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
  history: DemoSnapshot[]
}

const SAMPLE_INTERVAL_MS = 2000
const HISTORY_WINDOW_MS = 120_000
const MAX_HISTORY_SAMPLES = 60

function round(value: number, decimals = 1): number {
  return Number(value.toFixed(decimals))
}

function demoStatus(unit: number): CompressorStatus {
  if (unit === 3 || unit === 13) return 'Standby'
  if (unit === 5 || unit === 12) return 'Trip'
  if (unit === 7 || unit === 15) return 'Isolate'
  return 'Running'
}

function createSnapshot(timestamp: number): DemoSnapshot {
  const seconds = timestamp / 1000

  const compressors: Compressor[] = Array.from({ length: 15 }, (_, index) => {
    const number = index + 1
    const status = demoStatus(number)
    const running = status === 'Running'
    const sac14 = number === 14

    // Seluruh nilai di fungsi ini khusus mode Demo.
    const wave = (period: number) => Math.sin(seconds / period + index)
    const wave14 = (period: number) => Math.sin(seconds / period)

    return {
      id: `SAC#${number}`,
      status,
      acquisitionActive: true,

      pressureStg1: !running ? 0 : sac14
        ? round(15.3 + wave14(7) * 0.2)
        : round(15.5 + (index % 4) * 0.4 + wave(7) * 0.3),

      pressureStg2: !running ? 0 : sac14
        ? round(45.2 + wave14(8) * 0.7)
        : round(44.8 + (index % 3) * 0.6 + wave(8) * 0.5),

      airTempStg1: !running ? round(30.2 + (index % 3) * 0.4) : sac14
        ? round(97.5 + wave14(11) * 0.5)
        : round(96.8 + (index % 5) * 0.4 + wave(11) * 0.4),

      airTempStg2: !running ? round(30.5 + (index % 3) * 0.4) : sac14
        ? round(84.6 + wave14(12) * 0.4)
        : round(84.2 + (index % 4) * 0.5 + wave(12) * 0.4),

      bearingDeTemp: !running ? round(32.1 + (index % 3) * 0.5) : sac14
        ? 0
        : round(56.4 + (index % 3) * 1.1 + wave(14) * 0.8),

      bearingNdeTemp: !running ? round(31.4 + (index % 3) * 0.5) : sac14
        ? 0
        : round(52.8 + (index % 3) * 0.9 + wave(15) * 0.7),

      ctInput: !running ? 0 : sac14
        ? Math.round(188 + wave14(6) * 2)
        : Math.round(186 + (index % 6) * 3 + wave(6) * 2),

      flow: running ? round(2450 + index * 25 + wave(8) * 35) : 0,
    }
  })

  return {
    timestamp,
    compressors,
    headerPressure: round(85.3 + Math.sin(seconds / 9) * 0.8),
    totalFlow: round(compressors.reduce((sum, unit) => sum + (unit.flow ?? 0), 0)),
    dewPoint: round(57.2 + Math.sin(seconds / 13) * 0.5),
  }
}

function createSession(): DemoSession {
  const snapshot = createSnapshot(Date.now())
  return { snapshot, history: [snapshot] }
}

export function useDemoData(enabled: boolean) {
  const [session, setSession] = useState<DemoSession>(createSession)

  useEffect(() => {
    if (!enabled) return

    const timer = window.setInterval(() => {
      const snapshot = createSnapshot(Date.now())

      setSession((previous) => ({
        snapshot,
        // Simpan seluruh snapshot agar tren tiap SAC bisa dibaca.
        history: [...previous.history, snapshot]
          .filter((item) => snapshot.timestamp - item.timestamp <= HISTORY_WINDOW_MS)
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