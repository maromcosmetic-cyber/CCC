'use client';

import { useState, useEffect } from "react";
import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TrendingUp, Save } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useProject } from "@/contexts/ProjectContext";

const FUNNEL_STAGES = [
    { id: 'awareness', name: 'Awareness', description: 'They just learned you exist', color: 'bg-gray-100' },
    { id: 'curiosity', name: 'Curiosity', description: 'They want to know more', color: 'bg-blue-100' },
    { id: 'education', name: 'Education', description: "They're learning about the solution", color: 'bg-purple-100' },
    { id: 'desire', name: 'Desire', description: 'They want it', color: 'bg-pink-100' },
    { id: 'trust', name: 'Trust', description: "They're evaluating if you're legit", color: 'bg-green-100' },
    { id: 'action', name: 'Action', description: "They're ready to buy", color: 'bg-orange-100' },
    { id: 'loyalty', name: 'Loyalty', description: 'They bought, now what?', color: 'bg-indigo-100' },
    { id: 'advocacy', name: 'Advocacy', description: "They're telling others", color: 'bg-yellow-100' }
];

export default function FunnelPage() {
    const { currentProject, updateBrandIdentity } = useProject();
    const [stages, setStages] = useState<any>({});

    useEffect(() => {
        if (currentProject?.brandIdentity?.funnel_psychology?.stages) {
            setStages(currentProject.brandIdentity.funnel_psychology.stages);
        }
    }, [currentProject]);

    const handleSave = () => {
        const brandIdentity = currentProject?.brandIdentity || {};
        updateBrandIdentity({
            ...brandIdentity,
            funnel_psychology: { stages }
        });
        alert("Funnel Psychology Saved!");
    };

    const updateStageField = (stageId: string, field: string, value: any) => {
        setStages((prev: any) => ({
            ...prev,
            [stageId]: {
                ...(prev[stageId] || {}),
                [field]: value
            }
        }));
    };

    const updateStageArray = (stageId: string, field: string, value: string) => {
        const items = value.split(',').map(s => s.trim()).filter(Boolean);
        updateStageField(stageId, field, items);
    };

    return (
        <Shell>
            <div className="max-w-6xl mx-auto space-y-8 pb-20">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-widest mb-2">
                            <TrendingUp className="w-3 h-3" /> Funnel Psychology
                        </div>
                        <h1 className="text-3xl font-display font-bold">Customer Journey Logic</h1>
                        <p className="text-muted-foreground">Map every stage from awareness to advocacy.</p>
                    </div>
                    <Button onClick={handleSave}>
                        <Save className="w-4 h-4 mr-2" /> Save Journey
                    </Button>
                </div>

                <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4">
                        <p className="text-sm text-blue-800">
                            <strong>Why map the journey?</strong> Different stages need different messages.
                            The AI will sequence content correctly based on where someone is in the funnel.
                        </p>
                    </CardContent>
                </Card>

                {/* Visual Funnel */}
                <Card>
                    <CardHeader>
                        <CardTitle>The Journey Flow</CardTitle>
                        <CardDescription>Click each stage to define it</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2 overflow-x-auto pb-4">
                            {FUNNEL_STAGES.map((stage, index) => (
                                <div key={stage.id} className="flex items-center shrink-0">
                                    <div className={`${stage.color} p-4 rounded-lg border-2 border-gray-300 min-w-[120px]`}>
                                        <div className="font-bold text-sm">{stage.name}</div>
                                        <div className="text-xs text-muted-foreground mt-1">{stage.description}</div>
                                    </div>
                                    {index < FUNNEL_STAGES.length - 1 && (
                                        <div className="text-gray-400 mx-2">→</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Stage Details */}
                <Accordion type="multiple" defaultValue={['awareness', 'desire', 'action']} className="space-y-4">
                    {FUNNEL_STAGES.map((stage) => {
                        const stageData = stages[stage.id] || {};
                        return (
                            <AccordionItem key={stage.id} value={stage.id} className={`border rounded-lg ${stage.color} px-4`}>
                                <AccordionTrigger className="hover:no-underline">
                                    <div className="flex items-center gap-3">
                                        <div className="text-left">
                                            <div className="font-bold text-lg">{stage.name}</div>
                                            <div className="text-xs text-muted-foreground font-normal">{stage.description}</div>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="space-y-4 pt-4">
                                    {/* Emotional State */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Emotional State</label>
                                        <Input
                                            value={stageData.emotional_state || ""}
                                            onChange={(e) => updateStageField(stage.id, 'emotional_state', e.target.value)}
                                            placeholder="e.g., Curious but skeptical, Excited but anxious"
                                        />
                                    </div>

                                    {/* Key Questions */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Key Questions They're Asking</label>
                                        <Textarea
                                            value={(stageData.key_questions || []).join(', ')}
                                            onChange={(e) => updateStageArray(stage.id, 'key_questions', e.target.value)}
                                            placeholder="Comma-separated. e.g., What is this?, How does it work?, Is it for me?"
                                            className="min-h-[80px]"
                                        />
                                    </div>

                                    {/* Objections */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Objections at This Stage</label>
                                        <Textarea
                                            value={(stageData.objections || []).join(', ')}
                                            onChange={(e) => updateStageArray(stage.id, 'objections', e.target.value)}
                                            placeholder="Comma-separated. e.g., Too expensive, Not sure it works, Need more time"
                                            className="min-h-[80px]"
                                        />
                                    </div>

                                    {/* Best Content Type */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Best Content Type</label>
                                            <Input
                                                value={stageData.content_type || ""}
                                                onChange={(e) => updateStageField(stage.id, 'content_type', e.target.value)}
                                                placeholder="e.g., Video, Blog, Email, Testimonial"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Desired Action</label>
                                            <Input
                                                value={stageData.desired_action || ""}
                                                onChange={(e) => updateStageField(stage.id, 'desired_action', e.target.value)}
                                                placeholder="e.g., Watch demo, Read guide, Book call"
                                            />
                                        </div>
                                    </div>

                                    {/* Messaging Focus */}
                                    <div className="space-y-2 bg-white p-3 rounded-lg">
                                        <label className="text-sm font-medium">Messaging Focus</label>
                                        <Textarea
                                            value={stageData.messaging_focus || ""}
                                            onChange={(e) => updateStageField(stage.id, 'messaging_focus', e.target.value)}
                                            placeholder="What should messaging emphasize at this stage?"
                                            className="min-h-[60px]"
                                        />
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        );
                    })}
                </Accordion>
            </div>
        </Shell>
    );
}

