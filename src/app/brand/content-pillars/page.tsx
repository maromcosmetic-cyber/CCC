'use client';

import { useState, useEffect } from "react";
import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Layers, Save, Plus, Trash2, BookOpen, Target, Sparkles } from "lucide-react";
import { useProject } from "@/contexts/ProjectContext";

interface ContentPillar {
    name: string;
    strategic_purpose: string;
    emotional_tone: string;
    example_topics: string[];
    platforms_used: string[];
}

export default function ContentPillarsPage() {
    const { currentProject, updateBrandIdentity } = useProject();
    const [pillars, setPillars] = useState<ContentPillar[]>([]);

    useEffect(() => {
        if (currentProject?.brandIdentity?.content_pillars) {
            setPillars(currentProject.brandIdentity.content_pillars);
        }
    }, [currentProject]);

    const handleSave = () => {
        const brandIdentity = currentProject?.brandIdentity || {};
        updateBrandIdentity({ ...brandIdentity, content_pillars: pillars });
        alert("Content Pillars Saved!");
    };

    const addPillar = () => {
        setPillars(prev => [
            ...prev,
            {
                name: '',
                strategic_purpose: '',
                emotional_tone: '',
                example_topics: [''],
                platforms_used: ['']
            }
        ]);
    };

    const removePillar = (index: number) => {
        setPillars(prev => prev.filter((_, i) => i !== index));
    };

    const updatePillar = (index: number, field: keyof ContentPillar, value: any) => {
        setPillars(prev => prev.map((pillar, i) =>
            i === index ? { ...pillar, [field]: value } : pillar
        ));
    };

    const addToPillarArray = (pillarIndex: number, field: 'example_topics' | 'platforms_used') => {
        setPillars(prev => prev.map((pillar, i) =>
            i === pillarIndex
                ? { ...pillar, [field]: [...pillar[field], ''] }
                : pillar
        ));
    };

    const updatePillarArrayItem = (pillarIndex: number, field: 'example_topics' | 'platforms_used', itemIndex: number, value: string) => {
        setPillars(prev => prev.map((pillar, i) =>
            i === pillarIndex
                ? {
                    ...pillar,
                    [field]: pillar[field].map((item, j) => j === itemIndex ? value : item)
                }
                : pillar
        ));
    };

    const removePillarArrayItem = (pillarIndex: number, field: 'example_topics' | 'platforms_used', itemIndex: number) => {
        setPillars(prev => prev.map((pillar, i) =>
            i === pillarIndex
                ? {
                    ...pillar,
                    [field]: pillar[field].filter((_, j) => j !== itemIndex)
                }
                : pillar
        ));
    };

    return (
        <Shell>
            <div className="max-w-6xl mx-auto space-y-8 pb-20">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-purple-600 font-bold text-xs uppercase tracking-widest mb-2">
                            <Layers className="w-3 h-3" /> Content Strategy
                        </div>
                        <h1 className="text-3xl font-display font-bold">Content Pillar System</h1>
                        <p className="text-muted-foreground">
                            AI uses these pillars to generate strategically aligned content.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={addPillar} variant="outline">
                            <Plus className="w-4 h-4 mr-2" /> Add Pillar
                        </Button>
                        <Button onClick={handleSave}>
                            <Save className="w-4 h-4 mr-2" /> Save Pillars
                        </Button>
                    </div>
                </div>

                <Card className="bg-purple-50 border-purple-200">
                    <CardContent className="p-4">
                        <p className="text-sm text-purple-800">
                            <strong>Content Pillars = Strategic Themes:</strong> These are the 3-7 core topics your brand consistently creates content about. 
                            Each pillar serves a strategic purpose (awareness, trust, education, conversion).
                        </p>
                    </CardContent>
                </Card>

                {pillars.length === 0 && (
                    <Card className="border-dashed">
                        <CardContent className="p-12 text-center">
                            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground mb-4">No content pillars defined yet</p>
                            <Button onClick={addPillar}>
                                <Plus className="w-4 h-4 mr-2" /> Create Your First Pillar
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {pillars.map((pillar, pillarIndex) => (
                    <Card key={pillarIndex} className="border-purple-200 bg-gradient-to-br from-purple-50/50 to-transparent">
                        <CardHeader className="border-b bg-white">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
                                        {pillarIndex + 1}
                                    </div>
                                    <Input
                                        value={pillar.name}
                                        onChange={(e) => updatePillar(pillarIndex, 'name', e.target.value)}
                                        placeholder="Pillar Name (e.g., 'Education & How-To', 'Inspiration & Mindset')"
                                        className="font-semibold text-lg border-none shadow-none focus-visible:ring-0"
                                    />
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removePillar(pillarIndex)}
                                >
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-6">
                            {/* Strategic Purpose */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium flex items-center gap-2">
                                    <Target className="w-4 h-4 text-purple-600" />
                                    Strategic Purpose
                                </label>
                                <Textarea
                                    value={pillar.strategic_purpose}
                                    onChange={(e) => updatePillar(pillarIndex, 'strategic_purpose', e.target.value)}
                                    placeholder="Why does this pillar exist? (e.g., 'Build authority', 'Nurture leads', 'Drive conversions')"
                                    className="min-h-[60px] bg-white"
                                />
                            </div>

                            {/* Emotional Tone */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-purple-600" />
                                    Emotional Tone
                                </label>
                                <Input
                                    value={pillar.emotional_tone}
                                    onChange={(e) => updatePillar(pillarIndex, 'emotional_tone', e.target.value)}
                                    placeholder="e.g., 'Empowering & Motivational', 'Educational & Calm', 'Bold & Disruptive'"
                                    className="bg-white"
                                />
                            </div>

                            {/* Example Topics */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium">Example Topics</label>
                                    <Button
                                        onClick={() => addToPillarArray(pillarIndex, 'example_topics')}
                                        size="sm"
                                        variant="outline"
                                    >
                                        <Plus className="w-3 h-3 mr-1" /> Add Topic
                                    </Button>
                                </div>
                                {pillar.example_topics.map((topic, topicIndex) => (
                                    <div key={topicIndex} className="flex gap-2">
                                        <Input
                                            value={topic}
                                            onChange={(e) => updatePillarArrayItem(pillarIndex, 'example_topics', topicIndex, e.target.value)}
                                            placeholder="e.g., 'How to [solve problem]', '[Industry] myths debunked'"
                                            className="bg-white"
                                        />
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removePillarArrayItem(pillarIndex, 'example_topics', topicIndex)}
                                        >
                                            <Trash2 className="w-4 h-4 text-red-500" />
                                        </Button>
                                    </div>
                                ))}
                            </div>

                            {/* Platforms Used */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium">Best Platforms for This Pillar</label>
                                    <Button
                                        onClick={() => addToPillarArray(pillarIndex, 'platforms_used')}
                                        size="sm"
                                        variant="outline"
                                    >
                                        <Plus className="w-3 h-3 mr-1" /> Add Platform
                                    </Button>
                                </div>
                                {pillar.platforms_used.map((platform, platformIndex) => (
                                    <div key={platformIndex} className="flex gap-2">
                                        <Input
                                            value={platform}
                                            onChange={(e) => updatePillarArrayItem(pillarIndex, 'platforms_used', platformIndex, e.target.value)}
                                            placeholder="e.g., 'Instagram', 'Blog', 'YouTube', 'Email Newsletter'"
                                            className="bg-white"
                                        />
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removePillarArrayItem(pillarIndex, 'platforms_used', platformIndex)}
                                        >
                                            <Trash2 className="w-4 h-4 text-red-500" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {pillars.length > 0 && (
                    <Card className="border-green-200 bg-green-50">
                        <CardContent className="p-4">
                            <p className="text-sm text-green-800">
                                <strong>✓ {pillars.length} Pillar{pillars.length !== 1 ? 's' : ''} Defined:</strong> The AI will now generate content aligned with these strategic themes.
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </Shell>
    );
}

