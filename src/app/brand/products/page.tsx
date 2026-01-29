'use client';

import { useState, useEffect } from "react";
import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Package, Save, Plus, Trash2, Star, TrendingUp, Layers } from "lucide-react";
import { useProject } from "@/contexts/ProjectContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Product {
    name: string;
    functional_purpose: string;
    emotional_purpose: string;
    customer_journey_stage: string;
    problems_solved: string;
    objections_overcome: string;
    superiority_reason: string;
    strategic_position: string;
    story: string;
}

export default function ProductsPage() {
    const { currentProject, updateBrandIdentity } = useProject();
    const [products, setProducts] = useState<Product[]>([]);

    useEffect(() => {
        if (currentProject?.brandIdentity?.product_intelligence) {
            setProducts(currentProject.brandIdentity.product_intelligence);
        }
    }, [currentProject]);

    const handleSave = () => {
        const brandIdentity = currentProject?.brandIdentity || {};
        updateBrandIdentity({ ...brandIdentity, product_intelligence: products });
        alert("Product Intelligence Saved!");
    };

    const addProduct = () => {
        setProducts(prev => [
            ...prev,
            {
                name: '',
                functional_purpose: '',
                emotional_purpose: '',
                customer_journey_stage: '',
                problems_solved: '',
                objections_overcome: '',
                superiority_reason: '',
                strategic_position: 'Core',
                story: ''
            }
        ]);
    };

    const removeProduct = (index: number) => {
        setProducts(prev => prev.filter((_, i) => i !== index));
    };

    const updateProduct = (index: number, field: keyof Product, value: string) => {
        setProducts(prev => prev.map((product, i) =>
            i === index ? { ...product, [field]: value } : product
        ));
    };

    const getPositionBadge = (position: string) => {
        const badges: { [key: string]: string } = {
            'Hero': 'bg-purple-100 text-purple-700 border-purple-300',
            'Core': 'bg-blue-100 text-blue-700 border-blue-300',
            'Support': 'bg-green-100 text-green-700 border-green-300',
            'Entry': 'bg-amber-100 text-amber-700 border-amber-300',
            'Upsell': 'bg-pink-100 text-pink-700 border-pink-300'
        };
        return badges[position] || 'bg-gray-100 text-gray-700 border-gray-300';
    };

    return (
        <Shell>
            <div className="max-w-6xl mx-auto space-y-8 pb-20">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-widest mb-2">
                            <Package className="w-3 h-3" /> Product Intelligence
                        </div>
                        <h1 className="text-3xl font-display font-bold">Strategic Product Architecture</h1>
                        <p className="text-muted-foreground">
                            AI uses this to build funnels, bundles, and strategic cross-sells.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={addProduct} variant="outline">
                            <Plus className="w-4 h-4 mr-2" /> Add Product
                        </Button>
                        <Button onClick={handleSave}>
                            <Save className="w-4 h-4 mr-2" /> Save Intelligence
                        </Button>
                    </div>
                </div>

                <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4">
                        <p className="text-sm text-blue-800">
                            <strong>Product = Strategic Weapon:</strong> Each product should be positioned based on its role in the customer journey and revenue model.
                        </p>
                    </CardContent>
                </Card>

                {products.length === 0 && (
                    <Card className="border-dashed">
                        <CardContent className="p-12 text-center">
                            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground mb-4">No products defined yet</p>
                            <Button onClick={addProduct}>
                                <Plus className="w-4 h-4 mr-2" /> Add Your First Product
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {products.map((product, index) => (
                    <Card key={index} className="border-2 border-blue-100">
                        <CardHeader className="bg-gradient-to-r from-blue-50 to-transparent border-b">
                            <div className="flex items-start justify-between">
                                <div className="flex-1 space-y-2">
                                    <div className="flex items-center gap-3">
                                        <Input
                                            value={product.name}
                                            onChange={(e) => updateProduct(index, 'name', e.target.value)}
                                            placeholder="Product Name"
                                            className="font-semibold text-lg border-none shadow-none focus-visible:ring-0"
                                        />
                                        <Badge className={`${getPositionBadge(product.strategic_position)} border`}>
                                            {product.strategic_position || 'Core'}
                                        </Badge>
                                    </div>
                                    <div className="flex gap-2">
                                        <Select
                                            value={product.strategic_position}
                                            onValueChange={(value) => updateProduct(index, 'strategic_position', value)}
                                        >
                                            <SelectTrigger className="w-[200px]">
                                                <SelectValue placeholder="Strategic Position" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Hero">🌟 Hero (Flagship)</SelectItem>
                                                <SelectItem value="Core">💎 Core (Revenue Driver)</SelectItem>
                                                <SelectItem value="Support">🛡️ Support (Complementary)</SelectItem>
                                                <SelectItem value="Entry">🚪 Entry (Lead Gen)</SelectItem>
                                                <SelectItem value="Upsell">📈 Upsell (Premium)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeProduct(index)}
                                        >
                                            <Trash2 className="w-4 h-4 text-red-500" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Functional Purpose */}
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground uppercase">Functional Purpose</label>
                                    <Textarea
                                        value={product.functional_purpose}
                                        onChange={(e) => updateProduct(index, 'functional_purpose', e.target.value)}
                                        placeholder="What does this product DO? (Features, specs)"
                                        className="min-h-[80px] bg-white"
                                    />
                                </div>

                                {/* Emotional Purpose */}
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground uppercase">Emotional Purpose</label>
                                    <Textarea
                                        value={product.emotional_purpose}
                                        onChange={(e) => updateProduct(index, 'emotional_purpose', e.target.value)}
                                        placeholder="How does this make them FEEL? (Confidence, relief, status)"
                                        className="min-h-[80px] bg-white"
                                    />
                                </div>
                            </div>

                            {/* Customer Journey Stage */}
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground uppercase">When Introduced (Customer Journey Stage)</label>
                                <Input
                                    value={product.customer_journey_stage}
                                    onChange={(e) => updateProduct(index, 'customer_journey_stage', e.target.value)}
                                    placeholder="e.g., Awareness, Consideration, Decision, Post-Purchase"
                                    className="bg-white"
                                />
                            </div>

                            {/* Problems Solved */}
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground uppercase">Problems This Product Solves</label>
                                <Textarea
                                    value={product.problems_solved}
                                    onChange={(e) => updateProduct(index, 'problems_solved', e.target.value)}
                                    placeholder="List specific pain points this product addresses"
                                    className="min-h-[80px] bg-white"
                                />
                            </div>

                            {/* Objections Overcome */}
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground uppercase">Objections This Product Overcomes</label>
                                <Textarea
                                    value={product.objections_overcome}
                                    onChange={(e) => updateProduct(index, 'objections_overcome', e.target.value)}
                                    placeholder="e.g., 'Too expensive' → 'Payment plans available', 'Takes too long' → 'Results in 7 days'"
                                    className="min-h-[80px] bg-white"
                                />
                            </div>

                            {/* Superiority Reason */}
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground uppercase">Why This Product is Superior</label>
                                <Textarea
                                    value={product.superiority_reason}
                                    onChange={(e) => updateProduct(index, 'superiority_reason', e.target.value)}
                                    placeholder="What makes this better than alternatives? (Unique ingredients, methodology, technology)"
                                    className="min-h-[80px] bg-white"
                                />
                            </div>

                            {/* Story */}
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground uppercase">Product Story</label>
                                <Textarea
                                    value={product.story}
                                    onChange={(e) => updateProduct(index, 'story', e.target.value)}
                                    placeholder="Why was this product created? What narrative does it carry?"
                                    className="min-h-[80px] bg-white"
                                />
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {products.length > 0 && (
                    <Card className="border-green-200 bg-green-50">
                        <CardContent className="p-4">
                            <p className="text-sm text-green-800">
                                <strong>✓ {products.length} Product{products.length !== 1 ? 's' : ''} Mapped:</strong> AI can now build strategic funnels and cross-sell logic.
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </Shell>
    );
}

