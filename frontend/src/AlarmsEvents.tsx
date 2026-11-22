import { matchesAlarmSearch } from './alarmSearch'
import AlarmSelect from './AlarmSelect'
import { useEffect, useRef, useState } from 'react'
import { evaluateParameterAlarm } from './ParameterAlarm'
import type { FleetUnit } from './useHistoricalFleet'
import './AlarmsEvents.css'

type Props = {units: FleetUnit[]; mode: 'historical'|'live'; visible: boolean; loading: boolean; error: string; onTrend: (id:string, tag:string)=>void; day:string; time:string; onDay:(value:string)=>void; onTime:(value:string)=>void; onRefresh:()=>void}
type Event = {id:string; unit:string; time:string; before:string; after:string}
const categories = ['Trip','High High','High','Low Low','Low'] as const
const categoryColor:Record<string,string> = {'Trip':'#fbbf24','High High':'#fb7185','High':'#fbbf24','Low Low':'#c4b5fd','Low':'#60a5fa'}
const colors: Record<string,string> = {Running:'#34d399',Standby:'#f87171',Isolate:'#f8fafc',Trip:'#fbbf24',Unknown:'#94a3b8'}
export default function AlarmsEvents({units,mode,visible,loading,error,onTrend,day,time,onDay,onTime,onRefresh}:Props) {
 const [unitFilter,setUnitFilter]=useState('All')
 const [kind,setKind]=useState('All')
 const [search,setSearch]=useState('')
 const [events,setEvents]=useState<Event[]>([])
 const previous=useRef(new Map<string,{status:string;time:number}>())
 const lastMode=useRef(mode)
 useEffect(()=>{
  if(lastMode.current!==mode){previous.current.clear();setEvents([]);lastMode.current=mode}
  if(mode!=='live')return
  const changes:Event[]=[]
  for(const u of units){
   const time=Date.parse(u.sourceTime??'')
   if(!u.acquisitionActive||u.status==='Unknown'||!Number.isFinite(time)){previous.current.delete(u.id);continue}
   const old=previous.current.get(u.id)
   if(old&&time<=old.time)continue
   if(old&&old.status!==u.status)changes.push({id:`${u.id}:${time}`,unit:u.id,time:u.sourceTime!,before:old.status,after:u.status})
   previous.current.set(u.id,{status:u.status,time})
  }
  if(changes.length)setEvents(old=>[...changes.reverse(),...old].slice(0,300))
 },[units,mode])
 const alarms: {id:string;unit:string;tag:string;fullTag:string;label:string;value:string;condition:string;color:string;time:string;details:string}[]=[]
 let evaluated=0
 if(!loading&&!error)for(const u of units){
  if(u.status==='Trip')alarms.push({id:`${u.id}:status`,unit:u.id,tag:'',fullTag:'',label:'Status operasi kompresor',value:'Trip',condition:'Trip',color:colors.Trip,time:u.sourceTime??'—',details:'Status Trip yang disediakan logika status/sumber data; bukan hasil pelampauan parameter.'})
  for(const p of u.customParameters??[]){
   if(mode==='live' && (!u.acquisitionActive || !p.tag.toUpperCase().startsWith(`U-SAC${u.id.replace('SAC#','')}-`))){continue}
   const result=evaluateParameterAlarm(p)
   const active=['High','Low','Mencapai batas Trip High','Mencapai batas Trip Low'].includes(result.text)
   if(active||result.text==='Dalam batas')evaluated++
   if(active)alarms.push({id:`${u.id}:${p.tag}`,unit:u.id,tag:p.suffix,fullTag:p.tag,label:p.label,value:`${p.value?.toLocaleString('id-ID')} ${p.unit}`,condition:result.text === 'Mencapai batas Trip High' ? 'High High' : result.text === 'Mencapai batas Trip Low' ? 'Low Low' : result.text,color:result.color,time:u.sourceTime??'—',details:result.details.join('\n')})
  }
 }
 const matching=alarms.filter(a=>(unitFilter==='All'||a.unit===unitFilter)&&matchesAlarmSearch(search,[a.unit,a.label,a.tag,a.fullTag]))
 const filtered=matching.filter(a=>kind==='All'||a.condition===kind)
 return <section className="alarm-page" hidden={!visible}>
  <header><div><span className="alarm-eyebrow">SERVICE AIR · MONITORING</span><h2>Alarms &amp; Events</h2><p>{mode==='historical'?'Historical · evaluasi sampel pada waktu pilihan':'Live · status terbaru dan perubahan yang teramati'}</p></div><span className="alarm-mode">{mode.toUpperCase()}</span></header>
  {loading?<p role="status">Memuat data Historical…</p>:error?<p role="alert">Data alarm belum dapat dievaluasi: {error}</p>:null}
  <p>High High memakai acuan batas Trip High; Low Low memakai batas Trip Low yang sudah ada. Pelampauan parameter bukan konfirmasi mesin Trip. Jumlah pada kartu menunjukkan kondisi sampel, bukan jumlah kejadian.</p>
  {mode==='live'&&<p className="alarm-note">Evaluasi Live memakai profil ambang yang tersedia untuk tag Centac yang cocok. Parameter tanpa nilai, ambang, atau satuan yang sesuai belum dievaluasi. Status Trip mengikuti sumber.</p>}
  <div className="alarm-controls">{mode==='historical'&&<><label>Tanggal data<input type="date" value={day} onChange={e=>/^\d{4}-\d{2}-\d{2}$/.test(e.target.value)&&onDay(e.target.value)}/></label><label>Waktu<input type="time" value={time} onChange={e=>/^\d{2}:\d{2}$/.test(e.target.value)&&onTime(e.target.value)}/></label><button type="button" disabled={loading} onClick={onRefresh}>{loading?'Memuat…':'Muat ulang data'}</button></>}<AlarmSelect label="Unit" value={unitFilter} onChange={setUnitFilter} options={[{value:'All',label:'Semua unit'},...units.map(u=>({value:u.id,label:u.id}))]}/><AlarmSelect label="Jenis" value={kind} onChange={setKind} options={[{value:'All',label:'Semua indikasi'},...categories.map(c=>({value:c,label:c}))]}/><div className="alarm-search"><input type="search" aria-label="Cari unit atau parameter pada alarm" aria-describedby="alarm-search-help" placeholder="Cari unit atau parameter…" value={search} onChange={e=>setSearch(e.target.value)}/>{search&&<button type="button" onClick={()=>setSearch('')} aria-label="Hapus pencarian">Hapus</button>}</div></div>
  <div className="alarm-metrics">{categories.map(category=><button type="button" className={`alarm-metric ${kind===category?'selected':''}`} aria-pressed={kind===category} key={category} style={{borderTopColor:categoryColor[category]}} onClick={()=>setKind(kind===category?'All':category)}><span>{category}</span><strong style={{color:categoryColor[category]}}>{loading||error||(mode==='live'&&(category==='Trip'?!units.some(u=>u.acquisitionActive&&u.status!=='Unknown'):evaluated===0))?'—':matching.filter(a=>a.condition===category).length}</strong><small>{category==='Trip'?'Status Trip kompresor':mode==='live'?'Indikasi pada sampel terbaru':'Indikasi pada sampel pilihan'}</small></button>)}</div>
  <p id="alarm-search-help">Pencarian berlaku pada tabel alarm di waktu yang dipilih, berdasarkan unit, nama parameter, atau tag. Parameter tanpa indikasi alarm tidak ditampilkan di tabel ini.</p>
  <div className="alarm-coverage" role="status" aria-live="polite"><span>Parameter dievaluasi: <b>{loading||error?'—':evaluated}</b></span><span>Hasil filter: <b>{filtered.length}</b></span></div>
  <div className="alarm-table"><table><thead><tr><th>Waktu sumber</th><th>Unit / parameter</th><th>Nilai</th><th>Kondisi</th><th>Detail</th></tr></thead><tbody>{filtered.map(a=><tr key={a.id}><td>{a.time}</td><td><strong>{a.unit}</strong><br/>{a.label}{a.tag&&<small className="alarm-tag">{a.tag}</small>}</td><td>{a.value}</td><td><span className="alarm-badge" style={{color:categoryColor[a.condition],borderColor:categoryColor[a.condition]}}>{a.condition}</span></td><td>{a.tag&&<button type="button" onClick={()=>onTrend(a.unit,a.tag)}>Lihat tren</button>}<details><summary>Informasi</summary><pre>{a.details}</pre></details></td></tr>)}</tbody></table>{!filtered.length&&!loading&&!error&&<p className="alarm-empty">{search.trim()?<>Tidak ada alarm yang cocok dengan “{search.trim()}” pada waktu dan filter pilihan.</>:'Tidak ada indikasi alarm pada data yang dapat dievaluasi dengan filter pilihan.'} {(search.trim()||unitFilter!=='All'||kind!=='All')&&<button type="button" onClick={()=>{setSearch('');setUnitFilter('All');setKind('All')}}>Reset filter alarm</button>}</p>}</div>
  <h3>Events · perubahan status Live</h3><p>Dicatat selama mode Live dibuka, termasuk saat berpindah menu. Maksimal 300 perubahan; hilang saat refresh atau berganti mode. Waktu adalah sampel saat perubahan teramati, bukan waktu kejadian pasti. Sampel awal dan pemulihan setelah data terputus menjadi acuan baru.</p>
  {mode==='historical'?<p className="alarm-empty">Riwayat kejadian Historical belum tersedia. Perubahan pemilihan tanggal tidak dicatat sebagai kejadian mesin.</p>:<div className="alarm-table"><table><thead><tr><th>Waktu sumber</th><th>Unit</th><th>Status sebelumnya</th><th>Status teramati</th></tr></thead><tbody>{events.filter(e=>unitFilter==='All'||e.unit===unitFilter).map(e=><tr key={e.id}><td>{e.time}</td><td>{e.unit}</td><td style={{color:colors[e.before]}}>{e.before}</td><td style={{color:colors[e.after]}}>{e.after}</td></tr>)}</tbody></table>{!events.length&&<p className="alarm-empty">Belum ada perubahan status Live yang teramati pada sesi ini.</p>}</div>}
 </section>
}
