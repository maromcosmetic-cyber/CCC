'use client';

import { useState, useEffect } from "react";
import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Save, Palette, Type, Image as ImageIcon, Layout, Download } from "lucide-react";
import { useProject } from "@/contexts/ProjectContext";

export default function BrandVisualsPage() {
    const { currentProject, updateBrandIdentity } = useProject();
    const [data, setData] = useState<any>({});

    useEffect(() => {
        if (currentProject?.brandIdentity) {
            setData(currentProject.brandIdentity);
        }
    }, [currentProject]);

    const handleSave = () => {
        updateBrandIdentity(data);
        alert("Visual Identity Saved!");
    };

    const updateDeepField = (parent: string, field: string, value: any) => {
        const parentData = data[parent] || {};
        setData({
            ...data,
            [parent]: { ...parentData, [field]: value }
        });
    };

    // For arrays like colors/fonts
    const updateArrayField = (parent: string, field: string, index: number, value: any) => {
        const parentData = data[parent] || {};
        const arr = [...(parentData[field] || [])];
        arr[index] = value;
        setData({
            ...data,
            [parent]: { ...parentData, [field]: arr }
        });
    };

    const addArrayItem = (parent: string, field: string) => {
        const parentData = data[parent] || {};
        const arr = [...(parentData[field] || []), ""];
        setData({
            ...data,
            [parent]: { ...parentData, [field]: arr }
        });
    };


    return (
        <Shell>
            <div className="max-w-5xl mx-auto space-y-8 pb-20">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-display font-bold">Visual Identity</h1>
                        <p className="text-muted-foreground">Manage your brand's colors, typography, logos, and aesthetic.</p>
                    </div>
                    <Button variant="outline" onClick={handleSave}><Save className="w-4 h-4 mr-2" /> Save Changes</Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                    {/* Colors */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Palette className="w-5 h-5" /> Brand Colors</CardTitle>
                            <CardDescription>Primary and secondary palette.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {(data.visuals?.colors || ["#000000", "#ffffff"]).map((color: string, i: number) => (
                                <div key={i} className="flex gap-2 items-center">
                                    <div className="w-10 h-10 rounded border" style={{ backgroundColor: color }}></div>
                                    <Input
                                        value={color}
                                        onChange={(e) => updateArrayField("visuals", "colors", i, e.target.value)}
                                        placeholder="#HEX"
                                    />
                                </div>
                            ))}
                            <Button variant="ghost" size="sm" onClick={() => addArrayItem("visuals", "colors")}>+ Add Color</Button>
                        </CardContent>
                    </Card>

                    {/* Typography */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Type className="w-5 h-5" /> Typography</CardTitle>
                            <CardDescription>Brand fonts and usage.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {(data.visuals?.fonts || ["Inter"]).map((font: string, i: number) => (
                                <div key={i} className="flex gap-2 items-center">
                                    <Input
                                        value={font}
                                        onChange={(e) => updateArrayField("visuals", "fonts", i, e.target.value)}
                                        placeholder="Font Family Name"
                                    />
                                </div>
                            ))}
                            <Button variant="ghost" size="sm" onClick={() => addArrayItem("visuals", "fonts")}>+ Add Font</Button>
                        </CardContent>
                    </Card>

                    {/* Logo & Assets */}
                    <Card className="md:col-span-2">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><ImageIcon className="w-5 h-5" /> Logo & Assets</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Logo URL</label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={data.dna?.logo_url || ""}
                                            onChange={(e) => updateDeepField("dna", "logo_url", e.target.value)}
                                            placeholder="https://..."
                                        />
                                    </div>
                                    {data.dna?.logo_url && (
                                        <div className="mt-2 p-4 border rounded bg-gray-50 flex justify-center">
                                            <img src={data.dna.logo_url} alt="Logo" className="max-h-32 object-contain" />
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Aesthetic Style</label>
                                    <Input
                                        value={data.visuals?.aesthetic || ""}
                                        onChange={(e) => updateDeepField("visuals", "aesthetic", e.target.value)}
                                        placeholder="e.g. Minimalist, Luxury, Bold"
                                    />
                                    <p className="text-xs text-muted-foreground">This guides the AI image generator.</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Visual Rules (Guardrails Mirror) */}
                    <Card className="md:col-span-2 bg-gray-50">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Layout className="w-5 h-5" /> Visual Guidelines</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="font-semibold text-sm mb-2 block">Visual Do's & Don'ts</label>
                                    <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                                        {(data.guardrails?.visual_rules || []).map((rule: string, i: number) => (
                                            <li key={i}>{rule}</li>
                                        ))}
                                        {!data.guardrails?.visual_rules?.length && <li>No specific visual rules set in Voice & Guardrails.</li>}
                                    </ul>
                                    <Button variant="link" className="px-0 text-indigo-600" onClick={() => window.location.href = '/brand/voice?tab=guardrails'}>Edit in Guardrails</Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </Shell>
    );
}
