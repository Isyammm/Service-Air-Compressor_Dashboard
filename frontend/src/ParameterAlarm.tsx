type Pair = readonly [number, number]
type ThreePairs = readonly [Pair, Pair, Pair]
type OilTemperature = readonly [number, number, number, number]

type Limits = {
  label: string
  unit: string | null
  high?: number
  highTrip?: number
  low?: number
  lowTrip?: number
}

type UnitProfile = {
  temperatureUnit: '°C' | '°F'
  oilPressureUnit: 'psi' | null
  oilPressure: Pair

  // High Alarm, High Trip, Low Alarm, Low Trip
  oilTemperature: OilTemperature

  stageTemperature: ThreePairs
  bearingTemperature: Pair
  phaseTemperature?: Pair

  stageVibrationX?: ThreePairs
  stageVibrationY?: ThreePairs
  stageVibrationZ?: ThreePairs

  // Foto tidak menyebutkan sumbu.
  stageVibrationUnspecified?: ThreePairs

  motorBearingVibration?: Pair

  oilFilter?: Pair
  inletFilter?: Pair

  // Bukan pasangan Alarm/Trip.
  highLoadLimit?: number
  throttleLimit?: number
}

type Parameter = {
  tag: string
  label: string
  value: number | null
  unit: string
}

type Props = {
  parameter: Parameter
  enabled?: boolean
}

const repeat = (pair: Pair): ThreePairs => [
  pair,
  pair,
  pair,
]

const CELSIUS_BASE: UnitProfile = {
  temperatureUnit: '°C',

  // Satuan tekanan oli pada kertas SAC#1/#3/#4
  // belum dikonfirmasi. Angka disimpan tanpa ditebak.
  oilPressureUnit: null,
  oilPressure: [1.6, 1.4],

  oilTemperature: [51, 53, 35, 33],
  stageTemperature: repeat([53, 56]),
  bearingTemperature: [95, 100],
  phaseTemperature: [155, 165],

  stageVibrationX: [
    [0.99, 1.11],
    [0.79, 0.99],
    [0.79, 0.99],
  ],

  stageVibrationZ: [
    [2.57, 6.32],
    [2.29, 5.73],
    [1.82, 4.56],
  ],

  // Tidak otomatis dianggap sebagai vibration Y.
  stageVibrationUnspecified: [
    [0.91, 1.11],
    [0.79, 0.99],
    [0.79, 0.99],
  ],

  oilFilter: [0.8, 1],
  inletFilter: [5, 10],
}

const SAC2_BASE: UnitProfile = {
  temperatureUnit: '°F',
  oilPressureUnit: 'psi',
  oilPressure: [24, 22],
  oilTemperature: [120, 125, 95, 90],
  stageTemperature: repeat([120, 125]),
  bearingTemperature: [194, 203],

  stageVibrationX: [
    [1.11, 1.26],
    [0.91, 0.99],
    [0.9, 0.99],
  ],

  stageVibrationY: [
    [1.11, 1.26],
    [0.91, 0.99],
    [0.9, 0.99],
  ],
}

// Seluruh angka mengikuti 11 foto yang dikirim.
// Unit tanpa foto tidak diberi ambang buatan.
export const CENTAC_PROFILES: Record<number, UnitProfile> = {
  1: CELSIUS_BASE,

  2: SAC2_BASE,

  3: {
    ...CELSIUS_BASE,
    oilPressure: [1.7, 1.4],
    stageVibrationZ: [
      [2.57, 6.32],
      [2.29, 5.73],
      [1.82, 4.54],
    ],
  },

  4: {
    ...CELSIUS_BASE,
    oilPressure: [1.7, 1.4],
    oilTemperature: [51, 53, 35, 30],
    stageVibrationZ: [
      [2.57, 6.32],
      [2.29, 5.73],
      [1.82, 4.54],
    ],
  },

  8: {
    temperatureUnit: '°F',
    oilPressureUnit: 'psi',
    oilPressure: [23, 21],
    oilTemperature: [125, 130, 78, 75],

    stageTemperature: [
      [120, 135],
      [120, 135],
      [125, 135],
    ],

    bearingTemperature: [194, 203],
    motorBearingVibration: [2.2, 2.7],

    stageVibrationX: [
      [0.95, 1.15],
      [0.85, 1.1],
      [0.85, 1.1],
    ],

    stageVibrationY: [
      [0.95, 1.15],
      [0.85, 1.1],
      [0.85, 1.1],
    ],

    highLoadLimit: 185,
    throttleLimit: 135,
  },

  9: {
    temperatureUnit: '°F',
    oilPressureUnit: 'psi',
    oilPressure: [23, 21],
    oilTemperature: [130, 135, 80, 75],
    stageTemperature: repeat([125, 135]),
    bearingTemperature: [194, 203],
    motorBearingVibration: [2.2, 2.7],
    stageVibrationX: repeat([0.85, 1.05]),
    stageVibrationY: repeat([0.85, 1.05]),
    highLoadLimit: 185,
    throttleLimit: 135,
  },

  10: {
    temperatureUnit: '°F',
    oilPressureUnit: 'psi',
    oilPressure: [18, 15],
    oilTemperature: [120, 125, 80, 70],
    stageTemperature: repeat([120, 125]),
    bearingTemperature: [194, 203],
    motorBearingVibration: [2.2, 2.7],

    stageVibrationX: [
      [0.95, 1.15],
      [0.85, 1.05],
      [0.85, 1.05],
    ],

    stageVibrationY: [
      [0.95, 1.15],
      [0.85, 1.05],
      [0.85, 1.05],
    ],

    highLoadLimit: 185,
    throttleLimit: 135,
  },

  11: {
    temperatureUnit: '°F',
    oilPressureUnit: 'psi',
    oilPressure: [23, 21],
    oilTemperature: [125, 135, 70, 65],

    stageTemperature: [
      [125, 135],
      [125, 135],
      [125, 130],
    ],

    bearingTemperature: [194, 203],
    motorBearingVibration: [2.2, 2.7],

    stageVibrationX: [
      [0.95, 1.15],
      [0.85, 1.05],
      [0.85, 1.05],
    ],

    stageVibrationY: [
      [0.95, 1.15],
      [0.8, 1.05],
      [0.85, 1.05],
    ],

    highLoadLimit: 185,
    throttleLimit: 135,
  },

  12: {
    temperatureUnit: '°F',
    oilPressureUnit: 'psi',
    oilPressure: [23, 21],
    oilTemperature: [120, 125, 64.2, 62.7],

    stageTemperature: [
      [120, 135],
      [120, 135],
      [120, 130],
    ],

    bearingTemperature: [194, 203],
    motorBearingVibration: [2.6, 3],

    stageVibrationUnspecified: [
      [0.95, 1.15],
      [0.85, 1.05],
      [0.85, 1.05],
    ],
  },

  13: {
    temperatureUnit: '°F',
    oilPressureUnit: 'psi',
    oilPressure: [18, 16],
    oilTemperature: [120, 125, 68.5, 64.8],

    stageTemperature: [
      [125, 135],
      [125, 135],
      [125, 139.3],
    ],

    bearingTemperature: [194, 203],
    motorBearingVibration: [2.6, 3],

    stageVibrationUnspecified: [
      [0.95, 1.15],
      [0.85, 1.05],
      [0.85, 1.05],
    ],
  },

  14: SAC2_BASE,
}

function highLimit(
  label: string,
  unit: string | null,
  pair: Pair,
): Limits {
  return {
    label,
    unit,
    high: pair[0],
    highTrip: pair[1],
  }
}

// Daftar lengkap ambang per unit.
// Tetap tersedia meskipun parameter belum memiliki sampel.
export function getCentacLimits(
  unitNumber: number,
): Record<string, Limits> {
  const profile = CENTAC_PROFILES[unitNumber]
  if (!profile) return {}

  const result: Record<string, Limits> = {
    oilPressure: {
      label: 'Oil pressure',
      unit: profile.oilPressureUnit,
      low: profile.oilPressure[0],
      lowTrip: profile.oilPressure[1],
    },

    oilTemperature: {
      label: 'Oil temperature',
      unit: profile.temperatureUnit,
      high: profile.oilTemperature[0],
      highTrip: profile.oilTemperature[1],
      low: profile.oilTemperature[2],
      lowTrip: profile.oilTemperature[3],
    },

    bearingDE: highLimit(
      'Motor bearing DE / inboard temperature',
      profile.temperatureUnit,
      profile.bearingTemperature,
    ),

    bearingNDE: highLimit(
      'Motor bearing NDE / outboard temperature',
      profile.temperatureUnit,
      profile.bearingTemperature,
    ),
  }

  for (const stage of [1, 2, 3]) {
    const index = stage - 1

    result[`stageTemp${stage}`] = highLimit(
      `Stage ${stage} temperature`,
      profile.temperatureUnit,
      profile.stageTemperature[index],
    )

    const axes = [
      ['X', profile.stageVibrationX],
      ['Y', profile.stageVibrationY],
      ['Z', profile.stageVibrationZ],
      ['Unspecified', profile.stageVibrationUnspecified],
    ] as const

    for (const [axis, pairs] of axes) {
      if (!pairs) continue

      result[`stageVib${stage}${axis}`] = highLimit(
        axis === 'Unspecified'
          ? `Stage ${stage} vibration — sumbu belum disebutkan`
          : `Stage ${stage} vibration ${axis}`,
        'mils',
        pairs[index],
      )
    }
  }

  if (profile.phaseTemperature) {
    for (const phase of ['A', 'B', 'C']) {
      result[`phase${phase}`] = highLimit(
        `Motor phase ${phase} temperature`,
        profile.temperatureUnit,
        profile.phaseTemperature,
      )
    }
  }

  if (profile.motorBearingVibration) {
    for (const position of ['DE', 'NDE']) {
      result[`motorVib${position}`] = highLimit(
        `Motor bearing ${position} vibration`,
        'mils',
        profile.motorBearingVibration,
      )
    }
  }

  if (profile.oilFilter) {
    result.oilFilter = highLimit(
      'Oil filter DP',
      'psi',
      profile.oilFilter,
    )
  }

  if (profile.inletFilter) {
    result.inletFilter = highLimit(
      'Inlet filter DP',
      'inH₂O',
      profile.inletFilter,
    )
  }

  return result
}

// Pemetaan manual untuk tag instrumen yang tidak dapat
// dikenali dari nama. Isi hanya setelah tag dipastikan.
//
// Contoh bentuk:
// 'U-SACn-TAG-LENGKAP': 'stageTemp1'
//
// Jangan menebak fungsi tag hanya dari nomor instrumennya.
const TAG_LIMIT_KEYS: Record<string, string> = {}

function clean(value: string): string {
  return value
    .toUpperCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\bSTG(?=\d|\b)/g, 'STAGE')
    .replace(/\bTEMPERATURE\b/g, 'TEMP')
    .replace(/\bPRESS\b/g, 'PRESSURE')
    .replace(/\bBRG\b/g, 'BEARING')
    .replace(/\bVIBRATION\b/g, 'VIB')
    .replace(/\bPH\b/g, 'PHASE')
    .replace(/\s+/g, ' ')
    .trim()
}

function identifyParameter(name: string): string | null {
  const text = clean(name)

  if (/^(?:(?:LUBE|LUBRICATING) )?OIL TEMP$/.test(text)) {
    return 'oilTemperature'
  }

  if (/^(?:(?:LUBE|LUBRICATING) )?OIL PRESSURE$/.test(text)) {
    return 'oilPressure'
  }

  if (/^OIL FILTER (?:DP|DIFFERENTIAL PRESSURE)$/.test(text)) {
    return 'oilFilter'
  }

  if (
    /^(?:INLET|SUCTION) (?:AIR )?FILTER (?:DP|DIFFERENTIAL PRESSURE)$/.test(text)
  ) {
    return 'inletFilter'
  }

  const temperature =
    /^(?:AIR )?TEMP STAGE\s*([123])$/.exec(text) ??
    /^STAGE\s*([123]) (?:AIR )?TEMP$/.exec(text)

  if (temperature) {
    return `stageTemp${temperature[1]}`
  }

  const vibration =
    /^VIB STAGE\s*([123])\s*([XYZ])?(?:\s*\(([XYZ])\))?$/.exec(text) ??
    /^STAGE\s*([123])\s*([XYZ])? VIB(?:\s*\(([XYZ])\))?$/.exec(text)

  if (vibration) {
    const axis = vibration[2] || vibration[3] || 'Unspecified'
    return `stageVib${vibration[1]}${axis}`
  }

  const phase = /^(?:MOTOR )?PHASE ([ABC]) TEMP$/.exec(text)
  if (phase) return `phase${phase[1]}`

  const bearingTemperature =
    /^(?:MOTOR )?BEARING (DE|NDE) TEMP$/.exec(text) ??
    /^(?:MOTOR )?BEARING TEMP (DE|NDE)$/.exec(text)

  if (bearingTemperature) {
    return `bearing${bearingTemperature[1]}`
  }

  const motorVibration =
    /^(?:MOTOR|M) BEARING VIB (DE|NDE)$/.exec(text) ??
    /^(?:MOTOR|M) BEARING (DE|NDE) VIB$/.exec(text)

  if (motorVibration) {
    return `motorVib${motorVibration[1]}`
  }

  // Pada foto, kedua lokasi memiliki batas yang sama.
  const bearingPosition =
    /^MOTOR (INBOARD|OUTBOARD) BEARING (TEMP|VIB)$/.exec(text)

  if (bearingPosition) {
    const position =
      bearingPosition[1] === 'INBOARD' ? 'DE' : 'NDE'

    return bearingPosition[2] === 'TEMP'
      ? `bearing${position}`
      : `motorVib${position}`
  }

  return null
}

function normalizeUnit(value: string): string {
  const key = value.trim().toLowerCase().replace(/\s+/g, '')

  const aliases: Record<string, string> = {
    '°c': '°C',
    degc: '°C',
    celsius: '°C',
    c: '°C',

    '°f': '°F',
    degf: '°F',
    fahrenheit: '°F',
    f: '°F',

    psi: 'psi',
    mil: 'mils',
    mils: 'mils',
    inh2o: 'inH₂O',
    'inh₂o': 'inH₂O',
  }

  return aliases[key] ?? value.trim()
}

function convertLimit(
  value: number,
  sourceUnit: string,
  targetUnit: string,
): number | null {
  if (sourceUnit === targetUnit) return value

  if (sourceUnit === '°C' && targetUnit === '°F') {
    return value * 9 / 5 + 32
  }

  if (sourceUnit === '°F' && targetUnit === '°C') {
    return (value - 32) * 5 / 9
  }

  return null
}

function format(value: number): string {
  return value.toLocaleString('id-ID', {
    maximumFractionDigits: 3,
  })
}

function findLimits(parameter: Parameter): {
  limits: Limits | null
  message: string
} {
  const fullTag = parameter.tag.trim().toUpperCase()
  const match = /^U-SAC(\d+)-(.+)$/.exec(fullTag)

  if (!match) {
    return {
      limits: null,
      message: 'Identitas unit belum dikenali',
    }
  }

  const unitNumber = Number(match[1])

  if (!CENTAC_PROFILES[unitNumber]) {
    return {
      limits: null,
      message: 'Tabel ambang unit belum tersedia',
    }
  }

  const allLimits = getCentacLimits(unitNumber)
  const suffix = match[2].replace(/-AI(?:-MS)?$/, '')

  const key =
    TAG_LIMIT_KEYS[fullTag] ??
    identifyParameter(suffix) ??
    identifyParameter(parameter.label)

  if (!key) {
    return {
      limits: null,
      message: 'Ambang belum dipetakan',
    }
  }

  const limits = allLimits[key]

  if (!limits) {
    const axisMatch = /^stageVib([123])[XYZ]$/.exec(key)

    if (
      axisMatch &&
      allLimits[`stageVib${axisMatch[1]}Unspecified`]
    ) {
      return {
        limits: null,
        message: 'Sumbu ambang perlu dipastikan',
      }
    }

    return {
      limits: null,
      message: 'Ambang parameter belum tersedia',
    }
  }

  return { limits, message: '' }
}

export function evaluateParameterAlarm(parameter: Parameter) {

  const result = findLimits(parameter)
  const limits = result.limits
  const dataUnit = normalizeUnit(parameter.unit)
  const value = parameter.value

  let text = result.message
  let color = '#94a3b8'

  const details: string[] = [
    parameter.label,
    `Tag: ${parameter.tag}`,
    `Nilai: ${
      value !== null && Number.isFinite(value)
        ? `${format(value)} ${dataUnit}`
        : 'Tidak tersedia'
    }`,
  ]

  if (limits) {
    details.push(`Acuan: ${limits.label}`)

    const entries: [string, number | undefined][] = [
      ['Alarm High', limits.high],
      ['Batas Trip High', limits.highTrip],
      ['Alarm Low', limits.low],
      ['Batas Trip Low', limits.lowTrip],
    ]

    for (const [name, threshold] of entries) {
      if (threshold === undefined) continue

      const originalUnit =
        limits.unit ?? '(satuan kertas belum dikonfirmasi)'

      let line = `${name}: ${format(threshold)} ${originalUnit}`

      if (limits.unit && limits.unit !== dataUnit) {
        const converted = convertLimit(
          threshold,
          limits.unit,
          dataUnit,
        )

        if (converted !== null) {
          line += ` = ${format(converted)} ${dataUnit}`
        }
      }

      details.push(line)
    }

    const convert = (threshold: number | undefined) => {
      if (threshold === undefined) return undefined
      if (!limits.unit) return null

      return convertLimit(threshold, limits.unit, dataUnit)
    }

    const high = convert(limits.high)
    const highTrip = convert(limits.highTrip)
    const low = convert(limits.low)
    const lowTrip = convert(limits.lowTrip)

    const incompatible = [
      high,
      highTrip,
      low,
      lowTrip,
    ].some((threshold) => threshold === null)

    if (
      value === null ||
      !Number.isFinite(value) ||
      value <= -9000
    ) {
      text = 'Nilai tidak tersedia'
    } else if (!limits.unit) {
      text = 'Satuan ambang belum dikonfirmasi'
    } else if (incompatible) {
      text = 'Satuan perlu dicocokkan'
    } else if (limits.unit === 'mils' && value < 0) {
      // Nilai negatif tidak diberi label "Dalam batas"
      // sebelum arti dan kualitas sinyalnya diperiksa.
      text = 'Periksa nilai vibration negatif'
    } else {
      const tolerance = 1e-9

      if (
        highTrip != null &&
        value >= highTrip - tolerance
      ) {
        text = 'Mencapai batas Trip High'
        color = '#f87171'
      } else if (
        lowTrip != null &&
        value <= lowTrip + tolerance
      ) {
        text = 'Mencapai batas Trip Low'
        color = '#f87171'
      } else if (
        high != null &&
        value >= high - tolerance
      ) {
        text = 'High'
        color = '#fbbf24'
      } else if (
        low != null &&
        value <= low + tolerance
      ) {
        text = 'Low'
        color = '#fbbf24'
      } else {
        text = 'Dalam batas'
        color = '#34d399'
      }
    }
  } else if (
    value === null ||
    !Number.isFinite(value) ||
    value <= -9000
  ) {
    text = 'Nilai tidak tersedia'
  }

  details.push(`Kondisi: ${text}`)
  details.push(
    'Evaluasi nilai sampel; bukan konfirmasi status operasi mesin.',
  )

  return { text, color, details }
}

export function parameterAlarmStyle(parameter: Parameter, enabled = true) {
  if (!enabled) return undefined
  const { color } = evaluateParameterAlarm(parameter)
  return {
    color,
    background: `${color}12`,
    border: `1px solid ${color}66`,
    borderLeft: `3px solid ${color}`,
  }
}

export default function ParameterAlarm({ parameter, enabled = true }: Props) {
  if (!enabled) return null
  const { text, color, details } = evaluateParameterAlarm(parameter)
  return (
    <span
      title={details.join('\n')}
      aria-label={details.join('. ')}
      style={{
        display: 'block',
        marginTop: 6,
        color,
        fontSize: 10,
        fontWeight: 600,
        lineHeight: 1.4,
        overflowWrap: 'anywhere',
      }}
    >
      {text}
    </span>
  )
}