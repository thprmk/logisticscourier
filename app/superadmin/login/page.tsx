// app/superadmin/login/page.tsx

import { redirect } from 'next/navigation';

export default function SuperAdminLoginRedirect() {
  // This component's only job is to immediately redirect.
  redirect('/login');
  
  // Return null or a loading indicator, as this will never be seen.
  return null;
}