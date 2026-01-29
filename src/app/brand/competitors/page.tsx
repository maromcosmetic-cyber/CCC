"use client";

import { useState, useEffect, useMemo } from "react";
import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Search, Loader2, ArrowRight, TrendingUp, AlertTriangle, ShieldCheck, Target,
    Sparkles, Users, Package, DollarSign, Eye, Palette, FileText, Heart, BookOpen,
    Award, Monitor, Smile, BarChart2, Scale, AlertCircle, Crosshair, Swords, X, Plus, Trash2, Lightbulb, Zap, Rocket
} from "lucide-react";
import { useProject } from "@/contexts/ProjectContext";
import { createClient } from "@/lib/auth/client";
import { toast } from "sonner";
import { PageLoading } from "@/components/ui/page-loading";

interface WinningAd {
    ad_creative_body: string;
    ad_creative_link_title?: string;
    platform: string;
    ad_delivery_start_time?: string;
    success_analysis: {
        hook_strength: string;
        psychological_triggers: string[];
        why_it_works: string;
        target_audience_fit: string;
    };
    meta_ad_library_url?: string;
}

interface AdStrategyAnalysis {
    winning_ads?: WinningAd[];
    winning_hooks: Array<{
        hook: string;
        why_it_works: string;
        estimated_effectiveness: 'High' | 'Medium' | 'Low';
    }>;
    creative_patterns: Array<{
        type: string;
        description: string;
        frequency: 'Dominant' | 'Common' | 'Rare';
    }>;
    funnel_diagnosis: {
        structure: string;
        friction_points: string[];
        conversion_triggers: string[];
    };
    psychological_triggers: Array<{
        trigger: string;
        application: string;
    }>;
    attack_plan: {
        weakness_to_exploit: string;
        counter_strategy: string;
        differentiation_angle: string;
    };
    campaign_suggestions: Array<{
        name: string;
        angle: string;
        headline: string;
        primary_text: string;
        visual_concept: string;
        target_audience: string;
        reasoning: string;
    }>;
}

interface CompetitorAnalysis {
    competitor_identification?: any;
    brand_positioning_extraction?: any;
    target_audience_signals?: any;
    offer_structure_pricing?: any;
    product_feature_mapping?: any;
    claims_promises_analysis?: any;
    visual_identity_aesthetic?: any;
    content_strategy_messaging?: any;
    customer_psychology?: any;
    brand_story_narrative?: any;
    trust_authority_signals?: any;
    ux_funnel_design?: any;
    brand_personality?: any;
    market_saturation?: any;
    weakness_detection?: any;
    value_perception?: any;
    compliance_risk?: any;
    strategic_insight_synthesis?: any;
    integration_into_brand?: any;
    continuous_monitoring?: any;
    ads_data?: {
        has_active_ads: boolean;
        total_ads_found: number;
        ad_platforms: string[];
        ad_copy_themes: string[];
        common_headlines: string[];
        estimated_monthly_spend: string;
        ad_creative_styles: string[];
        target_languages: string[];
        ad_frequency: string;
        sample_ad_urls: string[];
        competitive_advantage: string;
        raw_ads?: any[];
    };
    ad_strategy?: AdStrategyAnalysis;
}

interface CrossCompetitorInsights {
    winning_campaigns: Array<{
        competitor_name: string;
        campaign_description: string;
        why_successful: string;
        key_tactics: string[];
        applicability_to_your_brand: string;
    }>;
    success_patterns: Array<{
        pattern_name: string;
        description: string;
        frequency: string;
        competitors_using: string[];
        recommended_implementation: string;
    }>;
    market_opportunities: Array<{
        opportunity: string;
        gap_identified: string;
        potential_impact: 'High' | 'Medium' | 'Low';
        action_steps: string[];
    }>;
    recommended_actions: Array<{
        priority: 'High' | 'Medium' | 'Low';
        action: string;
        rationale: string;
        expected_outcome: string;
        implementation_difficulty: 'Easy' | 'Medium' | 'Hard';
    }>;
    strategic_insights: {
        market_landscape: string;
        competitive_positioning_advice: string;
        differentiation_opportunities: string[];
        threats_to_address: string[];
    };
}

interface Competitor {
    id: string;
    name: string;
    url: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    analysis_json?: CompetitorAnalysis;
    last_analyzed_at: string;
}

export default function CompetitorResearchPage() {
    const { currentProject, loading } = useProject();
    
    if (loading) {
        return (
            <Shell>
                <PageLoading message="Loading competitor data..." />
            </Shell>
        );
    }
    const [url, setUrl] = useState("");
    const [analyzing, setAnalyzing] = useState(false);
    const [analysisProgress, setAnalysisProgress] = useState("");
    const [competitors, setCompetitors] = useState<Competitor[]>([]);
    const [selectedCompetitor, setSelectedCompetitor] = useState<Competitor | null>(null);
    const [crossInsights, setCrossInsights] = useState<CrossCompetitorInsights | null>(null);
    const [analyzingAll, setAnalyzingAll] = useState(false);

    // Get user's website from project (try multiple locations)
    const userWebsite = useMemo(() => {
        const project = currentProject as any;
        const detectedUrl = project?.website_url ||  // ✅ Correct field name!
            project?.website ||
            project?.url ||
            project?.brandIdentity?.dna?.website ||
            "";



        return detectedUrl;
    }, [currentProject]);

    useEffect(() => {
        if (currentProject) {
            fetchCompetitors();
            // Auto-populate with user's website if available and input is empty
            if (userWebsite && !url) {
                // console.log('✅ Auto-populating URL:', userWebsite);
                setUrl(userWebsite);
            } else {
                // console.log('⚠️ No auto-populate:', { userWebsite, url, hasUrl: !!url });
            }

            // Load saved cross-competitor insights if they exist
            const savedInsights = (currentProject as any)?.brand_identity?.competitive_insights;
            if (savedInsights?.insights) {
                setCrossInsights(savedInsights.insights);
            }
        }
    }, [currentProject, userWebsite, url]);

    const handleDeleteCompetitor = async (competitorId: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent selecting the competitor when clicking delete

        if (!confirm('Are you sure you want to remove this competitor?')) {
            return;
        }

        try {
            const response = await fetch(`/api/competitors/delete?id=${competitorId}`, {
                method: 'DELETE'
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to delete competitor');
            }

            toast.success('✅ Competitor removed');

            // If the deleted competitor was selected, clear selection
            if (selectedCompetitor?.id === competitorId) {
                setSelectedCompetitor(null);
            }

            // Refresh the list
            fetchCompetitors();
        } catch (error: any) {
            console.error('Error deleting competitor:', error);
            toast.error('❌ Failed to remove competitor: ' + error.message);
        }
    };

    const handleDeleteAllCompetitors = async () => {
        if (!currentProject?.id) {
            toast.error('No project selected');
            return;
        }
        if (competitors.length === 0) {
            toast.error('No competitors to delete');
            return;
        }

        if (!confirm(`⚠️ Are you sure you want to delete ALL ${competitors.length} competitors? This cannot be undone.`)) {
            return;
        }

        try {
            const response = await fetch(`/api/competitors/delete?deleteAll=true&projectId=${currentProject?.id}`, {
                method: 'DELETE'
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to delete competitors');
            }

            toast.success(`✅ Deleted all ${competitors.length} competitors`);
            setSelectedCompetitor(null);
            fetchCompetitors();
        } catch (error: any) {
            console.error('Error deleting all competitors:', error);
            toast.error('❌ Failed to delete all competitors: ' + error.message);
        }
    };

    const fetchCompetitors = async () => {
        if (!currentProject?.id) return;

        const supabase = createClient();
        const { data } = await supabase
            .from('competitors')
            .select('*')
            .eq('project_id', currentProject.id)
            .order('created_at', { ascending: false });

        if (data) {
            setCompetitors(data);
            // Auto-select first competitor if none selected
            if (!selectedCompetitor && data.length > 0) {
                setSelectedCompetitor(data[0]);
            }
        }
    };

    const handleAnalyze = async () => {
        console.log('🔍 Current Project:', currentProject);
        console.log('📊 Project ID:', currentProject?.id);
        console.log('🌐 User Website:', userWebsite);

        if (!currentProject?.id) {
            toast.error("No project selected");
            return;
        }

        if (!userWebsite) {
            toast.error("Please add your website URL in Brand Identity first");
            return;
        }

        setAnalyzing(true);

        // Multi-stage progress messages
        setAnalysisProgress("🔍 Searching Google for competitors...");
        toast.info("🕵️ Starting Competitor Discovery...");

        setTimeout(() => setAnalysisProgress("📡 Found competitors, scraping websites... (this may take a few minutes)"), 5000);
        setTimeout(() => setAnalysisProgress("🧠 Analyzing competitor 1 of 10..."), 15000);
        setTimeout(() => setAnalysisProgress("🧠 Analyzing competitor 3 of 10..."), 30000);
        setTimeout(() => setAnalysisProgress("🧠 Analyzing competitor 5 of 10..."), 45000);
        setTimeout(() => setAnalysisProgress("🧠 Analyzing competitor 7 of 10..."), 60000);
        setTimeout(() => setAnalysisProgress("⚔️ Extracting strategic insights..."), 75000);

        try {
            const response = await fetch('/api/ai/research/competitor-deep', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: currentProject.id
                })
            });

            const result = await response.json();

            if (response.ok) {
                setAnalysisProgress("✅ Intelligence report complete!");
                toast.success(`✅ Discovered & Analyzed ${result.saved} Competitors!`);
                setTimeout(() => {
                    fetchCompetitors();
                    setAnalysisProgress("");
                }, 1000);
            } else {
                toast.error("❌ Analysis Failed: " + result.error);
                setAnalysisProgress("");
            }
        } catch (error: any) {
            toast.error("Error: " + error.message);
            setAnalysisProgress("");
        } finally {
            setTimeout(() => setAnalyzing(false), 1000);
        }
    };

    const handleAnalyzeStrategy = async () => {
        if (!selectedCompetitor || !currentProject?.id) return;

        setAnalyzing(true);
        setAnalysisProgress("🧠 Decoding Ad Strategy & Psychology...");

        try {
            const response = await fetch('/api/ai/research/ad-strategy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: currentProject.id,
                    competitorId: selectedCompetitor.id
                })
            });

            const result = await response.json();

            if (result.success) {
                toast.success("✅ Strategy Decoded!");
                setAnalysisProgress("✅ Strategy Decoded!");
                // Force update local state or fetch again
                fetchCompetitors();
            } else {
                toast.error("❌ " + result.error);
                setAnalysisProgress("");
            }
        } catch (error: any) {
            toast.error("Failed to analyze strategy: " + error.message);
            setAnalysisProgress("");
        } finally {
            setTimeout(() => {
                setAnalyzing(false);
                setAnalysisProgress("");
            }, 1000);
        }
    };

    const handleAnalyzeAll = async () => {
        if (!currentProject?.id || competitors.length === 0) {
            toast.error("No competitors to analyze");
            return;
        }

        setAnalyzingAll(true);
        setAnalysisProgress("🧠 Analyzing all competitors for patterns and insights...");

        try {
            const response = await fetch('/api/ai/research/competitors-analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: currentProject.id
                })
            });

            const result = await response.json();

            if (result.success) {
                toast.success(`✅ Analyzed ${result.competitors_analyzed} competitors!`);
                setCrossInsights(result.insights);
                setAnalysisProgress("");
            } else {
                toast.error("❌ " + result.error);
                setAnalysisProgress("");
            }
        } catch (error: any) {
            toast.error("Failed to analyze competitors: " + error.message);
            setAnalysisProgress("");
        } finally {
            setTimeout(() => {
                setAnalyzingAll(false);
                setAnalysisProgress("");
            }, 1000);
        }
    };


    const analysis = selectedCompetitor?.analysis_json;

    return (
        <Shell>
            <div className="h-[calc(100vh-2rem)] flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-display font-bold">🎯 Competitor Intelligence Warfare</h1>
                        <p className="text-muted-foreground">20-Module Strategic Analysis System</p>
                    </div>
                </div>

                <div className="grid grid-cols-12 gap-6 flex-1 min-h-0">
                    {/* Left Sidebar */}
                    <div className="col-span-3 flex flex-col gap-4">
                        {/* Deep Intelligence Scan Button */}
                        <Card>
                            <CardContent className="p-4 space-y-3">
                                <Button
                                    onClick={async () => {
                                        setAnalyzing(true);
                                        setAnalysisProgress("🕵️ Searching Google for top 3 competitors...");

                                        // Simulate progress steps while the backend works
                                        const timers = [
                                            setTimeout(() => setAnalysisProgress("📡 Found competitors, scraping websites..."), 5000),
                                            setTimeout(() => setAnalysisProgress("🧠 Analyzing competitor 1 of 3..."), 12000),
                                            setTimeout(() => setAnalysisProgress("🧠 Analyzing competitor 2 of 3..."), 25000),
                                            setTimeout(() => setAnalysisProgress("🧠 Analyzing competitor 3 of 3..."), 38000),
                                            setTimeout(() => setAnalysisProgress("📢 Fetching Meta Ads data..."), 40000),
                                            setTimeout(() => setAnalysisProgress("🎯 Decoding ad strategies..."), 55000),
                                            setTimeout(() => setAnalysisProgress("⚔️ Compiling strategic reports..."), 70000),
                                        ];

                                        try {
                                            const response = await fetch('/api/ai/research/competitor-deep', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                    projectId: currentProject?.id
                                                })
                                            });

                                            const result = await response.json();

                                            if (response.ok && result.success) {
                                                setAnalysisProgress("✅ Deep Intelligence complete!");
                                                toast.success(`✅ Discovered & Analyzed ${result.saved} Competitors with Ad Strategy!`);
                                                fetchCompetitors();
                                            } else {
                                                console.error('❌ SCAN FAILED:', result);
                                                toast.error('❌ Scan failed: ' + (result.error || 'Unknown error'));
                                                setAnalysisProgress("");
                                            }
                                        } catch (error: any) {
                                            console.error('❌ SCAN ERROR:', error);
                                            toast.error('❌ Scan error: ' + error.message);
                                            setAnalysisProgress("");
                                        } finally {
                                            // Clear timers if it finishes early or fails
                                            timers.forEach(t => clearTimeout(t));
                                            setTimeout(() => {
                                                setAnalyzing(false);
                                                setAnalysisProgress("");
                                            }, 1500);
                                        }
                                    }}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                                    disabled={analyzing || !currentProject?.id}
                                >
                                    {analyzing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                                    🎯 Deep Intelligence Scan
                                </Button>
                                <p className="text-xs text-center text-muted-foreground leading-relaxed">
                                    20-Module Analysis • Top 3 Competitors • Meta Ads • Ad Strategy
                                </p>
                            </CardContent>
                        </Card>

                        {/* Analyze All Competitors Button */}
                        {competitors.length > 0 && (
                            <Card>
                                <CardContent className="p-4 space-y-3">
                                    <Button
                                        onClick={handleAnalyzeAll}
                                        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                                        disabled={analyzingAll || competitors.length === 0}
                                    >
                                        {analyzingAll ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <BarChart2 className="w-4 h-4 mr-2" />}
                                        📊 Analyze All Competitors
                                    </Button>
                                    {crossInsights && (
                                        <Button
                                            onClick={() => setCrossInsights(crossInsights)}
                                            variant="outline"
                                            size="sm"
                                            className="w-full"
                                        >
                                            <Eye className="w-4 h-4 mr-2" />
                                            View Last Analysis
                                        </Button>
                                    )}
                                    <p className="text-xs text-center text-muted-foreground leading-relaxed">
                                        Cross-competitor insights • Winning patterns • Strategic recommendations
                                    </p>
                                    {(currentProject as any)?.brand_identity?.competitive_insights?.last_analyzed && (
                                        <p className="text-[10px] text-center text-muted-foreground">
                                            Last analyzed: {new Date((currentProject as any).brand_identity.competitive_insights.last_analyzed).toLocaleDateString()}
                                        </p>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        <Card className="flex-1 min-h-0 flex flex-col">
                            <CardHeader className="py-4 border-b">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm">Tracked Competitors ({competitors.length})</CardTitle>
                                    <div className="flex items-center gap-1">

                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                                            onClick={handleDeleteAllCompetitors}
                                            disabled={competitors.length === 0}
                                        >
                                            <Trash2 className="h-3 w-3 mr-1" />
                                            Clear All
                                        </Button>

                                    </div>
                                </div>
                            </CardHeader>
                            <ScrollArea className="flex-1">
                                <div className="p-2 space-y-1">
                                    {competitors.map((comp) => (
                                        <div
                                            key={comp.id}
                                            onClick={() => setSelectedCompetitor(comp)}
                                            className={`
                                                p-3 rounded-lg cursor-pointer transition-all border relative group
                                                ${selectedCompetitor?.id === comp.id
                                                    ? 'bg-primary/10 border-primary shadow-sm'
                                                    : 'hover:bg-accent border-transparent'}
                                            `}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-sm truncate">{comp.name}</p>
                                                    <p className="text-xs text-muted-foreground truncate">{comp.url}</p>
                                                    <div className="flex gap-2 mt-2">
                                                        <Badge
                                                            variant={comp.status === 'completed' ? 'default' : 'secondary'}
                                                            className="text-[10px]"
                                                        >
                                                            {comp.status}
                                                        </Badge>
                                                        {comp.analysis_json?.ads_data?.has_active_ads && (
                                                            <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                                                                <Monitor className="w-3 h-3 mr-1" />
                                                                {comp.analysis_json.ads_data.total_ads_found} Ads
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 w-7 p-0 hover:bg-destructive/10 shrink-0"
                                                    onClick={(e) => handleDeleteCompetitor(comp.id, e)}
                                                    title="Remove competitor"
                                                >
                                                    <X className="h-4 w-4 text-destructive hover:text-destructive" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                    {competitors.length === 0 && (
                                        <div className="p-8 text-center text-sm text-muted-foreground">
                                            No competitors tracked yet
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </Card>
                    </div>

                    {/* Main Panel */}
                    <div className="col-span-9">
                        {analyzing && analysisProgress ? (
                            <Card className="h-full flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
                                <div className="text-center space-y-6 p-12">
                                    <div className="relative">
                                        <div className="w-32 h-32 mx-auto">
                                            <svg className="animate-spin" viewBox="0 0 100 100">
                                                <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                                                <circle cx="50" cy="50" r="45" fill="none" stroke="#6366f1" strokeWidth="8" strokeDasharray="283" strokeDashoffset="70" strokeLinecap="round" />
                                            </svg>
                                        </div>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <Loader2 className="w-12 h-12 text-indigo-600 animate-pulse" />
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <h3 className="text-2xl font-bold text-gray-900">
                                            AI Deep Intelligence Scan
                                        </h3>
                                        <p className="text-lg font-medium text-indigo-600 animate-pulse">
                                            {analysisProgress}
                                        </p>
                                        <p className="text-sm text-muted-foreground max-w-md mx-auto">
                                            We're performing a comprehensive 20-module analysis across their website,
                                            extracting positioning, pricing, messaging, weaknesses, and strategic opportunities.
                                        </p>
                                        <div className="pt-4">
                                            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                                                <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                                                <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                                <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                                            </div>
                                            <p className="mt-2 text-xs text-muted-foreground">This typically takes 1-2 minutes</p>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ) : crossInsights ? (
                            <Card className="h-full flex flex-col">
                                <div className="p-6 border-b bg-gradient-to-r from-purple-50 to-pink-50">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h2 className="text-2xl font-bold">📊 Cross-Competitor Analysis</h2>
                                            <p className="text-sm text-muted-foreground mt-1">Strategic insights from all competitors</p>
                                            {(currentProject as any)?.brand_identity?.competitive_insights?.last_analyzed && (
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Last analyzed: {new Date((currentProject as any).brand_identity.competitive_insights.last_analyzed).toLocaleString()}
                                                </p>
                                            )}
                                        </div>
                                        <Button variant="outline" size="sm" onClick={() => setCrossInsights(null)}>
                                            <X className="w-4 h-4 mr-1" /> Close
                                        </Button>
                                    </div>
                                </div>
                                <ScrollArea className="flex-1 p-6">
                                    <div className="space-y-8">
                                        <Card className="border-2 border-purple-500 bg-gradient-to-br from-purple-50 to-pink-50">
                                            <CardHeader><CardTitle className="flex items-center gap-2 text-purple-700"><Lightbulb className="w-5 h-5" /> Strategic Insights</CardTitle></CardHeader>
                                            <CardContent className="space-y-4">
                                                <div><strong className="text-purple-700">Market Landscape:</strong><p className="text-sm mt-1">{crossInsights.strategic_insights.market_landscape}</p></div>
                                                <div><strong className="text-purple-700">Positioning Advice:</strong><p className="text-sm mt-1">{crossInsights.strategic_insights.competitive_positioning_advice}</p></div>
                                                <div><strong className="text-purple-700">Differentiation:</strong><ul className="list-disc list-inside mt-2 space-y-1 text-sm">{crossInsights.strategic_insights.differentiation_opportunities.map((opp, i) => <li key={i}>{opp}</li>)}</ul></div>
                                                <div><strong className="text-red-600">Threats:</strong><ul className="list-disc list-inside mt-2 space-y-1 text-sm">{crossInsights.strategic_insights.threats_to_address.map((threat, i) => <li key={i}>{threat}</li>)}</ul></div>
                                            </CardContent>
                                        </Card>
                                        <div><h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Zap className="w-5 h-5 text-yellow-600" /> Recommended Actions</h3><div className="space-y-3">{crossInsights.recommended_actions.map((action, i) => <Card key={i} className={`border-l-4 ${action.priority === 'High' ? 'border-l-red-500 bg-red-50/50' : action.priority === 'Medium' ? 'border-l-yellow-500 bg-yellow-50/50' : 'border-l-blue-500 bg-blue-50/50'}`}><CardContent className="p-4"><div className="flex items-center gap-2 mb-2"><Badge variant={action.priority === 'High' ? 'destructive' : action.priority === 'Medium' ? 'default' : 'secondary'}>{action.priority}</Badge><Badge variant="outline" className="text-xs">{action.implementation_difficulty}</Badge></div><h4 className="font-semibold text-sm mb-1">{action.action}</h4><p className="text-xs text-muted-foreground mb-1">{action.rationale}</p><p className="text-xs text-green-700 font-medium">Expected: {action.expected_outcome}</p></CardContent></Card>)}</div></div>
                                        <div><h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Award className="w-5 h-5 text-yellow-600" /> Top Winning Campaigns</h3><div className="space-y-4">{crossInsights.winning_campaigns.map((campaign, i) => <Card key={i} className="border-yellow-100 bg-gradient-to-br from-yellow-50/50 to-orange-50/50"><CardHeader className="pb-3"><div className="flex items-start justify-between"><CardTitle className="text-base">{campaign.competitor_name}</CardTitle><Badge variant="outline">#{i + 1}</Badge></div></CardHeader><CardContent className="space-y-3"><div><span className="text-xs uppercase font-bold text-muted-foreground">Campaign</span><p className="text-sm mt-1">{campaign.campaign_description}</p></div><div><span className="text-xs uppercase font-bold text-green-600">Why It Worked</span><p className="text-sm mt-1">{campaign.why_successful}</p></div><div><span className="text-xs uppercase font-bold text-muted-foreground">Key Tactics</span><div className="flex flex-wrap gap-1 mt-1">{campaign.key_tactics.map((tactic, idx) => <Badge key={idx} variant="secondary" className="text-xs">{tactic}</Badge>)}</div></div><div className="pt-2 border-t"><span className="text-xs uppercase font-bold text-purple-600">How to Apply</span><p className="text-sm mt-1 text-purple-800">{campaign.applicability_to_your_brand}</p></div></CardContent></Card>)}</div></div>
                                        <div><h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Target className="w-5 h-5 text-blue-600" /> Success Patterns</h3><div className="grid grid-cols-2 gap-4">{crossInsights.success_patterns.map((pattern, i) => <Card key={i}><CardHeader className="pb-3"><CardTitle className="text-sm">{pattern.pattern_name}</CardTitle><CardDescription className="text-xs">{pattern.frequency}</CardDescription></CardHeader><CardContent className="space-y-2"><p className="text-xs">{pattern.description}</p><div><span className="text-xs font-semibold">Used by:</span><div className="flex flex-wrap gap-1 mt-1">{pattern.competitors_using.map((comp, idx) => <Badge key={idx} variant="outline" className="text-[10px]">{comp}</Badge>)}</div></div><div className="pt-2 border-t"><span className="text-xs font-semibold text-indigo-600">Implementation:</span><p className="text-xs mt-1">{pattern.recommended_implementation}</p></div></CardContent></Card>)}</div></div>
                                        <div><h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Rocket className="w-5 h-5 text-green-600" /> Market Opportunities</h3><div className="space-y-3">{crossInsights.market_opportunities.map((opp, i) => <Card key={i} className="border-green-100 bg-green-50/30"><CardContent className="p-4"><div className="flex items-start justify-between mb-2"><h4 className="font-semibold text-sm">{opp.opportunity}</h4><Badge variant={opp.potential_impact === 'High' ? 'default' : opp.potential_impact === 'Medium' ? 'secondary' : 'outline'} className="text-xs">{opp.potential_impact}</Badge></div><p className="text-xs text-muted-foreground mb-2">{opp.gap_identified}</p><div><span className="text-xs font-semibold text-green-700">Action Steps:</span><ol className="list-decimal list-inside mt-1 space-y-1 text-xs">{opp.action_steps.map((step, idx) => <li key={idx}>{step}</li>)}</ol></div></CardContent></Card>)}</div></div>
                                    </div>
                                </ScrollArea>
                            </Card>
                        ) : selectedCompetitor && analysis ? (
                            <Card className="h-full flex flex-col">
                                {/* Header */}
                                <div className="p-6 border-b bg-gradient-to-r from-indigo-50 to-purple-50">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h2 className="text-2xl font-bold">{selectedCompetitor.name}</h2>
                                            <a
                                                href={selectedCompetitor.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm text-blue-600 hover:underline flex items-center gap-1 mt-1"
                                            >
                                                {selectedCompetitor.url} <ArrowRight className="w-3 h-3" />
                                            </a>
                                            <div className="flex gap-2 mt-3">
                                                <Badge>{analysis.competitor_identification?.type || 'Direct'}</Badge>
                                                <Badge variant="outline">{analysis.competitor_identification?.price_positioning || 'Mid-tier'}</Badge>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Tabs */}
                                <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
                                    <div className="px-4 pt-4 border-b">
                                        <TabsList className="grid grid-cols-9 w-full">
                                            <TabsTrigger value="overview">Overview</TabsTrigger>
                                            <TabsTrigger value="positioning">Positioning</TabsTrigger>
                                            <TabsTrigger value="audience">Audience</TabsTrigger>
                                            <TabsTrigger value="offers">Offers</TabsTrigger>
                                            <TabsTrigger value="content">Content</TabsTrigger>
                                            <TabsTrigger value="weaknesses">⚔️ Weaknesses</TabsTrigger>
                                            <TabsTrigger value="strategy">🎯 Battle Plan</TabsTrigger>
                                            <TabsTrigger value="ads">📢 Advertising</TabsTrigger>
                                            <TabsTrigger value="ad_strategy" className="relative">
                                                🧠 Ad Strategy
                                                {!analysis.ad_strategy && (
                                                    <span className="absolute -top-1 -right-1 flex h-2 w-2">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                                                    </span>
                                                )}
                                            </TabsTrigger>
                                        </TabsList>
                                    </div>
                                    <ScrollArea className="flex-1 p-6">
                                        {/* Ad Strategy Tab */}
                                        <TabsContent value="ad_strategy" className="space-y-6 mt-0">
                                            {!analysis.ad_strategy ? (
                                                <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-50 border rounded-xl border-dashed">
                                                    <div className="p-4 bg-indigo-100 rounded-full mb-4">
                                                        <Zap className="w-8 h-8 text-indigo-600" />
                                                    </div>
                                                    <h3 className="text-xl font-bold mb-2">Unlock Ad Strategy Intelligence</h3>
                                                    <p className="text-muted-foreground max-w-md mb-6">
                                                        Use AI to reverse-engineer their winning hooks, diagnose their funnel,
                                                        and generate a counter-attack campaign strategy.
                                                    </p>
                                                    <Button onClick={handleAnalyzeStrategy} disabled={analyzing} className="bg-indigo-600 hover:bg-indigo-700">
                                                        {analyzing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                                                        Decode Their Strategy
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                                    {/* Attack Plan Banner */}
                                                    <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-100 p-6 rounded-xl">
                                                        <h3 className="flex items-center gap-2 text-lg font-bold text-red-800 mb-4">
                                                            <Swords className="w-5 h-5" /> Attack Plan
                                                        </h3>
                                                        <div className="grid grid-cols-3 gap-6">
                                                            <div>
                                                                <div className="text-xs font-bold text-red-600 uppercase mb-1">Exploit Weakness</div>
                                                                <p className="text-sm font-medium text-slate-800">{analysis.ad_strategy.attack_plan.weakness_to_exploit}</p>
                                                            </div>
                                                            <div>
                                                                <div className="text-xs font-bold text-indigo-600 uppercase mb-1">Counter Strategy</div>
                                                                <p className="text-sm font-medium text-slate-800">{analysis.ad_strategy.attack_plan.counter_strategy}</p>
                                                            </div>
                                                            <div>
                                                                <div className="text-xs font-bold text-emerald-600 uppercase mb-1">Differentiation</div>
                                                                <p className="text-sm font-medium text-slate-800">{analysis.ad_strategy.attack_plan.differentiation_angle}</p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Winning Hooks & Patterns */}
                                                    <div className="grid grid-cols-2 gap-6">
                                                        <Card>
                                                            <CardHeader>
                                                                <CardTitle className="text-base flex items-center gap-2">
                                                                    <Crosshair className="w-4 h-4 text-indigo-500" /> Winning Hooks
                                                                </CardTitle>
                                                            </CardHeader>
                                                            <CardContent className="space-y-4">
                                                                {analysis.ad_strategy.winning_hooks.map((hook, i) => (
                                                                    <div key={i} className="p-3 bg-slate-50 rounded-lg border">
                                                                        <div className="flex justify-between items-start mb-1">
                                                                            <span className="font-semibold text-sm">{hook.hook}</span>
                                                                            <Badge variant={hook.estimated_effectiveness === 'High' ? 'default' : 'secondary'} className="text-[10px]">
                                                                                {hook.estimated_effectiveness} Impact
                                                                            </Badge>
                                                                        </div>
                                                                        <p className="text-xs text-muted-foreground">{hook.why_it_works}</p>
                                                                    </div>
                                                                ))}
                                                            </CardContent>
                                                        </Card>

                                                        <Card>
                                                            <CardHeader>
                                                                <CardTitle className="text-base flex items-center gap-2">
                                                                    <Palette className="w-4 h-4 text-pink-500" /> Creative Patterns
                                                                </CardTitle>
                                                            </CardHeader>
                                                            <CardContent className="space-y-4">
                                                                {analysis.ad_strategy.creative_patterns.map((pattern, i) => (
                                                                    <div key={i} className="flex items-start gap-3">
                                                                        <div className="mt-1">
                                                                            {pattern.frequency === 'Dominant' ? (
                                                                                <div className="w-2 h-2 rounded-full bg-green-500 ring-2 ring-green-100" />
                                                                            ) : (
                                                                                <div className="w-2 h-2 rounded-full bg-slate-300" />
                                                                            )}
                                                                        </div>
                                                                        <div>
                                                                            <div className="text-sm font-medium">{pattern.type} <span className="text-xs text-muted-foreground">({pattern.frequency})</span></div>
                                                                            <p className="text-xs text-muted-foreground">{pattern.description}</p>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </CardContent>
                                                        </Card>
                                                    </div>

                                                    {/* Funnel & Triggers */}
                                                    <div className="grid grid-cols-3 gap-6">
                                                        <Card className="col-span-2">
                                                            <CardHeader>
                                                                <CardTitle className="text-base flex items-center gap-2">
                                                                    <TrendingUp className="w-4 h-4 text-blue-500" /> Funnel Diagnosis
                                                                </CardTitle>
                                                            </CardHeader>
                                                            <CardContent>
                                                                <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg text-center font-mono text-sm mb-4">
                                                                    {analysis.ad_strategy.funnel_diagnosis.structure}
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <div>
                                                                        <div className="text-xs font-bold text-red-500 uppercase mb-2">Friction Points</div>
                                                                        <ul className="list-disc list-inside text-xs space-y-1">
                                                                            {analysis.ad_strategy.funnel_diagnosis.friction_points.map((p, i) => (
                                                                                <li key={i}>{p}</li>
                                                                            ))}
                                                                        </ul>
                                                                    </div>
                                                                    <div>
                                                                        <div className="text-xs font-bold text-green-600 uppercase mb-2">Conversion Triggers</div>
                                                                        <ul className="list-disc list-inside text-xs space-y-1">
                                                                            {analysis.ad_strategy.funnel_diagnosis.conversion_triggers.map((p, i) => (
                                                                                <li key={i}>{p}</li>
                                                                            ))}
                                                                        </ul>
                                                                    </div>
                                                                </div>
                                                            </CardContent>
                                                        </Card>

                                                        <Card>
                                                            <CardHeader>
                                                                <CardTitle className="text-base flex items-center gap-2">
                                                                    <Lightbulb className="w-4 h-4 text-yellow-500" /> Psych Triggers
                                                                </CardTitle>
                                                            </CardHeader>
                                                            <CardContent className="space-y-3">
                                                                {analysis.ad_strategy.psychological_triggers.map((trigger, i) => (
                                                                    <div key={i}>
                                                                        <div className="text-sm font-medium">{trigger.trigger}</div>
                                                                        <p className="text-xs text-muted-foreground leading-snug">{trigger.application}</p>
                                                                    </div>
                                                                ))}
                                                            </CardContent>
                                                        </Card>
                                                    </div>

                                                    {/* Their Top 5 Winning Campaigns */}
                                                    {analysis.ad_strategy.winning_ads && analysis.ad_strategy.winning_ads.length > 0 && (
                                                        <div className="mb-8">
                                                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                                                <Monitor className="w-5 h-5 text-blue-600" /> Their Top 5 Winning Campaigns
                                                            </h3>
                                                            <div className="grid grid-cols-2 gap-4">
                                                                {analysis.ad_strategy.winning_ads.map((ad, i) => (
                                                                    <Card key={i} className="border-blue-100 overflow-hidden bg-gradient-to-br from-blue-50/50 to-indigo-50/50">
                                                                        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-2 border-b flex justify-between items-center">
                                                                            <span className="font-bold text-sm text-white">Campaign #{i + 1}</span>
                                                                            <div className="flex gap-2">
                                                                                <Badge variant="outline" className="bg-white/90 text-blue-700 text-[10px] border-blue-200">
                                                                                    {ad.platform === 'instagram' ? 'Instagram' : 'Facebook'}
                                                                                </Badge>
                                                                            </div>
                                                                        </div>
                                                                        <CardContent className="p-4 space-y-3">
                                                                            {/* Ad Copy */}
                                                                            <div>
                                                                                <span className="text-[10px] uppercase font-bold text-muted-foreground">Ad Copy</span>
                                                                                <p className="text-sm leading-tight mt-1 line-clamp-3">{ad.ad_creative_body}</p>
                                                                                {ad.ad_creative_link_title && (
                                                                                    <p className="text-xs font-medium text-blue-600 mt-1">→ {ad.ad_creative_link_title}</p>
                                                                                )}
                                                                            </div>

                                                                            {/* Success Analysis */}
                                                                            <div className="bg-white/80 rounded-lg p-3 border border-blue-100">
                                                                                <div className="text-[10px] uppercase font-bold text-blue-600 mb-2">🧠 Why It Works</div>

                                                                                <div className="space-y-2">
                                                                                    <div>
                                                                                        <div className="text-xs font-semibold text-slate-700">Hook Strength</div>
                                                                                        <p className="text-xs text-muted-foreground leading-snug">{ad.success_analysis.hook_strength}</p>
                                                                                    </div>

                                                                                    <div>
                                                                                        <div className="text-xs font-semibold text-slate-700">Psychological Triggers</div>
                                                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                                                            {ad.success_analysis.psychological_triggers.map((trigger, idx) => (
                                                                                                <Badge key={idx} variant="secondary" className="text-[10px]">{trigger}</Badge>
                                                                                            ))}
                                                                                        </div>
                                                                                    </div>

                                                                                    <div>
                                                                                        <div className="text-xs font-semibold text-slate-700">Success Analysis</div>
                                                                                        <p className="text-xs text-muted-foreground leading-snug">{ad.success_analysis.why_it_works}</p>
                                                                                    </div>
                                                                                </div>
                                                                            </div>

                                                                            {/* Meta Link */}
                                                                            {ad.meta_ad_library_url && (
                                                                                <a
                                                                                    href={ad.meta_ad_library_url}
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                    className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                                                                                >
                                                                                    View on Meta Ad Library <ArrowRight className="w-3 h-3" />
                                                                                </a>
                                                                            )}
                                                                        </CardContent>
                                                                    </Card>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Recommended Campaigns */}
                                                    <div>
                                                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                                            <Rocket className="w-5 h-5 text-indigo-600" /> Recommended Campaigns
                                                        </h3>
                                                        <div className="grid grid-cols-2 gap-4">
                                                            {analysis.ad_strategy.campaign_suggestions.map((campaign, i) => (
                                                                <Card key={i} className="border-indigo-100 overflow-hidden">
                                                                    <div className="bg-indigo-50 px-4 py-2 border-b border-indigo-100 flex justify-between items-center">
                                                                        <span className="font-bold text-sm text-indigo-900">{campaign.name}</span>
                                                                        <Badge variant="outline" className="bg-white text-indigo-600 text-[10px]">{campaign.angle}</Badge>
                                                                    </div>
                                                                    <CardContent className="p-4 space-y-3">
                                                                        <div>
                                                                            <span className="text-[10px] uppercase font-bold text-muted-foreground">Headline</span>
                                                                            <p className="text-sm font-medium leading-tight">{campaign.headline}</p>
                                                                        </div>
                                                                        <div>
                                                                            <span className="text-[10px] uppercase font-bold text-muted-foreground">Why It Wins</span>
                                                                            <p className="text-xs text-muted-foreground">{campaign.reasoning}</p>
                                                                        </div>
                                                                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-dashed">
                                                                            <div>
                                                                                <span className="text-[10px] uppercase font-bold text-muted-foreground">Visual</span>
                                                                                <p className="text-xs">{campaign.visual_concept}</p>
                                                                            </div>
                                                                            <div>
                                                                                <span className="text-[10px] uppercase font-bold text-muted-foreground">Target</span>
                                                                                <p className="text-xs">{campaign.target_audience}</p>
                                                                            </div>
                                                                        </div>
                                                                    </CardContent>
                                                                </Card>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </TabsContent>
                                        <TabsContent value="overview" className="space-y-6 mt-0">
                                            <div className="grid grid-cols-2 gap-4">
                                                <Card>
                                                    <CardHeader>
                                                        <CardTitle className="text-sm flex items-center gap-2">
                                                            <Target className="w-4 h-4" /> Identification
                                                        </CardTitle>
                                                    </CardHeader>
                                                    <CardContent className="space-y-2 text-sm">
                                                        <div><strong>Category:</strong> {analysis.competitor_identification?.category}</div>
                                                        <div><strong>Sub-category:</strong> {analysis.competitor_identification?.subcategory}</div>
                                                        <div><strong>Country:</strong> {analysis.competitor_identification?.country}</div>
                                                        <div><strong>Type:</strong> {analysis.competitor_identification?.type}</div>
                                                    </CardContent>
                                                </Card>

                                                <Card>
                                                    <CardHeader>
                                                        <CardTitle className="text-sm flex items-center gap-2">
                                                            <Sparkles className="w-4 h-4" /> Core Promise
                                                        </CardTitle>
                                                    </CardHeader>
                                                    <CardContent>
                                                        <p className="text-sm">{analysis.brand_positioning_extraction?.core_promise}</p>
                                                    </CardContent>
                                                </Card>
                                            </div>

                                            <Card>
                                                <CardHeader>
                                                    <CardTitle className="text-sm">Brand Story</CardTitle>
                                                </CardHeader>
                                                <CardContent className="space-y-3 text-sm">
                                                    <div>
                                                        <strong>Origin Story:</strong>
                                                        <p className="text-muted-foreground mt-1">{analysis.brand_story_narrative?.origin_story}</p>
                                                    </div>
                                                    <div className="flex gap-4">
                                                        <div>
                                                            <strong>Authenticity:</strong> {analysis.brand_story_narrative?.authenticity_score}/10
                                                        </div>
                                                        <div>
                                                            <strong>Emotional Depth:</strong> {analysis.brand_story_narrative?.emotional_depth_score}/10
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>

                                            <Card>
                                                <CardHeader>
                                                    <CardTitle className="text-sm flex items-center gap-2">
                                                        <Smile className="w-4 h-4" /> Brand Personality
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="space-y-2 text-sm">
                                                    <div><strong>Archetype:</strong> {analysis.brand_personality?.brand_archetype}</div>
                                                    <div><strong>Warmth:</strong> {analysis.brand_personality?.warmth_score}/10</div>
                                                    <div><strong>Boldness:</strong> {analysis.brand_personality?.boldness_score}/10</div>
                                                    <div><strong>Tone:</strong> {analysis.brand_personality?.clinical_vs_emotional}</div>
                                                </CardContent>
                                            </Card>
                                        </TabsContent>

                                        {/* Positioning Tab */}
                                        <TabsContent value="positioning" className="space-y-4 mt-0">
                                            <Card>
                                                <CardHeader>
                                                    <CardTitle>Positioning Statement</CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <p className="text-lg font-medium mb-4">{analysis.brand_positioning_extraction?.positioning_statement}</p>
                                                    <div className="space-y-2">
                                                        <div><strong>Emotional Angle:</strong> {analysis.brand_positioning_extraction?.emotional_angle}</div>
                                                    </div>
                                                </CardContent>
                                            </Card>

                                            <Card>
                                                <CardHeader>
                                                    <CardTitle className="text-sm">Value Propositions</CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <ul className="list-disc list-inside space-y-1">
                                                        {analysis.brand_positioning_extraction?.value_propositions?.map((vp: string, i: number) => (
                                                            <li key={i}>{vp}</li>
                                                        ))}
                                                    </ul>
                                                </CardContent>
                                            </Card>
                                        </TabsContent>

                                        {/* Audience Tab */}
                                        <TabsContent value="audience" className="space-y-4 mt-0">
                                            <div className="grid grid-cols-2 gap-4">
                                                <Card>
                                                    <CardHeader>
                                                        <CardTitle className="text-sm flex items-center gap-2">
                                                            <Users className="w-4 h-4" /> Demographics
                                                        </CardTitle>
                                                    </CardHeader>
                                                    <CardContent>
                                                        <p className="text-sm">
                                                            {analysis.target_audience_signals?.demographics?.age_range && `Age: ${analysis.target_audience_signals.demographics.age_range}`}
                                                            {analysis.target_audience_signals?.demographics?.gender && ` • Gender: ${analysis.target_audience_signals.demographics.gender}`}
                                                            {analysis.target_audience_signals?.demographics?.income_level && ` • Income: ${analysis.target_audience_signals.demographics.income_level}`}
                                                        </p>
                                                    </CardContent>
                                                </Card>

                                                <Card>
                                                    <CardHeader>
                                                        <CardTitle className="text-sm flex items-center gap-2">
                                                            <Heart className="w-4 h-4" /> Emotional State
                                                        </CardTitle>
                                                    </CardHeader>
                                                    <CardContent>
                                                        <p className="text-sm">{analysis.target_audience_signals?.emotional_state_targeted}</p>
                                                    </CardContent>
                                                </Card>
                                            </div>

                                            <Card>
                                                <CardHeader>
                                                    <CardTitle className="text-sm">Identity & Aspiration</CardTitle>
                                                </CardHeader>
                                                <CardContent className="space-y-3 text-sm">
                                                    <div>
                                                        <strong>Identity Drivers:</strong>
                                                        <p className="text-muted-foreground">{analysis.target_audience_signals?.identity_drivers?.join(', ')}</p>
                                                    </div>
                                                    <div>
                                                        <strong>Aspirations:</strong>
                                                        <p className="text-muted-foreground">{analysis.target_audience_signals?.aspirations?.join(', ')}</p>
                                                    </div>
                                                </CardContent>
                                            </Card>

                                            <Card className="bg-purple-50 border-purple-200">
                                                <CardHeader>
                                                    <CardTitle className="text-sm">Customer Psychology</CardTitle>
                                                </CardHeader>
                                                <CardContent className="space-y-3 text-sm">
                                                    <div>
                                                        <strong>What Customers Praise:</strong>
                                                        <ul className="list-disc list-inside mt-1">
                                                            {analysis.customer_psychology?.what_customers_praise?.slice(0, 3).map((p: string, i: number) => (
                                                                <li key={i}>{p}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                    <div>
                                                        <strong>Common Frustrations:</strong>
                                                        <ul className="list-disc list-inside mt-1">
                                                            {analysis.customer_psychology?.common_frustrations?.slice(0, 3).map((f: string, i: number) => (
                                                                <li key={i}>{f}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </TabsContent>

                                        {/* Offers Tab */}
                                        <TabsContent value="offers" className="space-y-4 mt-0">
                                            <Card>
                                                <CardHeader>
                                                    <CardTitle className="flex items-center gap-2">
                                                        <DollarSign className="w-5 h-5" /> Pricing & Offers
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="space-y-4">
                                                    <div>
                                                        <strong>Price Ranges:</strong>
                                                        <p className="text-muted-foreground">{analysis.offer_structure_pricing?.price_ranges}</p>
                                                    </div>
                                                    <div>
                                                        <strong>Bundles:</strong>
                                                        <p className="text-muted-foreground">{analysis.offer_structure_pricing?.bundles?.join(', ')}</p>
                                                    </div>
                                                    <div>
                                                        <strong>Guarantees:</strong>
                                                        <p className="text-muted-foreground">{analysis.offer_structure_pricing?.guarantees?.join(', ')}</p>
                                                    </div>
                                                    <div>
                                                        <strong>Discounts:</strong>
                                                        <p className="text-muted-foreground">{analysis.offer_structure_pricing?.discounts?.join(', ')}</p>
                                                    </div>
                                                </CardContent>
                                            </Card>

                                            <Card>
                                                <CardHeader>
                                                    <CardTitle className="text-sm">Offer Classification</CardTitle>
                                                </CardHeader>
                                                <CardContent className="space-y-3">
                                                    <div>
                                                        <strong>Entry Offer:</strong>
                                                        <p className="text-sm text-muted-foreground">
                                                            {typeof analysis.offer_structure_pricing?.entry_offer === 'string'
                                                                ? analysis.offer_structure_pricing.entry_offer
                                                                : JSON.stringify(analysis.offer_structure_pricing?.entry_offer)}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <strong>Core Offers:</strong>
                                                        <p className="text-sm text-muted-foreground">
                                                            {Array.isArray(analysis.offer_structure_pricing?.core_offers)
                                                                ? analysis.offer_structure_pricing.core_offers.map((o: any) => typeof o === 'string' ? o : JSON.stringify(o)).join(', ')
                                                                : analysis.offer_structure_pricing?.core_offers}
                                                        </p>
                                                    </div>
                                                </CardContent>
                                            </Card>

                                            <Card>
                                                <CardHeader>
                                                    <CardTitle className="text-sm">Products & Features</CardTitle>
                                                </CardHeader>
                                                <CardContent className="space-y-3 text-sm">
                                                    <div>
                                                        <strong>Key Claims:</strong>
                                                        <ul className="list-disc list-inside mt-1">
                                                            {analysis.product_feature_mapping?.claims?.slice(0, 5).map((c: string, i: number) => (
                                                                <li key={i}>{c}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                    <div>
                                                        <strong>Certifications:</strong>
                                                        <p className="text-muted-foreground">{analysis.product_feature_mapping?.certifications?.join(', ')}</p>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </TabsContent>

                                        {/* Content Tab */}
                                        <TabsContent value="content" className="space-y-4 mt-0">
                                            <Card>
                                                <CardHeader>
                                                    <CardTitle className="flex items-center gap-2">
                                                        <FileText className="w-5 h-5" /> Content Strategy
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="space-y-3">
                                                    <div>
                                                        <strong>Content Pillars:</strong>
                                                        <ul className="list-disc list-inside mt-1">
                                                            {analysis.content_strategy_messaging?.content_pillars?.map((p: string, i: number) => (
                                                                <li key={i}>{p}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                    <div>
                                                        <strong>Themes:</strong>
                                                        <ul className="list-disc list-inside mt-1">
                                                            {analysis.content_strategy_messaging?.themes?.map((t: string, i: number) => (
                                                                <li key={i}>{t}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                    <div>
                                                        <strong>Education vs Entertainment:</strong>
                                                        <p className="text-muted-foreground">{analysis.content_strategy_messaging?.education_vs_entertainment_ratio}</p>
                                                    </div>
                                                </CardContent>
                                            </Card>

                                            <Card>
                                                <CardHeader>
                                                    <CardTitle className="text-sm flex items-center gap-2">
                                                        <Palette className="w-4 h-4" /> Visual Identity
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="space-y-2 text-sm">
                                                    <div><strong>Colors:</strong> {analysis.visual_identity_aesthetic?.color_palette?.join(', ')}</div>
                                                    <div><strong>Image Style:</strong> {analysis.visual_identity_aesthetic?.image_style}</div>
                                                    <div><strong>Mood:</strong> {analysis.visual_identity_aesthetic?.mood}</div>
                                                    <div><strong>Look:</strong> {analysis.visual_identity_aesthetic?.look}</div>
                                                </CardContent>
                                            </Card>

                                            <Card>
                                                <CardHeader>
                                                    <CardTitle className="text-sm">Claims Analysis</CardTitle>
                                                </CardHeader>
                                                <CardContent className="space-y-3">
                                                    <div>
                                                        <strong>Bold Claims:</strong>
                                                        <ul className="list-disc list-inside mt-1 text-sm">
                                                            {analysis.claims_promises_analysis?.bold_claims?.map((c: string, i: number) => (
                                                                <li key={i}>{c}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                    <div>
                                                        <strong>Risk Level:</strong> <Badge>{analysis.claims_promises_analysis?.risk_assessment?.risk_level}</Badge>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </TabsContent>

                                        {/* Advertising Tab */}
                                        <TabsContent value="ads" className="space-y-4 mt-0">
                                            {!analysis.ads_data || (analysis.ads_data as any).error === 'auth_failed' ? (
                                                <div className="text-center p-12 text-muted-foreground">
                                                    {(analysis.ads_data as any)?.error === 'auth_failed' ? (
                                                        <>
                                                            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-amber-500" />
                                                            <p className="font-medium text-amber-600">Meta Connection Error</p>
                                                            <p className="text-xs mt-2 mb-4 max-w-xs mx-auto">
                                                                Your Meta Ad Account credentials have expired or are invalid.
                                                                Please reconnect your account to fetch ad data.
                                                            </p>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Monitor className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                                            <p>No advertising data available for this competitor.</p>
                                                            <p className="text-xs mt-2 mb-4">This usually means the Meta Integration is missing or the scan hasn't been run.</p>
                                                        </>
                                                    )}
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => window.open('/settings/integrations', '_blank')}
                                                    >
                                                        Check Integrations
                                                    </Button>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="grid grid-cols-3 gap-4">
                                                        <Card>
                                                            <CardHeader className="pb-2">
                                                                <CardTitle className="text-sm font-medium">Active Ads</CardTitle>
                                                            </CardHeader>
                                                            <CardContent>
                                                                <div className="text-2xl font-bold">{analysis.ads_data.total_ads_found}</div>
                                                                <p className="text-xs text-muted-foreground">Currently running</p>
                                                            </CardContent>
                                                        </Card>
                                                        <Card>
                                                            <CardHeader className="pb-2">
                                                                <CardTitle className="text-sm font-medium">Frequency</CardTitle>
                                                            </CardHeader>
                                                            <CardContent>
                                                                <div className="text-2xl font-bold">{analysis.ads_data.ad_frequency}</div>
                                                                <p className="text-xs text-muted-foreground">Ad volume</p>
                                                            </CardContent>
                                                        </Card>
                                                        <Card>
                                                            <CardHeader className="pb-2">
                                                                <CardTitle className="text-sm font-medium">Platforms</CardTitle>
                                                            </CardHeader>
                                                            <CardContent>
                                                                <div className="flex flex-wrap gap-1">
                                                                    {analysis.ads_data.ad_platforms?.map((p: string) => (
                                                                        <Badge key={p} variant="secondary" className="text-[10px]">{p}</Badge>
                                                                    ))}
                                                                </div>
                                                            </CardContent>
                                                        </Card>
                                                    </div>

                                                    <Card>
                                                        <CardHeader>
                                                            <CardTitle className="text-sm">Ad Strategy</CardTitle>
                                                        </CardHeader>
                                                        <CardContent className="space-y-4">
                                                            <div>
                                                                <strong>Themes:</strong>
                                                                <div className="flex flex-wrap gap-2 mt-2">
                                                                    {analysis.ads_data.ad_copy_themes?.map((theme: string, i: number) => (
                                                                        <Badge key={i} variant="outline" className="text-xs font-normal max-w-full whitespace-pre-wrap text-left p-2 h-auto block">{theme.slice(0, 100)}...</Badge>
                                                                    ))}
                                                                </div>
                                                            </div>

                                                            <div>
                                                                <strong>Headlines:</strong>
                                                                <ul className="list-disc list-inside mt-2 text-sm text-muted-foreground">
                                                                    {analysis.ads_data.common_headlines?.map((h: string, i: number) => (
                                                                        <li key={i}>{h}</li>
                                                                    ))}
                                                                </ul>
                                                            </div>

                                                            <div className="pt-2 border-t mt-4">
                                                                <p className="text-xs text-muted-foreground italic">
                                                                    "{analysis.ads_data.competitive_advantage}"
                                                                </p>
                                                            </div>
                                                        </CardContent>
                                                    </Card>

                                                    {analysis.ads_data.raw_ads && analysis.ads_data.raw_ads.length > 0 && (
                                                        <div className="grid grid-cols-2 gap-4">
                                                            {analysis.ads_data.raw_ads.slice(0, 12).map((ad: any) => (
                                                                <Card key={ad.id} className="overflow-hidden">
                                                                    {ad.ad_snapshot_url ? (
                                                                        <div className="aspect-video bg-muted relative group">
                                                                            <iframe
                                                                                src={ad.ad_snapshot_url}
                                                                                className="w-full h-full border-0 pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity"
                                                                                sandbox=""
                                                                            />
                                                                            <div className="absolute inset-0 flex items-center justify-center">
                                                                                <a
                                                                                    href={ad.ad_snapshot_url}
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                    className="bg-background/80 hover:bg-background text-foreground px-3 py-1.5 rounded-full text-xs font-medium shadow-sm transition-colors border"
                                                                                >
                                                                                    View Ad
                                                                                </a>
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="aspect-video bg-muted flex items-center justify-center text-muted-foreground text-xs">
                                                                            No Preview
                                                                        </div>
                                                                    )}
                                                                    <div className="p-3">
                                                                        <p className="text-xs font-medium line-clamp-1">{ad.ad_creative_link_titles?.[0] || 'Untitled Ad'}</p>
                                                                        <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">
                                                                            {ad.ad_creative_bodies?.[0]}
                                                                        </p>
                                                                    </div>
                                                                </Card>
                                                            ))}
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </TabsContent>

                                        {/* Weaknesses Tab */}
                                        <TabsContent value="weaknesses" className="space-y-4 mt-0">
                                            <Card className="border-red-200 bg-red-50">
                                                <CardHeader>
                                                    <CardTitle className="flex items-center gap-2 text-red-700">
                                                        <AlertTriangle className="w-5 h-5" /> Weaknesses Detected
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="space-y-4">
                                                    <div>
                                                        <strong>Bad Review Themes:</strong>
                                                        <ul className="list-disc list-inside mt-2 space-y-1">
                                                            {analysis.weakness_detection?.bad_review_themes?.map((t: string, i: number) => (
                                                                <li key={i}>{t}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                    <div>
                                                        <strong>Complaint Patterns:</strong>
                                                        <ul className="list-disc list-inside mt-2 space-y-1">
                                                            {analysis.weakness_detection?.complaint_patterns?.map((c: string, i: number) => (
                                                                <li key={i}>{c}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                    <div>
                                                        <strong>Confusing Messaging:</strong>
                                                        <p className="text-sm text-red-800 mt-1">{analysis.weakness_detection?.confusing_messaging?.join(', ')}</p>
                                                    </div>
                                                </CardContent>
                                            </Card>

                                            <Card>
                                                <CardHeader>
                                                    <CardTitle className="text-sm">Trust & Authority Gaps</CardTitle>
                                                </CardHeader>
                                                <CardContent className="space-y-2 text-sm">
                                                    <div>
                                                        <strong>Reviews Volume:</strong> {analysis.trust_authority_signals?.reviews_volume}
                                                    </div>
                                                    <div>
                                                        <strong>Reviews Quality:</strong> {analysis.trust_authority_signals?.reviews_quality}
                                                    </div>
                                                </CardContent>
                                            </Card>

                                            <Card>
                                                <CardHeader>
                                                    <CardTitle className="text-sm flex items-center gap-2">
                                                        <AlertCircle className="w-4 h-4" /> Compliance Risks
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <div>
                                                        <strong>Risky Claims:</strong>
                                                        <ul className="list-disc list-inside mt-1 text-sm">
                                                            {analysis.compliance_risk?.risky_claims?.map((c: string, i: number) => (
                                                                <li key={i}>{c}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </TabsContent>

                                        {/* Strategy Tab */}
                                        <TabsContent value="strategy" className="space-y-4 mt-0">
                                            <Card className="border-2 border-green-500 bg-gradient-to-br from-green-50 to-emerald-50">
                                                <CardHeader>
                                                    <CardTitle className="flex items-center gap-2 text-green-700">
                                                        <Crosshair className="w-5 h-5" /> Strategic Opportunities
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="space-y-4">
                                                    <div>
                                                        <strong className="text-green-700">Market Gaps:</strong>
                                                        <ul className="list-disc list-inside mt-2 space-y-1">
                                                            {analysis.strategic_insight_synthesis?.market_gaps?.map((g: string, i: number) => (
                                                                <li key={i}>{g}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                    <div>
                                                        <strong className="text-green-700">Positioning Opportunities:</strong>
                                                        <ul className="list-disc list-inside mt-2 space-y-1">
                                                            {analysis.strategic_insight_synthesis?.positioning_opportunities?.map((o: string, i: number) => (
                                                                <li key={i}>{o}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                    <div>
                                                        <strong className="text-green-700">Messaging Opportunities:</strong>
                                                        <ul className="list-disc list-inside mt-2 space-y-1">
                                                            {analysis.strategic_insight_synthesis?.messaging_opportunities?.map((m: string, i: number) => (
                                                                <li key={i}>{m}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                </CardContent>
                                            </Card>

                                            <Card className="border-2 border-purple-500 bg-gradient-to-br from-purple-50 to-pink-50">
                                                <CardHeader>
                                                    <CardTitle className="flex items-center gap-2 text-purple-700">
                                                        <Swords className="w-5 h-5" /> Integration into YOUR Brand
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="space-y-3 text-sm">
                                                    <div>
                                                        <strong>Differentiation Strategy:</strong>
                                                        <p className="text-muted-foreground mt-1">{analysis.integration_into_brand?.differentiation_strategy?.join(', ')}</p>
                                                    </div>
                                                    <div>
                                                        <strong>Positioning Angle:</strong>
                                                        <p className="text-muted-foreground mt-1">{analysis.integration_into_brand?.positioning_angle}</p>
                                                    </div>
                                                    <div>
                                                        <strong>Voice Contrast:</strong>
                                                        <p className="text-muted-foreground mt-1">{analysis.integration_into_brand?.voice_contrast}</p>
                                                    </div>
                                                    <div>
                                                        <strong>Offer Strategy:</strong>
                                                        <p className="text-muted-foreground mt-1">{analysis.integration_into_brand?.offer_strategy?.join(', ')}</p>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </TabsContent>
                                    </ScrollArea>
                                </Tabs>
                            </Card>
                        ) : (
                            <div className="h-full flex items-center justify-center text-muted-foreground bg-muted/20 rounded-xl border-2 border-dashed">
                                <div className="text-center">
                                    <Target className="w-16 h-16 mx-auto mb-4 opacity-20" />
                                    <p className="text-lg font-semibold">No Competitor Selected</p>
                                    <p className="text-sm mt-2">Select a competitor or scan a new one</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div >
            </div >
        </Shell >
    );
}
