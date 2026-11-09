'use client';

import { useEffect, useMemo, useState } from 'react';
import { getData, postData } from '../../lib/api';

type MapFeature = {
  _id: string;
  featureType: 'block' | 'hive' | 'inspection_point' | 'access_point' | 'other';
  geometryType: 'Point' | 'Polygon';
  geometry: { type: 'Point' | 'Polygon'; coordinates: any };
  label: string;
  blockCode?: string;
  notes?: string;
  status?: string;
};
type NavigationTarget = {
  _id: string;
  title: string;
  targetType: string;
  targetLabel: string;
  latitude: number;
  longitude: number;
  blockCode?: string;
  instructions?: string;
  source: string;
};

function mapsUrl(lat: number, lon: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${lat},${lon}`)}`;
}
function osmUrl(lat: number, lon: number) {
  return `https://www.openstreetmap.org/?mlat=${encodeURIComponent(lat)}&mlon=${encodeURIComponent(lon)}#map=17/${lat}/${lon}`;
}
function polygonCentroidApprox(coords: number[][][]) {
  const ring: number[][] = coords?.[0] || [];
  if (ring.length < 4) return null;
  const vertices = ring.slice(0, -1);
  const avgLon = vertices.reduce((sum, p) => sum + p[0], 0) / vertices.length;
  const avgLat = vertices.reduce((sum, p) => sum + p[1], 0) / vertices.length;
  return { latitude: avgLat, longitude: avgLon };
}

export default function FieldNavigationPage() {
  const [features, setFeatures] = useState<MapFeature[]>([]);
  const [targets, setTargets] = useState<NavigationTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [blockCode, setBlockCode] = useState('');

  async function load() {
    setLoading(true);
    try {
      const [mapData, navData] = await Promise.all([getData<any>('/farm-map'), getData<any>('/field-navigation')]);
      const mapItems = Array.isArray(mapData) ? mapData : (mapData?.items || []);
      const navItems = Array.isArray(navData) ? navData : (navData?.items || []);
      setFeatures(mapItems);
      setTargets(navItems);
      setMessage('');
    } catch (e: any) {
      setMessage(e?.message || 'Could not load map features/navigation targets. Sign in and check API.');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); }, []);

  const selected = useMemo(() => features.find((f) => f._id === selectedId), [features, selectedId]);

  async function saveTarget(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');
    try {
      if (!selected) throw new Error('Select a map feature first.');
      let latitude: number, longitude: number;
      if (selected.geometryType === 'Point') {
        longitude = selected.geometry.coordinates[0];
        latitude = selected.geometry.coordinates[1];
      } else {
        const center = polygonCentroidApprox(selected.geometry.coordinates);
        if (!center) throw new Error('This block has no usable polygon. Add or repair its boundary in Farm Mapping.');
        latitude = center.latitude;
        longitude = center.longitude;
      }
      await postData('/field-navigation', {
        title: title.trim() || selected.label,
        targetType: selected.featureType,
        targetLabel: selected.label,
        latitude,
        longitude,
        blockCode: blockCode.trim() || selected.blockCode || undefined,
        instructions: instructions.trim() || undefined,
        source: 'map_feature',
      });
      setTitle('');
      setInstructions('');
      setBlockCode('');
      setMessage('Navigation target saved. For polygon blocks, the target is an approximate average-vertex point, not a guaranteed safe entry point.');
      await load();
    } catch (e: any) {
      setMessage(e?.message || 'Could not save navigation target.');
    }
  }

  async function archiveTarget(id: string) {
    if (!window.confirm('Archive this saved navigation target?')) return;
    try {
      await postData(`/field-navigation/${id}/archive`, {});
      setMessage('Navigation target archived.');
      await load();
    } catch (e: any) {
      setMessage(e?.message || 'Could not archive target. Owner access may be required.');
    }
  }

  return (
    <main className="page-container" style={{ maxWidth: 1150, margin: '0 auto', padding: 24 }}>
      <header style={{ marginBottom: 20 }}>
        <h1>Field Navigation & Map Integration</h1>
        <p>Turn recorded map features into saved navigation targets for supervisors and field workers.</p>
        <p><strong>Safety note:</strong> map directions are approximate. Confirm the route, access permissions, terrain, weather and local hazards before travel.</p>
      </header>
      {message ? <div className="card" role="status" style={{ marginBottom: 16 }}>{message}</div> : null}
      <section className="card" style={{ marginBottom: 20 }}>
        <h2>Map features</h2>
        <p>Features are loaded from the Phase 33 farm map register. Polygon blocks use an approximate average-vertex point as the navigation destination.</p>
        {loading ? <p>Loading…</p> : features.length === 0 ? <p>No map features found. Add locations in <a href="/farm-map">Farm Mapping</a> first.</p> : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead><tr><th>Label</th><th>Type</th><th>Block</th><th>Geometry</th><th>Destination</th></tr></thead>
              <tbody>{features.map((f) => {
                const point = f.geometryType === 'Point'
                  ? { latitude: f.geometry.coordinates[1], longitude: f.geometry.coordinates[0] }
                  : polygonCentroidApprox(f.geometry.coordinates);
                return <tr key={f._id}>
                  <td>{f.label}</td><td>{f.featureType.replaceAll('_', ' ')}</td><td>{f.blockCode || '—'}</td><td>{f.geometryType}</td>
                  <td>{point ? <a href={mapsUrl(point.latitude, point.longitude)} target="_blank" rel="noreferrer">Open directions</a> : 'No destination'}</td>
                </tr>;
              })}</tbody>
            </table>
          </div>
        )}
      </section>
      <section className="card" style={{ marginBottom: 20 }}>
        <h2>Save a navigation target</h2>
        <form onSubmit={saveTarget} style={{ display: 'grid', gap: 12, maxWidth: 760 }}>
          <label>Map feature
            <select required value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
              <option value="">Choose a recorded feature…</option>
              {features.map((f) => <option key={f._id} value={f._id}>{f.label} — {f.featureType.replaceAll('_', ' ')}</option>)}
            </select>
          </label>
          <label>Target title (optional)<input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} placeholder="Defaults to feature label" /></label>
          <label>Block code override (optional)<input value={blockCode} onChange={(e) => setBlockCode(e.target.value)} maxLength={40} /></label>
          <label>Field instructions (optional)<textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} maxLength={500} rows={3} placeholder="e.g. Use the east track; ask supervisor before entering" /></label>
          <button type="submit" disabled={!selected}>Save navigation target</button>
        </form>
      </section>
      <section className="card">
        <h2>Saved navigation targets</h2>
        {targets.length === 0 ? <p>No saved targets yet.</p> : <div style={{ overflowX: 'auto' }}>
          <table><thead><tr><th>Target</th><th>Coordinates</th><th>Block</th><th>Instructions</th><th>Map / Directions</th><th>Action</th></tr></thead>
            <tbody>{targets.map((t) => <tr key={t._id}>
              <td>{t.title}<br /><small>{t.targetLabel}</small></td>
              <td>{t.latitude.toFixed(6)}, {t.longitude.toFixed(6)}</td><td>{t.blockCode || '—'}</td><td>{t.instructions || '—'}</td>
              <td><a href={mapsUrl(t.latitude, t.longitude)} target="_blank" rel="noreferrer">Directions</a> · <a href={osmUrl(t.latitude, t.longitude)} target="_blank" rel="noreferrer">OpenStreetMap</a></td>
              <td><button type="button" onClick={() => void archiveTarget(t._id)}>Archive</button></td>
            </tr>)}</tbody>
          </table>
        </div>}
      </section>
    </main>
  );
}
