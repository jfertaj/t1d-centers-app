// lib/api.ts
export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  'http://localhost:8787/t1d-centers-proxy'; // fallback para dev si lo usas

type FetchOpts = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'OPTIONS';
  body?: any;
  headers?: Record<string, string>;
  cache?: RequestCache;
};

export async function apiFetch<T = any>(path: string, opts: FetchOpts = {}): Promise<T> {
  const url = `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, {
    method: opts.method || 'GET',
    headers: {
      'content-type': 'application/json',
      ...(opts.headers || {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    // nos aseguramos de que Next no cachee respuestas dinámicas
    cache: opts.cache ?? 'no-store',
    // importante: estas rutas se ejecutan en server (route handlers), no en edge
    // no es necesario 'next: { revalidate: 0 }' pero tampoco molesta si lo añades
  });

  if (!res.ok) {
    let details: unknown = undefined;
    try { details = await res.json(); } catch {}
    const msg = typeof details === 'object' && details !== null ? JSON.stringify(details) : res.statusText;
    throw new Error(`API ${res.status} ${res.statusText}: ${msg}`);
  }

  return (await res.json()) as T;
}