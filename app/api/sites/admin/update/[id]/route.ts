// app/api/sites/admin/update/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { apiFetch } from '@lib/api';

export const runtime = 'nodejs';

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const idNum = Number(params.id);
  if (!Number.isFinite(idNum)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  try {
    const data = await req.json();

    // Normalizamos a los nombres de columnas actuales (snake_case)
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

      // Si tu UI permite editar coords manualmente (si no, omítelos)
      latitude: data.latitude ?? undefined,
      longitude: data.longitude ?? undefined,
    };

    // Limpia undefined para no enviar claves vacías
    Object.keys(payload).forEach((k) => {
      // @ts-ignore
      if (payload[k] === undefined) delete payload[k];
    });

    // Llama a tu API Gateway → PUT /centers/:id
    const result = await apiFetch(`/centers/${idNum}`, {
      method: 'PUT',
      body: payload,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    console.error('❌ Upstream update error:', err);
    const message = err?.message ?? 'Upstream error';
    const status = /not found/i.test(message) ? 404 : 502;
    return NextResponse.json(
      { error: 'Failed to update center', details: message },
      { status }
    );
  }
}