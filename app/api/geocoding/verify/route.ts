// app/api/geocoding/verify/route.ts
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { address, city, zip_code, country } = await req.json();

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ ok: false, error: 'Missing API key' }, { status: 500 });
    }

    const full = [address, city, zip_code, country].filter(Boolean).join(', ');
    if (!full) {
      return NextResponse.json({ ok: false, error: 'Missing address pieces' }, { status: 400 });
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(full)}&key=${apiKey}`;
    const resp = await fetch(url);
    if (!resp.ok) {
      return NextResponse.json({ ok: false, error: 'Google fetch failed' }, { status: 502 });
    }

    const data = await resp.json();
    const top = data?.results?.[0];

    if (!top) {
      // No hubo resultados
      return NextResponse.json({
        ok: false,
        reason: 'NO_RESULTS',
        partial: false,
        formatted_address: null,
        location: null,
      });
    }

    const partial = !!top.partial_match;
    const loc = top.geometry?.location ?? null;

    // Consideramos inválido si es partial match (bloqueamos)
    return NextResponse.json({
      ok: !partial && !!loc,
      partial,
      formatted_address: top.formatted_address ?? null,
      location: loc,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: String(err?.message || err) },
      { status: 500 }
    );
  }
}