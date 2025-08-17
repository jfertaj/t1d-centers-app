// app/api/sites/create/route.ts
import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { geocodeAddress } from '@/lib/geocoding';

export async function POST(req: Request) {
  try {
    const data = await req.json();

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
    } = data;

    const fullAddress = `${address}, ${city}, ${zip_code}, ${country}`;
    const coords = await geocodeAddress(fullAddress);

    console.log('📦 Geocoding address:', fullAddress);
    console.log('📍 Geocoding result:', coords);

    const result = await pool.query(
      `INSERT INTO clinical_centers (
        name, address, city, country, zip_code,
        contact_name_1, email_1, phone_1,
        contact_name_2, email_2, phone_2,
        contact_name_3, email_3, phone_3,
        latitude, longitude
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8,
        $9, $10, $11,
        $12, $13, $14,
        $15, $16
      ) RETURNING id`,
      [
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
        coords?.lat || null,
        coords?.lng || null,
      ]
    );

    return NextResponse.json({ status: 'ok', id: result.rows[0].id });
  } catch (err) {
    console.error('❌ Error saving site:', err);
    return NextResponse.json(
      { error: 'Error saving site', details: String(err) },
      { status: 500 }
    );
  }
}