// Project Desktop Shell Page

'use client';

import { useParams } from 'next/navigation';
import { DesktopShell } from '@/components/desktop/DesktopShell';

export default function ProjectPage() {
  const params = useParams();
  const projectId = params.id as string;

  return <DesktopShell projectId={projectId} />;
}


