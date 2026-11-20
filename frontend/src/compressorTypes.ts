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

