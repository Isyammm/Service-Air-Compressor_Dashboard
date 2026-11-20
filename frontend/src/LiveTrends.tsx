import { useState } from 'react'
import InteractiveTrendChart from './InteractiveTrendChart'
import { ACTIVE_UNIT_NUMBERS } from './fleetConfig'
import { parameterKey } from './liveHistory'
import type { LiveHistory } from './liveHistory'
import type { FleetUnit } from './useHistoricalFleet'
type Props = {history:LiveHistory;units:FleetUnit[];unitId:string;initialTag:string;onUnitChange:(id:string)=>void;message:string}
export default function LiveTrends(props:Props) {
 // Unit/tag navigation starts a fresh selection and frozen view.
 return <LiveTrendContent key={`${props.unitId}:${props.initialTag}`} {...props}/>
}
function LiveTrendContent({history,units,unitId,initialTag,onUnitChange,message}:Props) {
 const [selected,setSelected] = useState(initialTag)
 const [frozen,setFrozen] = useState<{history:LiveHistory;units:FleetUnit[]} | null>(null)
 const parameters = (frozen?.units ?? units).find(unit=>unit.id===unitId)?.customParameters ?? []
 const item = parameters.find(p=>p.tag===selected) ?? parameters[0]
 const points = (frozen?.history ?? history)[unitId] ?? []
 const end = points.at(-1)?.time ?? Date.now()
 const key = item ? parameterKey(item.tag,item.unit) : ''
 const valid = item && points.some(point=>point.values[key]!=null)
 return <section className="panel">
  <div className="panel-header"><div><h2>Process & Trends · Live</h2><p>{message}</p></div></div>
  <div style={{padding:20,display:'flex',gap:12,flexWrap:'wrap'}}>
   <label>Centac <select value={unitId} onChange={e=>onUnitChange(e.target.value)}>{ACTIVE_UNIT_NUMBERS.map(n=><option key={n}>SAC#{n}</option>)}</select></label>
   <label>Parameter <select disabled={!parameters.length} value={item?.tag ?? ''} onChange={e=>setSelected(e.target.value)}>
    {!parameters.length && <option value="">Menunggu parameter perusahaan</option>}
    {parameters.map(p=><option key={p.tag} value={p.tag}>{p.label}{p.unit ? ` (${p.unit})` : ''}</option>)}
   </select></label>
   <button disabled={!item} onClick={()=>setFrozen(frozen ? null : {history,units})}>{frozen?'Lanjutkan grafik':'Jeda grafik untuk zoom'}</button>
  </div>
  <p style={{padding:'0 20px'}}>Waktu grafik: WITA (UTC+08:00). Maksimal 600 titik / 10 menit selama sesi Live. {frozen?'Grafik dijeda; pembacaan kartu tetap berjalan.':''}</p>
  {valid && item ? <InteractiveTrendChart timeZone="Asia/Makassar" points={points} series={[{tag:key,label:item.label,unit:item.unit,color:'#26c6da',dashed:false}]} start={end-600000} end={end} title={`${unitId} · ${item.label}`} /> : <div className="empty-state">{item?'Menunggu sampel valid untuk parameter ini.':'Menunggu konfigurasi parameter dari sumber perusahaan.'}</div>}
 </section>
}
