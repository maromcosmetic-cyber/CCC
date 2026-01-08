'use client';

import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mic, Play, Download, Wand2, Loader2, RefreshCw } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { useProject } from "@/contexts/ProjectContext";
import { useState } from "react";

export default function VoiceStudioPage() {
    const { currentProject } = useProject();
    const [isGenerating, setIsGenerating] = useState(false);

    return (
        <Shell>
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-rose-600 font-bold text-xs uppercase tracking-widest">
                            <Mic className="w-3 h-3" /> Professional Text-to-Speech
                        </div>
                        <h1 className="text-4xl font-display font-black text-foreground tracking-tight">Voice Studio</h1>
                        <p className="text-muted-foreground text-lg">
                            Generate lifelike voiceovers using premium ElevenLabs & Google voices.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Controls */}
                    <div className="md:col-span-1 space-y-6">
                        <Card className="glass-card">
                            <CardHeader>
                                <CardTitle>Settings</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Language</label>
                                    <Select defaultValue="en">
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Language" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="en">English (US)</SelectItem>
                                            <SelectItem value="he">Hebrew (IL)</SelectItem>
                                            <SelectItem value="es">Spanish</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Voice</label>
                                    <Select defaultValue="george">
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Voice" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="george">George (British, Calm)</SelectItem>
                                            <SelectItem value="sarah">Sarah (American, Upbeat)</SelectItem>
                                            <SelectItem value="yoni">Yoni (Hebrew, Deep)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-4 pt-2">
                                    <div className="flex justify-between">
                                        <label className="text-sm font-medium">Stability</label>
                                        <span className="text-xs text-muted-foreground">Normal</span>
                                    </div>
                                    <Slider defaultValue={[50]} max={100} step={1} />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Script & Generation */}
                    <div className="md:col-span-2 space-y-6">
                        <Card className="glass-card h-full flex flex-col">
                            <CardContent className="p-6 flex-1 flex flex-col gap-4">
                                <div className="flex justify-between items-center">
                                    <label className="font-semibold">Script</label>
                                    <Button variant="ghost" size="sm" className="text-rose-600 h-8">
                                        <Wand2 className="w-3 h-3 mr-2" />
                                        Enhance Text
                                    </Button>
                                </div>
                                <Textarea
                                    placeholder="Type what you want the voice to say..."
                                    className="flex-1 min-h-[200px] text-lg leading-relaxed p-4 bg-muted/20"
                                />
                                <div className="flex items-center justify-between pt-4 border-t">
                                    <span className="text-xs text-muted-foreground">0/5000 chars</span>
                                    <Button
                                        onClick={() => setIsGenerating(true)}
                                        disabled={isGenerating}
                                        className="bg-rose-600 hover:bg-rose-700 text-white min-w-[140px]"
                                    >
                                        {isGenerating ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Generating...
                                            </>
                                        ) : (
                                            <>
                                                <Play className="w-4 h-4 mr-2" />
                                                Generate Audio
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </Shell>
    );
}
