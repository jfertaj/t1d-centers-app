// app/api/sites/admin/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET() {
  try {
    const res = await pool.query('SELECT * FROM clinical_centers ORDER BY name ASC');
    return NextResponse.json({ centers: res.rows });
  } catch (err) {
    console.error('❌ Error fetching centers:', err);
    return NextResponse.json({ error: 'Failed to fetch centers' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const body = await req.json();

  try {
    const {
      id,
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
      id,
    ];

    await pool.query(query, values);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('❌ Error updating center:', err);
    return NextResponse.json({ error: 'Failed to update center' }, { status: 500 });
  }
}