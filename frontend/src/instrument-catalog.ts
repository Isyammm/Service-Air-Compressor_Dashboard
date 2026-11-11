import { useEffect, useState } from 'react'

type Category =
  | 'temperature'
  | 'pressure'
  | 'mechanical'
  | 'electrical'
  | 'flow'
  | 'status'

type CatalogItem = {
  tag: string
  unitNumber: number
  description: string
  engineeringUnit: string | null
}

export type InstrumentCatalog = ReadonlyMap<string, CatalogItem>

const EMPTY_CATALOG: InstrumentCatalog = new Map()

const API = (
  import.meta.env.VITE_API_BASE_URL ||
  'http://127.0.0.1:4000'
).replace(/\/$/, '')

function isCatalogItem(value: unknown): value is CatalogItem {
  if (!value || typeof value !== 'object') return false

  const item = value as Record<string, unknown>

  return (
    typeof item.tag === 'string' &&
    typeof item.unitNumber === 'number' &&
    Number.isInteger(item.unitNumber) &&
    item.unitNumber >= 1 &&
    item.unitNumber <= 15 &&
    item.tag.trim().toUpperCase().startsWith(
      `U-SAC${item.unitNumber}-`,
    ) &&
    typeof item.description === 'string' &&
    (
      item.engineeringUnit === null ||
      typeof item.engineeringUnit === 'string'
    )
  )
}

const UNIT_ALIASES: Record<string, string> = {
  degc: '°C',
  '°c': '°C',
  celsius: '°C',
  degf: '°F',
  '°f': '°F',
  fahrenheit: '°F',
  f: '°F',
  c: '°C',
  psi: 'psi',
  psig: 'psi',
  psia: 'psi',
  bar: 'bar',
  inh2o: 'inH2O',
  scfm: 'SCFM',
  cfm: 'SCFM',
  gpm: 'GPM',
  mils: 'mils',
  mil: 'mils',
  'mm/s': 'mm/s',
  amp: 'Amp',
  amps: 'Amp',
  ampere: 'Amp',
  a: 'Amp',
  '%': '%',
  percent: '%',
}

export function inferEngineeringUnit(
  suffix: string,
  description = '',
): string {
  const text = `${suffix} ${description}`.toUpperCase()

  if (/-DI(?:-|$)|\bTRIP\b|\bREADY\b|\bSTATUS\b/.test(text)) {
    return 'Status'
  }

  if (
    /\bVIBRATION\b|\bVIB\b|^VT\d|[-_]VT\d|\bBULLGEAR\b|\bSTAGE\s*[123]\s*[XYZ]\b|\bSTG\s*[123]\s*[XYZ]\b/.test(
      text,
    )
  ) {
    return 'mils'
  }

  if (
    /TEMPERATURE|\bTEMP\b|^TT\d|[-_]TT\d|\bWINDING\b|\bSTATOR\b|\bHOT[-_ ]AIR\b|\bDISCHRG[-_ ]TEMP\b|\bDSCH[-_ ]TEMP\b|\bBRG[-_ ].*TEMP\b|\bBEARING.*TEMP\b|\bPHASE\s*[ABC]\s*TEMP/.test(
      text,
    )
  ) {
    return '°F'
  }

  if (/\bWATER[-_ ]?FLOW\b|\bCOOLING[-_ ]?WATER\b/.test(text)) {
    return 'GPM'
  }

  if (/\bFLOW\b|\bSCFM\b|^FI-?\d|[-_]FI-?\d|^FT\d|[-_]FT\d/.test(text)) {
    return 'SCFM'
  }

  if (
    /PRESSURE|\bPRESS\b|\bDISCH\b|\bDSCH\b|^PT\d|[-_]PT\d|^DPT\d|[-_]DPT\d|\bFILTER[-_ ]?DP\b|\bSUCTION[-_ ]?AIR[-_ ]?FILTER\b|\bOIL[-_ ]?FILTER\b/.test(
      text,
    )
  ) {
    return 'psi'
  }

  if (
    /CURRENT|\bAMP\b|\bCT[-_ ]?INPUT\b|\bI[-_ ]?RMS\b|\bMOTOR[-_ ]?C|^IT\d|[-_]IT\d/.test(
      text,
    )
  ) {
    return 'Amp'
  }

  if (/^PCV\d|[-_]PCV\d|\bIGV\b|\bBOV\b|\bVALVE\b/.test(text)) {
    return '%'
  }

  return 'Belum ditentukan'
}

function normalizeUnit(
  value: string | null,
  suffix = '',
  description = '',
): string {
  const raw = value?.trim() ?? ''

  if (
    raw &&
    raw.toUpperCase() !== 'RAW' &&
    raw.toLowerCase() !== 'belum ditentukan' &&
    raw.toLowerCase() !== 'null' &&
    raw !== '-' &&
    raw !== '—'
  ) {
    return UNIT_ALIASES[raw.toLowerCase()] ?? raw
  }

  return inferEngineeringUnit(suffix, description)
}

function inferCategory(
  suffix: string,
  description: string,
): Category {
  const text = `${suffix} ${description}`.toUpperCase()

  if (
    /\bVIBRATION\b|\bVIB\b|^VT\d|[-_]VT\d|\bBULLGEAR\b|\bSTAGE\s*[123]\s*[XYZ]\b/.test(
      text,
    )
  ) {
    return 'mechanical'
  }

  if (
    /TEMPERATURE|\bTEMP\b|^TT\d|[-_]TT\d|\bWINDING\b|\bSTATOR\b|\bPHASE\s*[ABC]\s*TEMP/.test(
      text,
    )
  ) {
    return 'temperature'
  }

  if (
    /PRESSURE|\bPRESS\b|^PT\d|[-_]PT\d|^DPT\d|[-_]DPT\d|\bFILTER[-_ ]?DP\b/.test(
      text,
    )
  ) {
    return 'pressure'
  }

  if (/\bFLOW\b|^FI-?\d|[-_]FI-?\d|^FT\d|[-_]FT\d/.test(text)) {
    return 'flow'
  }

  if (
    /CURRENT|VOLTAGE|POWER|^IT\d|[-_]IT\d|I-RMS|CT[-_ ]?INPUT/.test(
      text,
    )
  ) {
    return 'electrical'
  }

  if (/-DI(?:-|$)|\bTRIP\b|\bREADY\b/.test(text)) {
    return 'status'
  }

  return 'mechanical'
}

function formatCleanLabel(rawLabel: string): string {
  return rawLabel
    .replace(/^_+/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function getInstrumentMeta(
  fullTag: string,
  catalog: InstrumentCatalog,
) {
  const normalizedTag = fullTag.trim().toUpperCase()
  const suffix = normalizedTag.replace(/^U-SAC\d+-/, '')
  const item = catalog.get(normalizedTag)

  const description =
    item?.description
      .replace(/^(?:CENTAC|SAC)\s*#?\s*\d+[A-Z]?\s*[-:–]?\s*/i, '')
      .replace(/^_+/, '')
      .trim() ?? ''

  const rawLabel = description || suffix.replace(/-/g, ' ')
  const label = formatCleanLabel(rawLabel)

  return {
    label,
    shortLabel: label,
    unit: normalizeUnit(item?.engineeringUnit ?? null, suffix, description),
    category: inferCategory(suffix, description),
    registered: Boolean(item),
  }
}

export function useInstrumentCatalog(
  enabled = true,
  refreshKey = 0,
) {
  const [catalog, setCatalog] =
    useState<InstrumentCatalog>(EMPTY_CATALOG)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!enabled) return

    const controller = new AbortController()

    async function load() {
      setLoading(true)
      setError('')
      setCatalog(EMPTY_CATALOG)

      try {
        const response = await fetch(`${API}/api/catalog`, {
          signal: controller.signal,
          cache: 'no-store',
        })

        if (!response.ok) {
          throw new Error(
            `Katalog PIMS gagal dimuat: HTTP ${response.status}.`,
          )
        }

        const result: unknown = await response.json()

        if (!result || typeof result !== 'object') {
          throw new Error('Respons katalog PIMS tidak valid.')
        }

        const data = (result as Record<string, unknown>).data

        if (
          !Array.isArray(data) ||
          !data.every(isCatalogItem)
        ) {
          throw new Error('Struktur data katalog PIMS tidak sesuai.')
        }

        const next = new Map<string, CatalogItem>()

        for (const item of data) {
          const tag = item.tag.trim().toUpperCase()

          if (next.has(tag)) {
            throw new Error(`Tag ganda pada katalog: ${tag}`)
          }

          next.set(tag, item)
        }

        if (!controller.signal.aborted) {
          setCatalog(next)

          if (next.size === 0) {
            setError(
              'Katalog PIMS masih kosong. Jalankan impor PIMS terlebih dahulu.',
            )
          }
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setError(
            error instanceof Error
              ? error.message
              : 'Katalog PIMS tidak dapat dimuat.',
          )
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => controller.abort()
  }, [enabled, refreshKey])

  return { catalog, loading, error }
}