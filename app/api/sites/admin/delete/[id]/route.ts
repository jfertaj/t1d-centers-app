// app/api/sites/admin/delete/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> } // 👈 params es Promise en Next 15
) {
  const { id } = await params;                      // 👈 hay que await
  const numericId = Number(id);

  if (!Number.isFinite(numericId)) {
    return NextResponse.json(
      { error: 'Missing or invalid center ID' },
      { status: 400 }
    );
  }

  try {
    const res = await pool.query(
      'DELETE FROM clinical_centers WHERE id = $1',
      [numericId]
    );

    if (res.rowCount === 0) {
      return NextResponse.json({ error: 'Center not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('❌ Error deleting center:', err);
    return NextResponse.json(
      { error: 'Failed to delete center', details: String(err) },
      { status: 500 }
    );
  }
}