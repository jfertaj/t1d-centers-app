// app/admin/page.tsx

'use client';

import withAdmin from '@/components/withAdmin';
import AdminCenterEditor from '@/components/AdminCenterEditorB'; // o A

function AdminPage() {
  return <AdminCenterEditor />;
}

export default withAdmin(AdminPage);