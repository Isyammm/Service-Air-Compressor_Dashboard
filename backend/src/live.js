import { createSharedSnapshot } from './sharedSnapshot.js'
export function staleAfterMs(value = process.env.STALE_AFTER_SECONDS) {
  const seconds = Number(value ?? 15)
  if (!Number.isFinite(seconds) || seconds < 1 || seconds > 3600) throw new Error('STALE_AFTER_SECONDS harus 1–3600')
  return Math.round(seconds * 1000)
}
const ids = [1,2,3,4,7,8,9,10,11,12,13,14,15].map(n => `SAC#${n}`)
const fields = ['airTempStg1','airTempStg2','bearingDeTemp','bearingNdeTemp','pressureStg1','pressureStg2','ctInput','motorWindingTemp','flow']
function timestamp(value, now) {
  const time = Date.parse(value)
  if (typeof value !== 'string' || !/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(time) || time > now + 5000) throw new Error('Invalid timestamp')
  return value
}
function readings(source, keys) {
  const result = {}
  for (const key of keys) {
    const value = source[key]
    if (value != null && (typeof value !== 'number' || !Number.isFinite(value))) throw new Error('Invalid reading')
    const quality = source.qualities?.[key]
    result[key] = quality != null && quality !== 'good' ? null : value ?? null
  }
  return result
}
function parameters(source) {
  if (source == null) return []
  if (!Array.isArray(source) || source.length > 64) throw new Error('Invalid parameter list')
  const seen = new Set()
  const categories = ['temperature','pressure','mechanical','electrical','flow','status','other']
  return source.map(item => {
    if (!item || typeof item.tag !== 'string' || !item.tag.trim() || item.tag.length > 255 || seen.has(item.tag.trim())) throw new Error('Invalid/duplicate parameter tag')
    seen.add(item.tag.trim())
    if (typeof item.label !== 'string' || !item.label.trim() || item.label.length > 200 || typeof item.unit !== 'string' || item.unit.length > 40) throw new Error('Invalid parameter metadata')
    if (item.value != null && (typeof item.value !== 'number' || !Number.isFinite(item.value))) throw new Error('Invalid parameter value')
    if (item.quality != null && !['good','bad','uncertain'].includes(item.quality)) throw new Error('Invalid parameter quality')
    const category = item.category ?? 'other'
    if (!categories.includes(category)) throw new Error('Invalid parameter category')
    return {tag:item.tag.trim(),label:item.label.trim(),unit:item.unit,category,value:item.quality && item.quality !== 'good' ? null : item.value ?? null}
  })
}
export function validateSnapshot(data, now = Date.now()) {
  if (!data || !Array.isArray(data.units) || data.units.length > ids.length) throw new Error('Invalid units')
  const seen = new Set()
  const units = data.units.map(unit => {
    if (!unit || !ids.includes(unit.id) || seen.has(unit.id)) throw new Error('Invalid/duplicate unit')
    seen.add(unit.id)
    if (!['Running','Standby','Trip','Isolate','Unknown'].includes(unit.status)) throw new Error('Invalid status')
    return {
      id:unit.id, sourceTime:timestamp(unit.sourceTime,now),
      status: unit.statusQuality != null && unit.statusQuality !== 'good' ? 'Unknown' : unit.status,
      ...readings(unit,fields),
      parameters:parameters(unit.parameters),
    }
  })
  const system = data.system == null ? null : {
    sourceTime: timestamp(data.system.sourceTime,now),
    ...readings(data.system,['flow','pressure','dewPoint']),
  }
  return { units, system }
}
const sharedSnapshot = createSharedSnapshot()
export async function liveSnapshot(_req, res) {
  res.set('Cache-Control', 'no-store')
  if (!process.env.LIVE_SOURCE_URL) return res.status(503).json({configured:false,message:'Sumber Live belum dikonfigurasi'})
  try {
    const expiry = staleAfterMs()
    const key = JSON.stringify([process.env.LIVE_SOURCE_URL, process.env.LIVE_SOURCE_TOKEN, expiry])
    const snapshot = await sharedSnapshot(key, async () => {
      const url = new URL(process.env.LIVE_SOURCE_URL)
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Unsupported source')
      const headers = process.env.LIVE_SOURCE_TOKEN ? {Authorization: `Bearer ${process.env.LIVE_SOURCE_TOKEN}`} : {}
      const response = await fetch(url, {headers, signal: AbortSignal.timeout(5000), redirect:'error'})
      if (!response.ok) throw new Error('Source unavailable')
      return {...validateSnapshot(await response.json()), staleAfterMs:expiry}
    })
    res.json(snapshot)
  } catch {
    res.status(502).json({message:'Sumber Live tidak dapat dibaca atau format data belum sesuai'})
  }
}
