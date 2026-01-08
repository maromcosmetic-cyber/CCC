// Projects list page

import { createServerSupabaseClient } from '@/lib/auth/server';
import Link from 'next/link';
import { Button } from '@/components/shared/Button';

export default async function ProjectsPage() {
  // Auth is handled by middleware - no need to check here
  const supabase = await createServerSupabaseClient();
  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div className="min-h-screen bg-bg-primary p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">Projects</h1>
            <p className="text-sm text-text-muted mt-1">Manage your eCommerce projects</p>
          </div>
          <Link href="/projects/new">
            <Button size="sm">Create new project</Button>
          </Link>
        </div>

        {projects && projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="bg-bg-elevated border border-border-subtle rounded-md p-6 hover:border-accent/50 transition-colors"
              >
                <h2 className="text-sm font-semibold text-text-primary mb-2">{project.name}</h2>
                <p className="text-xs text-text-muted mb-4 font-mono">{project.website_url}</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-muted font-mono">
                    {project.monthly_budget_currency} {project.monthly_budget_amount}
                  </span>
                  <span className="text-accent">View →</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-bg-elevated border border-border-subtle rounded-md p-12 text-center">
            <p className="text-sm text-text-muted mb-4">No projects yet</p>
            <Link href="/projects/new">
              <Button size="sm">Create your first project</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

