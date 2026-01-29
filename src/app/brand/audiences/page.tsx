
'use client';

import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Sparkles, Plus, Loader2, ArrowRight, BrainCircuit, Target, Zap, Heart, Repeat, Share2, Package, UserCircle, BookOpen, AlertCircle, TrendingUp, Crosshair } from "lucide-react";
import { useProject } from "@/contexts/ProjectContext";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageLoading } from "@/components/ui/page-loading";

// AUDIENCE INTERFACE
interface StrategicAudience {
    category: 'Cold' | 'Warm' | 'Hot' | 'Lookalike' | 'Retention';
    name: string;
    hook_concept: string;
    pain_points: string[];
    desires: string[];
    identity_upgrade: string;
    meta_interests: string[];
    age_range?: string; // Optional for backward compatibility
    awareness_level: string;
    description: string;
    suggested_products?: string[];
}

export default function AudiencesPage() {
    const { currentProject, loading } = useProject();
    const router = useRouter();

    // AUDIENCE STATE
    const [audiences, setAudiences] = useState<StrategicAudience[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [showGenerateDialog, setShowGenerateDialog] = useState(false);
    const [progress, setProgress] = useState("");
    const [isLoadingData, setIsLoadingData] = useState(true);

    // PERSONA STATE
    const [activeTab, setActiveTab] = useState("audiences");
    const [personas, setPersonas] = useState<Record<string, any>>({}); // Map: AudienceName -> PersonaData
    const [activePersonaGenerations, setActivePersonaGenerations] = useState<string[]>([]); // Array of audience names currently generating

    // --- AUDIENCE GENERATION HANDLER ---
    const handleGenerate = async () => {
        if (!currentProject?.id) return;

        setIsGenerating(true);
        setProgress("🧠 Analyzing Brand DNA & Pain Matrix...");

        const timers = [
            setTimeout(() => setProgress("🔍 Applying 'People with Problems' Framework..."), 5000),
            setTimeout(() => setProgress("🎯 Mapping Psychographics..."), 12000),
            setTimeout(() => setProgress("💡 Generating Strategic Hooks..."), 20000),
        ];

        try {
            const response = await fetch('/api/ai/audience-generator', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId: currentProject.id })
            });

            let data;
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                data = await response.json();
            } else {
                throw new Error("Server returned non-JSON response");
            }

            if (response.ok && data.success) {
                setAudiences(data.audiences);
                setShowGenerateDialog(false);
                toast.success('✅ 5 Strategic Audiences Generated!');
            } else {
                toast.error('Generation Failed: ' + (data.error || 'Unknown error'));
            }
        } catch (error: any) {
            console.error('Failed to generate audience:', error);
            toast.error('Network Error: ' + error.message);
        } finally {
            timers.forEach(clearTimeout);
            setIsGenerating(false);
            setProgress("");
        }
    };

    // --- PERSONA GENERATION HANDLER ---
    const handleGeneratePersona = async (audience: StrategicAudience) => {
        if (!currentProject?.id) return;

        // Add to active set
        setActivePersonaGenerations(prev => [...prev, audience.name]);
        // toast.info(`🤖 Designing persona for: ${audience.name}...`); // Optional: avoid spamming toasts in batch mode

        try {
            const response = await fetch('/api/ai/persona-generator', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: currentProject.id,
                    audienceSegment: audience
                })
            });

            const data = await response.json();

            if (data.success) {
                setPersonas(prev => ({
                    ...prev,
                    [audience.name]: data // Store full result { success, profile, imageUrl }
                }));
                // toast.success(`✨ Created persona: ${data.profile.name}`); // Optional: avoid spamming toasts
            } else {
                toast.error(`Failed to generate persona for ${audience.name}: ` + data.error);
            }
        } catch (error: any) {
            console.error(error);
            toast.error(`Error generating persona for ${audience.name}`);
        } finally {
            // Remove from active set
            setActivePersonaGenerations(prev => prev.filter(name => name !== audience.name));
        }
    };

    // --- BATCH GENERATE PERSONAS ---
    const handleGenerateAllPersonas = async () => {
        if (!audiences.length) return;

        toast.info("🚀 Starting batch generation for all personas...");

        // Filter audiences that don't have personas yet (optional, or just regen all?) 
        // User asked to generate all, usually implies filling gaps or doing all. Let's do all.
        // Parallel execution might be rate limited. Let's try it, 5 requests is usually fine.

        const promises = audiences.map(audience => handleGeneratePersona(audience));
        await Promise.all(promises);

        toast.success("✅ All personas generated!");
    };

    // Load from Project Context on mount or change
    useEffect(() => {
        // If ProjectContext is still loading, wait
        if (loading) {
            setIsLoadingData(true);
            return;
        }
        
        // If we don't have a project yet, keep loading
        if (!currentProject) {
            setIsLoadingData(true);
            return;
        }
        
        // We have a project, load the data
        if (currentProject.brandIdentity) {
            if (currentProject.brandIdentity.audiences && Array.isArray(currentProject.brandIdentity.audiences)) {
                setAudiences(currentProject.brandIdentity.audiences);
            } else {
                setAudiences([]);
            }
            if (currentProject.brandIdentity.personas) {
                setPersonas(currentProject.brandIdentity.personas);
            }
        } else {
            // Project exists but no brandIdentity yet
            setAudiences([]);
        }
        setIsLoadingData(false);
    }, [currentProject, loading]);
    
    // Show loading while project context is loading, no project yet, or while we're loading data
    if (loading || !currentProject || isLoadingData) {
        return (
            <Shell>
                <PageLoading message="Loading audience data..." />
            </Shell>
        );
    }

    const getIconForCategory = (category: string) => {
        switch (category) {
            case 'Cold': return <BrainCircuit className="w-5 h-5 text-blue-500" />;
            case 'Warm': return <Heart className="w-5 h-5 text-pink-500" />;
            case 'Hot': return <Zap className="w-5 h-5 text-amber-500" />;
            case 'Lookalike': return <Users className="w-5 h-5 text-purple-500" />;
            case 'Retention': return <Repeat className="w-5 h-5 text-emerald-500" />;
            default: return <Users className="w-5 h-5" />;
        }
    };

    const getColorForCategory = (category: string) => {
        switch (category) {
            case 'Cold': return "bg-blue-50 border-blue-100 text-blue-700";
            case 'Warm': return "bg-pink-50 border-pink-100 text-pink-700";
            case 'Hot': return "bg-amber-50 border-amber-100 text-amber-700";
            case 'Lookalike': return "bg-purple-50 border-purple-100 text-purple-700";
            case 'Retention': return "bg-emerald-50 border-emerald-100 text-emerald-700";
            default: return "bg-gray-50 border-gray-100 text-gray-700";
        }
    };

    return (
        <Shell>
            <div className="h-[calc(100vh-2rem)] flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Header */}
                <div className="flex items-center justify-between shrink-0">
                    <div>
                        <h1 className="text-3xl font-display font-bold">Strategic Audience Architecture</h1>
                        <p className="text-muted-foreground">12-Step Psychological Framework</p>
                    </div>

                    <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
                        <DialogTrigger asChild>
                            <Button size="lg" className="rounded-xl font-bold h-12 shadow-lg hover:shadow-xl transition-all">
                                <Sparkles className="w-5 h-5 mr-2" />
                                Generate Audiences
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <BrainCircuit className="w-5 h-5 text-blue-600" />
                                    AI Strategy Engine
                                </DialogTitle>
                                <DialogDescription>
                                    Our AI will analyze your Brand DNA, Pain Matrix, and Product to build 5 non-generic, high-performance audiences.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="py-8 flex flex-col items-center justify-center text-center space-y-6">
                                {isGenerating ? (
                                    <>
                                        <div className="relative">
                                            <div className="w-20 h-20 rounded-full border-4 border-blue-100 animate-pulse" />
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <p className="font-medium text-foreground animate-pulse">{progress}</p>
                                            <p className="text-xs text-muted-foreground">Reading Playbook & Brand Data...</p>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mb-2">
                                            <Target className="w-10 h-10" />
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            Ready to apply the 6-Layer Architecture to your brand.
                                        </p>
                                    </>
                                )}
                            </div>

                            <DialogFooter>
                                {!isGenerating && (
                                    <Button onClick={handleGenerate} className="w-full bg-blue-600 hover:bg-blue-700 font-bold">
                                        <Sparkles className="w-4 h-4 mr-2" />
                                        Run Strategy Engine
                                    </Button>
                                )}
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                <Tabs defaultValue="audiences" value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col min-h-0">
                    <TabsList className="w-full justify-start border-b rounded-none p-0 h-auto bg-transparent shrink-0">
                        <TabsTrigger
                            value="audiences"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3 text-sm font-medium"
                        >
                            <Target className="w-4 h-4 mr-2" />
                            Strategic Audiences ({(audiences || []).length})
                        </TabsTrigger>
                        <TabsTrigger
                            value="personas"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3 text-sm font-medium"
                        >
                            <UserCircle className="w-4 h-4 mr-2" />
                            Personas / Presenters
                        </TabsTrigger>
                        <div className="ml-auto flex items-center">
                            {activeTab === "personas" && audiences.length > 0 && (
                                <Button
                                    onClick={handleGenerateAllPersonas}
                                    variant="outline"
                                    size="sm"
                                    disabled={activePersonaGenerations.length > 0}
                                    className="gap-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200"
                                >
                                    {activePersonaGenerations.length > 0 ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Generating {activePersonaGenerations.length}...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-4 h-4" />
                                            Generate All Personas
                                        </>
                                    )}
                                </Button>
                            )}
                        </div>
                    </TabsList>

                    {/* --- AUDIENCES TAB --- */}
                    <TabsContent value="audiences" className="flex-1 mt-6 overflow-hidden">
                        <div className="h-full overflow-y-auto pr-4 pb-20">
                            {(!audiences || audiences.length === 0) ? (
                                <Card className="border-dashed bg-muted/20">
                                    <CardContent className="py-20 flex flex-col items-center justify-center text-center space-y-6">
                                        <div className="w-24 h-24 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                                            <Users className="w-12 h-12 text-blue-400" />
                                        </div>
                                        <div className="max-w-md space-y-2">
                                            <h3 className="text-2xl font-bold">No Strategic Data Yet</h3>
                                            <p className="text-muted-foreground">
                                                Run the AI Strategy Engine to generate your Cold, Warm, Hot, and Retention audiences.
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {(Array.isArray(audiences) ? audiences : []).map((audience, idx) => (
                                        <Card key={idx} className="flex flex-col h-full hover:shadow-xl transition-all duration-300 border-t-4 border-t-transparent hover:border-t-blue-500 group">
                                            <CardHeader className="pb-4">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${getColorForCategory(audience.category)}`}>
                                                        {getIconForCategory(audience.category)}
                                                        {audience.category}
                                                    </div>
                                                    <Badge variant="outline" className="text-[10px] opacity-70">
                                                        {audience.awareness_level}
                                                    </Badge>
                                                    {audience.age_range && (
                                                        <Badge variant="secondary" className="text-[10px] bg-slate-100 text-slate-700">
                                                            Age: {audience.age_range}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <CardTitle className="text-xl font-bold leading-tight min-h-[3rem] flex items-center">
                                                    {audience.name}
                                                </CardTitle>
                                                <CardDescription className="line-clamp-2">
                                                    {audience.description}
                                                </CardDescription>
                                            </CardHeader>

                                            <CardContent className="flex-1 space-y-6">
                                                {/* Hook Concept */}
                                                <div className="space-y-2 bg-muted/40 p-3 rounded-lg">
                                                    <div className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1">
                                                        <Zap className="w-3 h-3" /> Core Hook
                                                    </div>
                                                    <p className="text-sm font-medium italic text-foreground">
                                                        "{audience.hook_concept}"
                                                    </p>
                                                </div>

                                                {/* Meta Targeting Stack - New Section */}
                                                {(audience.meta_interests || []).length > 0 && (
                                                    <div className="space-y-2">
                                                        <div className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1">
                                                            <Crosshair className="w-3 h-3" /> Meta Targeting Signals
                                                        </div>
                                                        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                                                            {(audience.meta_interests || []).slice(0, 15).map((interest, i) => (
                                                                <span key={i} className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-100 whitespace-nowrap">
                                                                    {interest}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Identity Upgrade */}
                                                <div className="space-y-1">
                                                    <div className="text-xs font-bold uppercase text-muted-foreground">Identity Upgrade</div>
                                                    <p className="text-sm border-l-2 border-green-400 pl-3 py-1 bg-green-50/50">
                                                        {audience.identity_upgrade}
                                                    </p>
                                                </div>

                                                {/* Pain Points */}
                                                <div className="space-y-2">
                                                    <div className="text-xs font-bold uppercase text-muted-foreground">Pain Points (Layer 3)</div>
                                                    <ul className="space-y-1.5">
                                                        {(audience.pain_points || []).slice(0, 3).map((pain, i) => (
                                                            <li key={i} className="text-xs flex items-start gap-2">
                                                                <span className="text-red-500 mt-0.5">•</span>
                                                                <span className="opacity-90">{pain}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>

                                                {/* Suggested Products */}
                                                {audience.suggested_products && audience.suggested_products.length > 0 && (
                                                    <div className="pt-4 border-t">
                                                        <div className="text-xs font-bold uppercase text-muted-foreground mb-2 flex items-center gap-1">
                                                            <Package className="w-3 h-3" /> Recommended Products
                                                        </div>
                                                        <ul className="space-y-1">
                                                            {(audience.suggested_products || []).slice(0, 3).map((prod, i) => (
                                                                <li key={i} className="text-xs text-foreground flex items-center gap-2">
                                                                    <span className="w-1 h-1 rounded-full bg-blue-500" />
                                                                    {prod}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    {/* --- PERSONAS TAB --- */}
                    <TabsContent value="personas" className="flex-1 mt-6 overflow-hidden">
                        <div className="h-full overflow-y-auto pr-4 pb-20">
                            {audiences.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-4 border-2 border-dashed rounded-xl bg-muted/20">
                                    <p className="text-muted-foreground">Generate Audiences first to unlock Persona creation.</p>
                                </div>
                            ) : (
                                <div className="space-y-12">
                                    {audiences.map((audience, idx) => {
                                        const personaData = personas[audience.name];
                                        const persona = personaData?.profile;
                                        const imageUrl = personaData?.imageUrl;

                                        return (
                                            <div key={idx} className="space-y-4">
                                                {/* Header for Audience Section */}
                                                <div className="flex items-center justify-between border-b pb-4 sticky top-0 bg-background/95 backdrop-blur z-10 py-4">
                                                    <div>
                                                        <h3 className="text-lg font-bold flex items-center gap-2">
                                                            <Target className="w-4 h-4 text-muted-foreground" />
                                                            {audience.name}
                                                        </h3>
                                                        <p className="text-xs text-muted-foreground">
                                                            {audience.category} Audience • {audience.awareness_level}
                                                        </p>
                                                    </div>
                                                    {!persona ? (
                                                        <Button
                                                            onClick={() => handleGeneratePersona(audience)}
                                                            disabled={activePersonaGenerations.includes(audience.name)}
                                                            variant={activePersonaGenerations.includes(audience.name) ? "secondary" : "default"}
                                                            size="sm"
                                                        >
                                                            {activePersonaGenerations.includes(audience.name) ? (
                                                                <>
                                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                                    Designing Persona...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Sparkles className="mr-2 h-4 w-4" />
                                                                    Generate Persona
                                                                </>
                                                            )}
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            onClick={() => handleGeneratePersona(audience)}
                                                            disabled={activePersonaGenerations.includes(audience.name)}
                                                            variant={activePersonaGenerations.includes(audience.name) ? "secondary" : "outline"}
                                                            size="sm"
                                                        >
                                                            {activePersonaGenerations.includes(audience.name) ? (
                                                                <>
                                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                                    Regenerating...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Repeat className="mr-2 h-4 w-4" />
                                                                    Regenerate Persona
                                                                </>
                                                            )}
                                                        </Button>
                                                    )}
                                                </div>

                                                {/* Persona Card */}
                                                {persona ? (
                                                    <div className="grid md:grid-cols-12 gap-0 bg-card rounded-2xl border shadow-lg overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                                                        {/* IMAGE COLUMN */}
                                                        <div className="md:col-span-5 bg-muted/30 relative min-h-[400px] md:min-h-full">
                                                            {imageUrl ? (
                                                                <img
                                                                    src={imageUrl}
                                                                    alt={persona.name}
                                                                    className="w-full h-full object-cover absolute inset-0"
                                                                />
                                                            ) : (
                                                                <div className="flex items-center justify-center h-full text-muted-foreground">
                                                                    <div className="text-center">
                                                                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                                                                        <p>Generating Visuals...</p>
                                                                    </div>
                                                                </div>
                                                            )}
                                                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-8 pt-32 text-white">
                                                                <div className="flex gap-2 mb-2">
                                                                    <Badge variant="outline" className="text-white border-white/20 bg-white/10 backdrop-blur-md">
                                                                        {persona.role} Persona
                                                                    </Badge>
                                                                    <Badge variant="outline" className="text-white border-white/20 bg-white/10 backdrop-blur-md">
                                                                        {persona.age_range}
                                                                    </Badge>
                                                                </div>
                                                                <h2 className="text-4xl font-display font-bold text-shadow-xl">{persona.name}</h2>
                                                                <p className="text-white/80 font-medium text-lg">{persona.occupation}</p>
                                                            </div>
                                                        </div>

                                                        {/* PROFILE COLUMN */}
                                                        <div className="md:col-span-7 p-8 space-y-8">

                                                            <div className="grid grid-cols-2 gap-8">
                                                                <div>
                                                                    <h4 className="text-xs uppercase tracking-widest font-bold text-muted-foreground mb-3 flex items-center gap-2">
                                                                        <UserCircle className="w-3 h-3" /> Bio & Lifestyle
                                                                    </h4>
                                                                    <p className="text-sm leading-relaxed text-foreground/90">
                                                                        {persona.daily_routine || persona.lifestyle_notes || "A dedicated individual balancing personal growth and professional ambition..."}
                                                                    </p>
                                                                </div>
                                                                <div>
                                                                    <h4 className="text-xs uppercase tracking-widest font-bold text-muted-foreground mb-3 flex items-center gap-2">
                                                                        <AlertCircle className="w-3 h-3" /> Inner Conflict
                                                                    </h4>
                                                                    <p className="text-sm leading-relaxed italic text-foreground/80 border-l-2 pl-4 border-amber-500/50">
                                                                        "{persona.core_concerns || persona.emotional_state}"
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            <div className="space-y-4">
                                                                <h4 className="text-xs uppercase tracking-widest font-bold text-muted-foreground flex items-center gap-2">
                                                                    <Sparkles className="w-3 h-3" /> Personality Traits
                                                                </h4>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {persona.personality_traits?.map((t: string, i: number) => (
                                                                        <Badge key={i} variant="secondary" className="px-3 py-1.5 text-sm bg-blue-50/50 text-blue-700 hover:bg-blue-100">
                                                                            {t}
                                                                        </Badge>
                                                                    ))}
                                                                </div>
                                                            </div>

                                                            <div className="grid grid-cols-2 gap-8 pt-6 border-t">
                                                                <div>
                                                                    <h4 className="text-xs uppercase tracking-widest font-bold text-muted-foreground mb-2">Visual Style</h4>
                                                                    <p className="text-sm text-foreground/80">{persona.visual_style}</p>
                                                                </div>
                                                                <div>
                                                                    <h4 className="text-xs uppercase tracking-widest font-bold text-muted-foreground mb-2">Communication</h4>
                                                                    <p className="text-sm text-foreground/80">{persona.communication_style}</p>
                                                                </div>
                                                            </div>

                                                            {persona.casting_notes && (
                                                                <div className="bg-muted/40 p-4 rounded-lg text-xs font-mono text-muted-foreground border">
                                                                    <strong className="block mb-1 text-foreground">CASTING NOTES:</strong>
                                                                    {persona.casting_notes}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="p-12 border-2 border-dashed rounded-xl bg-muted/20 text-center text-muted-foreground flex flex-col items-center gap-4 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => handleGeneratePersona(audience)}>
                                                        <div className="w-12 h-12 rounded-full bg-background shadow-sm flex items-center justify-center">
                                                            <UserCircle className="w-6 h-6 text-muted-foreground/50" />
                                                        </div>
                                                        <p>No Persona designed yet. Click "Generate Persona" to create one.</p>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </Shell>
    );
}
