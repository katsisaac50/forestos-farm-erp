'use client';

export function readOfflineValue<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;

  let value: string | null;
  try {
    value = window.localStorage.getItem(key);
  } catch {
    throw new Error('Browser storage is unavailable. Offline data cannot be read.');
  }
  if (value === null) return null;

  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error('Saved offline data is unreadable. Do not clear browser storage until it has been recovered.');
  }
}

export function writeOfflineValue<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    throw new Error('Browser storage is full or unavailable. Sync offline work before continuing.');
  }
}
