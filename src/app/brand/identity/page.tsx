'use client';

import { useState, useEffect } from "react";
import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Loader2, Wand2, Save, FileText, Globe, Target, TrendingUp, DollarSign, Users } from "lucide-react";
import { useProject } from "@/contexts/ProjectContext";
// import { toast } from "sonner"; 

export default function BrandIdentityPage() {
    const { currentProject, updateBrandIdentity } = useProject();
    const [url, setUrl] = useState("");
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [data, setData] = useState<any>({});

    // Load initial data
    useEffect(() => {
        if (currentProject?.website_url) setUrl(currentProject.website_url);
        if (currentProject?.brandIdentity) {
            setData(currentProject.brandIdentity);
        }
    }, [currentProject]);

    const handleAnalyze = async () => {
        if (!url) return;
        setIsAnalyzing(true);
        try {
            const res = await fetch('/api/brand/scrape', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });
            const result = await res.json();
            if (result.error) throw new Error(result.error);

            // Merge with existing data so we don't lose other sections if they existed
            const newData = { ...data, ...result.data };
            setData(newData);
            updateBrandIdentity(newData);
            // Alert user (using simpler alert if toast not standard/configured yet)
            // alert("Analysis Complete! Brand Identity populated.");
        } catch (error: any) {
            console.error(error);
            alert(`Analysis Failed: ${error.message}`);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleSave = () => {
        updateBrandIdentity(data);
        alert("Brand Identity Saved!");
    };

    const updateField = (section: string, field: string, value: any) => {
        const sectionData = data[section] || {};
        setData({
            ...data,
            [section]: { ...sectionData, [field]: value }
        });
    };

    // Helper to render text inputs
    const renderInput = (section: string, field: string, label: string, placeholder?: string) => (
        <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase">{label}</label>
            <Input
                value={data[section]?.[field] || ""}
                onChange={(e) => updateField(section, field, e.target.value)}
                placeholder={placeholder}
                className="bg-white"
            />
        </div>
    );

    const renderTextarea = (section: string, field: string, label: string) => (
        <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase">{label}</label>
            <Textarea
                value={data[section]?.[field] || ""}
                onChange={(e) => updateField(section, field, e.target.value)}
                className="bg-white min-h-[80px]"
            />
        </div>
    );

    return (
        <Shell>
            <div className="max-w-5xl mx-auto space-y-8 pb-20">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-display font-bold">Brand DNA & Identity</h1>
                        <p className="text-muted-foreground">The core strategic blueprint of your brand.</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={handleSave}><Save className="w-4 h-4 mr-2" /> Save Changes</Button>
                    </div>
                </div>

                {/* Analysis Section */}
                <Card className="bg-indigo-50 border-indigo-100">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Wand2 className="w-5 h-5 text-indigo-600" /> AI Auto-Discovery</CardTitle>
                        <CardDescription>Enter your website URL to automatically extract and infer your entire 14-point brand strategy.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex gap-4">
                        <Input
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://example.com"
                            className="bg-white"
                        />
                        <Button onClick={handleAnalyze} disabled={isAnalyzing} className="bg-indigo-600 hover:bg-indigo-700">
                            {isAnalyzing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</> : "Analyze Site"}
                        </Button>
                    </CardContent>
                </Card>

                <Accordion type="multiple" defaultValue={["dna", "product"]} className="space-y-4">

                    {/* 1. Brand DNA */}
                    <AccordionItem value="dna" className="border rounded-lg bg-card px-4">
                        <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-md bg-blue-100 text-blue-600"><FingerprintIcon className="w-5 h-5" /></div>
                                <div className="text-left">
                                    <div className="font-bold text-lg">1. Brand DNA</div>
                                    <div className="text-xs text-muted-foreground font-normal">Who you are and what you stand for</div>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-4 pt-4">
                            <div className="grid grid-cols-2 gap-4">
                                {renderInput("dna", "name", "Brand Name")}
                                {renderInput("dna", "problem_solved", "Core Problem Solved")}
                            </div>
                            {renderTextarea("dna", "origin_story", "Origin Story (Why was it created?)")}
                            {renderTextarea("dna", "mission", "Mission & Stand")}
                            <div className="grid grid-cols-2 gap-4">
                                {renderInput("dna", "differentiator", "Main Differentiator")}
                                {renderInput("dna", "anti_identity", "Anti-Identity (Never associated with)")}
                            </div>
                            {renderTextarea("dna", "values", "Core Values (Comma separated)")}
                        </AccordionContent>
                    </AccordionItem>

                    {/* 2. Product Deep Dive */}
                    <AccordionItem value="product" className="border rounded-lg bg-card px-4">
                        <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-md bg-emerald-100 text-emerald-600"><FileText className="w-5 h-5" /></div>
                                <div className="text-left">
                                    <div className="font-bold text-lg">2. Product Deep Dive</div>
                                    <div className="text-xs text-muted-foreground font-normal">Know your product better than anyone</div>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-4 pt-4">
                            <div className="grid grid-cols-2 gap-4">
                                {renderInput("product", "name", "Top Product Name")}
                                {renderInput("product", "category", "Category")}
                            </div>
                            {renderTextarea("product", "main_benefits", "Main Benefits")}
                            {renderTextarea("product", "unique_features", "Unique Features / Ingredients")}
                            <div className="grid grid-cols-3 gap-4">
                                {renderInput("product", "quality_level", "Quality Level")}
                                {renderInput("product", "price_point", "Price Positioning")}
                                {renderInput("product", "why_choose_us", "Why Choose Us?")}
                            </div>
                        </AccordionContent>
                    </AccordionItem>

                    {/* 3. Audience */}
                    <AccordionItem value="audience" className="border rounded-lg bg-card px-4">
                        <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-md bg-rose-100 text-rose-600"><Users className="w-5 h-5" /></div>
                                <div className="text-left">
                                    <div className="font-bold text-lg">3. Target Audience</div>
                                    <div className="text-xs text-muted-foreground font-normal">Buyer Psychology & Demographics</div>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-4 pt-4">
                            {renderTextarea("audience", "ideal_customer", "Ideal Customer Description")}
                            <div className="grid grid-cols-3 gap-4">
                                {renderInput("audience", "pain_points", "Pain Points")}
                                {renderInput("audience", "desires", "Deep Desires")}
                                {renderInput("audience", "fears", "Fears & Frustrations")}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                {renderInput("audience", "shopping_behavior", "Shopping Behavior")}
                                {renderInput("audience", "influences", "Who Influences Them?")}
                            </div>
                        </AccordionContent>
                    </AccordionItem>

                    {/* 4. Market */}
                    <AccordionItem value="market" className="border rounded-lg bg-card px-4">
                        <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-md bg-amber-100 text-amber-600"><Globe className="w-5 h-5" /></div>
                                <div className="text-left">
                                    <div className="font-bold text-lg">4. Market & Competition</div>
                                    <div className="text-xs text-muted-foreground font-normal">Positioning and Competitive Landscape</div>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-4 pt-4">
                            {renderTextarea("market", "competitors", "Top Competitors")}
                            <div className="grid grid-cols-2 gap-4">
                                {renderInput("market", "positioning", "Positioning (Cheaper, Better, etc)")}
                                {renderInput("market", "market_gap", "What is Missing in Market?")}
                            </div>
                        </AccordionContent>
                    </AccordionItem>

                    {/* 5. Offer */}
                    <AccordionItem value="offer" className="border rounded-lg bg-card px-4">
                        <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-md bg-purple-100 text-purple-600"><DollarSign className="w-5 h-5" /></div>
                                <div className="text-left">
                                    <div className="font-bold text-lg">5. Offer Structure</div>
                                    <div className="text-xs text-muted-foreground font-normal">Economics and Offer Strategy</div>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-4 pt-4">
                            <div className="grid grid-cols-3 gap-4">
                                {renderInput("offer", "price_strategy", "Price Strategy")}
                                {renderInput("offer", "bundles", "Offers Bundles?")}
                                {renderInput("offer", "subscriptions", "Offers Subscriptions?")}
                            </div>
                        </AccordionContent>
                    </AccordionItem>

                    {/* 6. Customer Journey */}
                    <AccordionItem value="journey" className="border rounded-lg bg-card px-4">
                        <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-md bg-cyan-100 text-cyan-600"><TrendingUp className="w-5 h-5" /></div>
                                <div className="text-left">
                                    <div className="font-bold text-lg">6. Customer Journey</div>
                                    <div className="text-xs text-muted-foreground font-normal">How they discover and buy</div>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-4 pt-4">
                            {renderTextarea("journey", "discovery", "Discovery Channels")}
                            {renderTextarea("journey", "hesitation", "Where do they hesitate?")}
                            {renderInput("journey", "after_purchase", "Post-Purchase Experience")}
                        </AccordionContent>
                    </AccordionItem>

                </Accordion>
            </div>
        </Shell>
    );
}

function FingerprintIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M2 12C2 6.5 6.5 2 12 2a10 10 0 0 1 8 6" />
            <path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2" />
            <path d="M8.65 22c.21-.66.45-1.32.57-2" />
            <path d="M9 15.2c.4.65.92 1.2 1.6 1.8" />
            <path d="M12 21.6c.15-.3.26-.6.37-.9" />
            <path d="M11.8 17c.2.2.4.4.6.6" />
            <path d="M16 19.5c.3-1 .5-2.2.5-3.5a6 6 0 0 0-.34-2" />
            <path d="M15 15.2c-.4.65-.92 1.2-1.6 1.8" />
        </svg>
    )
}
