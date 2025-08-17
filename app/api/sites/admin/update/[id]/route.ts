// app/api/sites/admin/update/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params; // ✅ ya correcto, sin await
  const numericId = Number(id);

  if (!Number.isFinite(numericId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  const body = await req.json();

  try {
    const {
      name,
      address,
      city,
      country,
      zip_code,
      contact_name_1,
      email_1,
      phone_1,
      contact_name_2,
      email_2,
      phone_2,
      contact_name_3,
      email_3,
      phone_3,
    } = body;

    const query = `
      UPDATE clinical_centers
      SET name = $1,
          address = $2,
          city = $3,
          country = $4,
          zip_code = $5,
          contact_name_1 = $6,
          email_1 = $7,
          phone_1 = $8,
          contact_name_2 = $9,
          email_2 = $10,
          phone_2 = $11,
          contact_name_3 = $12,
          email_3 = $13,
          phone_3 = $14
      WHERE id = $15
      RETURNING *;
    `;

    const values = [
      name,
      address,
      city,
      country,
      zip_code,
      contact_name_1,
      email_1,
      phone_1,
      contact_name_2,
      email_2,
      phone_2,
      contact_name_3,
      email_3,
      phone_3,
      numericId,
    ];

    const { rows } = await pool.query(query, values);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Center not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, center: rows[0] });
  } catch (err) {
    console.error('❌ Error updating center:', err);
    return NextResponse.json({ error: 'Failed to update center' }, { status: 500 });
  }
}