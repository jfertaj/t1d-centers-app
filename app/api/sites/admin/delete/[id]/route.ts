import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export const runtime = 'nodejs'; // aseguramos runtime Node, no Edge

export async function DELETE(req: NextRequest, context: any) {
  const { id } = (context as { params: { id: string } }).params;
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