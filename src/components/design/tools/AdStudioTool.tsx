
"use client";

import { useState, useEffect } from "react";
import { useProject } from "@/contexts/ProjectContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, Image as ImageIcon } from "lucide-react";
import AdCanvas from "@/components/design/AdCanvas";
import { toast } from "sonner";

export default function AdStudioTool() {
    const { currentProject } = useProject();
    const [activeTab, setActiveTab] = useState("strategy");

    // Strategy State
    const [products, setProducts] = useState<any[]>([]);
    const [selectedProductId, setSelectedProductId] = useState<string>("");
    const [goal, setGoal] = useState("Drive Sales");
    const [audience, setAudience] = useState("Young Adults interested in trend");
    const [isGeneratingStrategy, setIsGeneratingStrategy] = useState(false);
    const [strategy, setStrategy] = useState<any>(null);

    // Visuals State
    const [visualMode, setVisualMode] = useState("scene");
    const [visualPrompt, setVisualPrompt] = useState("");
    const [isGeneratingVisual, setIsGeneratingVisual] = useState(false);
    const [generatedVisualUrl, setGeneratedVisualUrl] = useState<string | null>(null);

    // Fetch Products on Mount
    useEffect(() => {
        if (currentProject?.id) {
            fetch(`/api/projects/${currentProject.id}/commerce/products?per_page=20`)
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) {
                        setProducts(data);
                    } else if (data && Array.isArray(data.products)) {
                        setProducts(data.products);
                    } else {
                        console.warn("Unexpected products response format:", data);
                        setProducts([]);
                    }
                })
                .catch(err => {
                    console.error("Failed to load products", err);
                    setProducts([]);
                });
        }
    }, [currentProject?.id]);

    // Handler: Generate Strategy
    const handleGenerateStrategy = async () => {
        if (!selectedProductId || !currentProject) return;

        setIsGeneratingStrategy(true);
        try {
            const res = await fetch('/api/ai/ad-studio/strategy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: currentProject.id,
                    productId: selectedProductId,
                    goal,
                    audience
                })
            });

            const data = await res.json();
            if (data.error) throw new Error(data.error);

            setStrategy(data.strategy);
            // Auto-fill visual prompt
            if (data.strategy.visual_prompt) {
                setVisualPrompt(data.strategy.visual_prompt);
            }
            toast.success("Strategy generated!");
            setActiveTab("visuals");
        } catch (error: any) {
            toast.error(error.message || "Failed to generate strategy");
        } finally {
            setIsGeneratingStrategy(false);
        }
    };

    // Handler: Generate Visual
    const handleGenerateVisual = async () => {
        if (!currentProject || !selectedProductId) return;
        setIsGeneratingVisual(true);

        try {
            // Find product image
            const product = products.find(p => p.id.toString() === selectedProductId);
            const productImageUrl = product?.images?.[0]?.src;

            if (!productImageUrl) throw new Error("Product has no image");

            const res = await fetch('/api/ai/ad-studio/visuals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: visualPrompt,
                    productImageUrl,
                    mode: visualMode
                })
            });

            const data = await res.json();
            if (data.error) throw new Error(data.error);

            setGeneratedVisualUrl(data.url);
            toast.success("Visual generated!");
            setActiveTab("editor");

        } catch (error: any) {
            toast.error(error.message || "Failed to generate visual");
        } finally {
            setIsGeneratingVisual(false);
        }
    };

    return (
        <div className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
                    <TabsTrigger value="strategy">1. Strategy</TabsTrigger>
                    <TabsTrigger value="visuals" disabled={!strategy}>2. Visuals</TabsTrigger>
                    <TabsTrigger value="editor" disabled={!generatedVisualUrl}>3. Editor</TabsTrigger>
                </TabsList>

                {/* TAB 1: STRATEGY */}
                <TabsContent value="strategy" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Strategy Engine</CardTitle>
                            <CardDescription>Configure your campaign inputs to generate a winning ad blueprint.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-2">
                                <Label>Select Product</Label>
                                <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Choose a product..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Array.isArray(products) && products.map(p => (
                                            <SelectItem key={p.id} value={p.id.toString()}>
                                                {p.name} (${p.price})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <Label>Campaign Goal</Label>
                                <Input value={goal} onChange={e => setGoal(e.target.value)} />
                            </div>

                            <div className="grid gap-2">
                                <Label>Target Audience</Label>
                                <Textarea value={audience} onChange={e => setAudience(e.target.value)} placeholder="Who is this for?" />
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button onClick={handleGenerateStrategy} disabled={isGeneratingStrategy || !selectedProductId} className="w-full">
                                {isGeneratingStrategy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                Generate Ad Blueprint
                            </Button>
                        </CardFooter>
                    </Card>

                    {strategy && (
                        <Card className="bg-muted/50">
                            <CardHeader>
                                <CardTitle>Generated Blueprint</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-1">
                                    <Label className="font-bold">Headline</Label>
                                    <p>{strategy.headline}</p>
                                </div>
                                <div className="grid gap-1">
                                    <Label className="font-bold">Body Copy</Label>
                                    <p>{strategy.body_copy}</p>
                                </div>
                                <div className="grid gap-1">
                                    <Label className="font-bold">Visual Idea</Label>
                                    <p className="text-sm text-muted-foreground">{strategy.visual_prompt}</p>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {/* TAB 2: VISUALS */}
                <TabsContent value="visuals" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Visual Generator</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-2">
                                    <Label>Mode</Label>
                                    <Select value={visualMode} onValueChange={setVisualMode}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="scene">Scene Composition</SelectItem>
                                            <SelectItem value="human">Human Interaction</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label>Prompt</Label>
                                    <Textarea
                                        value={visualPrompt}
                                        onChange={e => setVisualPrompt(e.target.value)}
                                        className="h-32"
                                    />
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button onClick={handleGenerateVisual} disabled={isGeneratingVisual} className="w-full">
                                    {isGeneratingVisual ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}
                                    Generate Visual
                                </Button>
                            </CardFooter>
                        </Card>

                        <Card className="flex flex-col">
                            <CardHeader><CardTitle>Preview</CardTitle></CardHeader>
                            <CardContent className="flex-1 flex items-center justify-center bg-muted/20 min-h-[300px]">
                                {generatedVisualUrl ? (
                                    <img src={generatedVisualUrl} alt="Generated Ad" className="max-w-full rounded-md shadow-sm" />
                                ) : (
                                    <div className="text-center text-muted-foreground">
                                        <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-20" />
                                        <p>No visual generated yet</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* TAB 3: EDITOR */}
                <TabsContent value="editor" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Ad Editor</CardTitle>
                            <CardDescription>Finalize your ad by overlaying text and logos.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex justify-center bg-gray-50 p-8">
                            {generatedVisualUrl ? (
                                <AdCanvas
                                    width={1080}
                                    height={1080}
                                    backgroundImage={generatedVisualUrl}
                                    initialLayers={[
                                        { type: 'text', content: strategy?.headline || "HEADLINE HERE", options: { top: 100, fontSize: 60 } }
                                    ]}
                                />
                            ) : (
                                <div className="text-center p-12">
                                    <p>Please generate a visual first.</p>
                                    <Button variant="link" onClick={() => setActiveTab("visuals")}>Go to Visuals</Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
