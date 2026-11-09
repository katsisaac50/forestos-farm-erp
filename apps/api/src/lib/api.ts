// src/lib/api.ts
// const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

// export async function apiFetch(path: string, init: RequestInit = {}) {
//   const token = localStorage.getItem('forestos_token');
//   const orgId = localStorage.getItem('forestos_organization_id');
//   const headers: Record<string, string> = {
//     'Content-Type': 'application/json',
//     ...(init.headers as Record<string, string> || {}),
//   };
//   if (token) headers['Authorization'] = `Bearer ${token}`;
//   if (orgId) headers['X-Organization-Id'] = orgId;
//   return fetch(API_BASE + path, { ...init, headers });
// }