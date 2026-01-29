// Projects list page - redirect to brand identity

import { redirect } from 'next/navigation';

export default async function ProjectsPage() {
  // Redirect to brand identity instead of showing project list
  redirect('/brand/identity');
}



