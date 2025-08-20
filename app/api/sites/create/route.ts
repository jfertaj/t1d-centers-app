// app/api/sites/create/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { apiFetch } from '@lib/api'; // usa el helper que ya creamos para llamar a la Lambda

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    // Recogemos el body tal cual; la Lambda hará validaciones y geocoding
    const data = await req.json();

    // Aseguramos el shape con las claves que entiende la Lambda (snake_case)
    // Si algún campo no viene, lo dejamos como null/undefined y la Lambda lo maneja.
    const payload = {
      name: data.name ?? null,
      address: data.address ?? null,
      city: data.city ?? null,
      country: data.country ?? null,
      zip_code: data.zip_code ?? null,
      type_of_ed: data.type_of_ed ?? null,
      detect_site: data.detect_site ?? null,
      contact_name_1: data.contact_name_1 ?? null,
      email_1: data.email_1 ?? null,
      phone_1: data.phone_1 ?? null,
      contact_name_2: data.contact_name_2 ?? null,
      email_2: data.email_2 ?? null,
      phone_2: data.phone_2 ?? null,
      contact_name_3: data.contact_name_3 ?? null,
      email_3: data.email_3 ?? null,
      phone_3: data.phone_3 ?? null,
      contact_name_4: data.contact_name_4 ?? null,
      email_4: data.email_4 ?? null,
      phone_4: data.phone_4 ?? null,
      contact_name_5: data.contact_name_5 ?? null,
      email_5: data.email_5 ?? null,
      phone_5: data.phone_5 ?? null,
      contact_name_6: data.contact_name_6 ?? null,
      email_6: data.email_6 ?? null,
      phone_6: data.phone_6 ?? null,
      // No mandamos latitude/longitude: la Lambda lo calculará si puede
    };

    const created = await apiFetch('/centers', {
      method: 'POST',
      body: payload,
    });

    // La Lambda devuelve { success: true, id } o el row entero según tu versión.
    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    console.error('❌ Error proxying create site:', err);
    return NextResponse.json(
      { error: 'Error saving site', details: err?.message ?? String(err) },
      { status: 502 },
    );
  }
}