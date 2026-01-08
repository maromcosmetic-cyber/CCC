'use client';

import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowRight, Check, Play, MapPin, User, FileText, ShoppingBag, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useProject } from "@/contexts/ProjectContext";

const STEPS = [
    { id: 1, name: 'Location', icon: MapPin },
    { id: 2, name: 'Character', icon: User },
    { id: 3, name: 'Script & Voice', icon: FileText },
    { id: 4, name: 'Product', icon: ShoppingBag },
    { id: 5, name: 'Generate', icon: Play },
];

export default function UGCVideoPage() {
    const router = useRouter();
    const { currentProject } = useProject();
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        location: '',
        character: '',
        script: '',
        voice: '',
        product: '',
    });

    const handleNext = () => {
        if (currentStep < STEPS.length) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleGenerate = () => {
        setLoading(true);
        // Simulate generation
        setTimeout(() => {
            setLoading(false);
            alert("Video generation started! This would trigger the backend job.");
            router.push('/design/overview');
        }, 2000);
    };

    return (
        <Shell>
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => router.back()}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                    </Button>
                </div>

                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-purple-600 font-bold text-xs uppercase tracking-widest">
                        <Play className="w-3 h-3" /> Video Production
                    </div>
                    <h1 className="text-4xl font-display font-black text-foreground tracking-tight">UGC Video Generator</h1>
                    <p className="text-muted-foreground text-lg">
                        Create authentic user-generated content videos in 5 simple steps.
                    </p>
                </div>

                {/* Progress Bar */}
                <div className="relative">
                    <div className="absolute top-1/2 left-0 right-0 h-1 bg-muted -z-10" />
                    <div
                        className="absolute top-1/2 left-0 h-1 bg-purple-600 -z-10 transition-all duration-500"
                        style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
                    />
                    <div className="flex justify-between">
                        {STEPS.map((step) => {
                            const isActive = currentStep >= step.id;
                            const isCurrent = currentStep === step.id;
                            return (
                                <div key={step.id} className="flex flex-col items-center gap-2 bg-background p-2">
                                    <div
                                        className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${isActive
                                                ? 'bg-purple-600 border-purple-600 text-white'
                                                : 'bg-background border-muted text-muted-foreground'
                                            }`}
                                    >
                                        <step.icon className="w-5 h-5" />
                                    </div>
                                    <span className={`text-xs font-medium ${isCurrent ? 'text-foreground' : 'text-muted-foreground'}`}>
                                        {step.name}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <Card className="glass-card min-h-[400px] flex flex-col justify-center">
                    <CardHeader>
                        <CardTitle>Step {currentStep}: {STEPS[currentStep - 1].name}</CardTitle>
                        <CardDescription>
                            {currentStep === 1 && "Choose where your video takes place"}
                            {currentStep === 2 && "Select an AI actor for your video"}
                            {currentStep === 3 && "Write what they should say and how"}
                            {currentStep === 4 && "Feature your product in the video"}
                            {currentStep === 5 && "Review and generate your video"}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1">
                        {/* Step content */}
                        {currentStep === 1 && (
                            <div className="space-y-4 max-w-md">
                                <Label>Scene Location</Label>
                                <Input
                                    placeholder="e.g. Modern living room, sunny beach, coffee shop"
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                />
                                <div className="grid grid-cols-2 gap-4 mt-4">
                                    {['Living Room', 'Kitchen', 'Office', 'Outdoors'].map((loc) => (
                                        <div
                                            key={loc}
                                            className="p-4 border rounded-lg cursor-pointer hover:border-purple-600 hover:bg-purple-50 transition-colors text-center text-sm"
                                            onClick={() => setFormData({ ...formData, location: loc })}
                                        >
                                            {loc}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {currentStep === 2 && (
                            <div className="space-y-4 max-w-md">
                                <Label>Select Character</Label>
                                <Select
                                    value={formData.character}
                                    onValueChange={(val) => setFormData({ ...formData, character: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Choose an actor" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="sarah">Sarah (Young Professional)</SelectItem>
                                        <SelectItem value="mike">Mike (Fitness Enthusiast)</SelectItem>
                                        <SelectItem value="emma">Emma (Lifestyle)</SelectItem>
                                        <SelectItem value="david">David (Tech Reviewer)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {currentStep === 3 && (
                            <div className="space-y-6 max-w-lg">
                                <div className="space-y-2">
                                    <Label>Script</Label>
                                    <Textarea
                                        placeholder="Enter the dialogue here..."
                                        rows={5}
                                        value={formData.script}
                                        onChange={(e) => setFormData({ ...formData, script: e.target.value })}
                                    />
                                    <p className="text-xs text-muted-foreground text-right">{formData.script.length}/500 chars</p>
                                </div>
                                <div className="space-y-2">
                                    <Label>Voice Style</Label>
                                    <Select
                                        value={formData.voice}
                                        onValueChange={(val) => setFormData({ ...formData, voice: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Choose voice style" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="energetic">Energetic & Upbeat</SelectItem>
                                            <SelectItem value="calm">Calm & Soothing</SelectItem>
                                            <SelectItem value="professional">Professional & Authoritative</SelectItem>
                                            <SelectItem value="casual">Casual & Conversational</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}

                        {currentStep === 4 && (
                            <div className="space-y-4 max-w-md">
                                <Label>Featured Product</Label>
                                <Select
                                    value={formData.product}
                                    onValueChange={(val) => setFormData({ ...formData, product: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a product from catalog" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="prod_1">Summer Dress</SelectItem>
                                        <SelectItem value="prod_2">Wireless Headphones</SelectItem>
                                        <SelectItem value="prod_3">Vitamin Supplement</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-sm text-muted-foreground mt-2">
                                    Don't see your product? Go to Catalog to add it first.
                                </p>
                            </div>
                        )}

                        {currentStep === 5 && (
                            <div className="space-y-6">
                                <div className="bg-muted/30 p-6 rounded-lg space-y-3">
                                    <div className="flex justify-between border-b pb-2">
                                        <span className="text-muted-foreground">Location:</span>
                                        <span className="font-medium">{formData.location || 'Not set'}</span>
                                    </div>
                                    <div className="flex justify-between border-b pb-2">
                                        <span className="text-muted-foreground">Character:</span>
                                        <span className="font-medium capitalize">{formData.character || 'Not set'}</span>
                                    </div>
                                    <div className="flex justify-between border-b pb-2">
                                        <span className="text-muted-foreground">Voice:</span>
                                        <span className="font-medium capitalize">{formData.voice || 'Not set'}</span>
                                    </div>
                                    <div className="flex justify-between border-b pb-2">
                                        <span className="text-muted-foreground">Product:</span>
                                        <span className="font-medium capitalize">{formData.product || 'Not set'}</span>
                                    </div>
                                    <div className="pt-2">
                                        <span className="text-muted-foreground block mb-1">Script:</span>
                                        <p className="text-sm italic p-3 bg-background rounded border">{formData.script || 'No script provided'}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Navigation Buttons */}
                <div className="flex justify-between">
                    <Button
                        variant="outline"
                        onClick={handleBack}
                        disabled={currentStep === 1 || loading}
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Previous
                    </Button>

                    {currentStep < 5 ? (
                        <Button onClick={handleNext}>
                            Next Step
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    ) : (
                        <Button
                            className="bg-purple-600 hover:bg-purple-700 text-white min-w-[150px]"
                            onClick={handleGenerate}
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    Generate Video
                                </>
                            )}
                        </Button>
                    )}
                </div>
            </div>
        </Shell>
    );
}
