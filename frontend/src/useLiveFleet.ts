import { appendLive } from './liveHistory'
import type { LiveHistory } from './liveHistory'
import { useEffect, useState } from 'react'
import { nextPollDelay } from './liveTiming'
import { ACTIVE_UNIT_NUMBERS } from './fleetConfig'
import type { DynamicParameter, FleetUnit } from './useHistoricalFleet'
const base = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:4000').replace(/\/$/, '')
const empty = (): FleetUnit[] => ACTIVE_UNIT_NUMBERS.map(n => ({
 id: `SAC#${n}`, status: 'Unknown', acquisitionActive:false,
 airTempStg1:null, airTempStg2:null, bearingDeTemp:null, bearingNdeTemp:null,
 pressureStg1:null, pressureStg2:null, ctInput:null, flow:null,
 issue:'Menunggu data Live', customParameters:[], cardHighlights:[],
}))
type SystemValues = { sourceTime: string; flow: number | null; pressure: number | null; dewPoint: number | null }
export function useLiveFleet(enabled: boolean) {
 const [staleMs, setStaleMs] = useState(15000)
 const [network, setNetwork] = useState<'connecting'|'connected'|'offline'|'unconfigured'>('connecting')
 const [clock, setClock] = useState(Date.now())
 useEffect(() => {
  if (!enabled) return
  const timer = setInterval(() => setClock(Date.now()), 1000)
  return () => clearInterval(timer)
 }, [enabled])
 const [history, setHistory] = useState<LiveHistory>({})
 const [system, setSystem] = useState<SystemValues | null>(null)
 const [units, setUnits] = useState<FleetUnit[]>(empty)
 const [message, setMessage] = useState('Menunggu koneksi Live')
 useEffect(() => {
  if (!enabled) return
  let stopped = false
  let timer: ReturnType<typeof setTimeout>
  let controller: AbortController
  setNetwork('connecting'); setHistory({}); setSystem(null); setUnits(empty()); setMessage('Menghubungkan sumber Live…')
  async function poll() {
   let unconfigured = false
   const startedAt = performance.now()
   controller = new AbortController()
   const timeout = setTimeout(() => controller.abort(), 8000)
   try {
    const response = await fetch(`${base}/api/live/snapshot`, {signal:controller.signal, cache:'no-store'})
    const data = await response.json()
    if (!response.ok || !Array.isArray(data.units)) {
     unconfigured = data.configured === false
     throw new Error(data.message || 'Respons Live tidak valid')
    }
    const expiry = Number(data.staleAfterMs)
    if (!Number.isFinite(expiry) || expiry < 1000 || expiry > 3600000) throw new Error('Konfigurasi usia data tidak valid')
    const now = Date.now()
    const merged = empty().map(unit => {
     const found = (data.units as (FleetUnit & {parameters?: Omit<DynamicParameter, "shortLabel" | "suffix">[]})[]).find(item => item.id === unit.id)
     if (!found) return unit
     const age = now - Date.parse(found.sourceTime || '')
     if (!Number.isFinite(age) || age > expiry || age < -5000) return {...unit, issue:'Data terlambat; menunggu pembacaan terbaru'}
     const next = {...unit, customParameters:(found.parameters ?? []).map(parameter => ({...parameter, shortLabel:parameter.label, suffix:parameter.tag})), status:found.status, sourceTime:found.sourceTime, acquisitionActive:true, issue:'Data Live'}
     for (const key of ['airTempStg1','airTempStg2','bearingDeTemp','bearingNdeTemp','pressureStg1','pressureStg2','ctInput','motorWindingTemp','flow'] as const) next[key] = found[key] ?? null
     return next
    })
    if (!stopped) {
     setStaleMs(expiry); setNetwork('connected')
     const systemAge = now - Date.parse(data.system?.sourceTime ?? '')
     setSystem(Number.isFinite(systemAge) && systemAge >= -5000 && systemAge <= expiry ? data.system : null)
     setHistory(previous => appendLive(previous, merged, now))
     setUnits(merged); setMessage(`Live · ${merged.filter(u => u.acquisitionActive).length}/13 unit memiliki data terbaru`) }
   } catch (error) {
    if (!stopped) { setNetwork(unconfigured ? 'unconfigured' : 'offline'); setSystem(null); setHistory(previous => appendLive(previous, empty(), Date.now())); setUnits(empty()); setMessage(error instanceof Error ? error.message : 'Koneksi Live terputus') }
   } finally {
    clearTimeout(timeout)
    if (!stopped) timer = setTimeout(poll, nextPollDelay(startedAt, performance.now()))
   }
  }
  void poll()
  return () => { stopped = true; clearTimeout(timer); controller?.abort() }
 }, [enabled])
 const currentUnits = units.map(unit => unit.sourceTime && clock - Date.parse(unit.sourceTime) > staleMs
   ? {...empty().find(item => item.id === unit.id)!, issue:'Data terlambat; menunggu pembacaan terbaru'} : unit)
 const currentSystem = system && clock - Date.parse(system.sourceTime) <= staleMs ? system : null
 const hasExpired = currentUnits.some((unit,index) => unit.acquisitionActive !== units[index].acquisitionActive) || (system !== null && currentSystem === null)
 const freshCount = currentUnits.filter(unit => unit.acquisitionActive).length
 const connection = network !== 'connected' ? network : freshCount === 13 && currentSystem ? 'connected' : (freshCount > 0 || currentSystem) ? 'partial' : 'stale'
 return {connection, units:currentUnits, message:hasExpired ? 'Data terlambat; menunggu pembacaan terbaru' : message, history, system:currentSystem}
}
