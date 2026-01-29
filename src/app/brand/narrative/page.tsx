'use client';

import { useState, useEffect } from "react";
import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Save, User, Target, Shield, TrendingUp, Sparkles } from "lucide-react";
import { useProject } from "@/contexts/ProjectContext";

export default function NarrativePage() {
    const { currentProject, updateBrandIdentity } = useProject();
    const [data, setData] = useState<any>({});

    useEffect(() => {
        if (currentProject?.brandIdentity?.narrative) {
            setData(currentProject.brandIdentity.narrative);
        }
    }, [currentProject]);

    const handleSave = () => {
        const brandIdentity = currentProject?.brandIdentity || {};
        updateBrandIdentity({ ...brandIdentity, narrative: data });
        alert("Narrative Architecture Saved!");
    };

    const updateField = (field: string, value: any) => {
        setData((prev: any) => ({ ...prev, [field]: value }));
    };

    return (
        <Shell>
            <div className="max-w-5xl mx-auto space-y-8 pb-20">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-purple-600 font-bold text-xs uppercase tracking-widest mb-2">
                            <MessageSquare className="w-3 h-3" /> Narrative Architecture
                        </div>
                        <h1 className="text-3xl font-display font-bold">Story Engine</h1>
                        <p className="text-muted-foreground">How you structure emotionally compelling narratives.</p>
                    </div>
                    <Button onClick={handleSave}>
                        <Save className="w-4 h-4 mr-2" /> Save Story
                    </Button>
                </div>

                <Card className="bg-purple-50 border-purple-200">
                    <CardContent className="p-4">
                        <p className="text-sm text-purple-800">
                            <strong>Story = Connection:</strong> People don't buy products, they buy transformations. 
                            Use this framework for campaigns, ads, emails, and landing pages.
                        </p>
                    </CardContent>
                </Card>

                {/* The Framework */}
                <div className="space-y-6">
                    {/* Hero (Customer) */}
                    <Card className="border-blue-200 bg-blue-50/30">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="w-5 h-5 text-blue-600" />
                                1. The Hero (Your Customer)
                            </CardTitle>
                            <CardDescription>The hero is ALWAYS the customer, not you</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Textarea
                                value={data.hero || ""}
                                onChange={(e) => updateField('hero', e.target.value)}
                                placeholder="Describe who the hero is. What's their situation? What do they want?"
                                className="min-h-[100px] bg-white"
                            />
                        </CardContent>
                    </Card>

                    {/* Villain (Problem) */}
                    <Card className="border-red-200 bg-red-50/30">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Target className="w-5 h-5 text-red-600" />
                                2. The Villain (The Problem)
                            </CardTitle>
                            <CardDescription>The problem, not competitors. Make it external, tangible.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Textarea
                                value={data.villain || ""}
                                onChange={(e) => updateField('villain', e.target.value)}
                                placeholder="What is the external enemy? The obstacle? The thing standing in their way?"
                                className="min-h-[100px] bg-white"
                            />
                        </CardContent>
                    </Card>

                    {/* Guide (Brand) */}
                    <Card className="border-green-200 bg-green-50/30">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="w-5 h-5 text-green-600" />
                                3. The Guide (Your Brand)
                            </CardTitle>
                            <CardDescription>You're Yoda, not Luke. You have the wisdom and tools.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Textarea
                                value={data.guide || ""}
                                onChange={(e) => updateField('guide', e.target.value)}
                                placeholder="How does your brand show up as the guide? What authority/empathy do you bring?"
                                className="min-h-[100px] bg-white"
                            />
                        </CardContent>
                    </Card>

                    {/* Struggle */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <TrendingUp className="w-5 h-5" />
                                4. The Struggle (The Journey)
                            </CardTitle>
                            <CardDescription>What does the hero go through?</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Textarea
                                value={data.struggle || ""}
                                onChange={(e) => updateField('struggle', e.target.value)}
                                placeholder="What challenges do they face? What must they overcome?"
                                className="min-h-[100px]"
                            />
                        </CardContent>
                    </Card>

                    {/* Transformation */}
                    <Card className="border-indigo-200 bg-indigo-50/30">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-indigo-600" />
                                5. The Transformation (Before → After)
                            </CardTitle>
                            <CardDescription>The change that happens</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Before State</label>
                                    <Textarea
                                        value={data.before_state || ""}
                                        onChange={(e) => updateField('before_state', e.target.value)}
                                        placeholder="Where they start..."
                                        className="min-h-[80px] bg-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">After State</label>
                                    <Textarea
                                        value={data.after_state || ""}
                                        onChange={(e) => updateField('after_state', e.target.value)}
                                        placeholder="Where they end up..."
                                        className="min-h-[80px] bg-white"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">The Transformation</label>
                                <Textarea
                                    value={data.transformation || ""}
                                    onChange={(e) => updateField('transformation', e.target.value)}
                                    placeholder="What changed? Who did they become?"
                                    className="min-h-[80px] bg-white"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Outcome */}
                    <Card className="border-yellow-200 bg-yellow-50/30">
                        <CardHeader>
                            <CardTitle>6. The Outcome (The Promised Land)</CardTitle>
                            <CardDescription>Paint the picture of success</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Textarea
                                value={data.outcome || ""}
                                onChange={(e) => updateField('outcome', e.target.value)}
                                placeholder="What does life look like when they've won? Be specific and emotional."
                                className="min-h-[120px] bg-white"
                            />
                        </CardContent>
                    </Card>

                    {/* Story Templates */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Story Templates</CardTitle>
                            <CardDescription>Pre-written story structures for different use cases</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Campaign Story Template</label>
                                <Textarea
                                    value={data.campaign_template || ""}
                                    onChange={(e) => updateField('campaign_template', e.target.value)}
                                    placeholder="e.g., '[Hero] was struggling with [villain]. With [guide], they [transformation] and now [outcome].'"
                                    className="min-h-[80px]"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Product Launch Narrative</label>
                                <Textarea
                                    value={data.launch_template || ""}
                                    onChange={(e) => updateField('launch_template', e.target.value)}
                                    placeholder="Story structure for new product launches..."
                                    className="min-h-[80px]"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Testimonial Story Structure</label>
                                <Textarea
                                    value={data.testimonial_template || ""}
                                    onChange={(e) => updateField('testimonial_template', e.target.value)}
                                    placeholder="How to structure customer success stories..."
                                    className="min-h-[80px]"
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </Shell>
    );
}

