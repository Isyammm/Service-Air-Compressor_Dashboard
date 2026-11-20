import type { FleetUnit } from './useHistoricalFleet'
export type LivePoint = { time: number; label: string; values: Record<string, number | null> }
export type LiveHistory = Record<string, LivePoint[]>
export function parameterKey(tag: string, unit: string) { return JSON.stringify([tag,unit]) }
export const fields = ['airTempStg1','airTempStg2','bearingDeTemp','bearingNdeTemp','pressureStg1','pressureStg2','ctInput','flow'] as const
export function appendLive(previous: LiveHistory, units: FleetUnit[], now: number): LiveHistory {
 const result: LiveHistory = {}
 for (const unit of units) {
  const points = (previous[unit.id] ?? []).filter(p => p.time >= now - 600000)
  const source = Date.parse(unit.sourceTime ?? '')
  const valid = unit.acquisitionActive && Number.isFinite(source)
  const time = valid ? source : now
  const last = points.at(-1)
  if (!last || time > last.time) {
   // A missing interval is a gap, never an interpolated measurement.
   if (valid && last && time - last.time > 3000) points.push({time:last.time+1,label:'Data terputus',values:{}})
   points.push({time,label:new Date(time).toISOString(),values:Object.fromEntries((unit.customParameters ?? []).map(p=>[parameterKey(p.tag,p.unit), valid ? p.value : null]))})
  }
  result[unit.id] = points.slice(-600)
 }
 return result
}
