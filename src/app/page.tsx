// Landing page - redirects to brand identity

import { redirect } from 'next/navigation';

export default async function Home() {
  // Redirect directly to brand identity workspace
  redirect('/brand/identity');
}

