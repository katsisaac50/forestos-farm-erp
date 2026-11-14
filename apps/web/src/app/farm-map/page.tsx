'use client';
import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import { getData, postData } from '../../lib/api';
import { NavSidebar } from '@/components/NavSidebar';
import type { FarmMapFeatureView } from '../../components/farm-map/FarmMapClient';
const FarmMapClient=dynamic(()=>import('../../components/farm-map/FarmMapClient'),{ssr:false,loading:()=> <div className="card">Loading map…</div>});
type FeatureType='block'|'hive'|'inspection_point'|'access_point'|'other';
function parseRing(text:string):number[][] {
 const pts=text.split(/\n|;/).map(x=>x.trim()).filter(Boolean).map(line=>{
  const a=line.split(',').map(x=>Number(x.trim()));
  if(a.length!==2||!a.every(Number.isFinite)) throw new Error('Each boundary line must be latitude,longitude.');
  const [lat,lon]=a; if(lat < -90||lat>90||lon < -180||lon>180) throw new Error('Coordinate outside valid ranges.');
  return [lon,lat];
 });
 if(pts.length<3) throw new Error('Enter at least 3 boundary vertices.');
 if(pts[0][0]!==pts[pts.length-1][0]||pts[0][1]!==pts[pts.length-1][1]) pts.push([...pts[0]]);
 if(pts.length>501) throw new Error('Maximum 500 vertices.');
 if(new Set(pts.slice(0,-1).map(p=>p.join(','))).size<3) throw new Error('Boundary needs 3 unique vertices.');
 return pts;
}
export default function FarmMapPage() {
 const [features,setFeatures]=useState<FarmMapFeatureView[]>([]),[loading,setLoading]=useState(true),[message,setMessage]=useState('');
 const [featureType,setFeatureType]=useState<FeatureType>('hive'),[label,setLabel]=useState(''),[blockCode,setBlockCode]=useState(''),[areaAcres,setAreaAcres]=useState(''),[notes,setNotes]=useState('');
 const [lat,setLat]=useState(''),[lon,setLon]=useState(''),[ringText,setRingText]=useState(''),[source,setSource]=useState<'manual'|'gps'>('manual');
 const center=useMemo<[number,number]>(()=>{const f=features.find(x=>x.geometryType==='Point');return f?[f.geometry.coordinates[1],f.geometry.coordinates[0]]:[0.3476,32.5825]},[features]);
 async function load(){setLoading(true);try{const d=await getData<any>('/farm-map');setFeatures(Array.isArray(d)?d:(d?.items||[]));setMessage('')}catch(e:any){setMessage(e?.message||'Could not load map features. Sign in and check API.')}finally{setLoading(false)}}
 useEffect(()=>{void load()},[]);
 function pick(a:number,b:number){setLat(String(a));setLon(String(b));setSource('manual');setMessage('Map point selected. Save the feature to record it.')}
 function useGps(){if(!navigator.geolocation){setMessage('This browser does not provide GPS.');return}navigator.geolocation.getCurrentPosition(p=>{setLat(p.coords.latitude.toFixed(6));setLon(p.coords.longitude.toFixed(6));setSource('gps');setMessage('GPS captured. Device-reported accuracy: about '+Math.round(p.coords.accuracy)+' m; this is not independently verified.')},e=>setMessage('GPS could not be read: '+e.message),{enableHighAccuracy:true,timeout:15000,maximumAge:0})}
 async function save(e:React.FormEvent){e.preventDefault();setMessage('');try{
  if(!label.trim()) throw new Error('Enter a label.');
  let geometryType:'Point'|'Polygon',geometry:any;
  if(featureType==='block'){geometryType='Polygon';geometry={type:'Polygon',coordinates:[parseRing(ringText)]}}
  else {geometryType='Point';const a=Number(lat),b=Number(lon);if(!lat.trim()||!lon.trim()||!Number.isFinite(a)||!Number.isFinite(b)||a < -90||a>90||b < -180||b>180)throw new Error('Choose a map point, capture GPS, or enter valid coordinates.');geometry={type:'Point',coordinates:[b,a]}}
  const payload:any={featureType,geometryType,geometry,label:label.trim(),source};if(blockCode.trim())payload.blockCode=blockCode.trim();
  if(areaAcres.trim()){const n=Number(areaAcres);if(!Number.isFinite(n)||n<0||n>100000)throw new Error('Recorded acres must be between 0 and 100,000.');payload.areaAcres=n}
  if(notes.trim())payload.notes=notes.trim();await postData('/farm-map',payload);setMessage('Map feature saved.');setLabel('');setBlockCode('');setAreaAcres('');setNotes('');setRingText('');await load();
 }catch(e:any){setMessage(e?.message||'Could not save feature.')}}
 async function archive(id:string){if(!window.confirm('Archive this feature?'))return;try{await postData('/farm-map/'+id+'/archive',{});setMessage('Feature archived.');await load()}catch(e:any){setMessage(e?.message||'Could not archive feature. Owner access may be required.')}}
 const points=features.filter(f=>f.geometryType==='Point').length,blocks=features.filter(f=>f.featureType==='block').length;
 return (
  <div className="shell">
   <NavSidebar />
   <main id="main-content" className="main">
    <div style={{maxWidth:1200,margin:'0 auto'}}>
     <header style={{marginBottom:20}}>
      <h1>Farm Mapping &amp; Geospatial Intelligence</h1>
      <p>Record farm blocks, eucalyptus areas, hive sites, inspection points and access points.</p>
      <p><strong>Important:</strong> geometry and GPS are operational aids, not surveyed/legal boundaries or proof of acreage.</p>
     </header>
     {message?<div className="card" role="status" style={{marginBottom:16}}>{message}</div>:null}
     <section className="card" style={{marginBottom:20}}>
      <h2>Map overview</h2>
      <div style={{display:'flex',gap:20,flexWrap:'wrap',marginBottom:12}}>
       <span>Active features: <strong>{features.length}</strong></span>
       <span>Block polygons: <strong>{blocks}</strong></span>
       <span>Point features: <strong>{points}</strong></span>
       <button type="button" onClick={()=>void load()}>Refresh map</button>
      </div>
      {loading?<p>Loading features…</p>:<FarmMapClient features={features} onMapPick={pick} initialCenter={center}/>}
      <p style={{fontSize:13,marginTop:8}}>OpenStreetMap tiles require internet; offline tiles are not included.</p>
     </section>
     <section className="card" style={{marginBottom:20}}>
      <h2>Add a map feature</h2>
      <p>Click the map to populate point coordinates or capture device GPS. For a block, enter boundary vertices one per line as latitude,longitude.</p>
      <form onSubmit={save} style={{display:'grid',gap:12,maxWidth:780}}>
       <label>Feature type<select value={featureType} onChange={e=>setFeatureType(e.target.value as FeatureType)}><option value="block">Farm block boundary</option><option value="hive">Hive / apiary point</option><option value="inspection_point">Inspection point</option><option value="access_point">Access point / gate</option><option value="other">Other point</option></select></label>
       <label>Label<input value={label} onChange={e=>setLabel(e.target.value)} maxLength={100} required placeholder="e.g. Block A or Hive 01"/></label>
       <label>Block code (optional)<input value={blockCode} onChange={e=>setBlockCode(e.target.value)} maxLength={40}/></label>
       <label>Recorded acres (optional; manual, not calculated)<input type="number" min="0" max="100000" step="0.01" value={areaAcres} onChange={e=>setAreaAcres(e.target.value)}/></label>
       {featureType==='block'?
        <label>Boundary vertices (latitude,longitude)<textarea rows={5} value={ringText} onChange={e=>setRingText(e.target.value)} placeholder={'0.123456,32.123456\n0.123500,32.123900\n0.123100,32.123800'}/></label>:
        <>
         <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <button type="button" onClick={useGps}>Capture device GPS</button>
          <span>Source: {source==='gps'?'device GPS':'manual/map point'}</span>
         </div>
         <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12}}>
          <label>Latitude<input value={lat} onChange={e=>{setLat(e.target.value);setSource('manual')}} inputMode="decimal"/></label>
          <label>Longitude<input value={lon} onChange={e=>{setLon(e.target.value);setSource('manual')}} inputMode="decimal"/></label>
         </div>
        </>
       }
       <label>Notes<textarea rows={3} value={notes} onChange={e=>setNotes(e.target.value)} maxLength={500}/></label>
       <button type="submit">Save map feature</button>
      </form>
     </section>
     <section className="card">
      <h2>Feature register</h2>
      {features.length===0?
       <p>No active features recorded. Add a hive point or farm block boundary to begin.</p>:
       <div style={{overflowX:'auto'}}>
        <table><thead><tr><th>Feature</th><th>Type</th><th>Block</th><th>Recorded acres</th><th>Source</th><th>Action</th></tr></thead><tbody>
         {features.map(f=><tr key={f._id}>
          <td>{f.label}</td><td>{f.featureType.replaceAll('_',' ')}</td><td>{f.blockCode||'—'}</td>
          <td>{typeof f.areaAcres==='number'?f.areaAcres:'—'}</td><td>{f.source}</td>
          <td><button type="button" onClick={()=>void archive(f._id)}>Archive</button></td>
         </tr>)}
        </tbody></table>
       </div>
      }
     </section>
    </div>
   </main>
  </div>
 );
}