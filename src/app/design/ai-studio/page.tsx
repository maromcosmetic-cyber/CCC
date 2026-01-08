'use client';

import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Sparkles, Zap, FileText, ArrowRight, Play } from "lucide-react";
import { useProject } from "@/contexts/ProjectContext";

export default function AIStudioPage() {
    const router = useRouter();
    const { currentProject } = useProject();

    return (
        <Shell>
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <h1 className="text-4xl font-display font-black text-foreground tracking-tight">AI Studio</h1>
                        <p className="text-muted-foreground text-lg">
                            Your central hub for AI-powered content creation
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Creative Kit Section */}
                    <Card className="glass-card hover:shadow-xl transition-all border-blue-500/20 overflow-hidden relative group">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <CardHeader>
                            <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4 text-blue-600">
                                <Zap className="w-6 h-6" />
                            </div>
                            <CardTitle className="text-2xl">Creative Kit</CardTitle>
                            <CardDescription className="text-base">
                                Generate comprehensive asset packages including images, copy, and headlines tailored to your brand voice.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="bg-background/50 rounded-lg p-4 text-sm text-muted-foreground">
                                    <ul className="space-y-2">
                                        <li className="flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                            Generates 10+ variations per prompt
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                            Learns from your brand guidelines
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                            Optimized for Meta & Google Ads
                                        </li>
                                    </ul>
                                </div>
                                <Button
                                    className="w-full h-11 text-base gap-2 bg-blue-600 hover:bg-blue-700 text-white border-none"
                                    onClick={() => router.push('/design/creative-kit')}
                                >
                                    <Sparkles className="w-4 h-4" />
                                    Launch Creative Kit
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* UGC Video Generator Section */}
                    <Card className="glass-card hover:shadow-xl transition-all border-purple-500/20 overflow-hidden relative group">
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <CardHeader>
                            <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center mb-4 text-purple-600">
                                <FileText className="w-6 h-6" />
                            </div>
                            <CardTitle className="text-2xl">UGC Video Generator</CardTitle>
                            <CardDescription className="text-base">
                                Create authentic-looking User Generated Content videos with AI avatars, voices, and scripts.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="bg-background/50 rounded-lg p-4 text-sm text-muted-foreground">
                                    <ul className="space-y-2">
                                        <li className="flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                            Professional AI Actors & Voices
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                            Multi-scene script generation
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                            Lip-sync & Voice Synthesis
                                        </li>
                                    </ul>
                                </div>
                                <Button
                                    className="w-full h-11 text-base gap-2 bg-purple-600 hover:bg-purple-700 text-white border-none"
                                    onClick={() => router.push('/design/ugc-video')}
                                >
                                    <Play className="w-4 h-4 ml-1" />
                                    Start Video Generator
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Recent Generations (Placeholder) */}
                <div className="mt-8">
                    <h2 className="text-xl font-bold mb-4">Recent Generations</h2>
                    <Card className="glass-card">
                        <CardContent className="p-12 text-center text-muted-foreground">
                            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                                <Sparkles className="w-8 h-8 text-muted-foreground/50" />
                            </div>
                            <p>No generations yet. Start creating!</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </Shell>
    );
}
