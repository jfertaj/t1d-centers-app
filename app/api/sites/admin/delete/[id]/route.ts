// app/api/sites/admin/delete/[id]/route.ts
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Proxyea el DELETE a tu API (Lambda / API Gateway)
export async function DELETE(req: Request) {
  try {
    // Saca el id del último segmento de la URL
    // Ej: /api/sites/admin/delete/123  -> id = "123"
    const url = new URL(req.url);
    const parts = url.pathname.split('/').filter(Boolean);
    const id = parts[parts.length - 1];
    const numericId = Number(id);

    if (!Number.isFinite(numericId)) {
      return NextResponse.json({ error: 'Invalid or missing ID' }, { status: 400 });
    }

    const apiBase = process.env.NEXT_PUBLIC_API_BASE; // ej: https://.../prod/t1d-centers-proxy
    if (!apiBase) {
      return NextResponse.json(
        { error: 'NEXT_PUBLIC_API_BASE is not set' },
        { status: 500 }
      );
    }

    // Llama a tu backend real
    const resp = await fetch(`${apiBase}/centers/${numericId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      // credentials: 'include', // si algún día usas cookies
    });

    const bodyText = await resp.text();
    // Intenta parsear JSON del backend, pero no revientes si no es JSON
    let data: unknown;
    try { data = JSON.parse(bodyText); } catch { data = { message: bodyText }; }

    return NextResponse.json(data, { status: resp.status });
  } catch (err: any) {
    console.error('❌ Proxy delete center error:', err);
    return NextResponse.json(
      { error: 'Proxy error', details: String(err?.message || err) },
      { status: 500 }
    );
  }
}