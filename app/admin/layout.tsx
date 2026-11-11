'use client';

// Every page in this section is admin-only. The API enforces it server-side
// (middleware.ts + gateway authorizer); this guard just avoids rendering an
// empty admin UI to signed-out or non-admin visitors.
import withAdmin from '@components/withAdmin';

function AdminSection({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export default withAdmin(AdminSection);
