'use client';

import { useState, useEffect } from "react";
import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Telescope, Save, Plus, Trash2, Rocket, Globe2, TrendingUp } from "lucide-react";
import { useProject } from "@/contexts/ProjectContext";

export default function VisionPage() {
    const { currentProject, updateBrandIdentity } = useProject();
    const [data, setData] = useState<any>({
        future_products: [],
        future_markets: [],
        future_positioning: '',
        brand_evolution_path: '',
        three_year_vision: '',
        five_year_vision: '',
        expansion_strategy: ''
    });

    useEffect(() => {
        if (currentProject?.brandIdentity?.long_term_vision) {
            setData(currentProject.brandIdentity.long_term_vision);
        }
    }, [currentProject]);

    const handleSave = () => {
        const brandIdentity = currentProject?.brandIdentity || {};
        updateBrandIdentity({ ...brandIdentity, long_term_vision: data });
        alert("Long-Term Vision Saved!");
    };

    const updateField = (field: string, value: any) => {
        setData((prev: any) => ({ ...prev, [field]: value }));
    };

    const addToArray = (field: string) => {
        setData((prev: any) => ({
            ...prev,
            [field]: [...(prev[field] || []), '']
        }));
    };

    const updateArrayItem = (field: string, index: number, value: string) => {
        setData((prev: any) => ({
            ...prev,
            [field]: prev[field].map((item: string, i: number) => i === index ? value : item)
        }));
    };

    const removeFromArray = (field: string, index: number) => {
        setData((prev: any) => ({
            ...prev,
            [field]: prev[field].filter((_: any, i: number) => i !== index)
        }));
    };

    return (
        <Shell>
            <div className="max-w-6xl mx-auto space-y-8 pb-20">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-purple-600 font-bold text-xs uppercase tracking-widest mb-2">
                            <Telescope className="w-3 h-3" /> Long-Term Vision
                        </div>
                        <h1 className="text-3xl font-display font-bold">Future Vision & Expansion Logic</h1>
                        <p className="text-muted-foreground">
                            Where is the brand going? AI uses this to think long-term, not just immediate campaigns.
                        </p>
                    </div>
                    <Button onClick={handleSave}>
                        <Save className="w-4 h-4 mr-2" /> Save Vision
                    </Button>
                </div>

                <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
                    <CardContent className="p-4 flex items-start gap-3">
                        <Rocket className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm text-purple-800 font-semibold mb-1">Strategic Foresight</p>
                            <p className="text-xs text-purple-700">
                                This vision ensures AI creates campaigns that align with where you're going, not just where you are now.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Future Products */}
                <Card className="border-blue-200">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <Rocket className="w-5 h-5 text-blue-600" />
                                    Future Products Pipeline
                                </CardTitle>
                                <CardDescription>What new products are you planning to launch?</CardDescription>
                            </div>
                            <Button onClick={() => addToArray('future_products')} size="sm" variant="outline">
                                <Plus className="w-4 h-4 mr-2" /> Add Product
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {(data.future_products || []).map((product: string, index: number) => (
                            <div key={index} className="flex gap-2">
                                <Input
                                    value={product}
                                    onChange={(e) => updateArrayItem('future_products', index, e.target.value)}
                                    placeholder="e.g., AI-powered coaching platform (Q3 2026), Premium subscription tier (Q1 2026)"
                                />
                                <Button variant="ghost" size="icon" onClick={() => removeFromArray('future_products', index)}>
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                            </div>
                        ))}
                        {data.future_products.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4">No future products planned</p>
                        )}
                    </CardContent>
                </Card>

                {/* Future Markets */}
                <Card className="border-green-200">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <Globe2 className="w-5 h-5 text-green-600" />
                                    Future Markets & Audiences
                                </CardTitle>
                                <CardDescription>What new markets or customer segments will you target?</CardDescription>
                            </div>
                            <Button onClick={() => addToArray('future_markets')} size="sm" variant="outline">
                                <Plus className="w-4 h-4 mr-2" /> Add Market
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {(data.future_markets || []).map((market: string, index: number) => (
                            <div key={index} className="flex gap-2">
                                <Input
                                    value={market}
                                    onChange={(e) => updateArrayItem('future_markets', index, e.target.value)}
                                    placeholder="e.g., European market (2027), B2B enterprise segment (2026), Gen Z audience (2025)"
                                />
                                <Button variant="ghost" size="icon" onClick={() => removeFromArray('future_markets', index)}>
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                            </div>
                        ))}
                        {data.future_markets.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4">No future markets defined</p>
                        )}
                    </CardContent>
                </Card>

                {/* Future Positioning */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-purple-600" />
                            Future Positioning
                        </CardTitle>
                        <CardDescription>How will your positioning evolve over the next 3-5 years?</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Textarea
                            value={data.future_positioning || ""}
                            onChange={(e) => updateField('future_positioning', e.target.value)}
                            placeholder="e.g., 'Shift from budget-friendly to premium authority', 'Expand from product brand to lifestyle movement', 'Position as industry leader in sustainability'"
                            className="min-h-[120px]"
                        />
                    </CardContent>
                </Card>

                {/* Brand Evolution Path */}
                <Card className="border-amber-200 bg-amber-50/30">
                    <CardHeader>
                        <CardTitle>Brand Evolution Path</CardTitle>
                        <CardDescription>How will the brand identity evolve without losing its core?</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Textarea
                            value={data.brand_evolution_path || ""}
                            onChange={(e) => updateField('brand_evolution_path', e.target.value)}
                            placeholder="e.g., 'Maintain rebellious spirit but become more refined', 'Keep educational focus but add entertainment', 'Stay authentic but scale production quality'"
                            className="min-h-[120px] bg-white"
                        />
                    </CardContent>
                </Card>

                {/* 3-Year Vision */}
                <Card>
                    <CardHeader>
                        <CardTitle>3-Year Vision (2027)</CardTitle>
                        <CardDescription>Where do you want to be in 3 years?</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Textarea
                            value={data.three_year_vision || ""}
                            onChange={(e) => updateField('three_year_vision', e.target.value)}
                            placeholder="e.g., '$10M ARR, 100,000 customers, recognized as top 3 in category, featured in major publications'"
                            className="min-h-[120px]"
                        />
                    </CardContent>
                </Card>

                {/* 5-Year Vision */}
                <Card className="border-purple-200 bg-purple-50/30">
                    <CardHeader>
                        <CardTitle>5-Year Vision (2029)</CardTitle>
                        <CardDescription>What's the ultimate transformation you want to achieve?</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Textarea
                            value={data.five_year_vision || ""}
                            onChange={(e) => updateField('five_year_vision', e.target.value)}
                            placeholder="e.g., 'Category leader, $50M+ revenue, international presence, brand synonymous with [outcome]'"
                            className="min-h-[120px] bg-white"
                        />
                    </CardContent>
                </Card>

                {/* Expansion Strategy */}
                <Card>
                    <CardHeader>
                        <CardTitle>Expansion Strategy</CardTitle>
                        <CardDescription>How will you scale and expand strategically?</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Textarea
                            value={data.expansion_strategy || ""}
                            onChange={(e) => updateField('expansion_strategy', e.target.value)}
                            placeholder="e.g., 'Phase 1: Master US market. Phase 2: Launch in EU. Phase 3: Strategic partnerships with [companies]. Phase 4: Acquire competitors.'"
                            className="min-h-[120px]"
                        />
                    </CardContent>
                </Card>
            </div>
        </Shell>
    );
}

