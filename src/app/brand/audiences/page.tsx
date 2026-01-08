'use client';

import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Users, Sparkles, Plus, Loader2, ArrowRight } from "lucide-react";
import { useProject } from "@/contexts/ProjectContext";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Audience {
    id: string;
    name: string;
    description: string;
    match_rate?: string | null;
    size_estimate?: number | null;
    ai_suggested: boolean;
    platform?: string[];
    created_at: string;
}

export default function AudiencesPage() {
    const { currentProject } = useProject();
    const router = useRouter();
    const [audiences, setAudiences] = useState<Audience[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [showGenerateDialog, setShowGenerateDialog] = useState(false);

    useEffect(() => {
        if (currentProject?.id) {
            fetchAudiences();
        }
    }, [currentProject?.id]);

    const fetchAudiences = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/projects/${currentProject?.id}/audiences`);
            if (response.ok) {
                const data = await response.json();
                setAudiences(data.audiences || []);
            }
        } catch (error) {
            console.error('Failed to fetch audiences:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            const response = await fetch(`/api/projects/${currentProject?.id}/audiences/generate`, {
                method: 'POST',
            });

            if (response.ok) {
                await fetchAudiences();
                setShowGenerateDialog(false);
            }
        } catch (error) {
            console.error('Failed to generate audience:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <Shell>
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-widest">
                            <Users className="w-3 h-3" /> Audience Segments
                        </div>
                        <h1 className="text-4xl font-display font-black text-foreground tracking-tight">Audiences</h1>
                        <p className="text-muted-foreground text-lg">
                            Manage and generate AI-targeted audience segments for your campaigns
                        </p>
                    </div>
                    <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
                        <DialogTrigger asChild>
                            <Button className="rounded-xl font-bold h-11">
                                <Sparkles className="w-4 h-4 mr-2" />
                                Generate Audience
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Generate AI Audience</DialogTitle>
                                <DialogDescription>
                                    Our AI will analyze your company profile and products to suggest high-converting audience segments.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="py-6 flex flex-col items-center justify-center text-center space-y-4">
                                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                    <Sparkles className="w-8 h-8" />
                                </div>
                                <p className="text-sm text-muted-foreground max-w-xs">
                                    This process typically takes 30-60 seconds. We'll verify your brand data and market trends.
                                </p>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>Cancel</Button>
                                <Button onClick={handleGenerate} disabled={isGenerating} className="bg-blue-600 hover:bg-blue-700">
                                    {isGenerating ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Analyzing...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-4 h-4 mr-2" />
                                            Start Generation
                                        </>
                                    )}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                ) : audiences.length === 0 ? (
                    <Card className="glass-card border-dashed">
                        <CardContent className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground">
                                <Users className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold">No audiences yet</h3>
                                <p className="text-muted-foreground mb-4">Generate your first audience segment to get started</p>
                                <Button onClick={() => setShowGenerateDialog(true)}>
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    Generate Audience
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {audiences.map((audience) => (
                            <Card key={audience.id} className="glass-card hover:shadow-lg transition-all cursor-pointer group">
                                <CardHeader className="pb-3">
                                    <div className="flex justify-between items-start">
                                        <Badge variant="outline" className="mb-2">
                                            {audience.size_estimate ? `~${audience.size_estimate.toLocaleString()} people` : 'Size pending'}
                                        </Badge>
                                        {audience.ai_suggested && (
                                            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none">
                                                <Sparkles className="w-3 h-3 mr-1" /> AI Suggestion
                                            </Badge>
                                        )}
                                    </div>
                                    <CardTitle className="text-xl">{audience.name}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-muted-foreground text-sm line-clamp-3 mb-4">
                                        {audience.description}
                                    </p>
                                    <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
                                        <div className="flex gap-2">
                                            {audience.platform?.map((p) => (
                                                <span key={p} className="uppercase px-1.5 py-0.5 bg-muted rounded">{p}</span>
                                            )) || <span>ALL PLATFORMS</span>}
                                        </div>
                                        <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-blue-600" />
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </Shell>
    );
}
