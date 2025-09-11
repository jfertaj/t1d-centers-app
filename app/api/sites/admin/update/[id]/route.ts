// app/api/sites/admin/update/[id]/route.ts
import { NextResponse } from 'next/server';
import { apiFetch } from '@lib/api';

export const runtime = 'nodejs';

function toIntOrNull(v: unknown): number | null {
  if (v === '' || v === undefined || v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}
function toBoolOrNull(v: unknown): boolean | null {
  if (v === '' || v === undefined || v === null) return null;
  if (typeof v === 'boolean') return v;
  const s = String(v).toLowerCase().trim();
  if (['true', '1', 'yes', 'on'].includes(s)) return true;
  if (['false', '0', 'no', 'off'].includes(s)) return false;
  return null;
}

export async function PUT(req: Request) {
  try {
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

      // NUEVO
      age_from: toIntOrNull(data.age_from),
      age_to: toIntOrNull(data.age_to),
      monitor: toBoolOrNull(data.monitor),

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

      // Si algún día editas coords desde el admin
      latitude: data.latitude ?? undefined,
      longitude: data.longitude ?? undefined,
    };

    for (const [k, v] of Object.entries(payload)) {
      if (v === undefined) delete (payload as any)[k];
    }

    const upstream = await apiFetch(`/centers/${idNum}`, {
      method: 'PUT',
      body: payload,
    });

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