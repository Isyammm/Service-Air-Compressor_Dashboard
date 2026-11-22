import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

type Option = { value: string; label: string }
type Props = { label: string; value: string; options: Option[]; onChange: (value: string) => void }
export default function AlarmSelect({label,value,options,onChange}: Props) {
 const id=useId()
 const trigger=useRef<HTMLButtonElement>(null)
 const popup=useRef<HTMLDivElement>(null)
 const [open,setOpen]=useState(false)
 const [active,setActive]=useState(0)
 const [position,setPosition]=useState({top:0,left:0,width:180,height:240})
 const selected=Math.max(0,options.findIndex(o=>o.value===value))
 function show() {
  const rect=trigger.current?.getBoundingClientRect()
  if(!rect)return
  const below=window.innerHeight-rect.bottom-12
  const above=rect.top-12
  const height=Math.min(240,Math.max(below,above))
  const width=Math.min(Math.max(rect.width,180),window.innerWidth-24)
  setPosition({top:below>=Math.min(240,above)?rect.bottom+6:Math.max(8,rect.top-height-6),
   left:Math.max(12,Math.min(rect.left,window.innerWidth-width-12)),width,height})
  setActive(selected);setOpen(true)
 }
 function close(restore=false){setOpen(false);if(restore)trigger.current?.focus()}
 function choose(index:number){if(options[index])onChange(options[index].value);close(true)}
 useEffect(()=>{
  if(!open)return
  popup.current?.focus()
  function outside(e:PointerEvent){if(!popup.current?.contains(e.target as Node)&&!trigger.current?.contains(e.target as Node))setOpen(false)}
  function reposition(e:Event){if(!popup.current?.contains(e.target as Node))setOpen(false)}
  document.addEventListener('pointerdown',outside)
  window.addEventListener('resize',reposition)
  window.addEventListener('scroll',reposition,true)
  return()=>{document.removeEventListener('pointerdown',outside);window.removeEventListener('resize',reposition);window.removeEventListener('scroll',reposition,true)}
 },[open])
 useEffect(()=>{if(open)popup.current?.querySelector('[data-active="true"]')?.scrollIntoView({block:'nearest'})},[active,open])
 return <div className="alarm-select">
  <span id={id+'-label'}>{label}</span>
  <button ref={trigger} type="button" className="alarm-select-trigger" aria-labelledby={id+'-label '+id+'-value'} aria-haspopup="listbox" aria-expanded={open} aria-controls={open?id:undefined}
   onClick={()=>open?close():show()} onKeyDown={e=>{if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();show()}}}>
   <span id={id+'-value'}>{options[selected]?.label??value}</span><span aria-hidden="true">⌄</span>
  </button>
  {open&&createPortal(<div ref={popup} id={id} role="listbox" aria-labelledby={id+'-label'} tabIndex={-1} aria-activedescendant={id+'-'+active}
   className="alarm-select-popup" style={{top:position.top,left:position.left,width:position.width,maxHeight:position.height}}
   onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))close()}}
   onKeyDown={e=>{
    if(e.key==='Escape'){e.preventDefault();close(true)}
    else if(e.key==='Tab'){e.preventDefault();close(true)}
    else if(e.key==='Enter'||e.key===' '){e.preventDefault();choose(active)}
    else if(e.key==='ArrowDown'){e.preventDefault();setActive(i=>Math.min(options.length-1,i+1))}
    else if(e.key==='ArrowUp'){e.preventDefault();setActive(i=>Math.max(0,i-1))}
    else if(e.key==='Home'){e.preventDefault();setActive(0)}
    else if(e.key==='End'){e.preventDefault();setActive(options.length-1)}
    else if(e.key.length===1){const i=options.findIndex(o=>o.label.toLowerCase().startsWith(e.key.toLowerCase()));if(i>=0)setActive(i)}
   }}>
   {options.map((o,i)=><div key={o.value} id={id+'-'+i} role="option" aria-selected={o.value===value} data-active={i===active}
    className="alarm-select-option" onPointerMove={()=>setActive(i)} onMouseDown={e=>e.preventDefault()} onClick={()=>choose(i)}>
    <span>{o.label}</span><span aria-hidden="true">{o.value===value?'✓':''}</span>
   </div>)}
  </div>,document.body)}
 </div>
}
