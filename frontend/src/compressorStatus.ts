import type { CompressorStatus } from './compressorTypes'

export type OperatingStatus = CompressorStatus | 'Unknown'

export type StatusReading = {
  status: OperatingStatus
  reason?: string
}

type Sample = {
  tags: string[]
  values: (number | null)[]
  qualities?: (string | null)[]
}

// Masukkan tag status 0/1 tiap unit hanya setelah identitas sinyal disahkan.
export const STATUS_TAG_BY_UNIT: Partial<Record<number, string>> = {}

const TRIP_SUFFIXES = [
  'ANY-COMPRESSOR-TRIP-DI-MS',
  'ANY-COMP-TRIP-DI',
] as const

// Normalisasi hanya pada salinan nilai tag Trip, tidak pada data mentah.
function tripValue(tag: string, value: number | null): number | null {
  const isTrip = /^U-SAC\d+-(?:ANY-COMPRESSOR-TRIP-DI-MS|ANY-COMP-TRIP-DI)$/i.test(tag.trim())
  return isTrip && value === -1 ? 1 : value
}

function readTag(sample: Sample, tag: string) {
  const matches = sample.tags.flatMap((entry, index) =>
    entry.trim().toUpperCase() === tag.toUpperCase()
      ? [{
          value: tripValue(tag, sample.values[index] ?? null),
          quality: sample.qualities?.[index]?.trim().toLowerCase() ?? null,
        }]
      : [],
  )
  if (matches.length === 0) return null
  const first = matches[0]
  return {
    ...first,
    conflict: matches.some((other) =>
      other.value !== first.value || other.quality !== first.quality,
    ),
  }
}

export function evaluateCompressorStatus(
  unit: number,
  sample: Sample,
): StatusReading {
  const statusTag = STATUS_TAG_BY_UNIT[unit]
  if (!statusTag) {
    // Mentor: ANY-COMPRESSOR-TRIP aktif merupakan indikasi Trip.
    // Nilai 0 pada tag ini saja tidak membuktikan Standby atau Running.
    const readings = TRIP_SUFFIXES.map((suffix) =>
      readTag(sample, `U-SAC${unit}-${suffix}`),
    ).filter((reading) => reading !== null)
    const first = readings[0]
    if (first && readings.every((reading) =>
      !reading.conflict && reading.value === 1 &&
      (!reading.quality || reading.quality === 'good'),
    )) {
      return { status: 'Trip', reason: 'ANY-COMPRESSOR-TRIP aktif (nilai sumber 1 atau -1) pada waktu pilihan.' }
    }
    return {
      status: 'Unknown',
      reason: 'Tag status utama 0/1/Bad Data belum dipetakan; tag Trip saja tidak menentukan Running atau Standby.',
    }
  }

  const state = readTag(sample, statusTag)
  if (!state) {
    return { status: 'Unknown', reason: 'Tag status tidak ada pada sampel.' }
  }

  if (state.conflict) {
    return { status: 'Unknown', reason: 'Nilai status berbeda antarimpor pada waktu yang sama.' }
  }

  // Null/angka sentinel tidak membuktikan Bad Data. Kualitas harus eksplisit.
  if (state.quality === 'bad data' || state.quality === 'bad') {
    return { status: 'Isolate' }
  }
  if (state.quality && state.quality !== 'good') {
    return { status: 'Unknown', reason: `Kualitas status: ${state.quality}.` }
  }
  if (state.value !== 0 && state.value !== 1) {
    return { status: 'Unknown', reason: 'Nilai status tidak valid/tersedia.' }
  }

  const prefix = `U-SAC${unit}-`
  const tripReadings = TRIP_SUFFIXES.map((suffix) => readTag(sample, prefix + suffix))
    .filter((reading) => reading !== null)
  const trip = tripReadings[0]

  if (tripReadings.some((reading) =>
    reading.conflict || reading.value !== trip.value || reading.quality !== trip.quality,
  )) {
    return { status: 'Unknown', reason: 'Nilai trip berbeda antarimpor pada waktu yang sama.' }
  }

  if (state.value === 1) {
    // Bila dua sinyal bertentangan, prioritasnya belum disahkan.
    if (trip?.value === 1) {
      return { status: 'Unknown', reason: 'Sinyal Running dan Trip aktif bersamaan.' }
    }
    return { status: 'Running' }
  }

  if (!trip || (trip.quality && trip.quality !== 'good')) {
    return { status: 'Unknown', reason: 'Kualitas/tag trip belum tersedia.' }
  }
  if (trip.value === 1) return { status: 'Trip' }
  if (trip.value === 0) return { status: 'Standby' }
  return { status: 'Unknown', reason: 'Nilai tag trip tidak valid/tersedia.' }
}
