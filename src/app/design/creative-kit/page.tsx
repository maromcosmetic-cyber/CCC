'use client';

import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Zap, ArrowLeft, Loader2, Image as ImageIcon, Copy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useProject } from "@/contexts/ProjectContext";

export default function CreativeKitPage() {
    const router = useRouter();
    const { currentProject } = useProject();
    const [loading, setLoading] = useState(false);
    const [generated, setGenerated] = useState(false);

    const handleGenerate = () => {
        setLoading(true);
        // Simulate generation
        setTimeout(() => {
            setLoading(false);
            setGenerated(true);
        }, 2000);
    };

    return (
        <Shell>
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => router.back()}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                    </Button>
                </div>

                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-widest">
                        <Zap className="w-3 h-3" /> Creative Automation
                    </div>
                    <h1 className="text-4xl font-display font-black text-foreground tracking-tight">Creative Kit</h1>
                    <p className="text-muted-foreground text-lg">
                        Generate comprehensive asset packages for your upcoming campaigns in seconds.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Configuration Panel */}
                    <div className="lg:col-span-1 space-y-6">
                        <Card className="glass-card">
                            <CardHeader>
                                <CardTitle>Configuration</CardTitle>
                                <CardDescription>Define your creative needs</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Campaign Theme</Label>
                                    <Input placeholder="e.g. Summer Sale, Holiday Special" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Key Message</Label>
                                    <Textarea placeholder="What is the main value proposition?" rows={3} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Target Audience</Label>
                                    <Input placeholder="e.g. Young Professionals, Parents" />
                                </div>
                                <Button
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                    onClick={handleGenerate}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-4 h-4 mr-2" />
                                            Generate Assets
                                        </>
                                    )}
                                </Button>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Results Panel */}
                    <div className="lg:col-span-2 space-y-6">
                        {!generated ? (
                            <div className="h-[400px] border-2 border-dashed border-muted rounded-xl flex flex-col items-center justify-center text-muted-foreground bg-muted/5">
                                <Sparkles className="w-12 h-12 mb-4 opacity-20" />
                                <p>Enter details and click generate to see results</p>
                            </div>
                        ) : (
                            <div className="space-y-6 animate-in fade-in zoom-in duration-500">
                                {/* Ad Copy Section */}
                                <Card className="glass-card">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-base">
                                            <Copy className="w-4 h-4" /> Generated Copy
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="p-4 bg-muted/30 rounded-lg border">
                                            <p className="font-semibold text-sm mb-1">Primary Text</p>
                                            <p className="text-sm text-muted-foreground">Get ready for the biggest summer savings! ☀️ Upgrade your style with our exclusive collection. Limited time offer.</p>
                                        </div>
                                        <div className="p-4 bg-muted/30 rounded-lg border">
                                            <p className="font-semibold text-sm mb-1">Headline</p>
                                            <p className="text-sm text-muted-foreground">Summer Sale: Up to 50% Off Everything</p>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Visual Assets Section */}
                                <Card className="glass-card">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-base">
                                            <ImageIcon className="w-4 h-4" /> Visual Concepts
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="aspect-square bg-muted/50 rounded-lg flex items-center justify-center border hover:border-blue-500 cursor-pointer transition-colors relative group">
                                                <ImageIcon className="w-8 h-8 text-muted-foreground group-hover:text-blue-500" />
                                                <span className="absolute bottom-2 text-xs text-muted-foreground">Concept 1</span>
                                            </div>
                                            <div className="aspect-square bg-muted/50 rounded-lg flex items-center justify-center border hover:border-blue-500 cursor-pointer transition-colors relative group">
                                                <ImageIcon className="w-8 h-8 text-muted-foreground group-hover:text-blue-500" />
                                                <span className="absolute bottom-2 text-xs text-muted-foreground">Concept 2</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Shell>
    );
}
