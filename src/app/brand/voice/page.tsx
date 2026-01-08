'use client';

import { useState, useEffect } from "react";
import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Save, Mic2, AlertTriangle, Shield, Heart, MessagesSquare, Eye } from "lucide-react";
import { useProject } from "@/contexts/ProjectContext";

export default function BrandVoicePage() {
    const { currentProject, updateBrandIdentity } = useProject();
    const [data, setData] = useState<any>({});

    useEffect(() => {
        if (currentProject?.brandIdentity) {
            setData(currentProject.brandIdentity);
        }
    }, [currentProject]);

    const handleSave = () => {
        updateBrandIdentity(data);
        alert("Brand Voice & Guardrails Saved!");
    };

    const updateField = (parent: string, field: string, value: any) => {
        const parentData = data[parent] || {};
        setData({
            ...data,
            [parent]: { ...parentData, [field]: value }
        });
    };

    // Deep update for nested objects (e.g. voice.language_style.use_emojis)
    const updateDeepField = (parent: string, sub: string, field: string, value: any) => {
        const parentData = data[parent] || {};
        const subData = parentData[sub] || {};
        setData({
            ...data,
            [parent]: {
                ...parentData,
                [sub]: { ...subData, [field]: value }
            }
        });
    };

    const renderInput = (parent: string, field: string, label: string) => (
        <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase">{label}</label>
            <Input
                value={data[parent]?.[field] || ""}
                onChange={(e) => updateField(parent, field, e.target.value)}
                className="bg-white"
            />
        </div>
    );

    const renderTextarea = (parent: string, field: string, label: string) => (
        <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase">{label}</label>
            <Textarea
                value={data[parent]?.[field] || ""}
                onChange={(e) => updateField(parent, field, e.target.value)}
                className="bg-white min-h-[80px]"
            />
        </div>
    );

    return (
        <Shell>
            <div className="max-w-5xl mx-auto space-y-8 pb-20">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-display font-bold">Voice & Guardrails</h1>
                        <p className="text-muted-foreground">Define how your brand speaks and what lines it never crosses.</p>
                    </div>
                    <Button variant="outline" onClick={handleSave}><Save className="w-4 h-4 mr-2" /> Save Changes</Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* Column 1: Voice & Tone */}
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold flex items-center gap-2"><Mic2 className="w-5 h-5" /> Brand Voice</h2>

                        <Card>
                            <CardHeader><CardTitle>1. Voice Personality</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                {renderTextarea("voice", "tone_adjectives", "Tone Adjectives (e.g. Calm, Playful)")}
                                {renderInput("voice", "archetype", "Brand Archetype (e.g. Mentor, Friend)")}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader><CardTitle>2. Language Style</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                {renderInput("voice", "sentence_structure", "Sentence Structure (Short/Long)")}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-muted-foreground uppercase">Use Emojis?</label>
                                        <Input
                                            value={data.voice?.language_style?.use_emojis || ""}
                                            onChange={(e) => updateDeepField("voice", "language_style", "use_emojis", e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-muted-foreground uppercase">Use Slang?</label>
                                        <Input
                                            value={data.voice?.language_style?.use_slang || ""}
                                            onChange={(e) => updateDeepField("voice", "language_style", "use_slang", e.target.value)}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader><CardTitle>3. Emotional Positioning</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                {renderInput("voice", "emotional_driver", "Primary Emotional Driver (Fear/Desire/Status)")}
                                {renderInput("voice", "perspective", "Perspective (I/We/You)")}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Column 2: Guardrails */}
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold flex items-center gap-2"><Shield className="w-5 h-5" /> Brand Guardrails</h2>

                        <Accordion type="multiple" defaultValue={["forbidden", "claims"]} className="space-y-4">
                            <AccordionItem value="forbidden" className="border rounded-lg bg-card px-4">
                                <AccordionTrigger>Forbidden Topics & Words</AccordionTrigger>
                                <AccordionContent className="space-y-4 pt-4">
                                    {renderTextarea("guardrails", "forbidden_topics", "Forbidden Topics (Politics, Religion etc)")}
                                    {renderTextarea("guardrails", "forbidden_words", "Forbidden Words")}
                                </AccordionContent>
                            </AccordionItem>

                            <AccordionItem value="claims" className="border rounded-lg bg-card px-4">
                                <AccordionTrigger>Claim Restrictions</AccordionTrigger>
                                <AccordionContent className="space-y-4 pt-4">
                                    {renderTextarea("guardrails", "allowed_claims", "Allowed Claims")}
                                    {renderTextarea("guardrails", "forbidden_claims", "Forbidden Claims (Cure, Guaranteed etc)")}
                                </AccordionContent>
                            </AccordionItem>

                            <AccordionItem value="visuals" className="border rounded-lg bg-card px-4">
                                <AccordionTrigger>Visual Guardrails</AccordionTrigger>
                                <AccordionContent className="space-y-4 pt-4">
                                    {renderTextarea("guardrails", "visual_rules", "Visual Do's and Don'ts")}
                                    {renderInput("guardrails", "tone_limits", "Tone Extremes / Limits")}
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>

                        <Card className="bg-red-50 border-red-100">
                            <CardHeader>
                                <CardTitle className="text-red-800 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> AI System Constraints</CardTitle>
                                <CardDescription className="text-red-600">These rules are strictly enforced on all AI generation.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-xs font-mono bg-red-100 p-4 rounded text-red-900 whitespace-pre-wrap">
                                    {JSON.stringify({
                                        tone: data.voice?.tone_adjectives || [],
                                        forbidden_words: data.guardrails?.forbidden_words || [],
                                        forbidden_topics: data.guardrails?.forbidden_topics || [],
                                        allowed_claims: data.guardrails?.allowed_claims || [],
                                    }, null, 2)}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                </div>
            </div>
        </Shell>
    );
}
