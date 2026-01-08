// Landing page - redirects to studio overview

import { redirect } from 'next/navigation';

export default async function Home() {
  // Redirect to studio overview as the main dashboard
  redirect('/studio/campaigns');
}

