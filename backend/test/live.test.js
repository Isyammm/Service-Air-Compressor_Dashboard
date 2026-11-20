import {test} from 'node:test'
import assert from 'node:assert/strict'
import {validateSnapshot,liveSnapshot,staleAfterMs} from '../src/live.js'
const stamp=()=>new Date().toISOString()
const unit=()=>({id:'SAC#2',sourceTime:stamp(),status:'Running',airTempStg1:98})
test('accepts normalized source; drops unrelated fields',()=>{
 const result=validateSnapshot({units:[{...unit(),secret:'not forwarded'}]})
 assert.equal(result.units[0].airTempStg1,98);assert.equal(result.units[0].secret,undefined)
})
test('rejects duplicate units',()=>assert.throws(()=>validateSnapshot({units:[unit(),unit()]})))
test('rejects invalid unit/status',()=>{
 for(const patch of [{id:'SAC#99'},{status:'Normal'}])assert.throws(()=>validateSnapshot({units:[{...unit(),...patch}]}))
})
test('rejects timestamp without timezone and future timestamp',()=>{
 for(const sourceTime of ['2026-11-20 10:00:00',new Date(Date.now()+60000).toISOString()])assert.throws(()=>validateSnapshot({units:[{...unit(),sourceTime}]}))
})
test('invalid quality cannot appear as valid numeric reading',()=>{
 const result=validateSnapshot({units:[{...unit(),qualities:{airTempStg1:'bad'},statusQuality:'uncertain'}]})
 assert.equal(result.units[0].airTempStg1,null);assert.equal(result.units[0].status,'Unknown')
})
test('rejects numeric strings and non-finite values',()=>{
 for(const airTempStg1 of ['98',Infinity,NaN])assert.throws(()=>validateSnapshot({units:[{...unit(),airTempStg1}]}))
})
test('system quality and missing fields',()=>{
 const r=validateSnapshot({units:[],system:{sourceTime:stamp(),dewPoint:10,qualities:{dewPoint:'bad'}}})
 assert.equal(r.system.dewPoint,null);assert.equal(r.system.flow,null)
})
test('unconfigured source returns unavailable',async()=>{
 const original=process.env.LIVE_SOURCE_URL;delete process.env.LIVE_SOURCE_URL
 try {let status;await liveSnapshot({}, {set(){},status(n){status=n;return this},json(){}});assert.equal(status,503)}
 finally {if(original!==undefined)process.env.LIVE_SOURCE_URL=original}
})

test('configurable data age validates bounds',()=>{
 assert.equal(staleAfterMs('5'),5000)
 assert.equal(staleAfterMs('15'),15000)
 for(const value of ['bad','0','-1','3601'])assert.throws(()=>staleAfterMs(value))
})
test('API includes configured expiry with upstream data',async()=>{
 const oldFetch=globalThis.fetch, oldUrl=process.env.LIVE_SOURCE_URL, oldAge=process.env.STALE_AFTER_SECONDS
 process.env.LIVE_SOURCE_URL='http://example.invalid/snapshot';process.env.STALE_AFTER_SECONDS='7'
 globalThis.fetch=async()=>({ok:true,json:async()=>({units:[unit()]})})
 try{let body;await liveSnapshot({}, {set(){},status(){return this},json(value){body=value}});assert.equal(body.staleAfterMs,7000);assert.equal(body.units[0].id,'SAC#2')}
 finally{globalThis.fetch=oldFetch;for(const [key,value] of [['LIVE_SOURCE_URL',oldUrl],['STALE_AFTER_SECONDS',oldAge]]){if(value===undefined)delete process.env[key];else process.env[key]=value}}
})
test('dynamic parameters: missing catalog remains empty',()=>{
 assert.deepEqual(validateSnapshot({units:[unit()]}).units[0].parameters,[])
})
test('dynamic parameters preserve source metadata and filter bad quality',()=>{
 const parameter={tag:'TAG-A',label:'Parameter perusahaan',unit:'cfm',category:'flow',value:25,quality:'bad'}
 const result=validateSnapshot({units:[{...unit(),parameters:[parameter]}]}).units[0].parameters[0]
 assert.equal(result.tag,'TAG-A');assert.equal(result.unit,'cfm');assert.equal(result.value,null)
})
test('dynamic parameters reject duplicates and invalid readings',()=>{
 const parameter={tag:'TAG-A',label:'Suhu',unit:'°C',value:25}
 assert.throws(()=>validateSnapshot({units:[{...unit(),parameters:[parameter,parameter]}]}))
 assert.throws(()=>validateSnapshot({units:[{...unit(),parameters:[{...parameter,value:'25'}]}]}))
 assert.throws(()=>validateSnapshot({units:[{...unit(),parameters:[{...parameter,quality:'invalid'}]}]}))
})
