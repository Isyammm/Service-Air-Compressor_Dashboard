import { useEffect, useState } from 'react'

const API = (
  import.meta.env.VITE_API_BASE_URL ||
  'http://127.0.0.1:4000'
).replace(/\/$/, '')

const TAGS = {
  flow: 'U-AIR-FLOW-AI',
  pressure: 'U-AIR-PRESS-AI',
  dewPoint: 'U-PPAC-THERMALCADEWPOINT-B-AI',
} as const

type MetricKey = keyof typeof TAGS

type Metric = {
  value: number | null
  sourceFile: string
}

type Values = Record<MetricKey, Metric>

type ImportItem = {
  id: number
  fileName: string
  assetName: string
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

type State = {
  key: string
  loading: boolean
  error: string
  warning: string
  values: Values
}

function emptyValues(): Values {
  return {
    flow: { value: null, sourceFile: '' },
    pressure: { value: null, sourceFile: '' },
    dewPoint: { value: null, sourceFile: '' },
  }
}

function isObject(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isImport(value: unknown): value is ImportItem {
  return (
    isObject(value) &&
    typeof value.id === 'number' &&
    Number.isSafeInteger(value.id) &&
    value.id > 0 &&
    typeof value.fileName === 'string' &&
    typeof value.assetName === 'string'
  )
}

function isHistory(value: unknown): value is HistoryResponse {
  if (
    !isObject(value) ||
    !Array.isArray(value.tags) ||
    !value.tags.every((tag) => typeof tag === 'string') ||
    !Array.isArray(value.data)
  ) {
    return false
  }

  const columnCount = value.tags.length

  return value.data.every(
    (row: unknown) =>
      isObject(row) &&
      typeof row.sourceTime === 'string' &&
      Array.isArray(row.values) &&
      row.values.length === columnCount &&
      row.values.every(
        (item: unknown) =>
          item === null ||
          (typeof item === 'number' && Number.isFinite(item)),
      ),
  )
}

async function request(
  endpoint: string,
  signal: AbortSignal,
): Promise<unknown> {
  const response = await fetch(`${API}${endpoint}`, {
    signal,
    cache: 'no-store',
  })

  const body: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      isObject(body) && typeof body.message === 'string'
        ? body.message
        : `API mengembalikan HTTP ${response.status}.`

    throw new Error(message)
  }

  return body
}

export function useSystemHistory(
  enabled: boolean,
  day: string,
  time: string,
  refreshKey = 0,
) {
  const sourceTime =
    `${day} ${time.length === 5 ? `${time}:00` : time}`

  const key = `${sourceTime}|${refreshKey}`

  const [state, setState] = useState<State>(() => ({
    key: '',
    loading: false,
    error: '',
    warning: '',
    values: emptyValues(),
  }))

  useEffect(() => {
    if (!enabled) return

    const controller = new AbortController()
    const { signal } = controller

    setState({
      key,
      loading: true,
      error: '',
      warning: '',
      values: emptyValues(),
    })

    async function load() {
      try {
        const result = await request('/api/history/imports', signal)

        if (
          !isObject(result) ||
          !Array.isArray(result.data) ||
          !result.data.every(isImport)
        ) {
          throw new Error('Format daftar impor tidak sesuai.')
        }

        const imports = result.data
          .filter((item) => item.assetName === 'SYSTEM')
          .sort((a, b) => b.id - a.id)

        const values = emptyValues()
        const found = new Set<MetricKey>()
        const warnings: string[] = []

        for (const item of imports) {
          const response = await request(
            `/api/history/${item.id}/samples?day=${encodeURIComponent(day)}`,
            signal,
          )

          if (!isHistory(response)) {
            throw new Error(
              `Format sampel pada impor #${item.id} tidak sesuai.`,
            )
          }

          if (response.truncated) {
            warnings.push(
              `Impor #${item.id}: sampel harian dibatasi API.`,
            )
          }

          const sample = response.data.find(
            (row) => row.sourceTime === sourceTime,
          )

          if (!sample) continue

          const tags = response.tags.map(
            (tag) => tag.trim().toUpperCase(),
          )

          for (const metric of Object.keys(TAGS) as MetricKey[]) {
            if (found.has(metric)) continue

            const index = tags.indexOf(TAGS[metric])
            if (index < 0) continue

            // ID impor terbaru diprioritaskan per tag.
            // Null tidak diganti menggunakan nilai impor lama.
            values[metric] = {
              value: sample.values[index] ?? null,
              sourceFile: item.fileName,
            }

            found.add(metric)
          }

          if (found.size === 3) break
        }

        if (!signal.aborted) {
          setState({
            key,
            loading: false,
            error: '',
            warning: warnings.join(' '),
            values,
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
                : 'Gagal memuat parameter sistem.',
            warning: '',
            values: emptyValues(),
          })
        }
      }
    }

    void load()

    return () => controller.abort()
  }, [enabled, day, sourceTime, key])

  const current = enabled && state.key === key

  return {
    values: current ? state.values : emptyValues(),
    sourceTime,
    loading: enabled && (!current || state.loading),
    error: current ? state.error : '',
    warning: current ? state.warning : '',
  }
}