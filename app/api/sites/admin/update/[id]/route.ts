// app/api/sites/admin/update/[id]/route.ts
import { NextResponse } from 'next/server';
import { apiFetch } from '@lib/api';

export const runtime = 'nodejs';

export async function PUT(req: Request) {
  try {
    // Extrae el id del último segmento de la URL
    const url = new URL(req.url);
    const parts = url.pathname.split('/').filter(Boolean);
    const idStr = parts[parts.length - 1];
    const idNum = Number(idStr);

    if (!Number.isFinite(idNum)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const data = await req.json();

    // Normaliza a snake_case para tu backend
    const payload: Record<string, unknown> = {
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

      // si tu UI permite editar coords; si no, omítelos
      latitude: data.latitude ?? undefined,
      longitude: data.longitude ?? undefined,
    };

    // Quita claves undefined (para no sobreescribir con undefined)
    for (const [k, v] of Object.entries(payload)) {
      if (v === undefined) delete (payload as any)[k];
    }

    // Proxy a tu API Gateway → PUT /centers/:id
    const upstream = await apiFetch(`/centers/${idNum}`, {
      method: 'PUT',
      body: payload,
    });

    // Devuelve lo que responda el backend
    return NextResponse.json(upstream, { status: 200 });
  } catch (err: any) {
    console.error('❌ Upstream update error:', err);
    const msg = err?.message ?? 'Upstream error';
    const status = /not found/i.test(msg) ? 404 : 502;
    return NextResponse.json(
      { error: 'Failed to update center', details: msg },
      { status }
    );
  }
}