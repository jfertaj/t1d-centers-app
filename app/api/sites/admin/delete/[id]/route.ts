// app/api/sites/admin/delete/[id]/route.ts
export const runtime = 'nodejs';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE!;

export async function DELETE(
  _req: Request,
  context: { params: { id: string } },
) {
  const id = Number(context?.params?.id);
  if (!Number.isFinite(id)) {
    return new Response(JSON.stringify({ error: 'Missing or invalid center ID' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  try {
    const r = await fetch(`${API_BASE}/centers/${id}`, { method: 'DELETE' });
    const data = await r.json().catch(() => ({}));
    return new Response(JSON.stringify(data), {
      status: r.status,
      headers: { 'content-type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: 'Failed to delete center', details: String(err) }),
      { status: 500, headers: { 'content-type': 'application/json' } },
    );
  }
}