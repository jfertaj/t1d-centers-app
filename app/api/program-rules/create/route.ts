// app/api/program-rules/create/route.ts
import { NextResponse } from 'next/server';
import { apiFetch } from '@lib/api';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Campos típicos de region_program_rules
    const payload = {
      country: body.country,
      zip_pattern: body.zip_pattern ?? null,  // ej. "80***;90***"
      zip_from: body.zip_from ?? null,        // ej. 40000
      zip_to: body.zip_to ?? null,            // ej. 40999
      age_from: body.age_from ?? null,
      age_to: body.age_to ?? null,
      program_code: body.program_code,        // "DIAUNION", "EDENT1FI"
      program_name: body.program_name,        // "DiaUnion", "EDENT1FI"
      message: body.message,                  // texto banner
      website: body.website ?? null,
      priority: body.priority ?? 100,
      active: body.active ?? true,
      type_of_ed: body.type_of_ed ?? null,    // opcional si lo añadiste a la tabla
    };

    const res = await apiFetch('/program-rules', {
      method: 'POST',
      body: payload,
    });
    return NextResponse.json(res, { status: 201 });
  } catch (err: any) {
    console.error('❌ program-rules create error:', err);
    return NextResponse.json({ error: 'Upstream error' }, { status: 502 });
  }
}