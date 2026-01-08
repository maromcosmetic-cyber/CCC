'use client';

import { Shell } from "@/components/layout/Shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Video, Wand2, Loader2, RefreshCw, Settings2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useProject } from "@/contexts/ProjectContext";
import { useState } from "react";

export default function VideoGenPage() {
    const { currentProject } = useProject();
    const [isGenerating, setIsGenerating] = useState(false);

    return (
        <Shell>
            <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-widest">
                            <Video className="w-3 h-3" /> Multi-Model Video Gen
                        </div>
                        <h1 className="text-4xl font-display font-black text-foreground tracking-tight">Video Director</h1>
                        <p className="text-muted-foreground text-lg">
                            Create cinematic AI videos using Sora, Kling, Veo 3, and more.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Settings Sidebar */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Model</label>
                                <Select defaultValue="kling">
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Model" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="kling">Kling AI (High Dynamic)</SelectItem>
                                        <SelectItem value="veo">Google Veo 3 (Pro)</SelectItem>
                                        <SelectItem value="sora">OpenAI Sora (Cinema)</SelectItem>
                                        <SelectItem value="luma">Luma Dream Machine</SelectItem>
                                        <SelectItem value="runway">Runway Gen-3</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Aspect Ratio</label>
                                <Select defaultValue="16:9">
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Ratio" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="16:9">Wide (16:9 TV)</SelectItem>
                                        <SelectItem value="9:16">Vertical (9:16 Story)</SelectItem>
                                        <SelectItem value="1:1">Square (1:1)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Duration</label>
                                <Select defaultValue="5">
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Duration" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="5">5 Seconds</SelectItem>
                                        <SelectItem value="8">8 Seconds</SelectItem>
                                        <SelectItem value="10">10 Seconds (Pro)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="lg:col-span-3 space-y-8">
                        {/* Prompt Input */}
                        <div className="bg-white rounded-xl border p-4 shadow-sm space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="font-semibold text-sm">Description</h3>
                                <Button variant="ghost" size="sm" className="text-indigo-600 h-6">
                                    <Wand2 className="w-3 h-3 mr-1" /> Enhance
                                </Button>
                            </div>
                            <Textarea
                                placeholder="Describe the camera movement, lighting, subject action..."
                                className="min-h-[120px] resize-none border-muted focus-visible:ring-indigo-500"
                            />
                            <div className="flex justify-end">
                                <Button
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[200px]"
                                    onClick={() => setIsGenerating(true)}
                                    disabled={isGenerating}
                                >
                                    {isGenerating ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <Video className="w-4 h-4 mr-2" />
                                            Generate Video
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>

                        {/* Results */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold">Recent Generations</h3>
                                <Button variant="ghost" size="sm"><RefreshCw className="w-3 h-3 mr-2" />Refresh</Button>
                            </div>
                            <div className="border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center text-muted-foreground bg-muted/5 min-h-[300px]">
                                <Video className="w-12 h-12 mb-4 opacity-20" />
                                <p>No videos generated yet</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Shell>
    );
}
