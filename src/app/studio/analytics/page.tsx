"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Activity, Users, Globe, Brain, Flame, PlayCircle, MousePointerClick, ExternalLink, CheckCircle2 } from "lucide-react";
import { Shell } from "@/components/layout/Shell";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, FunnelChart, Funnel, LabelList } from "recharts";
import { toast } from "sonner";
import { ConnectAnalyticsPrompt } from "@/components/marketing/ConnectAnalyticsPrompt";
import { useProject } from "@/contexts/ProjectContext";
import { Badge } from "@/components/ui/badge";

import { getClarityInsights } from "./actions";
import { generateAIAnalyticsReport, AIAnalyticsReport } from "./ai-report-action";

export default function AnalyticsPage() {
    const router = useRouter();
    const { currentProject } = useProject();
    const [status, setStatus] = useState<'loading' | 'enabled' | 'disabled'>('loading');
    const [providers, setProviders] = useState({ google: false, facebook: false });
    const [clarityId, setClarityId] = useState<string | null>(null);
    const [data, setData] = useState<any>(null);
    const [clarityData, setClarityData] = useState<any>(null);
    const [aiReport, setAiReport] = useState<AIAnalyticsReport | null>(null);
    const [generatingReport, setGeneratingReport] = useState(false);

    useEffect(() => {
        checkStatus();
        if (currentProject) {
            checkClarityStatus();
        }
    }, [currentProject]);

    useEffect(() => {
        if (currentProject && clarityId && clarityId !== 'needs_update') {
            getClarityInsights(currentProject.id).then(data => {
                if (data) setClarityData(data);
            });
        }
    }, [currentProject, clarityId]);

    const handleGenerateReport = async () => {
        if (!currentProject) return;

        setGeneratingReport(true);
        try {
            const report = await generateAIAnalyticsReport(currentProject.id);
            if (report) {
                setAiReport(report);
                toast.success('AI Report generated successfully!');
            } else {
                toast.error('Failed to generate report. Please ensure Clarity is connected with an API token.');
            }
        } catch (error) {
            console.error('Error generating report:', error);
            toast.error('Failed to generate AI report');
        } finally {
            setGeneratingReport(false);
        }
    };

    const checkClarityStatus = async () => {
        if (!currentProject) return;
        try {
            const res = await fetch(`/api/projects/${currentProject.id}/integrations`);
            if (res.ok) {
                const json = await res.json();
                const clarity = json.integrations?.find((i: any) => i.provider_type === 'microsoft_clarity');

                if (clarity && clarity.status === 'active') { // Default status is active?
                    // Verify if we have project_id in config
                    if (clarity.config?.project_id) {
                        setClarityId(clarity.config.project_id);
                    } else {
                        // If config is missing (legacy), try to set it but warn
                        setClarityId('needs_update');
                    }
                }
            }
        } catch (e) {
            console.error("Failed to check clarity status", e);
        }
    };

    const checkStatus = async () => {
        try {
            const res = await fetch('/api/marketing/analytics/report?check_status=true');
            const json = await res.json();

            if (json.module_enabled) {
                setStatus('enabled');
                setProviders({
                    google: json.google_connected,
                    facebook: json.facebook_connected
                });
                if (json.data) setData(json.data);
            } else {
                setStatus('disabled');
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to load analytics status");
            setStatus('disabled');
        }
    };

    const handleEnableModule = async () => {
        try {
            const res = await fetch('/api/marketing/analytics/connect', {
                method: 'POST',
                body: JSON.stringify({ type: 'module_init' })
            });
            if (res.ok) {
                toast.success("Analytics Dashboard Enabled");
                checkStatus();
            }
        } catch (error) {
            toast.error("Failed to enable analytics");
        }
    };

    const handleConnectProvider = (type: 'google' | 'facebook' | 'clarity') => {
        router.push('/settings/integrations');
    };

    const handleDisconnect = async () => {
        try {
            await fetch('/api/marketing/analytics/disconnect', { method: 'POST' });
            toast.success("Disconnected");
            setStatus('disabled');
            setProviders({ google: false, facebook: false });
            setData(null);
        } catch {
            toast.error("Failed to disconnect");
        }
    };

    if (status === 'loading') return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

    if (status === 'disabled') return (
        <Shell>
            <div className="space-y-6">
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-bold tracking-tight">Website Analytics</h1>
                    <p className="text-muted-foreground">Monitor traffic, sources, and user drop-off.</p>
                </div>
                <ConnectAnalyticsPrompt onConnect={handleEnableModule} />
            </div>
        </Shell>
    );

    const showData = providers.google || providers.facebook;
    const isClarityConnected = clarityId && clarityId !== 'needs_update';
    const clarityUrl = (path: string) => clarityId ? `https://clarity.microsoft.com/projects/view/${clarityId}/${path}` : '#';

    return (
        <Shell>
            <div className="space-y-6">
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-bold tracking-tight">Website Analytics</h1>
                    <p className="text-muted-foreground">Monitor traffic, sources, and user drop-off.</p>
                </div>

                <Tabs defaultValue="settings" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="settings">Settings</TabsTrigger>
                        <TabsTrigger value="traffic">Traffic Overview</TabsTrigger>
                        <TabsTrigger value="funnel">Funnel Analysis</TabsTrigger>
                        <TabsTrigger value="behavior">User Behavior</TabsTrigger>
                    </TabsList>

                    <TabsContent value="traffic" className="space-y-4">
                        {!showData ? (
                            <div className="p-12 text-center border-2 border-dashed rounded-lg">
                                <h3 className="text-lg font-medium">No Data Available</h3>
                                <p className="text-muted-foreground mb-4">Connect a data provider in Settings to view traffic.</p>
                            </div>
                        ) : (
                            <>
                                <div className="grid gap-4 md:grid-cols-3">
                                    <Card>
                                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                            <CardTitle className="text-sm font-medium">Total Visits</CardTitle>
                                            <Users className="h-4 w-4 text-muted-foreground" />
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold">{data?.summary?.total_visits || 0}</div>
                                            <p className="text-xs text-muted-foreground">+12% from last week</p>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                                            <Activity className="h-4 w-4 text-muted-foreground" />
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold">{data?.summary?.conversion_rate || '0%'}</div>
                                            <p className="text-xs text-muted-foreground">+2.1% from last week</p>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                            <CardTitle className="text-sm font-medium">Avg. Session</CardTitle>
                                            <Globe className="h-4 w-4 text-muted-foreground" />
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold">{data?.summary?.avg_session || '0m 0s'}</div>
                                        </CardContent>
                                    </Card>
                                </div>

                                <Card>
                                    <CardHeader>
                                        <CardTitle>Traffic Trend</CardTitle>
                                    </CardHeader>
                                    <CardContent className="h-[350px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={data?.traffic || []}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                                <Tooltip />
                                                <Area type="monotone" dataKey="visits" stroke="#2B71FF" fill="#2B71FF" fillOpacity={0.2} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>
                            </>
                        )}
                    </TabsContent>

                    <TabsContent value="funnel" className="space-y-4">
                        {!showData ? (
                            <div className="p-12 text-center border-2 border-dashed rounded-lg">
                                <h3 className="text-lg font-medium">No Data Available</h3>
                                <p className="text-muted-foreground mb-4">Connect a data provider in Settings to view funnel.</p>
                            </div>
                        ) : (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Conversion Funnel</CardTitle>
                                    <CardDescription>Track where users drop off in the buying journey.</CardDescription>
                                </CardHeader>
                                <CardContent className="h-[400px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <FunnelChart>
                                            <Tooltip />
                                            <Funnel
                                                dataKey="value"
                                                data={data?.funnel || []}
                                                isAnimationActive
                                            >
                                                <LabelList position="right" fill="#000" stroke="none" dataKey="name" />
                                            </Funnel>
                                        </FunnelChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    <TabsContent value="behavior" className="space-y-4">
                        {!clarityId ? (
                            <div className="p-12 text-center border-2 border-dashed rounded-lg bg-gray-50/50">
                                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                                    <Activity className="w-8 h-8 text-blue-600" />
                                </div>
                                <h3 className="text-lg font-medium">Connect Microsoft Clarity</h3>
                                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                                    See how users interact with your site using heatmaps and recordings.
                                    Connect your Clarity Project ID to get started.
                                </p>
                                <Button onClick={() => handleConnectProvider('clarity')}>
                                    Connect Clarity
                                </Button>
                            </div>
                        ) : (
                            <>
                                {clarityId === 'needs_update' && (
                                    <div className="p-4 bg-yellow-50 text-yellow-800 rounded-lg mb-4 flex items-center gap-2">
                                        <Activity className="w-4 h-4" />
                                        <span className="text-sm">Please update your Clarity settings to enable direct links.</span>
                                        <Button variant="link" size="sm" onClick={() => handleConnectProvider('clarity')} className="ml-auto">Update Settings</Button>
                                    </div>
                                )}

                                {clarityData && (
                                    <div className="grid gap-4 md:grid-cols-4">
                                        <Card>
                                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                                <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                                                <Users className="h-4 w-4 text-muted-foreground" />
                                            </CardHeader>
                                            <CardContent>
                                                <div className="text-2xl font-bold">{clarityData.sessionsCount}</div>
                                                <p className="text-xs text-muted-foreground">in last 3 days</p>
                                            </CardContent>
                                        </Card>
                                        <Card>
                                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                                <CardTitle className="text-sm font-medium">Pages / Session</CardTitle>
                                                <Globe className="h-4 w-4 text-muted-foreground" />
                                            </CardHeader>
                                            <CardContent>
                                                <div className="text-2xl font-bold">{clarityData.pagesPerSession?.toFixed(1) || '0.0'}</div>
                                            </CardContent>
                                        </Card>
                                        <Card>
                                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                                <CardTitle className="text-sm font-medium">Scroll Depth</CardTitle>
                                                <Activity className="h-4 w-4 text-muted-foreground" />
                                            </CardHeader>
                                            <CardContent>
                                                <div className="text-2xl font-bold">{clarityData.scrollDepth?.toFixed(0) || '0'}%</div>
                                            </CardContent>
                                        </Card>
                                        <Card>
                                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                                <CardTitle className="text-sm font-medium">Bounce Rate</CardTitle>
                                                <Activity className="h-4 w-4 text-muted-foreground" />
                                            </CardHeader>
                                            <CardContent>
                                                <div className="text-2xl font-bold">{clarityData.bounceRate?.toFixed(1) || '0'}%</div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                )}

                                <div className="grid gap-4 md:grid-cols-3">
                                    <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-200">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="flex items-center gap-2 text-lg text-blue-700">
                                                <Users className="w-5 h-5" />
                                                Live Users
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm text-blue-600/80 mb-4">
                                                Watch users on your site right now.
                                            </p>
                                            <Button className="w-full bg-blue-600 hover:bg-blue-700" asChild>
                                                <a href={clarityUrl('dashboard?live=true')} target="_blank" rel="noreferrer">
                                                    View Live Board <ExternalLink className="w-3 h-3 ml-2" />
                                                </a>
                                            </Button>
                                        </CardContent>
                                    </Card>

                                    <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-200">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="flex items-center gap-2 text-lg text-orange-700">
                                                <Flame className="w-5 h-5" />
                                                Heatmaps
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm text-orange-600/80 mb-4">
                                                See where users click and scroll.
                                            </p>
                                            <Button className="w-full bg-orange-600 hover:bg-orange-700" asChild>
                                                <a href={clarityUrl('heatmaps')} target="_blank" rel="noreferrer">
                                                    View Heatmaps <ExternalLink className="w-3 h-3 ml-2" />
                                                </a>
                                            </Button>
                                        </CardContent>
                                    </Card>

                                    <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-200">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="flex items-center gap-2 text-lg text-purple-700">
                                                <PlayCircle className="w-5 h-5" />
                                                Recordings
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm text-purple-600/80 mb-4">
                                                Watch full session replays.
                                            </p>
                                            <Button className="w-full bg-purple-600 hover:bg-purple-700" asChild>
                                                <a href={clarityUrl('recordings')} target="_blank" rel="noreferrer">
                                                    View Recordings <ExternalLink className="w-3 h-3 ml-2" />
                                                </a>
                                            </Button>
                                        </CardContent>
                                    </Card>
                                </div>

                                <Card className="border-indigo-100 bg-indigo-50/30">
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <CardTitle className="flex items-center gap-2">
                                                    <Brain className="w-5 h-5 text-indigo-600" />
                                                    AI Analytics Report
                                                </CardTitle>
                                                <CardDescription>
                                                    Get AI-powered insights and recommendations based on your live data
                                                </CardDescription>
                                            </div>
                                            <Button
                                                onClick={handleGenerateReport}
                                                disabled={generatingReport || !clarityData}
                                                className="bg-indigo-600 hover:bg-indigo-700"
                                            >
                                                {generatingReport ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                        Analyzing...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Brain className="w-4 h-4 mr-2" />
                                                        Generate Report
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        {!aiReport ? (
                                            <div className="text-center py-8 text-muted-foreground">
                                                <Brain className="w-12 h-12 mx-auto mb-3 text-indigo-300" />
                                                <p className="text-sm">
                                                    Click "Generate Report" to analyze your website behavior data with AI
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="space-y-6">
                                                {/* Executive Summary */}
                                                <div className="p-4 bg-white rounded-lg border border-indigo-100">
                                                    <h4 className="font-semibold text-sm mb-2 text-indigo-900">Executive Summary</h4>
                                                    <p className="text-sm text-gray-700">{aiReport.summary}</p>
                                                    <p className="text-xs text-muted-foreground mt-2">
                                                        Generated {new Date(aiReport.generatedAt).toLocaleString()}
                                                    </p>
                                                </div>

                                                {/* Key Findings */}
                                                <div>
                                                    <h4 className="font-semibold text-sm mb-3 text-indigo-900">Key Findings</h4>
                                                    <div className="space-y-3">
                                                        {aiReport.keyFindings.map((finding, idx) => (
                                                            <div key={idx} className="p-4 bg-white rounded-lg border border-indigo-100 shadow-sm">
                                                                <div className="flex gap-3">
                                                                    <div className="mt-1">
                                                                        <div className={`w-2 h-2 rounded-full ${finding.severity === 'high' ? 'bg-red-500 animate-pulse' :
                                                                            finding.severity === 'medium' ? 'bg-yellow-500' :
                                                                                'bg-blue-500'
                                                                            }`} />
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            <h5 className="font-medium text-sm">{finding.title}</h5>
                                                                            <Badge
                                                                                variant="outline"
                                                                                className={`text-xs ${finding.severity === 'high' ? 'border-red-300 text-red-700' :
                                                                                    finding.severity === 'medium' ? 'border-yellow-300 text-yellow-700' :
                                                                                        'border-blue-300 text-blue-700'
                                                                                    }`}
                                                                            >
                                                                                {finding.severity}
                                                                            </Badge>
                                                                        </div>
                                                                        <p className="text-xs text-muted-foreground">{finding.description}</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Recommendations */}
                                                <div>
                                                    <h4 className="font-semibold text-sm mb-3 text-indigo-900">Recommendations</h4>
                                                    <div className="space-y-3">
                                                        {aiReport.recommendations.map((rec, idx) => (
                                                            <div key={idx} className="p-4 bg-white rounded-lg border border-green-100 shadow-sm">
                                                                <div className="flex gap-3">
                                                                    <div className="mt-1">
                                                                        <CheckCircle2 className={`w-4 h-4 ${rec.priority === 'high' ? 'text-green-600' :
                                                                            rec.priority === 'medium' ? 'text-green-500' :
                                                                                'text-green-400'
                                                                            }`} />
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            <h5 className="font-medium text-sm">{rec.title}</h5>
                                                                            <Badge
                                                                                variant="outline"
                                                                                className={`text-xs ${rec.priority === 'high' ? 'border-green-600 text-green-700 bg-green-50' :
                                                                                    rec.priority === 'medium' ? 'border-green-500 text-green-600' :
                                                                                        'border-green-400 text-green-600'
                                                                                    }`}
                                                                            >
                                                                                Priority: {rec.priority}
                                                                            </Badge>
                                                                        </div>
                                                                        <p className="text-xs text-muted-foreground">{rec.description}</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </>
                        )}
                    </TabsContent>

                    <TabsContent value="settings" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Connections</CardTitle>
                                <CardDescription>Connect your external analytics providers.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between p-4 border rounded-lg">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-blue-600 rounded-md p-2 text-white font-bold">G</div>
                                        <div>
                                            <p className="font-medium">Google Analytics 4</p>
                                            <p className="text-sm text-muted-foreground">{providers.google ? 'Connected' : 'Not Connected'}</p>
                                        </div>
                                    </div>
                                    <Button
                                        variant={providers.google ? "outline" : "default"}
                                        onClick={() => handleConnectProvider('google')}
                                        disabled={providers.google}
                                    >
                                        {providers.google ? 'Connected' : 'Connect'}
                                    </Button>
                                </div>
                                <div className="flex items-center justify-between p-4 border rounded-lg">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-blue-500 rounded-md p-2 text-white font-bold">F</div>
                                        <div>
                                            <p className="font-medium">Facebook Pixel</p>
                                            <p className="text-sm text-muted-foreground">{providers.facebook ? 'Connected' : 'Not Connected'}</p>
                                        </div>
                                    </div>
                                    <Button
                                        variant={providers.facebook ? "outline" : "default"}
                                        onClick={() => handleConnectProvider('facebook')}
                                        disabled={providers.facebook}
                                    >
                                        {providers.facebook ? 'Connected' : 'Connect'}
                                    </Button>
                                </div>
                                <div className="flex items-center justify-between p-4 border rounded-lg">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-orange-500 rounded-md p-2 text-white font-bold flex items-center justify-center">
                                            <Activity className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="font-medium">Microsoft Clarity</p>
                                            <p className="text-sm text-muted-foreground">{clarityId && clarityId !== 'needs_update' ? 'Connected' : 'Not Connected'}</p>
                                        </div>
                                    </div>
                                    <Button
                                        variant={clarityId && clarityId !== 'needs_update' ? "outline" : "default"}
                                        onClick={() => handleConnectProvider('clarity')}
                                    >
                                        {clarityId && clarityId !== 'needs_update' ? 'Configure' : 'Connect'}
                                    </Button>
                                </div>
                            </CardContent>
                            <div className="p-4 border-t bg-muted/20">
                                <Button variant="destructive" size="sm" onClick={handleDisconnect}>
                                    Reset / Disconnect Module
                                </Button>
                            </div>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </Shell>
    );
}
