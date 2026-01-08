'use client';

import { Shell } from "@/components/layout/Shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, Wand2, Loader2, Download, Maximize2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useProject } from "@/contexts/ProjectContext";
import { useState } from "react";

export default function ImageGenPage() {
    const { currentProject } = useProject();
    const [isGenerating, setIsGenerating] = useState(false);

    return (
        <Shell>
            <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-green-600 font-bold text-xs uppercase tracking-widest">
                            <ImageIcon className="w-3 h-3" /> Advanced Image Generation
                        </div>
                        <h1 className="text-4xl font-display font-black text-foreground tracking-tight">Image Generator</h1>
                        <p className="text-muted-foreground text-lg">
                            Turn your ideas into stunning visuals with Google Imagen & Dali-3.
                        </p>
                    </div>
                </div>

                <Card className="glass-card p-2">
                    <CardContent className="p-4 space-y-6">
                        <div className="flex gap-4">
                            <div className="flex-1 space-y-2">
                                <Textarea
                                    placeholder="Describe the image you want to create..."
                                    className="min-h-[100px] text-lg resize-none border-0 bg-transparent focus-visible:ring-0 p-0 shadow-none placeholder:text-muted-foreground/50"
                                />
                            </div>
                            <div className="flex flex-col gap-2 justify-end">
                                <Button variant="ghost" size="icon" title="Enhance Prompt">
                                    <Wand2 className="w-5 h-5 text-green-600" />
                                </Button>
                                <Button
                                    size="lg"
                                    className="bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20"
                                    onClick={() => setIsGenerating(true)}
                                    disabled={isGenerating}
                                >
                                    {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : "Generate"}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Gallery / Results */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Placeholder for generated images */}
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="group relative aspect-square rounded-xl bg-muted/20 border border-muted/50 overflow-hidden">
                            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/30">
                                <ImageIcon className="w-12 h-12" />
                            </div>
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <Button variant="secondary" size="icon" className="rounded-full">
                                    <Maximize2 className="w-4 h-4" />
                                </Button>
                                <Button variant="secondary" size="icon" className="rounded-full">
                                    <Download className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </Shell>
    );
}
