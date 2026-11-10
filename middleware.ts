// middleware.ts
// Every /api/* route in this app is an admin operation (the public navigator
// reads the API Gateway directly, never these routes), so all of them require
// a valid Cognito access token from a user in the `admin` group. Routes that
// proxy to the gateway are checked again there; this is the only check for
// Next-only routes such as /api/geocoding/verify.
import { NextResponse, type NextRequest } from 'next/server';
import { adminTokenError } from '@lib/adminToken';

export async function middleware(req: NextRequest) {
  const denied = await adminTokenError(req.headers.get('authorization'));
  if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status });
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
