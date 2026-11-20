import { useEffect, useMemo, useState } from 'react'
import type { Compressor, CompressorStatus } from './compressorTypes'
import { ACTIVE_UNIT_NUMBERS } from './fleetConfig'
import {
  getInstrumentMeta,
  useInstrumentCatalog,
} from './instrument-catalog'
import type { InstrumentCatalog } from './instrument-catalog'

export type FleetStatus = CompressorStatus | 'Unknown'

type Category =
  | 'temperature'
  | 'pressure'
  | 'mechanical'
  | 'electrical'
  | 'flow'
  | 'status'
  | 'other'

type TagMeta = {
  label: string
  shortLabel: string
  unit: string
  category: Category
}

export type DynamicParameter = TagMeta & {
  tag: string
  suffix: string
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
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:4000'
).replace(/\/$/, '')

function meta(
  label: string,
  shortLabel: string,
  unit: string,
  category: Category,
): TagMeta {
  return { label, shortLabel, unit, category }
}

export const TAG_CATALOG: Record<string, TagMeta> = {
  'AIR-TEMP-STG1-AI-MS':
    meta('Air Temperature Stage 1', 'AIR TEMP 1', '°C', 'temperature'),

  'AIR-TEMP-STG2-AI-MS':
    meta('Air Temperature Stage 2', 'AIR TEMP 2', '°C', 'temperature'),

  'BRG-DE-TEMP-AI-MS':
    meta('Bearing DE Temperature', 'BRG DE TEMP', '°C', 'mechanical'),

  'BRG-NDE-TEMP-AI-MS':
    meta('Bearing NDE Temperature', 'BRG NDE TEMP', '°C', 'mechanical'),

  'DSCH-PRESSURE-STG1-AI-MS':
    meta('Discharge Pressure Stage 1', 'PRESS STG 1', 'psi', 'pressure'),

  'DSCH-PRESSURE-STG2-AI-MS':
    meta('Discharge Pressure Stage 2', 'PRESS STG 2', 'psi', 'pressure'),

  'CT-INPUT-AI-MS':
    meta('CT Input Current', 'CT INPUT', 'A', 'electrical'),

  'ANY-COMPRESSOR-TRIP-DI-MS':
    meta('Any Compressor Trip Status', 'TRIP DI', 'STATE', 'status'),

  'PCV57033-AI':
    meta('Pressure Control Valve PCV-57033', 'PCV 57033', '%', 'pressure'),

  'PT57033A-AI':
    meta('Pressure Transmitter PT-57033A', 'PT 57033A', 'psi', 'pressure'),

  'PT57033B-AI':
    meta('Pressure Transmitter PT-57033B', 'PT 57033B', 'psi', 'pressure'),

  'PT57033C-AI':
    meta('Pressure Transmitter PT-57033C', 'PT 57033C', 'psi', 'pressure'),

  'PT57035A-AI':
    meta('System Pressure PT-57035A', 'PT 57035A', 'psi', 'pressure'),

  'TT50733B-AI':
    meta('Temperature Transmitter TT-50733B', 'TT 50733B', '°C', 'temperature'),

  'TT57033A-AI':
    meta('Temperature Transmitter TT-57033A', 'TT 57033A', '°C', 'temperature'),

  'TT57033C-AI':
    meta('Temperature Transmitter TT-57033C', 'TT 57033C', '°C', 'temperature'),

  'FI-51037-AI':
    meta('Flow Indicator FI-51037', 'FLOW 51037', 'SCFM', 'flow'),

  'FT57036-AI':
    meta('Flow Transmitter FT-57036', 'FT 57036', 'SCFM', 'flow'),

  'FT57037-AI':
    meta('Flow Transmitter FT-57037', 'FT 57037', 'SCFM', 'flow'),

  'HOT-AIR-DSCH-TEMP-AI-MS':
    meta('Hot Air Discharge Temperature', 'HOT AIR TEMP', '°C', 'temperature'),

  'I-RMS-A-AI-MS':
    meta('Motor Current Phase A (RMS)', 'I-RMS PHASE A', 'A', 'electrical'),

  'I-RMS-B-AI-MS':
    meta('Motor Current Phase B (RMS)', 'I-RMS PHASE B', 'A', 'electrical'),

  'I-RMS-C-AI-MS':
    meta('Motor Current Phase C (RMS)', 'I-RMS PHASE C', 'A', 'electrical'),

  'AVERAGE MOTOR WINDING TEMPERATURE-AI':
    meta('Average Motor Winding Temperature', 'WINDING TEMP', '°C', 'temperature'),

  'B61-AI':
    meta('Sensor Reading B61', 'TAG B61', 'RAW', 'mechanical'),

  'B62-AI':
    meta('Sensor Reading B62', 'TAG B62', 'RAW', 'mechanical'),

  'B64-AI':
    meta('Sensor Reading B64', 'TAG B64', 'RAW', 'mechanical'),

  'FI-51040-AI':
    meta('Flow Indicator FI-51040', 'FLOW 51040', 'SCFM', 'flow'),

  'MOTOR-OUTBOARD-BRG-TEMP-AI':
    meta('Motor Outboard Bearing Temp', 'OUTBOARD BRG', '°F', 'mechanical'),

  'MOTOR-STATOR-TEMP-AI-MS':
    meta('Motor Stator Temperature', 'STATOR TEMP', '°F', 'temperature'),

  'OIL-PRESSURE-AI-MS':
    meta('Lube Oil Pressure', 'OIL PRESS', 'psi', 'pressure'),

  'READY-DI-MS':
    meta('Compressor Ready Status (DI)', 'READY DI', 'STATE', 'status'),

  'SYSTEM-PRESSURE-AI-MS':
    meta('System Discharge Pressure', 'SYS PRESS', 'psi', 'pressure'),

  'VIB-STG1X-AI-MS':
    meta('Stage 1 Vibration X-Axis', 'VIB STG1 X', 'mils', 'mechanical'),

  'VIB-STG1Y-AI-MS':
    meta('Stage 1 Vibration Y-Axis', 'VIB STG1 Y', 'mils', 'mechanical'),
}

const STANDARD_HIGHLIGHTS = [
  'AIR-TEMP-STG1-AI-MS',
  'DSCH-PRESSURE-STG2-AI-MS',
  'CT-INPUT-AI-MS',
]

const UNIT_CARD_PRIORITY: Record<number, string[]> = {
  2: STANDARD_HIGHLIGHTS,
  3: ['TT57033A-AI', 'PT57035A-AI', 'PT57033C-AI'],
  4: ['FT57036-AI', 'I-RMS-A-AI-MS', 'I-RMS-B-AI-MS'],
  7: ['FI-51040-AI', 'I-RMS-A-AI-MS', 'I-RMS-B-AI-MS'],
  10: [
    'MOTOR-STATOR-TEMP-AI-MS',
    'SYSTEM-PRESSURE-AI-MS',
    'OIL-PRESSURE-AI-MS',
  ],
  14: STANDARD_HIGHLIGHTS,
}

const STANDARD_FIELDS = [
  ['airTempStg1', 'AIR-TEMP-STG1-AI-MS'],
  ['airTempStg2', 'AIR-TEMP-STG2-AI-MS'],
  ['bearingDeTemp', 'BRG-DE-TEMP-AI-MS'],
  ['bearingNdeTemp', 'BRG-NDE-TEMP-AI-MS'],
  ['pressureStg1', 'DSCH-PRESSURE-STG1-AI-MS'],
  ['pressureStg2', 'DSCH-PRESSURE-STG2-AI-MS'],
  ['ctInput', 'CT-INPUT-AI-MS'],
  ['motorWindingTemp', 'AVERAGE MOTOR WINDING TEMPERATURE-AI'],
] as const

function emptyUnit(number: number): FleetUnit {
  return {
    id: `SAC#${number}`,
    status: 'Unknown',
    acquisitionActive: false,
    airTempStg1: null,
    airTempStg2: null,
    pressureStg1: null,
    pressureStg2: null,
    bearingDeTemp: null,
    bearingNdeTemp: null,
    ctInput: null,
    motorWindingTemp: null,
    flow: null,
    customParameters: [],
    cardHighlights: [],
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object'
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === 'string')
  )
}

function isImportItem(value: unknown): value is ImportItem {
  return (
    isObject(value) &&
    typeof value.id === 'number' &&
    Number.isSafeInteger(value.id) &&
    value.id > 0 &&
    typeof value.fileName === 'string' &&
    typeof value.assetName === 'string' &&
    isStringArray(value.tags)
  )
}

function isHistoryResponse(value: unknown): value is HistoryResponse {
  if (
    !isObject(value) ||
    !isStringArray(value.tags) ||
    !Array.isArray(value.data)
  ) {
    return false
  }

  const tagCount = value.tags.length

  return value.data.every((row: unknown) =>
    isObject(row) &&
    typeof row.sourceTime === 'string' &&
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(row.sourceTime) &&
    Array.isArray(row.values) &&
    row.values.length === tagCount &&
    row.values.every((v: unknown) =>
      v === null || (typeof v === 'number' && Number.isFinite(v)),
    ),
  )
}

function identifyUnit(tags: string[]): number | null {
  const ids = new Set<number>()

  for (const tag of tags) {
    const match = /^U-SAC(\d+)-/i.exec(tag.trim())
    if (match) ids.add(Number(match[1]))
  }

  if (ids.size !== 1) return null

  const [id] = ids
  return id >= 1 && id <= 15 ? id : null
}

async function request(
  path: string,
  signal: AbortSignal,
): Promise<unknown> {
  const response = await fetch(`${API_BASE}${path}`, {
    signal,
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`API mengembalikan HTTP ${response.status}.`)
  }

  return response.json()
}

function mapSample(
  number: number,
  tags: string[],
  sample: Sample,
  catalog: InstrumentCatalog,
): FleetUnit {
  const unit = emptyUnit(number)
  unit.sourceTime = sample.sourceTime

  const prefix = new RegExp(`^U-SAC${number}-`, 'i')

  const parameters: DynamicParameter[] = tags.map((rawTag, index) => {
    const tag = rawTag.trim()
    const suffix = tag.replace(prefix, '').toUpperCase()
    const info = getInstrumentMeta(tag, catalog)
    const raw = sample.values[index]

    return {
      ...info,
      tag,
      suffix,
      value:
        typeof raw === 'number' &&
        Number.isFinite(raw) &&
        raw > -9000
          ? raw
          : null,
    }
  })

  unit.customParameters =
    number === 2 || number === 14
      ? parameters.filter(
          (p) => p.suffix !== 'AVERAGE MOTOR WINDING TEMPERATURE-AI',
        )
      : parameters

  const bySuffix = new Map(
    parameters.map((p) => [p.suffix, p] as const),
  )

  const highlights: DynamicParameter[] = []

  for (const suffix of UNIT_CARD_PRIORITY[number] ?? []) {
    const parameter = bySuffix.get(suffix)
    if (parameter) highlights.push(parameter)
  }

  for (const parameter of unit.customParameters) {
    if (highlights.length >= 3) break
    if (!highlights.includes(parameter)) highlights.push(parameter)
  }

  unit.cardHighlights = highlights.slice(0, 3)

  for (const [field, suffix] of STANDARD_FIELDS) {
    unit[field] = bySuffix.get(suffix)?.value ?? null
  }

  unit.acquisitionActive = parameters.some((p) => p.value !== null)
  return unit
}

const EMPTY_IMPORTS: LoadedImport[] = []

function initialState(): LoadState {
  return {
    key: '',
    loading: false,
    error: '',
    notes: [],
    imports: [],
  }
}

export function useHistoricalFleet(
  enabled: boolean,
  day: string,
  time: string,
) {
  const [reload, setReload] = useState(0)
  const pims = useInstrumentCatalog(enabled, reload)
  const [state, setState] = useState<LoadState>(initialState)
  const key = `${day}:${reload}`

  useEffect(() => {
    if (!enabled) {
      setState(initialState())
      return
    }

    const controller = new AbortController()
    const { signal } = controller

    setState({
      key,
      loading: true,
      error: '',
      notes: [],
      imports: [],
    })

    async function load() {
      try {
        const response = await request('/api/history/imports', signal)

        if (
          !isObject(response) ||
          !Array.isArray(response.data) ||
          !response.data.every(isImportItem)
        ) {
          throw new Error('Format daftar impor API tidak sesuai.')
        }

        const jobs: { unit: number; item: ImportItem }[] = []
        const notes: string[] = []
        const counts = new Map<number, number>()

        for (const item of response.data) {
          const unit = identifyUnit(item.tags)

          if (unit === null) {
            notes.push(`Impor #${item.id}: identitas unit tidak jelas.`)
            continue
          }

          jobs.push({ unit, item })
          counts.set(unit, (counts.get(unit) ?? 0) + 1)
        }

        for (const [unit, count] of counts) {
          if (count > 1) {
            notes.push(
              `SAC#${unit}: ${count} impor. Jika waktu sama, ID impor terbesar diprioritaskan.`,
            )
          }
        }

        const loaded: LoadedImport[] = []
        let cursor = 0

        async function worker() {
          while (!signal.aborted && cursor < jobs.length) {
            const job = jobs[cursor++]

            try {
              const result = await request(
                `/api/history/${job.item.id}/samples?day=${encodeURIComponent(day)}`,
                signal,
              )

              if (
                !isHistoryResponse(result) ||
                identifyUnit(result.tags) !== job.unit
              ) {
                throw new Error(
                  'Format sampel atau identitas tag tidak sesuai.',
                )
              }

              loaded.push({ ...job, history: result })
            } catch (error) {
              if (signal.aborted) return

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
            () => worker(),
          ),
        )

        if (!signal.aborted) {
          loaded.sort((a, b) => b.item.id - a.item.id)

          setState({
            key,
            loading: false,
            error: '',
            notes,
            imports: loaded,
          })
        }
      } catch (error) {
        if (!signal.aborted) {
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
  const imports = current ? state.imports : EMPTY_IMPORTS
  const loading = enabled && (!current || state.loading)
  const error = current ? state.error : ''

  const sourceTime =
    `${day} ${time.length === 5 ? `${time}:00` : time}`

  const compressors = useMemo<FleetUnit[]>(
    () =>
      ACTIVE_UNIT_NUMBERS.map((number) => {
        const candidates = imports.filter(
          (entry) => entry.unit === number,
        )

        const partialFailure = candidates.some(
          (entry) => Boolean(entry.error),
        )

        for (const candidate of candidates) {
          const history = candidate.history
          if (!history) continue

          const sample = history.data.find(
            (row) => row.sourceTime === sourceTime,
          )

          if (!sample) continue

          return {
            ...mapSample(number, history.tags, sample, pims.catalog),
            sourceFile: candidate.item.fileName,
            importId: candidate.item.id,
            issue: partialFailure
              ? 'Sebagian impor unit gagal dimuat.'
              : undefined,
          }
        }

        const unit = emptyUnit(number)

        if (loading) {
          unit.issue = 'Memuat data…'
        } else if (error) {
          unit.issue = 'Sumber data tidak dapat dimuat.'
        } else if (partialFailure) {
          unit.issue = 'Gagal memuat data unit.'
        } else if (candidates.length > 0) {
          unit.issue = 'Tidak ada sampel pada waktu pilihan.'
        } else {
          unit.issue = 'Belum ada impor untuk unit ini.'
        }

        return unit
      }),
    [imports, sourceTime, loading, error, pims.catalog],
  )

  const warnings = imports.flatMap((entry) => {
    const prefix = `SAC#${entry.unit}, impor #${entry.item.id}`

    if (entry.error) {
      return [`${prefix}: ${entry.error}`]
    }

    if (entry.history?.truncated) {
      return [
        `${prefix}: respons dibatasi 1.440 sampel. Sebagian waktu mungkin tidak tersedia.`,
      ]
    }

    return []
  })

  return {
    compressors,
    imports,
    sourceTime,
    loading,
    error,
    warnings: [
      ...warnings,
      ...(pims.error ? [pims.error] : []),
    ],
    notes: current ? state.notes : [],
    refresh: () => setReload((value) => value + 1),
  }
}