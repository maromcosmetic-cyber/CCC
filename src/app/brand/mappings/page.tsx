'use client';

import { useState, useEffect } from "react";
import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Network, Save, Plus, Trash2, ArrowRight, Target, Package, Users, Zap } from "lucide-react";
import { useProject } from "@/contexts/ProjectContext";

interface StrategyMap {
    product: string;
    audience: string;
    value_proposition: string;
    pain_addressed: string;
    emotional_outcome: string;
}

export default function MappingsPage() {
    const { currentProject, updateBrandIdentity } = useProject();
    const [mappings, setMappings] = useState<StrategyMap[]>([]);

    useEffect(() => {
        if (currentProject?.brandIdentity?.strategy_mappings) {
            setMappings(currentProject.brandIdentity.strategy_mappings);
        }
    }, [currentProject]);

    const handleSave = () => {
        const brandIdentity = currentProject?.brandIdentity || {};
        updateBrandIdentity({ ...brandIdentity, strategy_mappings: mappings });
        alert("Strategic Mappings Saved!");
    };

    const addMapping = () => {
        setMappings(prev => [
            ...prev,
            {
                product: '',
                audience: '',
                value_proposition: '',
                pain_addressed: '',
                emotional_outcome: ''
            }
        ]);
    };

    const removeMapping = (index: number) => {
        setMappings(prev => prev.filter((_, i) => i !== index));
    };

    const updateMapping = (index: number, field: keyof StrategyMap, value: string) => {
        setMappings(prev => prev.map((mapping, i) =>
            i === index ? { ...mapping, [field]: value } : mapping
        ));
    };

    return (
        <Shell>
            <div className="max-w-7xl mx-auto space-y-8 pb-20">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-orange-600 font-bold text-xs uppercase tracking-widest mb-2">
                            <Network className="w-3 h-3" /> Strategic Alignment
                        </div>
                        <h1 className="text-3xl font-display font-bold">Product-to-Audience-to-Value Mappings</h1>
                        <p className="text-muted-foreground">
                            Connect your products to specific audiences with precise value propositions.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={addMapping} variant="outline">
                            <Plus className="w-4 h-4 mr-2" /> Add Mapping
                        </Button>
                        <Button onClick={handleSave}>
                            <Save className="w-4 h-4 mr-2" /> Save Mappings
                        </Button>
                    </div>
                </div>

                <Card className="bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-200">
                    <CardContent className="p-4">
                        <p className="text-sm text-orange-800">
                            <strong>Why This Matters:</strong> AI uses these mappings to match the right product message to the right audience at the right time.
                        </p>
                    </CardContent>
                </Card>

                {mappings.length === 0 && (
                    <Card className="border-dashed">
                        <CardContent className="p-12 text-center">
                            <Network className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground mb-4">No strategic mappings defined yet</p>
                            <Button onClick={addMapping}>
                                <Plus className="w-4 h-4 mr-2" /> Create Your First Mapping
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {mappings.map((mapping, index) => (
                    <Card key={index} className="border-2 border-orange-100 bg-gradient-to-br from-white to-orange-50/30">
                        <CardHeader className="border-b bg-white">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <div className="h-8 w-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-sm">
                                        {index + 1}
                                    </div>
                                    Strategic Connection Map
                                </CardTitle>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeMapping(index)}
                                >
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-6">
                            {/* Visual Flow Diagram */}
                            <div className="mb-8 p-6 bg-white rounded-lg border-2 border-dashed border-orange-200">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex-1 flex flex-col items-center text-center">
                                        <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-2">
                                            <Package className="w-8 h-8 text-blue-600" />
                                        </div>
                                        <Badge variant="outline" className="text-xs">Product</Badge>
                                        <p className="text-sm font-semibold mt-2 min-h-[20px]">
                                            {mapping.product || '...'}
                                        </p>
                                    </div>

                                    <ArrowRight className="w-8 h-8 text-orange-400 flex-shrink-0" />

                                    <div className="flex-1 flex flex-col items-center text-center">
                                        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-2">
                                            <Users className="w-8 h-8 text-green-600" />
                                        </div>
                                        <Badge variant="outline" className="text-xs">Audience</Badge>
                                        <p className="text-sm font-semibold mt-2 min-h-[20px]">
                                            {mapping.audience || '...'}
                                        </p>
                                    </div>

                                    <ArrowRight className="w-8 h-8 text-orange-400 flex-shrink-0" />

                                    <div className="flex-1 flex flex-col items-center text-center">
                                        <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mb-2">
                                            <Zap className="w-8 h-8 text-purple-600" />
                                        </div>
                                        <Badge variant="outline" className="text-xs">Value</Badge>
                                        <p className="text-sm font-semibold mt-2 min-h-[20px]">
                                            {mapping.value_proposition ? mapping.value_proposition.substring(0, 30) + '...' : '...'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Input Fields */}
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Product */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-2">
                                            <Package className="w-3 h-3 text-blue-600" />
                                            Product/Service
                                        </label>
                                        <Input
                                            value={mapping.product}
                                            onChange={(e) => updateMapping(index, 'product', e.target.value)}
                                            placeholder="e.g., Premium Membership, Starter Package"
                                            className="bg-white"
                                        />
                                    </div>

                                    {/* Audience */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-2">
                                            <Users className="w-3 h-3 text-green-600" />
                                            Target Audience
                                        </label>
                                        <Input
                                            value={mapping.audience}
                                            onChange={(e) => updateMapping(index, 'audience', e.target.value)}
                                            placeholder="e.g., Small business owners, Fitness enthusiasts"
                                            className="bg-white"
                                        />
                                    </div>
                                </div>

                                {/* Value Proposition */}
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-2">
                                        <Zap className="w-3 h-3 text-purple-600" />
                                        Value Proposition (What makes this perfect for them?)
                                    </label>
                                    <Textarea
                                        value={mapping.value_proposition}
                                        onChange={(e) => updateMapping(index, 'value_proposition', e.target.value)}
                                        placeholder="e.g., 'Gives busy entrepreneurs a done-for-you system that saves 10 hours/week'"
                                        className="min-h-[80px] bg-white"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Pain Addressed */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-2">
                                            <Target className="w-3 h-3 text-red-600" />
                                            Pain Point Addressed
                                        </label>
                                        <Textarea
                                            value={mapping.pain_addressed}
                                            onChange={(e) => updateMapping(index, 'pain_addressed', e.target.value)}
                                            placeholder="e.g., 'Overwhelmed by marketing, no time to learn complex tools'"
                                            className="min-h-[80px] bg-white"
                                        />
                                    </div>

                                    {/* Emotional Outcome */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-2">
                                            <span className="text-pink-600">❤️</span>
                                            Emotional Outcome
                                        </label>
                                        <Textarea
                                            value={mapping.emotional_outcome}
                                            onChange={(e) => updateMapping(index, 'emotional_outcome', e.target.value)}
                                            placeholder="e.g., 'Feel confident, in control, and professional'"
                                            className="min-h-[80px] bg-white"
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {mappings.length > 0 && (
                    <Card className="border-green-200 bg-green-50">
                        <CardContent className="p-4">
                            <p className="text-sm text-green-800">
                                <strong>✓ {mappings.length} Strategic Mapping{mappings.length !== 1 ? 's' : ''} Created:</strong> AI can now deliver hyper-targeted messaging.
                            </p>
                        </CardContent>
                    </Card>
                )}

                {/* AI Usage Explanation */}
                <Card className="border-indigo-200 bg-indigo-50">
                    <CardHeader>
                        <CardTitle className="text-sm">How AI Uses These Mappings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm text-indigo-900">
                        <p>✓ <strong>Ad Creation:</strong> Generates audience-specific ads with the right value prop</p>
                        <p>✓ <strong>Email Campaigns:</strong> Segments messaging based on product-audience fit</p>
                        <p>✓ <strong>Landing Pages:</strong> Customizes copy to match audience pain → product solution</p>
                        <p>✓ <strong>Product Recommendations:</strong> Suggests the right product to the right person</p>
                    </CardContent>
                </Card>
            </div>
        </Shell>
    );
}
