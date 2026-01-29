'use client';

import { useState, useEffect } from "react";
import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Save, Palette, Type, MessageSquare, Shield, FileText, Globe, Target, TrendingUp, DollarSign, Users, Package, AlertTriangle, Layers, Award, MessageCircle, Smartphone, Rocket, BarChart3, Bot, ImageIcon } from "lucide-react";
import { useProject } from "@/contexts/ProjectContext";
import { toast } from "sonner";
import { PageLoading } from "@/components/ui/page-loading";

function hexToRgbDisplay(hex: string): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r}, ${g}, ${b}`;
}

export default function UnifiedBrandIdentityPage() {
    const { currentProject, updateBrandIdentity, refreshProjects, loading } = useProject();
    
    // Show loading only if project context is loading and we don't have currentProject yet
    if (loading && !currentProject) {
        return (
            <Shell>
                <PageLoading message="Loading brand identity..." />
            </Shell>
        );
    }
    const [analyzing, setAnalyzing] = useState(false);
    const [analysisStage, setAnalysisStage] = useState("");
    const [progress, setProgress] = useState(0);
    const [data, setData] = useState<any>({});
    const [activeTab, setActiveTab] = useState("identity");
    
    // Initialize all 19 modules in data structure
    useEffect(() => {
        if (currentProject?.brandIdentity) {
            setData(currentProject.brandIdentity);
        }
    }, [currentProject]);

    // Load existing brand identity
    useEffect(() => {
        if (currentProject?.brandIdentity) {
            setData(currentProject.brandIdentity);
        }
    }, [currentProject]);

    const handleAnalyzeWebsite = async () => {
        if (!currentProject?.id) {
            toast.error("No project selected");
            return;
        }

        setAnalyzing(true);
        setProgress(0);

        // Progress simulation
        setAnalysisStage("🌐 Scraping your website...");
        setProgress(10);

        setTimeout(() => {
            setAnalysisStage("🎨 Extracting colors, logo, and fonts...");
            setProgress(30);
        }, 3000);

        setTimeout(() => {
            setAnalysisStage("📊 Analyzing content and tone...");
            setProgress(50);
        }, 8000);

        setTimeout(() => {
            setAnalysisStage("🧠 AI enhancing brand identity...");
            setProgress(70);
        }, 15000);

        setTimeout(() => {
            setAnalysisStage("✨ Finalizing visual intelligence...");
            setProgress(90);
        }, 25000);

        try {
            const response = await fetch('/api/brand/analyze-website', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId: currentProject.id })
            });

            const result = await response.json();

            if (response.ok) {
                setProgress(100);
                setAnalysisStage("✅ Brand Identity Complete!");
                
                console.log('✅ Analysis successful, refreshing data...');
                console.log(`📊 Stats: ${result.stats.colorsFound} colors, ${result.stats.fontsFound} fonts`);
                
                // Merge with existing data to preserve any manually entered fields
                const mergedData = { ...data, ...result.brandIdentity };
                setData(mergedData);
                await updateBrandIdentity(mergedData);
                
                // Refresh project data from database
                await refreshProjects();
                
                toast.success(`✅ Analysis Complete! Found ${result.stats.colorsFound} colors, ${result.stats.fontsFound} fonts, logo: ${result.stats.logoFound ? 'Yes' : 'No'}`);
                
                setTimeout(() => {
                    setAnalyzing(false);
                    setAnalysisStage("");
                    setProgress(0);
                }, 1500);
            } else {
                console.error('❌ Analysis failed:', result.error);
                toast.error("❌ Analysis Failed: " + result.error);
                setAnalyzing(false);
            }
        } catch (error: any) {
            toast.error("Error: " + error.message);
            setAnalyzing(false);
        }
    };

    const handleSave = () => {
        updateBrandIdentity(data);
        toast.success("✅ Brand Identity Saved!");
    };

    const updateField = (section: string, field: string, value: any) => {
        const sectionData = data[section] || {};
        setData({
            ...data,
            [section]: { ...sectionData, [field]: value }
        });
    };

    const updateArrayField = (section: string, field: string, value: string) => {
        const sectionData = data[section] || {};
        const array = value.split('\n').filter(v => v.trim());
        setData({
            ...data,
            [section]: { ...sectionData, [field]: array }
        });
    };

    const renderInput = (section: string, field: string, label: string, placeholder?: string) => (
        <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase">{label}</label>
            <Input
                value={data[section]?.[field] || ""}
                onChange={(e) => updateField(section, field, e.target.value)}
                placeholder={placeholder}
                className="bg-white"
            />
        </div>
    );

    const renderTextarea = (section: string, field: string, label: string, rows = 3) => (
        <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase">{label}</label>
            <Textarea
                value={data[section]?.[field] || ""}
                onChange={(e) => updateField(section, field, e.target.value)}
                className="bg-white"
                rows={rows}
            />
        </div>
    );

    return (
        <Shell>
            {/* Animated Progress Overlay */}
            {analyzing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
                    <div className="text-center text-white space-y-6 max-w-md px-6">
                        <Loader2 className="w-20 h-20 animate-spin text-indigo-400 mx-auto" />
                        <h3 className="text-3xl font-bold text-indigo-200">
                            Analyzing Your Brand...
                        </h3>
                        <p className="text-xl text-indigo-100">{analysisStage}</p>
                        <Progress 
                            value={progress} 
                            className="w-full h-3 bg-indigo-900/50"
                        />
                        <p className="text-sm text-indigo-300">
                            {Math.round(progress)}% Complete
                        </p>
                        <p className="text-xs text-indigo-400/70">
                            This typically takes 30-60 seconds
                        </p>
                    </div>
                </div>
            )}

            <div className="max-w-6xl mx-auto space-y-6 pb-20">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-display font-bold">Brand Identity System</h1>
                        <p className="text-muted-foreground">Your complete brand intelligence in one place</p>
                    </div>
                    <div className="flex gap-2">
                        <Button 
                            onClick={handleAnalyzeWebsite}
                            disabled={analyzing}
                            className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
                        >
                            {analyzing ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Analyzing...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    Analyze My Website
                                </>
                            )}
                        </Button>
                        <Button variant="outline" onClick={handleSave}>
                            <Save className="w-4 h-4 mr-2" />
                            Save
                        </Button>
                    </div>
                </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-6 h-auto p-1 bg-muted/50 gap-1">
                        <TabsTrigger value="identity" className="flex flex-col items-center gap-1 py-2 px-2">
                            <FileText className="w-4 h-4" />
                            <span className="text-[10px] leading-tight text-center">Brand<br/>Identity</span>
                        </TabsTrigger>
                        <TabsTrigger value="visual" className="flex flex-col items-center gap-1 py-2 px-2">
                            <Palette className="w-4 h-4" />
                            <span className="text-[10px] leading-tight text-center">Visual<br/>Identity</span>
                        </TabsTrigger>
                        <TabsTrigger value="voice" className="flex flex-col items-center gap-1 py-2 px-2">
                            <MessageSquare className="w-4 h-4" />
                            <span className="text-[10px] leading-tight text-center">Voice &<br/>Tone</span>
                        </TabsTrigger>
                        <TabsTrigger value="strategy" className="flex flex-col items-center gap-1 py-2 px-2">
                            <Target className="w-4 h-4" />
                            <span className="text-[10px] leading-tight text-center">Strategy &<br/>Story</span>
                        </TabsTrigger>
                        <TabsTrigger value="trust" className="flex flex-col items-center gap-1 py-2 px-2">
                            <Users className="w-4 h-4" />
                            <span className="text-[10px] leading-tight text-center">Trust &<br/>Community</span>
                        </TabsTrigger>
                        <TabsTrigger value="growth" className="flex flex-col items-center gap-1 py-2 px-2">
                            <TrendingUp className="w-4 h-4" />
                            <span className="text-[10px] leading-tight text-center">Growth &<br/>Rules</span>
                        </TabsTrigger>
                    </TabsList>

                    {/* Tab 1: Brand Identity */}
                    <TabsContent value="identity" className="space-y-6 mt-6">
                        <Accordion type="multiple" defaultValue={["dna", "product", "audience"]} className="space-y-4">
                            
                            {/* 1. Brand DNA */}
                            <AccordionItem value="dna" className="border rounded-lg bg-card px-4">
                                <AccordionTrigger className="hover:no-underline">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-md bg-blue-100 text-blue-600"><FileText className="w-5 h-5" /></div>
                                        <div className="text-left">
                                            <div className="font-bold text-lg">Brand DNA</div>
                                            <div className="text-xs text-muted-foreground font-normal">Core identity and purpose</div>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="space-y-4 pt-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        {renderInput("dna", "name", "Brand Name")}
                                        {renderInput("dna", "problem_solved", "Core Problem Solved")}
                                    </div>
                                    {renderTextarea("dna", "origin_story", "Origin Story", 3)}
                                    {renderTextarea("dna", "mission", "Mission & Stand", 2)}
                                    {renderTextarea("dna", "vision", "Vision (10-Year)", 2)}
                                    {renderTextarea("dna", "world_problem", "World Problem You're Solving", 2)}
                                    {renderTextarea("dna", "emotional_outcome", "Emotional Outcome for Customers", 2)}
                                    <div className="grid grid-cols-2 gap-4">
                                        {renderInput("dna", "differentiator", "Main Differentiator")}
                                        {renderInput("dna", "anti_identity", "Anti-Identity (Never associated with)")}
                                    </div>
                                    {renderTextarea("dna", "values", "Core Values (comma separated)", 2)}
                                    {renderTextarea("dna", "ethical_boundaries", "Ethical Boundaries (line separated)", 2)}
                                    {renderTextarea("dna", "standards", "Standards (line separated)", 2)}
                                    {renderTextarea("dna", "ten_year_identity", "10-Year Identity", 2)}
                                </AccordionContent>
                            </AccordionItem>

                            {/* 2. Product Deep Dive */}
                            <AccordionItem value="product" className="border rounded-lg bg-card px-4">
                                <AccordionTrigger className="hover:no-underline">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-md bg-emerald-100 text-emerald-600"><FileText className="w-5 h-5" /></div>
                                        <div className="text-left">
                                            <div className="font-bold text-lg">Product Intelligence</div>
                                            <div className="text-xs text-muted-foreground font-normal">Know your product better than anyone</div>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="space-y-4 pt-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        {renderInput("product", "name", "Top Product Name")}
                                        {renderInput("product", "category", "Category")}
                                    </div>
                                    {renderTextarea("product", "main_benefits", "Main Benefits", 3)}
                                    {renderTextarea("product", "unique_features", "Unique Features / Ingredients", 3)}
                                    <div className="grid grid-cols-3 gap-4">
                                        {renderInput("product", "quality_level", "Quality Level")}
                                        {renderInput("product", "price_point", "Price Positioning")}
                                        {renderInput("product", "why_choose_us", "Why Choose Us?")}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>

                            {/* 3. Target Audience */}
                            <AccordionItem value="audience" className="border rounded-lg bg-card px-4">
                                <AccordionTrigger className="hover:no-underline">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-md bg-rose-100 text-rose-600"><Users className="w-5 h-5" /></div>
                                        <div className="text-left">
                                            <div className="font-bold text-lg">Target Audience</div>
                                            <div className="text-xs text-muted-foreground font-normal">Buyer Psychology & Demographics</div>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="space-y-4 pt-4">
                                    {renderTextarea("audience", "ideal_customer", "Ideal Customer Description", 3)}
                                    <div className="grid grid-cols-3 gap-4">
                                        {renderInput("audience", "pain_points", "Pain Points")}
                                        {renderInput("audience", "desires", "Deep Desires")}
                                        {renderInput("audience", "fears", "Fears & Frustrations")}
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        {renderInput("audience", "shopping_behavior", "Shopping Behavior")}
                                        {renderInput("audience", "influences", "Who Influences Them?")}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>

                            {/* 4. Strategic Positioning */}
                            <AccordionItem value="positioning" className="border rounded-lg bg-card px-4">
                                <AccordionTrigger className="hover:no-underline">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-md bg-amber-100 text-amber-600"><Target className="w-5 h-5" /></div>
                                        <div className="text-left">
                                            <div className="font-bold text-lg">Strategic Positioning</div>
                                            <div className="text-xs text-muted-foreground font-normal">Where you sit in the market</div>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="space-y-4 pt-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        {renderInput("positioning", "market_category", "Market Category")}
                                        {renderInput("positioning", "sub_category", "Sub-Category")}
                                    </div>
                                    {renderTextarea("positioning", "target_audience", "Target Audience", 2)}
                                    {renderTextarea("positioning", "not_for", "Not For (line separated)", 2)}
                                    {renderInput("positioning", "remembered_for", "Want to be Remembered For")}
                                    {renderInput("positioning", "dominant_idea", "Dominant Brand Idea")}
                                </AccordionContent>
                            </AccordionItem>

                            {/* 5. Market & Competition */}
                            <AccordionItem value="market" className="border rounded-lg bg-card px-4">
                                <AccordionTrigger className="hover:no-underline">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-md bg-amber-100 text-amber-600"><Globe className="w-5 h-5" /></div>
                                        <div className="text-left">
                                            <div className="font-bold text-lg">Market & Competition</div>
                                            <div className="text-xs text-muted-foreground font-normal">Competitive landscape</div>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="space-y-4 pt-4">
                                    {renderTextarea("market", "competitors", "Top Competitors", 3)}
                                    <div className="grid grid-cols-2 gap-4">
                                        {renderInput("market", "positioning", "Positioning (Cheaper, Better, etc)")}
                                        {renderInput("market", "market_gap", "What is Missing in Market?")}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>

                            {/* 6. Offer Structure */}
                            <AccordionItem value="offer" className="border rounded-lg bg-card px-4">
                                <AccordionTrigger className="hover:no-underline">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-md bg-purple-100 text-purple-600"><DollarSign className="w-5 h-5" /></div>
                                        <div className="text-left">
                                            <div className="font-bold text-lg">Offer Structure</div>
                                            <div className="text-xs text-muted-foreground font-normal">Economics and pricing</div>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="space-y-4 pt-4">
                                    <div className="grid grid-cols-3 gap-4">
                                        {renderInput("offer", "price_strategy", "Price Strategy")}
                                        {renderInput("offer", "bundles", "Offers Bundles?")}
                                        {renderInput("offer", "subscriptions", "Offers Subscriptions?")}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>

                            {/* 7. Customer Journey */}
                            <AccordionItem value="journey" className="border rounded-lg bg-card px-4">
                                <AccordionTrigger className="hover:no-underline">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-md bg-cyan-100 text-cyan-600"><TrendingUp className="w-5 h-5" /></div>
                                        <div className="text-left">
                                            <div className="font-bold text-lg">Customer Journey</div>
                                            <div className="text-xs text-muted-foreground font-normal">How they discover and buy</div>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="space-y-4 pt-4">
                                    {renderTextarea("journey", "discovery", "Discovery Channels", 3)}
                                    {renderTextarea("journey", "hesitation", "Where do they hesitate?", 3)}
                                    {renderInput("journey", "after_purchase", "Post-Purchase Experience")}
                                </AccordionContent>
                            </AccordionItem>

                        </Accordion>
                    </TabsContent>

                    {/* Tab 2: Visual Identity */}
                    <TabsContent value="visual" className="space-y-6 mt-6">
                        {/* Colors */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Brand Colors</CardTitle>
                                <CardDescription>Your extracted color palette with psychology</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Primary Colors */}
                                {data?.visual?.colors?.primary && data.visual.colors.primary.length > 0 && (
                                    <div className="space-y-3">
                                        <h4 className="font-medium flex items-center gap-2">
                                            Primary Brand Colors
                                            <Badge variant="secondary">{data.visual.colors.primary.length} colors</Badge>
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {data.visual.colors.primary.map((color: any, i: number) => (
                                                <div key={i} className="p-4 border rounded-lg space-y-3 bg-white">
                                                    <div className="flex items-center gap-3">
                                                        <div 
                                                            className="w-16 h-16 rounded-lg border-2 border-gray-300 flex-shrink-0"
                                                            style={{ backgroundColor: color.hex }}
                                                            title={color.hex}
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-medium truncate">{color.name}</p>
                                                            <p className="text-sm font-mono text-muted-foreground">{color.hex}</p>
                                                            <p className="text-xs text-muted-foreground mt-1">RGB: {hexToRgbDisplay(color.hex)}</p>
                                                        </div>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground">{color.psychology}</p>
                                                    <p className="text-xs text-blue-600">Usage: {color.usage}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Secondary Colors */}
                                {data?.visual?.colors?.secondary && data.visual.colors.secondary.length > 0 && (
                                    <div className="space-y-3">
                                        <h4 className="font-medium flex items-center gap-2">
                                            Secondary Colors
                                            <Badge variant="secondary">{data.visual.colors.secondary.length}</Badge>
                                        </h4>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            {data.visual.colors.secondary.map((color: any, i: number) => (
                                                <div key={i} className="p-3 border rounded-lg">
                                                    <div 
                                                        className="w-full h-16 rounded-lg border-2 border-gray-300 mb-2"
                                                        style={{ backgroundColor: color.hex }}
                                                    />
                                                    <p className="text-sm font-medium">{color.name}</p>
                                                    <p className="text-xs text-muted-foreground">{color.hex}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Typography */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Type className="w-5 h-5" />
                                    Typography
                                </CardTitle>
                                <CardDescription>Fonts detected from your website</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {data?.visual?.typography?.headings && data.visual.typography.headings.length > 0 ? (
                                    data.visual.typography.headings.map((font: any, i: number) => (
                                        <div key={i} className="p-4 border rounded-lg space-y-2">
                                            <div className="flex items-center justify-between">
                                                <h4 className="font-medium">Heading Font</h4>
                                                <Badge className="text-sm">{font.family}</Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground">{font.personality}</p>
                                            <p className="text-xs text-muted-foreground">Usage: {font.usage}</p>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-muted-foreground">Click "Analyze My Website" to detect fonts</p>
                                )}
                                {data?.visual?.typography?.body && data.visual.typography.body.length > 0 ? (
                                    data.visual.typography.body.map((font: any, i: number) => (
                                        <div key={i} className="p-4 border rounded-lg space-y-2">
                                            <div className="flex items-center justify-between">
                                                <h4 className="font-medium">Body Font</h4>
                                                <Badge variant="outline" className="text-sm">{font.family}</Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground">{font.personality}</p>
                                            <p className="text-xs text-muted-foreground">Usage: {font.usage}</p>
                                        </div>
                                    ))
                                ) : null}
                            </CardContent>
                        </Card>

                        {/* Logo */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Logo</CardTitle>
                                <CardDescription>Your brand logo extracted from website</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {data?.visual?.logo?.url ? (
                                    <div className="space-y-4">
                                        <div className="p-6 border rounded-lg bg-white">
                                            <div className="flex items-center justify-center min-h-[120px] bg-gray-50 rounded-lg p-4">
                                                <img 
                                                    src={data.visual.logo.url} 
                                                    alt="Brand Logo" 
                                                    className="max-h-24 w-auto object-contain"
                                                    onError={(e) => {
                                                        const target = e.target as HTMLImageElement;
                                                        target.style.display = 'none';
                                                        const parent = target.parentElement;
                                                        if (parent) {
                                                            parent.innerHTML = `
                                                                <div class="text-center">
                                                                    <p class="text-sm text-red-600 font-medium">⚠️ Logo image failed to load</p>
                                                                    <p class="text-xs text-muted-foreground mt-1">The URL might be invalid or inaccessible</p>
                                                                </div>
                                                            `;
                                                        }
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <Badge variant="outline" className="text-xs">
                                                    {data.visual.logo.source || 'extracted'}
                                                </Badge>
                                                <span>•</span>
                                                <span>Detected from website</span>
                                            </div>
                                            
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Logo URL (you can edit)</label>
                                                <Input
                                                    value={data.visual.logo.url}
                                                    onChange={(e) => {
                                                        const newData = { ...data };
                                                        if (!newData.visual) newData.visual = {};
                                                        if (!newData.visual.logo) newData.visual.logo = {};
                                                        newData.visual.logo.url = e.target.value;
                                                        setData(newData);
                                                    }}
                                                    placeholder="https://example.com/logo.png"
                                                    className="text-xs font-mono"
                                                />
                                                <p className="text-xs text-muted-foreground">
                                                    Paste a direct link to your logo image (PNG, JPG, SVG)
                                                </p>
                                            </div>

                                            {data.visual.logo.description && (
                                                <div className="space-y-1">
                                                    <label className="text-sm font-medium">AI Description</label>
                                                    <p className="text-sm text-muted-foreground p-3 bg-gray-50 rounded">
                                                        {data.visual.logo.description}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-12 border-2 border-dashed rounded-lg bg-gray-50">
                                        <div className="space-y-3">
                                            <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto flex items-center justify-center">
                                                <Palette className="w-8 h-8 text-gray-400" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-muted-foreground">No logo detected yet</p>
                                                <p className="text-xs text-muted-foreground mt-1">Click "Analyze My Website" above to extract your logo</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Image Style & Mood */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Visual Style</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {renderTextarea("visual", "image_style", "Image Style", 2)}
                                {renderTextarea("visual", "mood", "Visual Mood", 2)}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Tab 3: Voice & Tone */}
                    <TabsContent value="voice" className="space-y-6 mt-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Voice Characteristics</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {renderInput("voice", "vocabulary_style", "Vocabulary Style")}
                                <div className="grid grid-cols-2 gap-4">
                                    {renderInput("voice", "humor_level", "Humor Level")}
                                    {renderInput("voice", "authority_level", "Authority Level")}
                                </div>
                                {renderTextarea("voice", "emotional_range", "Emotional Range", 2)}
                                {renderTextarea("voice", "personality_traits", "Personality Traits (line separated)", 3)}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Language Guidelines</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-green-600">Words to Use</label>
                                    <Textarea
                                        value={data?.voice?.words_to_use?.join('\n') || ""}
                                        onChange={(e) => updateArrayField('voice', 'words_to_use', e.target.value)}
                                        placeholder="One per line..."
                                        rows={3}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-red-600">Words to Avoid</label>
                                    <Textarea
                                        value={data?.voice?.words_to_avoid?.join('\n') || ""}
                                        onChange={(e) => updateArrayField('voice', 'words_to_avoid', e.target.value)}
                                        placeholder="One per line..."
                                        rows={3}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-blue-600">On-Brand Phrases</label>
                                    <Textarea
                                        value={data?.voice?.on_brand_phrases?.join('\n') || ""}
                                        onChange={(e) => updateArrayField('voice', 'on_brand_phrases', e.target.value)}
                                        placeholder="One per line..."
                                        rows={3}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-red-600">Forbidden Phrases</label>
                                    <Textarea
                                        value={data?.voice?.forbidden_phrases?.join('\n') || ""}
                                        onChange={(e) => updateArrayField('voice', 'forbidden_phrases', e.target.value)}
                                        placeholder="One per line..."
                                        rows={3}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Tab 2: Strategy & Story */}
                    <TabsContent value="strategy" className="space-y-6 mt-6">
                        <Accordion type="multiple" defaultValue={["narrative", "pain_matrix"]} className="space-y-4">
                            
                            {/* Narrative Architecture */}
                            <AccordionItem value="narrative" className="border rounded-lg bg-card px-4">
                                <AccordionTrigger className="hover:no-underline">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-md bg-purple-100 text-purple-600"><MessageSquare className="w-5 h-5" /></div>
                                        <div className="text-left">
                                            <div className="font-bold text-lg">Narrative Architecture</div>
                                            <div className="text-xs text-muted-foreground font-normal">Story engine and brand storytelling</div>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="space-y-4 pt-4">
                                    {renderTextarea("narrative", "hero", "The Hero (Customer)", 2)}
                                    {renderTextarea("narrative", "villain", "The Villain (Problem)", 2)}
                                    {renderTextarea("narrative", "guide", "The Guide (Brand)", 2)}
                                    {renderTextarea("narrative", "transformation", "The Transformation", 2)}
                                    {renderTextarea("narrative", "outcome", "The Outcome", 2)}
                                </AccordionContent>
                            </AccordionItem>

                            {/* Pain Matrix */}
                            <AccordionItem value="pain_matrix" className="border rounded-lg bg-card px-4">
                                <AccordionTrigger className="hover:no-underline">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-md bg-red-100 text-red-600"><AlertTriangle className="w-5 h-5" /></div>
                                        <div className="text-left">
                                            <div className="font-bold text-lg">Problem Matrix & Pain Hierarchy</div>
                                            <div className="text-xs text-muted-foreground font-normal">Deep customer pain analysis</div>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="space-y-4 pt-4">
                                    {renderTextarea("pain_matrix", "physical_problems", "Physical Problems", 2)}
                                    {renderTextarea("pain_matrix", "emotional_problems", "Emotional Problems", 2)}
                                    {renderTextarea("pain_matrix", "social_problems", "Social Problems", 2)}
                                    {renderTextarea("pain_matrix", "financial_problems", "Financial Problems", 2)}
                                    {renderTextarea("pain_matrix", "identity_problems", "Identity Problems", 2)}
                                </AccordionContent>
                            </AccordionItem>

                            {/* Content Pillars */}
                            <AccordionItem value="content_pillars" className="border rounded-lg bg-card px-4">
                                <AccordionTrigger className="hover:no-underline">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-md bg-indigo-100 text-indigo-600"><Layers className="w-5 h-5" /></div>
                                        <div className="text-left">
                                            <div className="font-bold text-lg">Content Pillar System</div>
                                            <div className="text-xs text-muted-foreground font-normal">Strategic content themes</div>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="space-y-4 pt-4">
                                    {renderTextarea("content_pillars", "pillar_1", "Pillar 1 (Name & Purpose)", 2)}
                                    {renderTextarea("content_pillars", "pillar_2", "Pillar 2 (Name & Purpose)", 2)}
                                    {renderTextarea("content_pillars", "pillar_3", "Pillar 3 (Name & Purpose)", 2)}
                                    {renderTextarea("content_pillars", "pillar_4", "Pillar 4 (Optional)", 2)}
                                </AccordionContent>
                            </AccordionItem>

                        </Accordion>
                    </TabsContent>

                    {/* Tab 6: Trust & Community */}
                    <TabsContent value="trust" className="space-y-6 mt-6">
                        <Accordion type="multiple" defaultValue={["trust_infrastructure"]} className="space-y-4">
                            
                            {/* Trust Infrastructure */}
                            <AccordionItem value="trust_infrastructure" className="border rounded-lg bg-card px-4">
                                <AccordionTrigger className="hover:no-underline">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-md bg-green-100 text-green-600"><Award className="w-5 h-5" /></div>
                                        <div className="text-left">
                                            <div className="font-bold text-lg">Trust Infrastructure</div>
                                            <div className="text-xs text-muted-foreground font-normal">Authority signals and social proof</div>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="space-y-4 pt-4">
                                    {renderTextarea("trust_infrastructure", "social_proof_types", "Social Proof Types (line separated)", 2)}
                                    {renderTextarea("trust_infrastructure", "certifications", "Certifications (line separated)", 2)}
                                    {renderTextarea("trust_infrastructure", "partnerships", "Partnerships (line separated)", 2)}
                                    {renderTextarea("trust_infrastructure", "media_mentions", "Media Mentions (line separated)", 2)}
                                    {renderTextarea("trust_infrastructure", "guarantees", "Guarantees (line separated)", 2)}
                                </AccordionContent>
                            </AccordionItem>

                            {/* Community Model */}
                            <AccordionItem value="community_model" className="border rounded-lg bg-card px-4">
                                <AccordionTrigger className="hover:no-underline">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-md bg-pink-100 text-pink-600"><MessageCircle className="w-5 h-5" /></div>
                                        <div className="text-left">
                                            <div className="font-bold text-lg">Community & Relationship Model</div>
                                            <div className="text-xs text-muted-foreground font-normal">How you build relationships</div>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="space-y-4 pt-4">
                                    {renderTextarea("community_model", "customer_treatment_philosophy", "Customer Treatment Philosophy", 2)}
                                    {renderTextarea("community_model", "problem_resolution_protocol", "Problem Resolution Protocol", 2)}
                                    {renderTextarea("community_model", "loyalty_building_tactics", "Loyalty Building Tactics", 2)}
                                    {renderTextarea("community_model", "community_building_strategy", "Community Building Strategy", 2)}
                                </AccordionContent>
                            </AccordionItem>

                            {/* Platform Strategy */}
                            <AccordionItem value="platform_strategy" className="border rounded-lg bg-card px-4">
                                <AccordionTrigger className="hover:no-underline">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-md bg-blue-100 text-blue-600"><Smartphone className="w-5 h-5" /></div>
                                        <div className="text-left">
                                            <div className="font-bold text-lg">Platform & Channel Strategy</div>
                                            <div className="text-xs text-muted-foreground font-normal">Where and how you show up</div>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="space-y-4 pt-4">
                                    {renderTextarea("platform_strategy", "primary_platforms", "Primary Platforms", 2)}
                                    {renderTextarea("platform_strategy", "platform_tone_adjustments", "Platform-Specific Tone Adjustments", 2)}
                                    {renderTextarea("platform_strategy", "content_types_per_platform", "Content Types Per Platform", 2)}
                                </AccordionContent>
                            </AccordionItem>

                        </Accordion>
                    </TabsContent>

                    {/* Tab 7: Growth & Rules */}
                    <TabsContent value="growth" className="space-y-6 mt-6">
                        <Accordion type="multiple" defaultValue={["vision", "guardrails"]} className="space-y-4">
                            
                            {/* Long-Term Vision */}
                            <AccordionItem value="vision" className="border rounded-lg bg-card px-4">
                                <AccordionTrigger className="hover:no-underline">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-md bg-purple-100 text-purple-600"><Rocket className="w-5 h-5" /></div>
                                        <div className="text-left">
                                            <div className="font-bold text-lg">Long-Term Vision & Expansion</div>
                                            <div className="text-xs text-muted-foreground font-normal">Where the brand is going</div>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="space-y-4 pt-4">
                                    {renderTextarea("long_term_vision", "future_products", "Future Products", 2)}
                                    {renderTextarea("long_term_vision", "future_markets", "Future Markets", 2)}
                                    {renderTextarea("long_term_vision", "future_positioning", "Future Positioning", 2)}
                                    {renderTextarea("long_term_vision", "brand_evolution_path", "Brand Evolution Path", 2)}
                                </AccordionContent>
                            </AccordionItem>

                            {/* KPIs & Optimization */}
                            <AccordionItem value="kpis" className="border rounded-lg bg-card px-4">
                                <AccordionTrigger className="hover:no-underline">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-md bg-green-100 text-green-600"><BarChart3 className="w-5 h-5" /></div>
                                        <div className="text-left">
                                            <div className="font-bold text-lg">KPIs & Optimization Logic</div>
                                            <div className="text-xs text-muted-foreground font-normal">Success metrics and goals</div>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="space-y-4 pt-4">
                                    {renderTextarea("kpis_optimization", "success_metrics", "Success Metrics (line separated)", 2)}
                                    {renderTextarea("kpis_optimization", "benchmarks", "Benchmarks", 2)}
                                    {renderTextarea("kpis_optimization", "growth_targets", "Growth Targets", 2)}
                                </AccordionContent>
                            </AccordionItem>

                            {/* AI Autonomy Rules */}
                            <AccordionItem value="ai_autonomy" className="border rounded-lg bg-card px-4">
                                <AccordionTrigger className="hover:no-underline">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-md bg-indigo-100 text-indigo-600"><Bot className="w-5 h-5" /></div>
                                        <div className="text-left">
                                            <div className="font-bold text-lg">AI Autonomy Rules</div>
                                            <div className="text-xs text-muted-foreground font-normal">What AI can decide alone</div>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="space-y-4 pt-4">
                                    {renderTextarea("ai_autonomy_rules", "can_decide_alone", "AI Can Decide Alone (line separated)", 2)}
                                    {renderTextarea("ai_autonomy_rules", "requires_approval", "Requires Approval (line separated)", 2)}
                                    {renderTextarea("ai_autonomy_rules", "forbidden_actions", "Forbidden Actions (line separated)", 2)}
                                    {renderTextarea("ai_autonomy_rules", "escalation_logic", "Escalation Logic", 2)}
                                </AccordionContent>
                            </AccordionItem>

                            {/* Guardrails - MOVED HERE FROM TAB 4 */}
                            <AccordionItem value="guardrails" className="border rounded-lg bg-card px-4">
                                <AccordionTrigger className="hover:no-underline">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-md bg-red-100 text-red-600"><Shield className="w-5 h-5" /></div>
                                        <div className="text-left">
                                            <div className="font-bold text-lg">Brand Guardrails</div>
                                            <div className="text-xs text-muted-foreground font-normal">Boundaries and compliance</div>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="space-y-4 pt-4">
                                    {renderTextarea("guardrails", "regulatory_limits", "Regulatory Limits (line separated)", 2)}
                                    {renderTextarea("guardrails", "cultural_sensitivities", "Cultural Sensitivities (line separated)", 2)}
                                    {renderTextarea("guardrails", "platform_policies", "Platform Policies (line separated)", 2)}
                                    {renderTextarea("guardrails", "forbidden_claims", "Forbidden Claims (line separated)", 2)}
                                </AccordionContent>
                            </AccordionItem>

                        </Accordion>
                    </TabsContent>
                </Tabs>
            </div>
        </Shell>
    );
}
