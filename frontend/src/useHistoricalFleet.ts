import { useEffect, useState } from 'react'
import type { Compressor, CompressorStatus } from './useDemoData'

export type FleetStatus = CompressorStatus | 'Unknown'

export type DynamicParameter = {
  tag: string
  suffix: string
  label: string
  shortLabel: string
  unit: string
  category:
    | 'temperature'
    | 'pressure'
    | 'mechanical'
    | 'electrical'
    | 'flow'
    | 'status'
  value: number | null
}

export type FleetUnit = Omit<Compressor, 'status'> & {
  status: FleetStatus
  sourceTime?: string
  sourceFile?: string
  importId?: number
  issue?: string
  motorWindingTemp?: number | null
  customParameters?: DynamicParameter[]
  cardHighlights?: DynamicParameter[]
}

type ImportItem = {
  id: number
  fileName: string
  assetName: string
  tags: string[]
}

type Sample = {
  sourceTime: string
  values: (number | null)[]
}

type HistoryResponse = {
  tags: string[]
  data: Sample[]
  truncated?: boolean
}

type LoadedImport = {
  item: ImportItem
  unit: number
  history?: HistoryResponse
  error?: string
}

type LoadState = {
  key: string
  loading: boolean
  error: string
  notes: string[]
  imports: LoadedImport[]
}

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL ||
  'http://127.0.0.1:4000'
).replace(/\/$/, '')

export const TAG_CATALOG: Record<
  string,
  {
    label: string
    shortLabel: string
    unit: string
    category: DynamicParameter['category']
  }
> = {
  // Centac 2 & 14
  'AIR-TEMP-STG1-AI-MS': {
    label: 'Air Temperature Stage 1',
    shortLabel: 'AIR TEMP 1',
    unit: '°C',
    category: 'temperature',
  },
  'AIR-TEMP-STG2-AI-MS': {
    label: 'Air Temperature Stage 2',
    shortLabel: 'AIR TEMP 2',
    unit: '°C',
    category: 'temperature',
  },
  'ANY-COMPRESSOR-TRIP-DI-MS': {
    label: 'Any Compressor Trip Status',
    shortLabel: 'TRIP DI',
    unit: 'STATE',
    category: 'status',
  },
  'BRG-DE-TEMP-AI-MS': {
    label: 'Bearing DE Temperature',
    shortLabel: 'BRG DE TEMP',
    unit: '°C',
    category: 'mechanical',
  },
  'BRG-NDE-TEMP-AI-MS': {
    label: 'Bearing NDE Temperature',
    shortLabel: 'BRG NDE TEMP',
    unit: '°C',
    category: 'mechanical',
  },
  'CT-INPUT-AI-MS': {
    label: 'CT Input Current',
    shortLabel: 'CT INPUT',
    unit: 'A',
    category: 'electrical',
  },
  'DSCH-PRESSURE-STG1-AI-MS': {
    label: 'Discharge Pressure Stage 1',
    shortLabel: 'PRESS STG 1',
    unit: 'psi',
    category: 'pressure',
  },
  'DSCH-PRESSURE-STG2-AI-MS': {
    label: 'Discharge Pressure Stage 2',
    shortLabel: 'PRESS STG 2',
    unit: 'psi',
    category: 'pressure',
  },

  // Centac 3
  'PCV57033-AI': {
    label: 'Pressure Control Valve PCV-57033',
    shortLabel: 'PCV 57033',
    unit: '%',
    category: 'pressure',
  },
  'PT57033A-AI': {
    label: 'Pressure Transmitter PT-57033A',
    shortLabel: 'PT 57033A',
    unit: 'psi',
    category: 'pressure',
  },
  'PT57033B-AI': {
    label: 'Pressure Transmitter PT-57033B',
    shortLabel: 'PT 57033B',
    unit: 'psi',
    category: 'pressure',
  },
  'PT57033C-AI': {
    label: 'Pressure Transmitter PT-57033C',
    shortLabel: 'PT 57033C',
    unit: 'psi',
    category: 'pressure',
  },
  'PT57035A-AI': {
    label: 'System Pressure PT-57035A',
    shortLabel: 'PT 57035A',
    unit: 'psi',
    category: 'pressure',
  },
  'TT50733B-AI': {
    label: 'Temperature Transmitter TT-50733B',
    shortLabel: 'TT 50733B',
    unit: '°C',
    category: 'temperature',
  },
  'TT57033A-AI': {
    label: 'Temperature Transmitter TT-57033A',
    shortLabel: 'TT 57033A',
    unit: '°C',
    category: 'temperature',
  },
  'TT57033C-AI': {
    label: 'Temperature Transmitter TT-57033C',
    shortLabel: 'TT 57033C',
    unit: '°C',
    category: 'temperature',
  },

  // Centac 4
  'FI-51037-AI': {
    label: 'Flow Indicator FI-51037',
    shortLabel: 'FLOW 51037',
    unit: 'SCFM',
    category: 'flow',
  },
  'FT57036-AI': {
    label: 'Flow Transmitter FT-57036',
    shortLabel: 'FT 57036',
    unit: 'SCFM',
    category: 'flow',
  },
  'FT57037-AI': {
    label: 'Flow Transmitter FT-57037',
    shortLabel: 'FT 57037',
    unit: 'SCFM',
    category: 'flow',
  },
  'HOT-AIR-DSCH-TEMP-AI-MS': {
    label: 'Hot Air Discharge Temperature',
    shortLabel: 'HOT AIR TEMP',
    unit: '°C',
    category: 'temperature',
  },
  'I-RMS-A-AI-MS': {
    label: 'Motor Current Phase A (RMS)',
    shortLabel: 'I-RMS PHASE A',
    unit: 'A',
    category: 'electrical',
  },
  'I-RMS-B-AI-MS': {
    label: 'Motor Current Phase B (RMS)',
    shortLabel: 'I-RMS PHASE B',
    unit: 'A',
    category: 'electrical',
  },
  'I-RMS-C-AI-MS': {
    label: 'Motor Current Phase C (RMS)',
    shortLabel: 'I-RMS PHASE C',
    unit: 'A',
    category: 'electrical',
  },

  // Centac 7
  'AVERAGE MOTOR WINDING TEMPERATURE-AI': {
    label: 'Average Motor Winding Temperature',
    shortLabel: 'WINDING TEMP',
    unit: '°C',
    category: 'temperature',
  },
  'B61-AI': {
    label: 'Sensor Reading B61',
    shortLabel: 'TAG B61',
    unit: 'RAW',
    category: 'mechanical',
  },
  'B62-AI': {
    label: 'Sensor Reading B62',
    shortLabel: 'TAG B62',
    unit: 'RAW',
    category: 'mechanical',
  },
  'B64-AI': {
    label: 'Sensor Reading B64',
    shortLabel: 'TAG B64',
    unit: 'RAW',
    category: 'mechanical',
  },
  'FI-51040-AI': {
    label: 'Flow Indicator FI-51040',
    shortLabel: 'FLOW 51040',
    unit: 'SCFM',
    category: 'flow',
  },

  // Centac 10
  'MOTOR-OUTBOARD-BRG-TEMP-AI': {
    label: 'Motor Outboard Bearing Temp',
    shortLabel: 'OUTBOARD BRG',
    unit: '°F',
    category: 'mechanical',
  },
  'MOTOR-STATOR-TEMP-AI-MS': {
    label: 'Motor Stator Temperature',
    shortLabel: 'STATOR TEMP',
    unit: '°F',
    category: 'temperature',
  },
  'OIL-PRESSURE-AI-MS': {
    label: 'Lube Oil Pressure',
    shortLabel: 'OIL PRESS',
    unit: 'psi',
    category: 'pressure',
  },
  'READY-DI-MS': {
    label: 'Compressor Ready Status (DI)',
    shortLabel: 'READY DI',
    unit: 'STATE',
    category: 'status',
  },
  'SYSTEM-PRESSURE-AI-MS': {
    label: 'System Discharge Pressure',
    shortLabel: 'SYS PRESS',
    unit: 'psi',
    category: 'pressure',
  },
  'VIB-STG1X-AI-MS': {
    label: 'Stage 1 Vibration X-Axis',
    shortLabel: 'VIB STG1 X',
    unit: 'mils',
    category: 'mechanical',
  },
  'VIB-STG1Y-AI-MS': {
    label: 'Stage 1 Vibration Y-Axis',
    shortLabel: 'VIB STG1 Y',
    unit: 'mils',
    category: 'mechanical',
  },
}

const UNIT_CARD_PRIORITY: Record<number, string[]> = {
  2: ['AIR-TEMP-STG1-AI-MS', 'DSCH-PRESSURE-STG2-AI-MS', 'CT-INPUT-AI-MS'],
  3: ['TT57033A-AI', 'PT57035A-AI', 'PT57033C-AI'],
  4: ['FT57036-AI', 'I-RMS-A-AI-MS', 'I-RMS-B-AI-MS'],
  7: ['FI-51040-AI', 'I-RMS-A-AI-MS', 'I-RMS-B-AI-MS'],
  10: ['MOTOR-STATOR-TEMP-AI-MS', 'SYSTEM-PRESSURE-AI-MS', 'OIL-PRESSURE-AI-MS'],
  14: ['AIR-TEMP-STG1-AI-MS', 'DSCH-PRESSURE-STG2-AI-MS', 'CT-INPUT-AI-MS'],
}

const fields = [
  ['airTempStg1', 'AIR-TEMP-STG1-AI-MS'],
  ['airTempStg2', 'AIR-TEMP-STG2-AI-MS'],
  ['bearingDeTemp', 'BRG-DE-TEMP-AI-MS'],
  ['bearingNdeTemp', 'BRG-NDE-TEMP-AI-MS'],
  ['pressureStg1', 'DSCH-PRESSURE-STG1-AI-MS'],
  ['pressureStg2', 'DSCH-PRESSURE-STG2-AI-MS'],
  ['ctInput', 'CT-INPUT-AI-MS'],
] as const

function emptyUnit(number: number): FleetUnit {
  return {
    id: `SAC#${number}`,
    status: 'Unknown',
    acquisitionActive: false,
    pressureStg1: null,
    pressureStg2: null,
    airTempStg1: null,
    airTempStg2: null,
    bearingDeTemp: null,
    bearingNdeTemp: null,
    ctInput: null,
    motorWindingTemp: null,
    flow: null,
    customParameters: [],
    cardHighlights: [],
  }
}

function isObject(
  value: unknown,
): value is Record<string, unknown> {
  return value !== null && typeof value === 'object'
}

function isImportItem(value: unknown): value is ImportItem {
  return (
    isObject(value) &&
    Number.isSafeInteger(value.id) &&
    Number(value.id) > 0 &&
    typeof value.fileName === 'string' &&
    typeof value.assetName === 'string' &&
    Array.isArray(value.tags) &&
    value.tags.every((tag) => typeof tag === 'string')
  )
}

function isHistoryResponse(
  value: unknown,
): value is HistoryResponse {
  if (
    !isObject(value) ||
    !Array.isArray(value.tags) ||
    !Array.isArray(value.data)
  ) {
    return false
  }

  const tagCount = value.tags.length

  return (
    value.tags.every((tag) => typeof tag === 'string') &&
    value.data.every(
      (sample) =>
        isObject(sample) &&
        typeof sample.sourceTime === 'string' &&
        /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(
          sample.sourceTime,
        ) &&
        Array.isArray(sample.values) &&
        sample.values.length === tagCount &&
        sample.values.every(
          (reading) =>
            reading === null ||
            (typeof reading === 'number' &&
              Number.isFinite(reading)),
        ),
    )
  )
}

function identifyUnit(tags: string[]): number | null {
  const numbers = new Set(
    tags
      .map((tag) => /^U-SAC(\d+)-/i.exec(tag.trim())?.[1])
      .filter((number): number is string => Boolean(number))
      .map(Number),
  )

  if (numbers.size !== 1) return null

  const number = [...numbers][0]

  return number >= 1 && number <= 15 ? number : null
}

async function request(
  endpoint: string,
  signal: AbortSignal,
): Promise<unknown> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    signal,
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(
      `API mengembalikan HTTP ${response.status}.`,
    )
  }

  return response.json()
}

function mapSample(
  unitNumber: number,
  tags: string[],
  sample: Sample,
): FleetUnit {
  const unit = emptyUnit(unitNumber)

  unit.sourceTime = sample.sourceTime

  const prefixRegex = new RegExp(`^U-SAC${unitNumber}-`, 'i')

  const customParameters: DynamicParameter[] = tags.map((rawTag, idx) => {
    const cleanTag = rawTag.trim()
    const suffix = cleanTag.replace(prefixRegex, '').toUpperCase()
    const meta = TAG_CATALOG[suffix] ?? {
      label: suffix.replace(/-/g, ' '),
      shortLabel: suffix.slice(0, 12),
      unit: 'RAW',
      category: 'mechanical' as const,
    }

    const rawVal = sample.values[idx]
    const validVal =
      typeof rawVal === 'number' && Number.isFinite(rawVal) && rawVal > -9000
        ? rawVal
        : null

    return {
      tag: cleanTag,
      suffix,
      label: meta.label,
      shortLabel: meta.shortLabel,
      unit: meta.unit,
      category: meta.category,
      value: validVal,
    }
  })

  unit.customParameters =
    unitNumber === 2 || unitNumber === 14
      ? customParameters.filter(
          (p) => p.suffix !== 'AVERAGE MOTOR WINDING TEMPERATURE-AI',
        )
      : customParameters

  const prioritySuffixes = UNIT_CARD_PRIORITY[unitNumber] ?? []
  const highlights: DynamicParameter[] = []

  for (const sfx of prioritySuffixes) {
    const found = customParameters.find((p) => p.suffix === sfx)
    if (found) highlights.push(found)
  }

  for (const param of customParameters) {
    if (highlights.length >= 3) break
    if (!highlights.includes(param)) {
      highlights.push(param)
    }
  }

  unit.cardHighlights = highlights.slice(0, 3)

  for (const [field, suffix] of fields) {
    const match = customParameters.find((p) => p.suffix === suffix)
    unit[field] = match ? match.value : null
  }

  unit.acquisitionActive = customParameters.some((p) => p.value !== null)

  return unit
}

export function useHistoricalFleet(
  enabled: boolean,
  day: string,
  time: string,
) {
  const [reload, setReload] = useState(0)

  const [state, setState] = useState<LoadState>({
    key: '',
    loading: false,
    error: '',
    notes: [],
    imports: [],
  })

  const key = `${day}:${reload}`

  useEffect(() => {
    if (!enabled) {
      setState({
        key: '',
        loading: false,
        error: '',
        notes: [],
        imports: [],
      })
      return
    }

    const controller = new AbortController()

    setState({
      key,
      loading: true,
      error: '',
      notes: [],
      imports: [],
    })

    async function load() {
      try {
        const response = await request(
          '/api/history/imports',
          controller.signal,
        )

        if (
          !isObject(response) ||
          !Array.isArray(response.data) ||
          !response.data.every(isImportItem)
        ) {
          throw new Error(
            'Format daftar impor API tidak sesuai.',
          )
        }

        const grouped = new Map<number, ImportItem[]>()
        const notes: string[] = []

        for (const item of response.data) {
          const unit = identifyUnit(item.tags)

          if (unit === null) {
            notes.push(
              `Impor #${item.id} tidak memiliki identitas unit yang jelas.`,
            )
            continue
          }

          grouped.set(unit, [
            ...(grouped.get(unit) ?? []),
            item,
          ])
        }

        const jobs = [...grouped.entries()].flatMap(
          ([unit, items]) => {
            if (items.length > 1) {
              notes.push(
                `SAC#${unit}: ${items.length} impor. Pada timestamp yang sama, ID impor terbesar diprioritaskan.`,
              )
            }

            return items.map((item) => ({ unit, item }))
          },
        )

        const loaded: LoadedImport[] = []
        let cursor = 0

        async function worker() {
          while (
            cursor < jobs.length &&
            !controller.signal.aborted
          ) {
            const job = jobs[cursor++]

            try {
              const result = await request(
                `/api/history/${job.item.id}/samples?day=${encodeURIComponent(day)}`,
                controller.signal,
              )

              if (
                !isHistoryResponse(result) ||
                identifyUnit(result.tags) !== job.unit
              ) {
                throw new Error(
                  'Format sampel atau identitas tag tidak sesuai.',
                )
              }

              loaded.push({
                ...job,
                history: result,
              })
            } catch (error) {
              if (controller.signal.aborted) return

              loaded.push({
                ...job,
                error:
                  error instanceof Error
                    ? error.message
                    : 'Gagal mengambil sampel.',
              })
            }
          }
        }

        await Promise.all(
          Array.from(
            { length: Math.min(3, jobs.length) },
            worker,
          ),
        )

        if (!controller.signal.aborted) {
          setState({
            key,
            loading: false,
            error: '',
            notes,
            imports: loaded,
          })
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setState({
            key,
            loading: false,
            error:
              error instanceof Error
                ? error.message
                : 'Backend tidak dapat dihubungi.',
            notes: [],
            imports: [],
          })
        }
      }
    }

    void load()

    return () => controller.abort()
  }, [enabled, day, key])

  const current = enabled && state.key === key
  const imports = current ? state.imports : []

  const sourceTime = `${day} ${
    time.length === 5 ? `${time}:00` : time
  }`

  const loading =
    enabled && (!current || state.loading)

  const error = current ? state.error : ''

  const compressors: FleetUnit[] = Array.from(
    { length: 15 },
    (_, index) => {
      const number = index + 1

      const candidates = imports
        .filter((item) => item.unit === number)
        .sort((a, b) => b.item.id - a.item.id)

      for (const candidate of candidates) {
        const history = candidate.history

        if (!history) continue

        const sample = history.data.find(
          (item) => item.sourceTime === sourceTime,
        )

        if (!sample) continue

        return {
          ...mapSample(number, history.tags, sample),
          sourceFile: candidate.item.fileName,
          importId: candidate.item.id,
          issue: candidates.some((item) => item.error)
            ? 'Sebagian impor unit gagal dimuat.'
            : undefined,
        }
      }

      return {
        ...emptyUnit(number),
        issue: loading
          ? 'Memuat data…'
          : error
            ? 'Sumber data tidak dapat dimuat.'
            : candidates.some((item) => item.error)
              ? 'Gagal memuat data unit.'
              : candidates.length
                ? 'Tidak ada sampel pada waktu pilihan.'
                : 'Belum ada impor untuk unit ini.',
      }
    },
  )

  const warnings = imports.flatMap((item) => {
    if (item.error) {
      return [
        `SAC#${item.unit}, impor #${item.item.id}: ${item.error}`,
      ]
    }

    if (item.history?.truncated) {
      return [
        `Impor #${item.item.id}: respons dibatasi 1.440 sampel. Sebagian waktu mungkin tidak tersedia.`,
      ]
    }

    return []
  })

  return {
    compressors,
    sourceTime,
    loading,
    error,
    warnings,
    notes: current ? state.notes : [],
    refresh: () => setReload((value) => value + 1),
  }
}
