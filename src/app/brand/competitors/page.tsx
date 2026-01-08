"use client";

import { useState, useEffect } from "react";
import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Loader2, ArrowRight, TrendingUp, AlertTriangle, ShieldCheck, Target, Sparkles } from "lucide-react";
import { useProject } from "@/contexts/ProjectContext";
import { createClient } from "@/lib/auth/client";
import { toast } from "sonner";

interface Competitor {
    id: string;
    name: string;
    url: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    analysis_json?: {
        brand_identity?: {
            voice_tone: string;
            target_audience: string;
            key_value_props: string[];
        };
        swot?: {
            strengths: string[];
            weaknesses: string[];
            opportunities: string[];
            threats: string[];
        };
        ad_strategy?: {
            suspected_angles: string[];
            hooks_used: string[];
        };
        counter_strategy?: {
            how_to_beat_them: string;
            recommended_ad_angles: string[];
        };
    };
    last_analyzed_at: string;
}

export default function CompetitorResearchPage() {
    const { currentProject } = useProject();
    const [url, setUrl] = useState("");
    const [analyzing, setAnalyzing] = useState(false);
    const [competitors, setCompetitors] = useState<Competitor[]>([]);
    const [selectedCompetitor, setSelectedCompetitor] = useState<Competitor | null>(null);

    useEffect(() => {
        if (currentProject) fetchCompetitors();
    }, [currentProject]);

    const fetchCompetitors = async () => {
        const supabase = createClient();
        const { data } = await supabase
            .from('competitors')
            .select('*')
            .eq('project_id', currentProject?.id)
            .order('created_at', { ascending: false });

        if (data) setCompetitors(data);
    };

    const handleAnalyze = async () => {
        if (!url) return;
        setAnalyzing(true);
        toast.info("Starting AI Research... This may take up to 2-3 minutes.");

        try {
            const response = await fetch('/api/ai/research/competitor', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url,
                    projectId: currentProject?.id,
                    mode: 'analyze'
                })
            });

            const result = await response.json();

            if (response.ok) {
                toast.success("Research Complete!");
                fetchCompetitors();
                setUrl("");
            } else {
                toast.error("Analysis Failed: " + result.error);
            }
        } catch (error: any) {
            toast.error("Error: " + error.message);
        } finally {
            setAnalyzing(false);
        }
    };

    return (
        <Shell>
            <div className="h-[calc(100vh-2rem)] flex flex-col gap-6 animate-in fade-in duration-500">
                <div className="flex items-center justify-between shrink-0">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-display font-bold">Competitor Intelligence</h1>
                        <p className="text-muted-foreground">AI-powered spy tool to analyze competitor websites & ad strategies.</p>
                    </div>
                </div>

                <div className="grid grid-cols-12 gap-6 flex-1 min-h-0">
                    {/* Left Sidebar: List & Input */}
                    <div className="col-span-4 flex flex-col gap-4 h-full">
                        <Card className="shrink-0 bg-background/50 backdrop-blur-sm">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium">Add Competitor</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <Tabs defaultValue="url" className="w-full">
                                    <TabsList className="grid w-full grid-cols-2 mb-4">
                                        <TabsTrigger value="url">Direct URL</TabsTrigger>
                                        <TabsTrigger value="discover">Discover</TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="url" className="space-y-3">
                                        <div className="flex gap-2">
                                            <Input
                                                placeholder="https://competitor.com"
                                                value={url}
                                                onChange={(e) => setUrl(e.target.value)}
                                                disabled={analyzing}
                                            />
                                            <Button onClick={handleAnalyze} disabled={!url || analyzing} size="icon">
                                                {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                                            </Button>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Enter a specific competitor URL to spy on their strategy.
                                        </p>
                                    </TabsContent>

                                    <TabsContent value="discover" className="space-y-3">
                                        <div className="flex gap-2">
                                            <Input
                                                placeholder="e.g. Luxury skincare brand"
                                                value={url} // Reusing url state for search query to save space
                                                onChange={(e) => setUrl(e.target.value)}
                                                disabled={analyzing}
                                            />
                                            <Button onClick={() => {
                                                if (!url) return;
                                                setAnalyzing(true);
                                                toast.info("Searching Google for competitors...");
                                                fetch('/api/ai/research/competitor', {
                                                    method: 'POST',
                                                    body: JSON.stringify({ mode: 'discover', niche: url, projectId: currentProject?.id })
                                                })
                                                    .then(res => res.json())
                                                    .then(data => {
                                                        if (data.success && data.companies) {
                                                            toast.success(`Found ${data.companies.length} competitors!`);
                                                            // Here we would ideally show a list to select, but for V1 let's just toast
                                                            // Or better, add them to a temporary list. 
                                                            // For MVP, let's just show them in a toast or console
                                                            console.log(data.companies);
                                                            // Check if we can auto-add the first one? No that's dangerous.
                                                            // Let's just create pending entries in DB?
                                                            // Actually, let's just modify the response to return the list and render it.
                                                            // But I need to update state.
                                                            // I'll update the state logic later. For now let's just log.
                                                            alert("Found: " + data.companies.map((c: any) => c.title).join(", "));
                                                        } else {
                                                            toast.error("No results found.");
                                                        }
                                                    })
                                                    .catch(err => toast.error(err.message))
                                                    .finally(() => setAnalyzing(false));
                                            }} disabled={!url || analyzing} size="icon">
                                                {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                            </Button>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            AI will search Google for top competitors in your niche.
                                        </p>
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>

                        <Card className="flex-1 min-h-0 flex flex-col bg-background/50 backdrop-blur-sm border-t-0">
                            <CardHeader className="py-4 border-b">
                                <CardTitle className="text-sm">Competitor List</CardTitle>
                            </CardHeader>
                            <ScrollArea className="flex-1">
                                <div className="p-2 space-y-1">
                                    {competitors.map((comp) => (
                                        <div
                                            key={comp.id}
                                            onClick={() => setSelectedCompetitor(comp)}
                                            className={`
                                                flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors border
                                                ${selectedCompetitor?.id === comp.id ? 'bg-primary/10 border-primary/20' : 'hover:bg-accent border-transparent'}
                                            `}
                                        >
                                            <div className="overflow-hidden">
                                                <p className="font-medium text-sm truncate">{comp.name}</p>
                                                <p className="text-xs text-muted-foreground truncate">{comp.url}</p>
                                            </div>
                                            <Badge variant={comp.status === 'completed' ? 'default' : 'secondary'} className="text-[10px]">
                                                {comp.status}
                                            </Badge>
                                        </div>
                                    ))}
                                    {competitors.length === 0 && (
                                        <div className="p-8 text-center text-muted-foreground text-sm">
                                            No competitors tracked yet. Add one above!
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </Card>
                    </div>

                    {/* Right Panel: Report View */}
                    <div className="col-span-8 h-full">
                        {selectedCompetitor ? (
                            <ScrollArea className="h-full pr-4">
                                <div className="space-y-6 pb-20">
                                    {/* Header */}
                                    <div className="flex items-center justify-between bg-card p-6 rounded-xl border shadow-sm">
                                        <div>
                                            <h2 className="text-2xl font-bold">{selectedCompetitor.name}</h2>
                                            <a href={selectedCompetitor.url} target="_blank" className="text-sm text-blue-500 hover:underline flex items-center gap-1">
                                                {selectedCompetitor.url} <ArrowRight className="w-3 h-3" />
                                            </a>
                                        </div>
                                        <Badge variant="outline" className="px-3 py-1 text-sm bg-green-500/10 text-green-600 border-green-200">
                                            {selectedCompetitor.status === 'completed' ? 'Analysis Ready' : 'Processing...'}
                                        </Badge>
                                    </div>

                                    {selectedCompetitor.analysis_json && (
                                        <Tabs defaultValue="overview" className="space-y-4">
                                            <TabsList className="bg-muted/50">
                                                <TabsTrigger value="overview">Overview & SWOT</TabsTrigger>
                                                <TabsTrigger value="voice">Brand Voice</TabsTrigger>
                                                <TabsTrigger value="ads">Ad Strategy</TabsTrigger>
                                                <TabsTrigger value="attack">Attack Plan</TabsTrigger>
                                            </TabsList>

                                            <TabsContent value="overview" className="space-y-4 animate-in slide-in-from-bottom-2">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <Card className="glass-card">
                                                        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Target className="w-4 h-4 text-primary" /> Target Audience</CardTitle></CardHeader>
                                                        <CardContent>
                                                            <p className="text-sm text-foreground/80 leading-relaxed">
                                                                {selectedCompetitor.analysis_json.brand_identity?.target_audience}
                                                            </p>
                                                        </CardContent>
                                                    </Card>
                                                    <Card className="glass-card">
                                                        <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4 text-green-500" /> Key Value Props</CardTitle></CardHeader>
                                                        <CardContent>
                                                            <ul className="list-disc list-inside text-sm space-y-1 text-foreground/80">
                                                                {selectedCompetitor.analysis_json.brand_identity?.key_value_props.map((prop, i) => (
                                                                    <li key={i}>{prop}</li>
                                                                ))}
                                                            </ul>
                                                        </CardContent>
                                                    </Card>
                                                </div>

                                                <h3 className="text-lg font-semibold pt-2">SWOT Analysis</h3>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-lg space-y-2">
                                                        <span className="font-semibold text-green-700 flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Strengths</span>
                                                        <ul className="text-sm list-disc list-inside opacity-80">{selectedCompetitor.analysis_json.swot?.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
                                                    </div>
                                                    <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-lg space-y-2">
                                                        <span className="font-semibold text-red-700 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Weaknesses</span>
                                                        <ul className="text-sm list-disc list-inside opacity-80">{selectedCompetitor.analysis_json.swot?.weaknesses.map((s, i) => <li key={i}>{s}</li>)}</ul>
                                                    </div>
                                                    <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg space-y-2">
                                                        <span className="font-semibold text-blue-700">Opportunities</span>
                                                        <ul className="text-sm list-disc list-inside opacity-80">{selectedCompetitor.analysis_json.swot?.opportunities.map((s, i) => <li key={i}>{s}</li>)}</ul>
                                                    </div>
                                                    <div className="p-4 bg-orange-500/5 border border-orange-500/20 rounded-lg space-y-2">
                                                        <span className="font-semibold text-orange-700">Threats</span>
                                                        <ul className="text-sm list-disc list-inside opacity-80">{selectedCompetitor.analysis_json.swot?.threats.map((s, i) => <li key={i}>{s}</li>)}</ul>
                                                    </div>
                                                </div>
                                            </TabsContent>

                                            <TabsContent value="voice">
                                                <Card>
                                                    <CardHeader><CardTitle>Voice & Tone Profile</CardTitle></CardHeader>
                                                    <CardContent className="prose prose-sm max-w-none dark:prose-invert">
                                                        <div className="whitespace-pre-wrap">
                                                            {selectedCompetitor.analysis_json.brand_identity?.voice_tone}
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            </TabsContent>

                                            <TabsContent value="ads" className="space-y-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <Card>
                                                        <CardHeader><CardTitle className="text-base">Suspected Ad Angles</CardTitle></CardHeader>
                                                        <CardContent>
                                                            <ul className="list-disc list-inside text-sm space-y-2 text-foreground/80">
                                                                {selectedCompetitor.analysis_json.ad_strategy?.suspected_angles?.map((angle, i) => (
                                                                    <li key={i}>{angle}</li>
                                                                ))}
                                                            </ul>
                                                        </CardContent>
                                                    </Card>
                                                    <Card>
                                                        <CardHeader><CardTitle className="text-base">Hooks Used</CardTitle></CardHeader>
                                                        <CardContent>
                                                            <ul className="list-disc list-inside text-sm space-y-2 text-foreground/80">
                                                                {selectedCompetitor.analysis_json.ad_strategy?.hooks_used?.map((angle, i) => (
                                                                    <li key={i}>{angle}</li>
                                                                ))}
                                                            </ul>
                                                        </CardContent>
                                                    </Card>
                                                </div>
                                            </TabsContent>

                                            <TabsContent value="attack">
                                                <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
                                                    <CardHeader>
                                                        <CardTitle className="flex items-center gap-2">
                                                            <Target className="w-5 h-5 text-primary" />
                                                            How to Beat Them
                                                        </CardTitle>
                                                    </CardHeader>
                                                    <CardContent className="space-y-6">
                                                        <p className="text-lg font-medium leading-relaxed">
                                                            {selectedCompetitor.analysis_json.counter_strategy?.how_to_beat_them}
                                                        </p>

                                                        <div className="space-y-3">
                                                            <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Recommended Ad Angles for YOU</h4>
                                                            <div className="grid gap-3">
                                                                {selectedCompetitor.analysis_json.counter_strategy?.recommended_ad_angles?.map((angle, i) => (
                                                                    <div key={i} className="p-4 bg-background/80 rounded-lg border shadow-sm">
                                                                        👉 {angle}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            </TabsContent>
                                        </Tabs>
                                    )}
                                </div>
                            </ScrollArea>
                        ) : (
                            <div className="h-full flex items-center justify-center text-muted-foreground bg-muted/20 rounded-xl border-2 border-dashed">
                                Select a competitor to view their dossier
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Shell>
    );
}
