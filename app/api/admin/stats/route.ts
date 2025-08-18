import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
export const runtime = 'nodejs'; // aseguramos runtime Node, no Edge

export async function GET() {
  try {
    const client = await pool.connect();

    const totalRes = await client.query('SELECT COUNT(*) FROM centers');
    const countryRes = await client.query('SELECT COUNT(DISTINCT country) FROM centers');
    const geoRes = await client.query('SELECT COUNT(*) FROM centers WHERE latitude IS NOT NULL AND longitude IS NOT NULL');

    client.release();

    return NextResponse.json({
      totalCenters: parseInt(totalRes.rows[0].count, 10),
      countriesCount: parseInt(countryRes.rows[0].count, 10),
      centersWithCoordinates: parseInt(geoRes.rows[0].count, 10),
    });
  } catch (err) {
    console.error('❌ Error fetching admin stats:', err);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}