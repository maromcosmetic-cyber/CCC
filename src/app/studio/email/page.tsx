'use client';

import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Mail, Settings, PenTool, BarChart3, AlertTriangle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useProject } from "@/contexts/ProjectContext";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/auth/client";

export default function EmailDashboardPage() {
    const { currentProject } = useProject();
    const [hasSettings, setHasSettings] = useState<boolean | null>(null); // null = loading
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentProject) return;
        checkSettings();
    }, [currentProject]);

    const checkSettings = async () => {
        const supabase = createClient();
        const { data } = await supabase
            .from('email_settings')
            .select('id, smtp_host')
            .eq('project_id', currentProject?.id)
            .single();

        setHasSettings(!!data?.smtp_host);
        setLoading(false);
    };

    const stats = [
        { label: "Total Subscribers", value: "0", icon: Users, color: "text-blue-500", bg: "bg-blue-50" },
        { label: "Sent Campaigns", value: "0", icon: Mail, color: "text-green-500", bg: "bg-green-50" },
        { label: "Avg. Open Rate", value: "0%", icon: BarChart3, color: "text-purple-500", bg: "bg-purple-50" },
    ];

    if (loading) {
        return (
            <Shell>
                <div className="max-w-6xl mx-auto py-20 text-center">
                    <p className="text-muted-foreground">Checking configuration...</p>
                </div>
            </Shell>
        );
    }

    if (!hasSettings) {
        // Automatically redirect to settings if not configured
        if (typeof window !== 'undefined') {
            window.location.href = '/settings?tab=integrations';
        }

        return (
            <Shell>
                <div className="max-w-6xl mx-auto py-20 text-center">
                    <p className="text-muted-foreground">Redirecting to settings...</p>
                </div>
            </Shell>
        );
    }

    return (
        <Shell>
            <div className="max-w-6xl mx-auto space-y-8 pb-20">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-display font-bold">Email Marketing</h1>
                        <p className="text-muted-foreground">Manage newsletters, subscribers, and automated campaigns.</p>
                    </div>
                    <div className="flex gap-2">
                        <Link href="/studio/email/templates/new">
                            <Button><PenTool className="w-4 h-4 mr-2" /> Create Campaign</Button>
                        </Link>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {stats.map((stat, i) => (
                        <Card key={i}>
                            <CardContent className="p-6 flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-lg ${stat.bg} ${stat.color} flex items-center justify-center`}>
                                    <stat.icon className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground font-medium">{stat.label}</p>
                                    <h3 className="text-2xl font-bold">{stat.value}</h3>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="hover:border-blue-200 transition-colors cursor-pointer group">
                        <CardHeader>
                            <CardTitle className="group-hover:text-blue-600 transition-colors">Subscribers</CardTitle>
                            <CardDescription>Manage your audience and segments.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Link href="/studio/email/subscribers" className="absolute inset-0" />
                            <div className="bg-gray-50 p-4 rounded-md border border-dashed text-center text-sm text-muted-foreground">
                                Import CSV or Add Manually
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="hover:border-purple-200 transition-colors cursor-pointer group">
                        <CardHeader>
                            <CardTitle className="group-hover:text-purple-600 transition-colors">Templates</CardTitle>
                            <CardDescription>Design email layouts and snippets.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Link href="/studio/email/templates" className="absolute inset-0" />
                            <div className="bg-gray-50 p-4 rounded-md border border-dashed text-center text-sm text-muted-foreground">
                                Visual and HTML Editors
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </Shell>
    );
}
