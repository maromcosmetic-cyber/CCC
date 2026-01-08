'use client';

import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Sparkles, Wand2, Upload, Loader2, RefreshCw } from "lucide-react";
import { useProject } from "@/contexts/ProjectContext";
import { useState } from "react";

export default function CharacterStudioPage() {
    const { currentProject } = useProject();
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);

    // Mock Character Library
    const [characters, setCharacters] = useState([
        { id: 1, name: 'Professional Nurse', url: '/images/char1.jpg' }, // Placeholder
        { id: 2, name: 'Tech Entrepreneur', url: '/images/char2.jpg' }, // Placeholder
    ]);

    const handleGenerate = async () => {
        setIsGenerating(true);
        // Simulate API call
        setTimeout(() => {
            setIsGenerating(false);
            setGeneratedImage("https://placehold.co/600x600/png?text=Generated+Character"); // Placeholder
        }, 2000);
    };

    return (
        <Shell>
            <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-purple-600 font-bold text-xs uppercase tracking-widest">
                            <User className="w-3 h-3" /> Character consistent generation
                        </div>
                        <h1 className="text-4xl font-display font-black text-foreground tracking-tight">Character Studio</h1>
                        <p className="text-muted-foreground text-lg">
                            Create consistent, Hollywood-quality characters for your campaigns.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Generator Controls */}
                    <div className="lg:col-span-1 space-y-6">
                        <Card className="glass-card">
                            <CardHeader>
                                <CardTitle>Generator</CardTitle>
                                <CardDescription>Define your character's look</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Tabs defaultValue="text" className="w-full">
                                    <TabsList className="grid w-full grid-cols-2 mb-4">
                                        <TabsTrigger value="text">Text Direct</TabsTrigger>
                                        <TabsTrigger value="ref">Reference</TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="text" className="space-y-4">
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <label className="text-sm font-medium">Description</label>
                                                <Button variant="ghost" size="sm" className="h-6 text-purple-600">
                                                    <Wand2 className="w-3 h-3 mr-1" /> Enhance
                                                </Button>
                                            </div>
                                            <Textarea
                                                placeholder="e.g. A professional nurse in blue scrubs, smiling warmly, looking at camera, studio lighting..."
                                                rows={5}
                                                className="resize-none"
                                            />
                                        </div>
                                        <Button
                                            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                                            onClick={handleGenerate}
                                            disabled={isGenerating}
                                        >
                                            {isGenerating ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    Generating...
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles className="w-4 h-4 mr-2" />
                                                    Generate Character
                                                </>
                                            )}
                                        </Button>
                                    </TabsContent>

                                    <TabsContent value="ref" className="space-y-4">
                                        <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-muted/50 cursor-pointer transition-colors">
                                            <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                                            <p className="text-sm font-medium">Upload Reference Photo</p>
                                            <p className="text-xs text-muted-foreground mt-1">We'll adopt the look & style</p>
                                        </div>
                                        <Button className="w-full" disabled>
                                            Generate from Ref (Coming Soon)
                                        </Button>
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>

                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800">
                            <p className="font-semibold flex items-center gap-2 mb-1">
                                <Sparkles className="w-4 h-4" /> Pro Tip
                            </p>
                            <p className="opacity-90">
                                For best results, specify: Age, Ethnicity, Outfit, and Expression. Characters are generated on pure white backgrounds for easy compositing.
                            </p>
                        </div>
                    </div>

                    {/* Right Column: Preview & Library */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Preview Area */}
                        {isGenerating || generatedImage ? (
                            <Card className="glass-card overflow-hidden">
                                <div className="aspect-video bg-black/5 relative flex items-center justify-center">
                                    {isGenerating ? (
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="relative">
                                                <div className="w-16 h-16 rounded-full border-4 border-purple-200 border-t-purple-600 animate-spin" />
                                                <User className="w-8 h-8 text-purple-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                                            </div>
                                            <p className="text-muted-foreground font-medium animate-pulse">Crafting your character...</p>
                                        </div>
                                    ) : (
                                        <img src={generatedImage!} alt="Generated Character" className="w-full h-full object-contain" />
                                    )}
                                </div>
                                {!isGenerating && (
                                    <div className="p-4 flex justify-between items-center border-t">
                                        <Input placeholder="Name your character..." className="max-w-[200px]" />
                                        <div className="flex gap-2">
                                            <Button variant="outline" onClick={() => setGeneratedImage(null)}>Discard</Button>
                                            <Button>Save to Library</Button>
                                        </div>
                                    </div>
                                )}
                            </Card>
                        ) : null}

                        {/* Recent Characters Grid */}
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold">Your Characters</h3>
                                <Button variant="ghost" size="sm">
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Refresh
                                </Button>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {characters.map((char) => (
                                    <div key={char.id} className="group relative aspect-square bg-white rounded-xl border shadow-sm hover:shadow-md transition-all overflow-hidden cursor-pointer">
                                        <div className="absolute inset-0 bg-muted/20 flex items-center justify-center text-muted-foreground">
                                            <User className="w-12 h-12 opacity-20" />
                                        </div>
                                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3 translate-y-full group-hover:translate-y-0 transition-transform">
                                            <p className="text-white font-medium text-sm truncate">{char.name}</p>
                                        </div>
                                    </div>
                                ))}
                                {/* Empty State / Placeholders */}
                                {[...Array(4)].map((_, i) => (
                                    <div key={`placeholder-${i}`} className="aspect-square bg-muted/10 rounded-xl border border-dashed flex items-center justify-center text-muted-foreground/30">
                                        <User className="w-8 h-8" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Shell>
    );
}
