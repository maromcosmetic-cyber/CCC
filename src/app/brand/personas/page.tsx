'use client';

import { useState, useEffect } from "react";
import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { UserCircle, Save, Brain, Heart, AlertTriangle, Target, MessageCircle, TrendingUp, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProject } from "@/contexts/ProjectContext";
import { PageLoading } from "@/components/ui/page-loading";

type PersonaType = 'primary' | 'secondary' | 'aspirational';

interface Persona {
    type: PersonaType;
    name: string;
    tagline: string;
    demographics: {
        age: string;
        location: string;
        income: string;
        role: string;
    };
    identity_drivers: string;
    emotional_triggers: string[];
    fears_anxieties: string[];
    desires_dreams: string[];
    language_style: string;
    content_behavior: string;
    buying_objections: string[];
    decision_logic: string;
}

const emptyPersona: Persona = {
    type: 'primary',
    name: '',
    tagline: '',
    demographics: { age: '', location: '', income: '', role: '' },
    identity_drivers: '',
    emotional_triggers: [],
    fears_anxieties: [],
    desires_dreams: [],
    language_style: '',
    content_behavior: '',
    buying_objections: [],
    decision_logic: ''
};

export default function PersonasPage() {
    const { currentProject, updateBrandIdentity, loading } = useProject();
    
    if (loading) {
        return (
            <Shell>
                <PageLoading message="Loading project data..." />
            </Shell>
        );
    }
    const [personas, setPersonas] = useState<Record<PersonaType, Persona>>({
        primary: { ...emptyPersona, type: 'primary' },
        secondary: { ...emptyPersona, type: 'secondary' },
        aspirational: { ...emptyPersona, type: 'aspirational' }
    });

    useEffect(() => {
        if (currentProject?.brandIdentity?.personas) {
            setPersonas(currentProject.brandIdentity.personas);
        }
    }, [currentProject]);

    const handleSave = () => {
        const brandIdentity = currentProject?.brandIdentity || {};
        updateBrandIdentity({ ...brandIdentity, personas });
        alert("Personas Saved!");
    };

    const updatePersonaField = (type: PersonaType, field: string, value: any) => {
        setPersonas(prev => ({
            ...prev,
            [type]: {
                ...prev[type],
                [field]: value
            }
        }));
    };

    const updateDemographics = (type: PersonaType, field: string, value: string) => {
        setPersonas(prev => ({
            ...prev,
            [type]: {
                ...prev[type],
                demographics: {
                    ...prev[type].demographics,
                    [field]: value
                }
            }
        }));
    };

    const updateArrayField = (type: PersonaType, field: string, index: number, value: string) => {
        setPersonas(prev => {
            const arr = [...(prev[type][field as keyof Persona] as string[])];
            arr[index] = value;
            return {
                ...prev,
                [type]: {
                    ...prev[type],
                    [field]: arr
                }
            };
        });
    };

    const addArrayItem = (type: PersonaType, field: string) => {
        setPersonas(prev => {
            const arr = [...(prev[type][field as keyof Persona] as string[]), ''];
            return {
                ...prev,
                [type]: {
                    ...prev[type],
                    [field]: arr
                }
            };
        });
    };

    const renderPersonaBuilder = (type: PersonaType, persona: Persona, color: string) => {
        return (
            <div className="space-y-6">
                {/* Basic Info */}
                <Card className={`border-${color}-200 bg-${color}-50/30`}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <UserCircle className={`w-5 h-5 text-${color}-600`} />
                            Basic Identity
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Persona Name</label>
                                <Input
                                    value={persona.name}
                                    onChange={(e) => updatePersonaField(type, 'name', e.target.value)}
                                    placeholder="e.g., Busy Sarah, Tech Tom"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Tagline</label>
                                <Input
                                    value={persona.tagline}
                                    onChange={(e) => updatePersonaField(type, 'tagline', e.target.value)}
                                    placeholder="One-liner description"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Demographics */}
                <Card>
                    <CardHeader>
                        <CardTitle>Demographics</CardTitle>
                        <CardDescription>Basic stats - but remember, psychology matters more</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Age Range</label>
                                <Input
                                    value={persona.demographics.age}
                                    onChange={(e) => updateDemographics(type, 'age', e.target.value)}
                                    placeholder="e.g., 25-34"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Location</label>
                                <Input
                                    value={persona.demographics.location}
                                    onChange={(e) => updateDemographics(type, 'location', e.target.value)}
                                    placeholder="e.g., Urban, US"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Income Level</label>
                                <Input
                                    value={persona.demographics.income}
                                    onChange={(e) => updateDemographics(type, 'income', e.target.value)}
                                    placeholder="e.g., $60-100k"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Role/Occupation</label>
                                <Input
                                    value={persona.demographics.role}
                                    onChange={(e) => updateDemographics(type, 'role', e.target.value)}
                                    placeholder="e.g., Marketing Manager"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Identity Drivers */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Brain className="w-5 h-5 text-purple-600" />
                            Identity Drivers
                        </CardTitle>
                        <CardDescription>Who they think they are / want to be</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Textarea
                            value={persona.identity_drivers}
                            onChange={(e) => updatePersonaField(type, 'identity_drivers', e.target.value)}
                            placeholder="e.g., 'Sees self as a rising professional who values efficiency and looking put-together'"
                            className="min-h-[80px]"
                        />
                    </CardContent>
                </Card>

                {/* Emotional Triggers */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Heart className="w-5 h-5 text-red-500" />
                            Emotional Triggers
                        </CardTitle>
                        <CardDescription>What moves them to action?</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {(persona.emotional_triggers || ['']).map((trigger, i) => (
                            <Input
                                key={i}
                                value={trigger}
                                onChange={(e) => updateArrayField(type, 'emotional_triggers', i, e.target.value)}
                                placeholder="e.g., Fear of missing out, desire for status"
                            />
                        ))}
                        <Button variant="ghost" size="sm" onClick={() => addArrayItem(type, 'emotional_triggers')}>
                            + Add Trigger
                        </Button>
                    </CardContent>
                </Card>

                {/* Fears & Anxieties */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-yellow-600" />
                            Fears & Anxieties
                        </CardTitle>
                        <CardDescription>What keeps them up at night?</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {(persona.fears_anxieties || ['']).map((fear, i) => (
                            <Input
                                key={i}
                                value={fear}
                                onChange={(e) => updateArrayField(type, 'fears_anxieties', i, e.target.value)}
                                placeholder="e.g., Falling behind, wasting money"
                            />
                        ))}
                        <Button variant="ghost" size="sm" onClick={() => addArrayItem(type, 'fears_anxieties')}>
                            + Add Fear
                        </Button>
                    </CardContent>
                </Card>

                {/* Desires & Dreams */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Target className="w-5 h-5 text-green-600" />
                            Desires & Dreams
                        </CardTitle>
                        <CardDescription>What do they want to become?</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {(persona.desires_dreams || ['']).map((desire, i) => (
                            <Input
                                key={i}
                                value={desire}
                                onChange={(e) => updateArrayField(type, 'desires_dreams', i, e.target.value)}
                                placeholder="e.g., Be seen as an expert, achieve freedom"
                            />
                        ))}
                        <Button variant="ghost" size="sm" onClick={() => addArrayItem(type, 'desires_dreams')}>
                            + Add Desire
                        </Button>
                    </CardContent>
                </Card>

                {/* Language Style */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MessageCircle className="w-5 h-5 text-blue-600" />
                            Language Style
                        </CardTitle>
                        <CardDescription>How they actually speak</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Textarea
                            value={persona.language_style}
                            onChange={(e) => updatePersonaField(type, 'language_style', e.target.value)}
                            placeholder="e.g., 'Uses casual slang, abbreviates, emojis in texts, formal in emails'"
                            className="min-h-[80px]"
                        />
                    </CardContent>
                </Card>

                {/* Content Behavior */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-indigo-600" />
                            Content Consumption Behavior
                        </CardTitle>
                        <CardDescription>Where and how do they consume content?</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Textarea
                            value={persona.content_behavior}
                            onChange={(e) => updatePersonaField(type, 'content_behavior', e.target.value)}
                            placeholder="e.g., 'Instagram reels in morning, LinkedIn at lunch, YouTube at night. Skims vs deep reads'"
                            className="min-h-[80px]"
                        />
                    </CardContent>
                </Card>

                {/* Buying Objections */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ShoppingBag className="w-5 h-5 text-orange-600" />
                            Buying Objections
                        </CardTitle>
                        <CardDescription>Why do they hesitate?</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {(persona.buying_objections || ['']).map((objection, i) => (
                            <Input
                                key={i}
                                value={objection}
                                onChange={(e) => updateArrayField(type, 'buying_objections', i, e.target.value)}
                                placeholder="e.g., 'Too expensive', 'Not sure it works', 'Need partner approval'"
                            />
                        ))}
                        <Button variant="ghost" size="sm" onClick={() => addArrayItem(type, 'buying_objections')}>
                            + Add Objection
                        </Button>
                    </CardContent>
                </Card>

                {/* Decision Logic */}
                <Card>
                    <CardHeader>
                        <CardTitle>Decision Logic</CardTitle>
                        <CardDescription>Emotional vs rational? Impulse vs research?</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Textarea
                            value={persona.decision_logic}
                            onChange={(e) => updatePersonaField(type, 'decision_logic', e.target.value)}
                            placeholder="e.g., 'Emotional buyer but needs logical justification. Researches reviews then impulse buys'"
                            className="min-h-[80px]"
                        />
                    </CardContent>
                </Card>
            </div>
        );
    };

    return (
        <Shell>
            <div className="max-w-6xl mx-auto space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-purple-600 font-bold text-xs uppercase tracking-widest">
                            <UserCircle className="w-3 h-3" /> Deep Audience Intelligence
                        </div>
                        <h1 className="text-4xl font-display font-black text-foreground tracking-tight">Persona Builder</h1>
                        <p className="text-muted-foreground text-lg">
                            Deep psychological profiling - not just demographics, but who they REALLY are.
                        </p>
                    </div>
                    <Button onClick={handleSave}>
                        <Save className="w-4 h-4 mr-2" /> Save All Personas
                    </Button>
                </div>

                <Tabs defaultValue="primary" className="space-y-6">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="primary" className="data-[state=active]:bg-red-100 data-[state=active]:text-red-700">
                            Primary Persona
                            <span className="ml-2 text-xs">(Revenue Driver)</span>
                        </TabsTrigger>
                        <TabsTrigger value="secondary" className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700">
                            Secondary Persona
                            <span className="ml-2 text-xs">(Growth Segment)</span>
                        </TabsTrigger>
                        <TabsTrigger value="aspirational" className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700">
                            Aspirational Persona
                            <span className="ml-2 text-xs">(Future Target)</span>
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="primary">
                        {renderPersonaBuilder('primary', personas.primary, 'red')}
                    </TabsContent>

                    <TabsContent value="secondary">
                        {renderPersonaBuilder('secondary', personas.secondary, 'blue')}
                    </TabsContent>

                    <TabsContent value="aspirational">
                        {renderPersonaBuilder('aspirational', personas.aspirational, 'purple')}
                    </TabsContent>
                </Tabs>
            </div>
        </Shell>
    );
}
