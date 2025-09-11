import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const id = Number(url.pathname.split('/').filter(Boolean).pop());
    if (!Number.isFinite(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    const apiBase = process.env.NEXT_PUBLIC_API_BASE!;
    const resp = await fetch(`${apiBase}/program-rules/${id}`, { method: 'DELETE' });
    const txt = await resp.text();
    let json: any; try { json = JSON.parse(txt); } catch { json = { message: txt }; }
    return NextResponse.json(json, { status: resp.status });
  } catch (err: any) {
    console.error('rules delete error:', err);
    return NextResponse.json({ error: 'Proxy error' }, { status: 500 });
  }
}