export type FieldCaptureDraft = {
  clientSubmissionId: string;
  taskId: string;
  captureType: 'Inspection' | 'Task completion' | 'Incident' | 'Harvest' | 'Other';
  title: string;
  notes?: string;
  locationConsent?: boolean;
  location?: { latitude: number; longitude: number; accuracyMeters?: number; capturedAt?: string };
  evidenceManifest?: Array<{ filename: string; mimeType: string; sizeBytes: number; sha256: string }>;
  queuedAt: string;
  lastError?: string;
};
const KEY = 'forestos.field-capture.queue.v1';
export function readCaptureQueue(): FieldCaptureDraft[] {
  if (typeof window === 'undefined') return [];
  try { const value = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(value) ? value : []; }
  catch { return []; }
}
export function writeCaptureQueue(items: FieldCaptureDraft[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(items));
}
export function newCaptureId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `fc-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
export async function syncCaptureQueue(apiBase?: string): Promise<{sent:number;remaining:number}> {
  if (typeof window === 'undefined' || !navigator.onLine) return {sent:0,remaining:readCaptureQueue().length};
  const api = apiBase || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
  const token = localStorage.getItem('forestos_token');
  const organizationId = localStorage.getItem('forestos_organization_id') || localStorage.getItem('forestos_active_organization');
  if (!token || !organizationId) throw new Error('Sign in and select an active organization before syncing field captures.');
  let queue = readCaptureQueue(), sent = 0;
  for (const item of [...queue]) {
    try {
      const {queuedAt, lastError, ...payload} = item;
      const response = await fetch(api + '/field-capture', {
        method: 'POST',
        headers: {'Content-Type':'application/json','Authorization':`Bearer ${token}`,'X-Organization-Id':organizationId},
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(`Server returned ${response.status}: ${(await response.text()).slice(0,300)}`);
      queue = queue.filter(x => x.clientSubmissionId !== item.clientSubmissionId);
      sent++;
      writeCaptureQueue(queue);
    } catch (error:any) {
      queue = queue.map(x => x.clientSubmissionId === item.clientSubmissionId ? {...x,lastError:error?.message || 'Sync failed'} : x);
      writeCaptureQueue(queue);
      // Continue so one failed item does not block the queue.
    }
  }
  return {sent,remaining:queue.length};
}
