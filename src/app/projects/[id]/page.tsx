// Project page - redirect to brand identity

import { redirect } from 'next/navigation';

export default function ProjectPage() {
  // Redirect to brand identity instead of showing desktop shell
  redirect('/brand/identity');
}


