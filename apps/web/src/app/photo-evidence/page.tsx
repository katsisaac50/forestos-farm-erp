'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { getData, patchData } from '@/lib/api';
import { NavSidebar } from '@/components/NavSidebar';
import {
  MetricCard,
  Segmented,
  Badge,
  FormSection,
  CollapsibleSection,
  NoticeBanner,
  Callout,
  thLeft,
  tdLeft,
  tableStyle,
  theadRow,
  bodyRow,
  mono,
} from '@/components/ui';

// ---- Types ----
type Evidence = {
  _id: string;
  runId: string;
  farmBlock: string;
  uploadedBy: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  caption?: string;
  reviewStatus: string;
  reviewNote?: string;
  createdAt?: string;
  evidenceType?: 'photo' | 'video';
};

const API = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api').replace(/\/$/, '');

function token() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('forestos_token') || '';
}

// ---- Download helper ----
async function downloadEvidence(item: Evidence) {
  const isVideo = item.evidenceType === 'video';
  const endpoint = isVideo
    ? `/video-evidence/${item._id}/file`
    : `/evidence/${item._id}/file`;
  const t = token();
  const r = await fetch(API + endpoint, {
    headers: t ? { Authorization: 'Bearer ' + t } : {},
  });
  if (!r.ok) throw new Error(`Download failed (${r.status})`);
  const blob = await r.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = item.originalName || (isVideo ? 'video.mp4' : 'photo.jpg');
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---- Video preview (top-level so hooks work) ----
function VideoPreview({ id }: { id: string }) {
  const [src, setSrc] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    let url = '';
    let cancelled = false;
    (async () => {
      try {
        const t = token();
        const r = await fetch(`${API}/video-evidence/${id}/file`, {
          headers: t ? { Authorization: 'Bearer ' + t } : {},
        });
        if (!r.ok) {
          if (!cancelled) setErr(`HTTP ${r.status}`);
          return;
        }
        const blob = await r.blob();
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setSrc(url);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'Failed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [id]);

  if (loading)
    return <span className="muted" style={{ fontSize: 12 }}>Loading…</span>;
  if (err)
    return <span className="muted" style={{ fontSize: 12 }}>Error ({err})</span>;
  return (
    <video
      src={src}
      controls
      style={{ maxWidth: 200, maxHeight: 120, borderRadius: 4 }}
    />
  );
}

// ---- Image compression ----
async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file.');
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Image compression unavailable.');
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  let q = 0.82;
  let blob: Blob | null = await new Promise(r => canvas.toBlob(r, 'image/jpeg', q));
  while (blob && blob.size > 3_500_000 && q > 0.4) {
    q -= 0.1;
    blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', q));
  }
  if (!blob || blob.size > 4_000_000)
    throw new Error('Could not compress image below 4 MB.');
  return new File([blob], 'field-photo.jpg', {
    type: 'image/jpeg',
    lastModified: Date.now(),
  });
}

// ---- Upload ----
async function uploadFile(
  file: File,
  meta: { runId: string; farmBlock: string; caption: string; evidenceType: string }
) {
  const isVideo = meta.evidenceType === 'video';
  const form = new FormData();
  form.append(isVideo ? 'video' : 'photo', file, file.name);
  form.append('runId', meta.runId);
  form.append('farmBlock', meta.farmBlock);
  form.append('caption', meta.caption);

  const t = token();
  const endpoint = isVideo ? '/video-evidence/upload' : '/evidence/upload';
  const r = await fetch(API + endpoint, {
    method: 'POST',
    headers: t ? { Authorization: 'Bearer ' + t } : {},
    body: form,
  });
  if (!r.ok) {
    const err = await r.text();
    throw new Error(`Upload failed (${r.status}): ${err.slice(0, 200)}`);
  }
  return r.json();
}

// ---- Page ----
export default function EvidencePage() {
  const [items, setItems] = useState<Evidence[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [downloadId, setDownloadId] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [reviews, setReviews] = useState<Record<string, string>>({});

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [runId, setRunId] = useState('');
  const [block, setBlock] = useState('');
  const [caption, setCaption] = useState('');
  const [evidenceType, setEvidenceType] = useState<'photo' | 'video'>('photo');
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function refresh() {
    try {
      const [photoRes, videoRes] = await Promise.all([
        getData<Evidence[] | { items: Evidence[] }>('/evidence').catch(
          () => [] as Evidence[]
        ),
        getData<Evidence[] | { items: Evidence[] }>('/video-evidence').catch(
          () => [] as Evidence[]
        ),
      ]);
      const photos = Array.isArray(photoRes) ? photoRes : photoRes?.items ?? [];
      const videos = Array.isArray(videoRes) ? videoRes : videoRes?.items ?? [];
      const combined = [
        ...photos.map(p => ({ ...p, evidenceType: p.evidenceType ?? ('photo' as const) })),
        ...videos.map(v => ({ ...v, evidenceType: 'video' as const })),
      ].sort(
        (a, b) =>
          new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
      );
      setItems(combined);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load evidence');
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  function choose(f: File | null) {
    setFile(f);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(f ? URL.createObjectURL(f) : '');
    if (f) setEvidenceType(f.type.startsWith('video/') ? 'video' : 'photo');
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !runId.trim() || !block.trim()) {
      setError('Choose a file and enter run ID and farm block.');
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const prepared = evidenceType === 'photo' ? await compressImage(file) : file;
      const result = await uploadFile(prepared, {
        runId: runId.trim(),
        farmBlock: block.trim(),
        caption,
        evidenceType,
      });
      setNotice(`Uploaded for review (${Math.round((result.sizeBytes ?? 0) / 1024)} KB).`);
      choose(null);
      setRunId('');
      setBlock('');
      setCaption('');
      setUploadOpen(false);
      await refresh();
      setTimeout(() => setNotice(''), 5000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  }

  async function review(x: Evidence, approve: boolean) {
    const note = (reviews[x._id] || '').trim();
    if (!note) {
      setError('A review note is required.');
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const endpoint =
        x.evidenceType === 'video'
          ? `/video-evidence/${x._id}/${approve ? 'approve' : 'reject'}`
          : `/evidence/${x._id}/${approve ? 'approve' : 'reject'}`;
      await patchData(endpoint, { reviewNote: note });
      setNotice(approve ? 'Evidence approved.' : 'Evidence rejected.');
      await refresh();
      setTimeout(() => setNotice(''), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Review failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleDownload(x: Evidence) {
    setDownloadId(x._id);
    setError('');
    try {
      await downloadEvidence(x);
      setNotice(`Downloaded ${x.originalName}.`);
      setTimeout(() => setNotice(''), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Download failed');
    } finally {
      setDownloadId(null);
    }
  }

  const pendingCount = items.filter(i => i.reviewStatus === 'pending_review').length;
  const approvedCount = items.filter(i => i.reviewStatus === 'approved').length;
  const rejectedCount = items.filter(i => i.reviewStatus === 'rejected').length;
  const photoCount = items.filter(i => i.evidenceType !== 'video').length;
  const videoCount = items.filter(i => i.evidenceType === 'video').length;

  const filtered = items.filter(i => {
    if (filter === 'pending') return i.reviewStatus === 'pending_review';
    if (filter === 'approved') return i.reviewStatus === 'approved';
    if (filter === 'rejected') return i.reviewStatus === 'rejected';
    return true;
  });

  return (
    <div className="shell">
      <NavSidebar />

      <main id="main-content" className="main">
        <h1>Photo &amp; video evidence</h1>
        <p className="muted" style={{ marginBottom: 24 }}>
          Capture or upload field photos and videos. Photos are compressed in-browser before
          upload. Videos are stored with range-request streaming support.
        </p>

        {error && <p className="error">{error}</p>}
        {notice && <NoticeBanner message={notice} />}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 16,
            marginBottom: 24,
          }}
        >
          <MetricCard
            label="Total evidence"
            value={String(items.length)}
            detail={`${photoCount} photos · ${videoCount} videos`}
          />
          <MetricCard
            label="Pending review"
            value={String(pendingCount)}
            detail="Awaiting owner action"
            tone={pendingCount > 0 ? 'warn' : 'neutral'}
          />
          <MetricCard
            label="Approved"
            value={String(approvedCount)}
            detail="Verified evidence"
            tone={approvedCount > 0 ? 'success' : 'neutral'}
          />
          <MetricCard
            label="Rejected"
            value={String(rejectedCount)}
            detail="Rejected evidence"
            tone={rejectedCount > 0 ? 'danger' : 'neutral'}
          />
        </div>

        <CollapsibleSection
          title="Upload evidence"
          open={uploadOpen}
          onToggle={() => setUploadOpen(o => !o)}
          actionLabel="+ Upload"
        >
          <form onSubmit={submit}>
            <FormSection title="File">
              <label style={{ gridColumn: 'span 2' }}>
                {evidenceType === 'photo' ? 'Photo' : 'Video'} *
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={evidenceType === 'photo' ? 'image/*' : 'video/*'}
                  capture={evidenceType === 'photo' ? 'environment' : undefined}
                  onChange={e => choose(e.target.files?.[0] ?? null)}
                  style={{ marginTop: 4 }}
                />
              </label>
              {preview && evidenceType === 'photo' && (
                <div style={{ gridColumn: 'span 2' }}>
                  <img
                    src={preview}
                    alt="Preview"
                    style={{
                      maxHeight: 240,
                      maxWidth: '100%',
                      borderRadius: 6,
                      border: '1px solid #e5e7eb',
                    }}
                  />
                </div>
              )}
              {preview && evidenceType === 'video' && (
                <div style={{ gridColumn: 'span 2' }}>
                  <video
                    src={preview}
                    controls
                    style={{ maxHeight: 240, maxWidth: '100%', borderRadius: 6 }}
                  />
                </div>
              )}
              <label>
                Evidence type
                <select
                  value={evidenceType}
                  onChange={e => setEvidenceType(e.target.value as 'photo' | 'video')}
                >
                  <option value="photo">Photo</option>
                  <option value="video">Video</option>
                </select>
              </label>
              <label>
                Farm block *
                <input
                  value={block}
                  onChange={e => setBlock(e.target.value)}
                  placeholder="BLK-001"
                  required
                />
              </label>
              <label style={{ gridColumn: 'span 2' }}>
                SOP run ID *
                <input
                  value={runId}
                  onChange={e => setRunId(e.target.value)}
                  placeholder="RUN-2026-001"
                  required
                />
              </label>
              <label style={{ gridColumn: 'span 2' }}>
                Caption
                <textarea
                  value={caption}
                  onChange={e => setCaption(e.target.value)}
                  rows={2}
                  maxLength={1000}
                  style={{ width: '100%', marginTop: 4 }}
                  placeholder="What does this evidence show?"
                />
              </label>
            </FormSection>

            <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
              Photos are resized to max 1800px and compressed below 4 MB. Videos are uploaded
              at original quality (max 100 MB). Streaming uses HTTP range requests so playback
              starts before the full file downloads.
            </p>

            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button className="btn" disabled={busy}>
                {busy ? 'Uploading…' : 'Upload'}
              </button>
              <button
                className="btn"
                type="button"
                onClick={() => {
                  setUploadOpen(false);
                  setError('');
                }}
                disabled={busy}
              >
                Cancel
              </button>
            </div>
          </form>
        </CollapsibleSection>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <Segmented
            options={[
              { key: 'all', label: `All (${items.length})` },
              { key: 'pending', label: `Pending (${pendingCount})` },
              { key: 'approved', label: `Approved (${approvedCount})` },
              { key: 'rejected', label: `Rejected (${rejectedCount})` },
            ]}
            value={filter}
            onChange={k => setFilter(k as typeof filter)}
          />
        </div>

        <section className="panel" style={{ marginBottom: 16 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 16,
            }}
          >
            <h2 style={{ margin: 0 }}>Evidence register</h2>
            <span className="muted" style={{ fontSize: 14 }}>
              {filtered.length} {filtered.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          {filtered.length === 0 ? (
            <p className="muted" style={{ padding: '24px 0', textAlign: 'center' }}>
              {filter !== 'all'
                ? 'No evidence matches this filter.'
                : 'No evidence uploaded yet. Click + Upload to add the first item.'}
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead>
                  <tr style={theadRow}>
                    <th style={thLeft}>Type</th>
                    <th style={thLeft}>Block / Run</th>
                    <th style={thLeft}>File</th>
                    <th style={thLeft}>SHA-256</th>
                    <th style={thLeft}>Status</th>
                    <th style={thLeft}>Review</th>
                    <th style={thLeft}>Preview</th>
                    <th style={thLeft}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(x => (
                    <tr key={x._id} style={bodyRow}>
                      <td style={tdLeft}>
                        <Badge
                          label={x.evidenceType === 'video' ? 'VIDEO' : 'PHOTO'}
                          tone={x.evidenceType === 'video' ? 'info' : 'neutral'}
                        />
                      </td>
                      <td style={tdLeft}>
                        <div style={{ fontWeight: 500 }}>{x.farmBlock}</div>
                        <div className="muted" style={{ fontSize: 12 }}>
                          Run {x.runId}
                        </div>
                      </td>
                      <td style={tdLeft}>
                        <div style={{ fontSize: 13 }}>{x.originalName}</div>
                        <div className="muted" style={{ fontSize: 12 }}>
                          {Math.round(x.sizeBytes / 1024)} KB · {x.mimeType}
                        </div>
                      </td>
                      <td
                        style={{
                          ...tdLeft,
                          ...mono,
                          fontSize: 11,
                          maxWidth: 160,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                        title={x.sha256}
                      >
                        {x.sha256}
                      </td>
                      <td style={tdLeft}>
                        <Badge
                          label={x.reviewStatus.replace('_', ' ')}
                          tone={
                            x.reviewStatus === 'approved'
                              ? 'ok'
                              : x.reviewStatus === 'rejected'
                              ? 'danger'
                              : 'warn'
                          }
                        />
                      </td>
                      <td style={tdLeft}>
                        {x.reviewStatus === 'pending_review' ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <input
                              value={reviews[x._id] || ''}
                              onChange={e =>
                                setReviews(old => ({ ...old, [x._id]: e.target.value }))
                              }
                              placeholder="Review note (required)"
                              style={{ fontSize: 12, padding: 4, width: 180 }}
                            />
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button
                                className="btn"
                                onClick={() => void review(x, true)}
                                disabled={busy}
                                style={{ fontSize: 12, padding: '4px 8px' }}
                              >
                                Approve
                              </button>
                              <button
                                className="btn"
                                onClick={() => void review(x, false)}
                                disabled={busy}
                                style={{ fontSize: 12, padding: '4px 8px' }}
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        ) : x.reviewNote ? (
                          <div className="muted" style={{ fontSize: 12 }}>
                            {x.reviewNote}
                          </div>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td style={tdLeft}>
                        {x.evidenceType === 'video' ? (
                          <VideoPreview id={x._id} />
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td style={{ ...tdLeft, whiteSpace: 'nowrap' }}>
                        <button
                          className="btn"
                          onClick={() => void handleDownload(x)}
                          disabled={downloadId === x._id}
                          style={{ fontSize: 12, padding: '4px 8px' }}
                        >
                          {downloadId === x._id ? 'Downloading…' : 'Download'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <Callout title="Evidence storage">
          Files are stored outside the public web root with random names. Videos are served
          via an authenticated range-request endpoint — no direct file paths are exposed.
          Production requires persistent private storage, backups, malware scanning, and rate
          limiting.
        </Callout>
      </main>
    </div>
  );
}