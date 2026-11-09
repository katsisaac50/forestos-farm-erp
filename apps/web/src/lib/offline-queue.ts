'use client';
import {readOfflineValue, writeOfflineValue} from './offline-cache';

export type QueuedFieldLog = {
  queueId: string;
  payload: Record<string, unknown>;
  queuedAt: string;
  lastError?: string;
};
const KEY = 'forestos-fieldlog-queue-v1';
export function readQueue(): QueuedFieldLog[] {
  const items = readOfflineValue<QueuedFieldLog[]>(KEY) || [];
  if (!Array.isArray(items) || items.some(item =>
    !item || typeof item.queueId !== 'string' || typeof item.queuedAt !== 'string' ||
    !item.payload || typeof item.payload !== 'object' || Array.isArray(item.payload)
  )) {
    throw new Error('Saved field-log queue is invalid. Do not clear browser storage; contact support.');
  }
  return items;
}
export function enqueueFieldLog(payload: Record<string, unknown>): QueuedFieldLog[] {
  const items = readQueue();
  const logId = payload.logId;
  if (typeof logId !== 'string' || !logId) throw new Error('A stable field-log ID is required for offline sync.');
  if (items.some(item => item.payload.logId === logId)) return items;
  const updated = [...items, {
    queueId: logId,
    payload,
    queuedAt: new Date().toISOString(),
  }];
  writeOfflineValue(KEY, updated);
  return updated;
}
export function updateQueuedFieldLog(queueId: string, update: Partial<QueuedFieldLog>): QueuedFieldLog[] {
  const updated = readQueue().map(item => item.queueId === queueId ? {...item, ...update} : item);
  writeOfflineValue(KEY, updated);
  return updated;
}
export function removeQueuedFieldLog(queueId: string): QueuedFieldLog[] {
  const updated = readQueue().filter(item => item.queueId !== queueId);
  writeOfflineValue(KEY, updated);
  return updated;
}
