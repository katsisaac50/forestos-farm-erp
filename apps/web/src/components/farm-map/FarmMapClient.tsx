'use client';
import { MapContainer, TileLayer, Marker, Polygon, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
export type FarmMapFeatureView = {
 _id:string; featureType:'block'|'hive'|'inspection_point'|'access_point'|'other'; geometryType:'Point'|'Polygon';
 geometry:{type:'Point'|'Polygon';coordinates:any}; label:string; blockCode?:string; areaAcres?:number; notes?:string; source:'manual'|'gps'|'imported';
};
const icon=new L.Icon({iconUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',iconRetinaUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',shadowUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',iconSize:[25,41],iconAnchor:[12,41]});
function ClickPicker({onPick}:{onPick:(lat:number,lon:number)=>void}) { useMapEvents({click(e){onPick(Number(e.latlng.lat.toFixed(6)),Number(e.latlng.lng.toFixed(6)));}}); return null; }
function latlngs(coords:number[][][]) { return coords[0].map(([lon,lat])=>[lat,lon] as [number,number]); }
export default function FarmMapClient({features,onMapPick,initialCenter}:{features:FarmMapFeatureView[];onMapPick:(lat:number,lon:number)=>void;initialCenter:[number,number]}) {
 return <MapContainer center={initialCenter} zoom={14} scrollWheelZoom style={{height:520,width:'100%',borderRadius:12}}>
  <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
  <ClickPicker onPick={onMapPick}/>
  {features.map(f=>f.geometryType==='Point' ? <Marker key={f._id} position={[f.geometry.coordinates[1],f.geometry.coordinates[0]]} icon={icon}><Popup><strong>{f.label}</strong><br/>Type: {f.featureType.replaceAll('_',' ')}<br/>{f.blockCode?<>Block: {f.blockCode}<br/></>:null}{typeof f.areaAcres==='number'?<>Recorded acres: {f.areaAcres}<br/></>:null}{f.notes? <>{f.notes}<br/></>:null}Source: {f.source}</Popup></Marker> : <Polygon key={f._id} positions={latlngs(f.geometry.coordinates)}><Popup><strong>{f.label}</strong><br/>Farm block boundary (approximate)<br/>{f.blockCode?<>Block: {f.blockCode}<br/></>:null}{typeof f.areaAcres==='number'?<>Recorded acres: {f.areaAcres}<br/></>:null}{f.notes? <>{f.notes}<br/></>:null}</Popup></Polygon>)}
 </MapContainer>;
}
