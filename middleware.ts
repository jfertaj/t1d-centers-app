// middleware.ts
// Every /api/* route in this app is an admin operation (the public navigator
// reads the API Gateway directly, never these routes), so all of them require
// a valid Cognito access token from a user in the `admin` group.
import { NextResponse, type NextRequest } from 'next/server';
import { verifyAdminToken } from '@lib/adminToken';

export async function middleware(req: NextRequest) {
  const check = await verifyAdminToken(req.headers.get('authorization'));
  if ('error' in check) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
