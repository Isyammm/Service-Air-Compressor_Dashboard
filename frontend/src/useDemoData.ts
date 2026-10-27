import { useEffect, useState } from 'react'

export type CompressorStatus =
  | 'Loaded'
  | 'Unloaded'
  | 'Trip'
  | 'Unknown'

export type Compressor = {
  id: string
  status: CompressorStatus
  acquisitionActive: boolean
  dischargePressure: number | null
  oilPressure: number | null
  motorCurrent: number | null
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

      const status: CompressorStatus =
        number >= 14
          ? 'Unknown'
          : number === 12
            ? 'Trip'
            : [5, 6, 13].includes(number)
              ? 'Unloaded'
              : 'Loaded'

      const acquisitionActive = number < 14

      const pressureVariation =
        Math.sin(seconds / 8 + index) * 0.6

      const oilVariation =
        Math.sin(seconds / 10 + index) * 0.4

      const currentVariation =
        Math.sin(seconds / 7 + index) * 4

      return {
        id: `SAC#${number}`,
        status,
        acquisitionActive,

        dischargePressure: !acquisitionActive
          ? null
          : status === 'Trip'
            ? 0
            : round(
                [85.3, 86.8, 83.9][index % 3] +
                  pressureVariation,
              ),

        oilPressure: !acquisitionActive
          ? null
          : status === 'Trip'
            ? 27.6
            : round(
                [30.5, 31.9, 29.0][index % 3] +
                  oilVariation,
              ),

        motorCurrent: !acquisitionActive
          ? null
          : status === 'Trip'
            ? 0
            : status === 'Unloaded'
              ? Math.round(118 + currentVariation)
              : Math.round(
                  395 + index * 3 + currentVariation,
                ),
      }
    },
  )

  return {
    timestamp,
    headerPressure: round(
      85.3 + Math.sin(seconds / 9) * 0.8,
    ),
    totalFlow: Math.round(
      32000 + Math.sin(seconds / 11) * 450,
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
  const [session, setSession] =
    useState<DemoSession>(createSession)

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
              snapshot.timestamp - item.timestamp <=
              HISTORY_WINDOW_MS,
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