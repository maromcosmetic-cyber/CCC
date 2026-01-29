'use client';

import { useState, useEffect } from "react";
import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Target, Save, AlertCircle } from "lucide-react";
import { useProject } from "@/contexts/ProjectContext";

export default function PositioningPage() {
    const { currentProject, updateBrandIdentity } = useProject();
    const [data, setData] = useState<any>({});

    useEffect(() => {
        if (currentProject?.brandIdentity?.positioning) {
            setData(currentProject.brandIdentity.positioning);
        }
    }, [currentProject]);

    const handleSave = () => {
        const brandIdentity = currentProject?.brandIdentity || {};
        updateBrandIdentity({ ...brandIdentity, positioning: data });
        alert("Strategic Positioning Saved!");
    };

    const updateField = (field: string, value: any) => {
        setData((prev: any) => ({ ...prev, [field]: value }));
    };

    return (
        <Shell>
            <div className="max-w-5xl mx-auto space-y-8 pb-20">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-widest mb-2">
                            <Target className="w-3 h-3" /> Strategic Positioning
                        </div>
                        <h1 className="text-3xl font-display font-bold">Brand Positioning</h1>
                        <p className="text-muted-foreground">Where you sit in the market and in the customer's mind.</p>
                    </div>
                    <Button onClick={handleSave}>
                        <Save className="w-4 h-4 mr-2" /> Save Changes
                    </Button>
                </div>

                <Card className="bg-yellow-50 border-yellow-200">
                    <CardContent className="p-4">
                        <div className="flex gap-3 items-start">
                            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 shrink-0" />
                            <div className="text-sm">
                                <p className="font-semibold text-yellow-900 mb-1">Why Positioning Matters</p>
                                <p className="text-yellow-800">Clear positioning prevents confused, mixed messaging. It tells the AI exactly what territory you own.</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    {/* Market Category */}
                    <Card>
                        <CardHeader>
                            <CardTitle>1. Market Category</CardTitle>
                            <CardDescription>What category do you compete in?</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Market Category</label>
                                <Input
                                    value={data.market_category || ""}
                                    onChange={(e) => updateField('market_category', e.target.value)}
                                    placeholder="e.g., Skincare, SaaS, Coffee, Consulting"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Sub-Category You Want to Own</label>
                                <Input
                                    value={data.subcategory_to_own || ""}
                                    onChange={(e) => updateField('subcategory_to_own', e.target.value)}
                                    placeholder="e.g., 'Clean beauty for busy moms', 'All-in-one marketing for agencies'"
                                />
                                <p className="text-xs text-muted-foreground">Be specific. This is YOUR niche.</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* NOT For Statement */}
                    <Card className="border-red-200 bg-red-50/30">
                        <CardHeader>
                            <CardTitle className="text-red-800">2. "NOT For" Statement</CardTitle>
                            <CardDescription className="text-red-600">CRITICAL: Who should NOT buy from you?</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Textarea
                                value={data.not_for || ""}
                                onChange={(e) => updateField('not_for', e.target.value)}
                                placeholder="e.g., 'Not for people who want overnight results', 'Not for agencies with less than 10 employees', 'Not for bargain hunters'"
                                className="min-h-[100px] bg-white"
                            />
                            <p className="text-xs text-red-700 font-medium">
                                ⚠️ This prevents the AI from generating content that attracts the wrong customers.
                            </p>
                        </CardContent>
                    </Card>

                    {/* What You Want to Be Remembered For */}
                    <Card>
                        <CardHeader>
                            <CardTitle>3. Memorable Positioning</CardTitle>
                            <CardDescription>What do you want to be known for?</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Remembered For</label>
                                <Input
                                    value={data.remembered_for || ""}
                                    onChange={(e) => updateField('remembered_for', e.target.value)}
                                    placeholder="e.g., 'The most reliable', 'The most innovative', 'The friendliest'"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Positioning Statement</label>
                                <Textarea
                                    value={data.positioning_statement || ""}
                                    onChange={(e) => updateField('positioning_statement', e.target.value)}
                                    placeholder="e.g., 'For [target], we are the [category] that [benefit] because [reason to believe]'"
                                    className="min-h-[80px]"
                                />
                                <p className="text-xs text-muted-foreground">Complete sentence describing your position</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Single Dominant Idea */}
                    <Card className="border-indigo-200 bg-indigo-50/30">
                        <CardHeader>
                            <CardTitle className="text-indigo-800">4. Single Dominant Brand Idea</CardTitle>
                            <CardDescription className="text-indigo-600">If people remember ONE thing about you, what is it?</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Input
                                value={data.dominant_brand_idea || ""}
                                onChange={(e) => updateField('dominant_brand_idea', e.target.value)}
                                placeholder="e.g., 'Fast delivery', 'Natural ingredients', 'Personalized service'"
                                className="bg-white"
                            />
                            <p className="text-xs text-indigo-700">
                                This becomes the North Star for all messaging. Keep it simple and ownable.
                            </p>
                        </CardContent>
                    </Card>

                    {/* Positioning Type */}
                    <Card>
                        <CardHeader>
                            <CardTitle>5. Positioning Type</CardTitle>
                            <CardDescription>How are you different?</CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Are you...</label>
                                <select
                                    value={data.positioning_type || ""}
                                    onChange={(e) => updateField('positioning_type', e.target.value)}
                                    className="w-full p-2 border rounded-md"
                                >
                                    <option value="">Select...</option>
                                    <option value="cheaper">Cheaper (Budget)</option>
                                    <option value="better">Better (Quality)</option>
                                    <option value="faster">Faster (Speed)</option>
                                    <option value="easier">Easier (Convenience)</option>
                                    <option value="emotional">Emotional (Feeling)</option>
                                    <option value="status">Status (Prestige)</option>
                                    <option value="niche">Niche (Specialized)</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Compared to...</label>
                                <Input
                                    value={data.compared_to || ""}
                                    onChange={(e) => updateField('compared_to', e.target.value)}
                                    placeholder="e.g., Traditional competitors, DIY solutions"
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </Shell>
    );
}

