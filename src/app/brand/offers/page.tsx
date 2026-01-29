'use client';

import { useState, useEffect } from "react";
import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Gift, Save, Plus, Trash2, DollarSign, Clock, Shield } from "lucide-react";
import { useProject } from "@/contexts/ProjectContext";

export default function OffersPage() {
    const { currentProject, updateBrandIdentity } = useProject();
    const [data, setData] = useState<any>({
        entry_offers: [],
        core_offers: [],
        high_ticket_offers: [],
        bundles: [],
        scarcity_triggers: [],
        urgency_logic: '',
        risk_reversal_methods: []
    });

    useEffect(() => {
        if (currentProject?.brandIdentity?.offer_architecture) {
            setData(currentProject.brandIdentity.offer_architecture);
        }
    }, [currentProject]);

    const handleSave = () => {
        const brandIdentity = currentProject?.brandIdentity || {};
        updateBrandIdentity({ ...brandIdentity, offer_architecture: data });
        alert("Offer Architecture Saved!");
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
                        <div className="flex items-center gap-2 text-green-600 font-bold text-xs uppercase tracking-widest mb-2">
                            <Gift className="w-3 h-3" /> Offer Architecture
                        </div>
                        <h1 className="text-3xl font-display font-bold">Conversion Engineering</h1>
                        <p className="text-muted-foreground">AI uses this to BUILD offers, not just describe them.</p>
                    </div>
                    <Button onClick={handleSave}>
                        <Save className="w-4 h-4 mr-2" /> Save Architecture
                    </Button>
                </div>

                <Card className="bg-green-50 border-green-200">
                    <CardContent className="p-4">
                        <p className="text-sm text-green-800">
                            <strong>Offer = Strategy:</strong> A great offer isn't just pricing. 
                            It's the entire value stack, risk reversal, urgency, and bonus structure.
                        </p>
                    </CardContent>
                </Card>

                {/* Entry Offers */}
                <Card className="border-blue-200">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <DollarSign className="w-5 h-5 text-blue-600" />
                                    Entry Offers (Tripwire / Lead Magnet)
                                </CardTitle>
                                <CardDescription>Low-cost offers that get people in the door</CardDescription>
                            </div>
                            <Button onClick={() => addToArray('entry_offers')} size="sm" variant="outline">
                                <Plus className="w-4 h-4 mr-2" /> Add Entry Offer
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {(data.entry_offers || []).map((offer: string, index: number) => (
                            <div key={index} className="flex gap-2">
                                <Input
                                    value={offer}
                                    onChange={(e) => updateArrayItem('entry_offers', index, e.target.value)}
                                    placeholder="e.g., $7 mini-course, Free 14-day trial, $1 sample pack"
                                />
                                <Button variant="ghost" size="icon" onClick={() => removeFromArray('entry_offers', index)}>
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                            </div>
                        ))}
                        {data.entry_offers.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4">No entry offers defined</p>
                        )}
                    </CardContent>
                </Card>

                {/* Core Offers */}
                <Card className="border-green-200">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-green-700">Core Offers (Main Revenue)</CardTitle>
                                <CardDescription>Your primary products/services</CardDescription>
                            </div>
                            <Button onClick={() => addToArray('core_offers')} size="sm" variant="outline">
                                <Plus className="w-4 h-4 mr-2" /> Add Core Offer
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {(data.core_offers || []).map((offer: string, index: number) => (
                            <div key={index} className="flex gap-2">
                                <Input
                                    value={offer}
                                    onChange={(e) => updateArrayItem('core_offers', index, e.target.value)}
                                    placeholder="e.g., $497 Complete System, Monthly subscription $99"
                                />
                                <Button variant="ghost" size="icon" onClick={() => removeFromArray('core_offers', index)}>
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                            </div>
                        ))}
                        {data.core_offers.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4">No core offers defined</p>
                        )}
                    </CardContent>
                </Card>

                {/* High-Ticket Offers */}
                <Card className="border-purple-200 bg-purple-50/30">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-purple-700">High-Ticket Offers (Premium)</CardTitle>
                                <CardDescription>Elite / VIP / Done-for-you services</CardDescription>
                            </div>
                            <Button onClick={() => addToArray('high_ticket_offers')} size="sm" variant="outline">
                                <Plus className="w-4 h-4 mr-2" /> Add Premium Offer
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {(data.high_ticket_offers || []).map((offer: string, index: number) => (
                            <div key={index} className="flex gap-2">
                                <Input
                                    value={offer}
                                    onChange={(e) => updateArrayItem('high_ticket_offers', index, e.target.value)}
                                    placeholder="e.g., $5k VIP Package, $10k/month Retainer"
                                    className="bg-white"
                                />
                                <Button variant="ghost" size="icon" onClick={() => removeFromArray('high_ticket_offers', index)}>
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                            </div>
                        ))}
                        {data.high_ticket_offers.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4">No premium offers defined</p>
                        )}
                    </CardContent>
                </Card>

                {/* Bundles */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Bundle Logic</CardTitle>
                                <CardDescription>What gets bundled together and why?</CardDescription>
                            </div>
                            <Button onClick={() => addToArray('bundles')} size="sm" variant="outline">
                                <Plus className="w-4 h-4 mr-2" /> Add Bundle
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {(data.bundles || []).map((bundle: string, index: number) => (
                            <div key={index} className="flex gap-2">
                                <Input
                                    value={bundle}
                                    onChange={(e) => updateArrayItem('bundles', index, e.target.value)}
                                    placeholder="e.g., Product A + Product B = 20% off, Starter Pack (3 items)"
                                />
                                <Button variant="ghost" size="icon" onClick={() => removeFromArray('bundles', index)}>
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Scarcity Triggers */}
                <Card className="border-orange-200 bg-orange-50/30">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-orange-600" />
                                    Scarcity Triggers (REAL, not fake)
                                </CardTitle>
                                <CardDescription>Limited quantity, seasonal, batch-based</CardDescription>
                            </div>
                            <Button onClick={() => addToArray('scarcity_triggers')} size="sm" variant="outline">
                                <Plus className="w-4 h-4 mr-2" /> Add Trigger
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {(data.scarcity_triggers || []).map((trigger: string, index: number) => (
                            <div key={index} className="flex gap-2">
                                <Input
                                    value={trigger}
                                    onChange={(e) => updateArrayItem('scarcity_triggers', index, e.target.value)}
                                    placeholder="e.g., Only 50 units/batch, Seasonal release, Limited enrollment"
                                    className="bg-white"
                                />
                                <Button variant="ghost" size="icon" onClick={() => removeFromArray('scarcity_triggers', index)}>
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Urgency Logic */}
                <Card>
                    <CardHeader>
                        <CardTitle>Urgency Mechanics</CardTitle>
                        <CardDescription>How do you create legitimate urgency?</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Textarea
                            value={data.urgency_logic || ""}
                            onChange={(e) => updateField('urgency_logic', e.target.value)}
                            placeholder="e.g., 'Price increases on [date]', 'Enrollment closes [date]', 'Early bird pricing for first 100'"
                            className="min-h-[100px]"
                        />
                    </CardContent>
                </Card>

                {/* Risk Reversal */}
                <Card className="border-green-200 bg-green-50/30">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <Shield className="w-5 h-5 text-green-600" />
                                    Risk Reversal Methods
                                </CardTitle>
                                <CardDescription>Guarantees, trials, money-back offers</CardDescription>
                            </div>
                            <Button onClick={() => addToArray('risk_reversal_methods')} size="sm" variant="outline">
                                <Plus className="w-4 h-4 mr-2" /> Add Guarantee
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {(data.risk_reversal_methods || []).map((method: string, index: number) => (
                            <div key={index} className="flex gap-2">
                                <Input
                                    value={method}
                                    onChange={(e) => updateArrayItem('risk_reversal_methods', index, e.target.value)}
                                    placeholder="e.g., 30-day money-back guarantee, Free trial first month, Pay-if-satisfied"
                                    className="bg-white"
                                />
                                <Button variant="ghost" size="icon" onClick={() => removeFromArray('risk_reversal_methods', index)}>
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Bonus Strategy */}
                <Card>
                    <CardHeader>
                        <CardTitle>Bonus Stack Strategy</CardTitle>
                        <CardDescription>What bonuses do you offer and when?</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Textarea
                            value={data.bonus_strategy || ""}
                            onChange={(e) => updateField('bonus_strategy', e.target.value)}
                            placeholder="e.g., 'Buy now: Get [bonus 1] + [bonus 2] + [bonus 3] (Value: $XXX)'"
                            className="min-h-[100px]"
                        />
                    </CardContent>
                </Card>
            </div>
        </Shell>
    );
}

