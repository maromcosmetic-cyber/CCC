'use client';

import { Shell } from "@/components/layout/Shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, AlertCircle, Zap, TrendingUp, Sparkles, BarChart2, Users, ImageIcon, Plus, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useProject } from "@/contexts/ProjectContext";
import { useMetaIntegration } from "@/hooks/useMetaIntegration";
import { ConnectAdsPrompt } from "@/components/studio/ConnectAdsPrompt";

interface Project {
    id: string;
    name: string;
    website_url: string;
    created_at: string;
    monthly_budget_amount?: number;
    monthly_budget_currency?: string;
}

export default function StudioOverview() {
    const router = useRouter();
    const { currentProject } = useProject();
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Check Integration Status
    const { isConnected, isLoading: isIntegrationLoading } = useMetaIntegration();

    const fetchProjects = async () => {
        try {
            const response = await fetch('/api/projects');
            if (!response.ok) {
                throw new Error('Failed to fetch projects');
            }
            const data = await response.json();
            setProjects(data.projects || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load projects');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateProject = () => {
        router.push('/projects/new');
    };

    useEffect(() => {
        fetchProjects();
    }, []);

    if (isIntegrationLoading) {
        return (
            <Shell>
                <div className="flex items-center justify-center h-[60vh]">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
            </Shell>
        );
    }

    if (!isConnected) {
        return (
            <Shell>
                <ConnectAdsPrompt />
            </Shell>
        );
    }

    return (
        <Shell>
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Welcome Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest">
                            <Sparkles className="w-3 h-3" /> System Intelligence Active
                        </div>
                        <h1 className="text-4xl font-display font-black text-foreground tracking-tight">Marketing Overview</h1>
                        <p className="text-muted-foreground text-lg max-w-2xl leading-relaxed">
                            Command center for your eCommerce campaigns. {projects.length > 0 ? `Managing ${projects.length} project${projects.length !== 1 ? 's' : ''}.` : 'Get started by creating your first project.'}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="outline" className="rounded-xl border-white/60 bg-white/40 h-11 px-6 font-bold">
                            View Reports
                        </Button>
                        <Button onClick={handleCreateProject} className="rounded-xl h-11 px-6 font-bold shadow-lg shadow-primary/20">
                            <Plus className="w-4 h-4 mr-2" />
                            New Project
                        </Button>
                    </div>
                </div>

                {/* Intelligence Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="glass-card border-none bg-gradient-to-br from-primary/[0.03] to-transparent">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-xs font-black text-muted-foreground uppercase tracking-widest">Active Projects</CardTitle>
                                <Zap className="w-4 h-4 text-primary" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-1">
                                <span className="text-4xl font-black font-display tracking-tight">{projects.length}</span>
                                <div className="flex items-center gap-2 text-emerald-500 text-sm font-bold">
                                    <TrendingUp className="w-4 h-4" /> Ready for campaigns
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="glass-card border-none">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-xs font-black text-muted-foreground uppercase tracking-widest">Total Budget</CardTitle>
                                <TrendingUp className="w-4 h-4 text-emerald-500" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-1">
                                <span className="text-4xl font-black font-display tracking-tight">
                                    ${projects.reduce((sum, p) => sum + (p.monthly_budget_amount || 0), 0).toLocaleString()}
                                </span>
                                <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium">
                                    Monthly allocation
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="glass-card border-none bg-primary/[0.02]">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-xs font-black text-muted-foreground uppercase tracking-widest">System Status</CardTitle>
                                <Sparkles className="w-4 h-4 text-primary" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-1">
                                <span className="text-4xl font-black font-display tracking-tight">100%</span>
                                <div className="flex items-center gap-2 text-primary text-sm font-bold">
                                    All systems operational
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Projects List */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-display font-black tracking-tight">Your Projects</h2>
                        {projects.length > 0 && (
                            <Button variant="ghost" size="sm" className="text-xs font-bold text-primary" onClick={handleCreateProject}>
                                <Plus className="w-3 h-3 mr-1" /> Create New
                            </Button>
                        )}
                    </div>

                    {loading && (
                        <div className="text-center py-12">
                            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
                            <p className="mt-4 text-sm text-muted-foreground">Loading projects...</p>
                        </div>
                    )}

                    {error && (
                        <Card className="glass-card border-rose-500/30 bg-rose-500/5">
                            <CardContent className="p-6">
                                <div className="flex items-center gap-3">
                                    <AlertCircle className="w-5 h-5 text-rose-500" />
                                    <div>
                                        <p className="font-bold text-sm">Error loading projects</p>
                                        <p className="text-xs text-muted-foreground">{error}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {!loading && !error && projects.length === 0 && (
                        <Card className="glass-card border-dashed">
                            <CardContent className="p-12 text-center">
                                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                                    <Plus className="w-8 h-8 text-primary" />
                                </div>
                                <h3 className="text-lg font-bold mb-2">No projects yet</h3>
                                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                                    Create your first project to start managing campaigns, generating content, and tracking performance.
                                </p>
                                <Button onClick={handleCreateProject} className="rounded-xl h-11 px-8 font-bold">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Create Your First Project
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {!loading && !error && projects.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {projects.map(project => (
                                <Card
                                    key={project.id}
                                    className="glass-card border-white/50 hover:bg-white/80 transition-all cursor-pointer group"
                                    onClick={() => router.push(`/projects/${project.id}`)}
                                >
                                    <CardHeader>
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <CardTitle className="text-base font-bold mb-1">{project.name}</CardTitle>
                                                <p className="text-xs text-muted-foreground truncate">{project.website_url}</p>
                                            </div>
                                            <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-muted-foreground">
                                                Created {new Date(project.created_at).toLocaleDateString()}
                                            </span>
                                            {project.monthly_budget_amount && (
                                                <span className="font-bold text-primary">
                                                    ${project.monthly_budget_amount.toLocaleString()}/{project.monthly_budget_currency || 'USD'}
                                                </span>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </Shell>
    );
}
