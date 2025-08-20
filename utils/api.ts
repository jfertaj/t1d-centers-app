// utils/api.ts
export const api = async (path: string, init?: RequestInit) => {
  const base = process.env.NEXT_PUBLIC_API_BASE!;
  const res = await fetch(`${base}/t1d-centers-proxy${path}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json();
};