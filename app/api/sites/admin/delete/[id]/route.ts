// app/api/sites/admin/delete/[id]/route.ts
import { NextResponse } from 'next/server';
import { apiFetch } from '@lib/api';

export const runtime = 'nodejs';

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const idNum = Number(params.id);
  if (!Number.isFinite(idNum)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  try {
    // Llama a tu API Gateway → DELETE /centers/:id
    await apiFetch(`/centers/${idNum}`, { method: 'DELETE' });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    console.error('❌ Upstream delete error:', err);
    const message = err?.message ?? 'Upstream error';
    const status = /not found/i.test(message) ? 404 : 502;
    return NextResponse.json(
      { error: 'Failed to delete center', details: message },
      { status }
    );
  }
}