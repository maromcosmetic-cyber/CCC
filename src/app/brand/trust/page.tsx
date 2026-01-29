'use client';

import { useState, useEffect } from "react";
import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Shield, Save, Plus, Trash2, Award, Users, Star, FileCheck } from "lucide-react";
import { useProject } from "@/contexts/ProjectContext";

export default function TrustPage() {
    const { currentProject, updateBrandIdentity } = useProject();
    const [data, setData] = useState<any>({
        social_proof_types: [],
        certifications: [],
        partnerships: [],
        media_mentions: [],
        guarantees: [],
        transparency_rules: []
    });

    useEffect(() => {
        if (currentProject?.brandIdentity?.trust_infrastructure) {
            setData(currentProject.brandIdentity.trust_infrastructure);
        }
    }, [currentProject]);

    const handleSave = () => {
        const brandIdentity = currentProject?.brandIdentity || {};
        updateBrandIdentity({ ...brandIdentity, trust_infrastructure: data });
        alert("Trust Infrastructure Saved!");
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
                        <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-widest mb-2">
                            <Shield className="w-3 h-3" /> Trust Infrastructure
                        </div>
                        <h1 className="text-3xl font-display font-bold">Authority & Credibility Signals</h1>
                        <p className="text-muted-foreground">AI automatically injects these trust elements across campaigns.</p>
                    </div>
                    <Button onClick={handleSave}>
                        <Save className="w-4 h-4 mr-2" /> Save Trust Signals
                    </Button>
                </div>

                <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4">
                        <p className="text-sm text-blue-800">
                            <strong>Trust = Conversion:</strong> The AI will automatically inject relevant trust signals 
                            into landing pages, ads, emails, and sales copy based on context.
                        </p>
                    </CardContent>
                </Card>

                {/* Social Proof Types */}
                <Card className="border-green-200">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <Users className="w-5 h-5 text-green-600" />
                                    Social Proof Types
                                </CardTitle>
                                <CardDescription>What forms of social proof do you have?</CardDescription>
                            </div>
                            <Button onClick={() => addToArray('social_proof_types')} size="sm" variant="outline">
                                <Plus className="w-4 h-4 mr-2" /> Add Proof
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {(data.social_proof_types || []).map((proof: string, index: number) => (
                            <div key={index} className="flex gap-2">
                                <Input
                                    value={proof}
                                    onChange={(e) => updateArrayItem('social_proof_types', index, e.target.value)}
                                    placeholder="e.g., 50,000+ customers, 4.9/5 stars (12,000 reviews), Featured in Forbes"
                                />
                                <Button variant="ghost" size="icon" onClick={() => removeFromArray('social_proof_types', index)}>
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                            </div>
                        ))}
                        {data.social_proof_types.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4">No social proof defined</p>
                        )}
                    </CardContent>
                </Card>

                {/* Testimonials Style */}
                <Card>
                    <CardHeader>
                        <CardTitle>Testimonials Strategy</CardTitle>
                        <CardDescription>How do you collect and display testimonials?</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground uppercase">Style</label>
                            <Input
                                value={data.testimonials_style || ""}
                                onChange={(e) => updateField('testimonials_style', e.target.value)}
                                placeholder="e.g., Video testimonials, Photo + quote, Before/after with story"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground uppercase">Format Rules</label>
                            <Textarea
                                value={data.testimonials_format || ""}
                                onChange={(e) => updateField('testimonials_format', e.target.value)}
                                placeholder="e.g., Always include full name, location, specific result. Never use fake stock photos."
                                className="min-h-[80px]"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Certifications */}
                <Card className="border-purple-200 bg-purple-50/30">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <Award className="w-5 h-5 text-purple-600" />
                                    Certifications & Accreditations
                                </CardTitle>
                                <CardDescription>Official certifications, licenses, compliance badges</CardDescription>
                            </div>
                            <Button onClick={() => addToArray('certifications')} size="sm" variant="outline">
                                <Plus className="w-4 h-4 mr-2" /> Add Certification
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {(data.certifications || []).map((cert: string, index: number) => (
                            <div key={index} className="flex gap-2">
                                <Input
                                    value={cert}
                                    onChange={(e) => updateArrayItem('certifications', index, e.target.value)}
                                    placeholder="e.g., FDA Approved, ISO 9001, Organic Certified, BBB A+ Rating"
                                    className="bg-white"
                                />
                                <Button variant="ghost" size="icon" onClick={() => removeFromArray('certifications', index)}>
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Partnerships */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Strategic Partnerships</CardTitle>
                                <CardDescription>Who do you partner with or are endorsed by?</CardDescription>
                            </div>
                            <Button onClick={() => addToArray('partnerships')} size="sm" variant="outline">
                                <Plus className="w-4 h-4 mr-2" /> Add Partner
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {(data.partnerships || []).map((partner: string, index: number) => (
                            <div key={index} className="flex gap-2">
                                <Input
                                    value={partner}
                                    onChange={(e) => updateArrayItem('partnerships', index, e.target.value)}
                                    placeholder="e.g., Official partner of [Brand], Sponsored by [Company], Trusted by [Organization]"
                                />
                                <Button variant="ghost" size="icon" onClick={() => removeFromArray('partnerships', index)}>
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Media Mentions */}
                <Card className="border-amber-200 bg-amber-50/30">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <Star className="w-5 h-5 text-amber-600" />
                                    Media Mentions & Press
                                </CardTitle>
                                <CardDescription>Where have you been featured?</CardDescription>
                            </div>
                            <Button onClick={() => addToArray('media_mentions')} size="sm" variant="outline">
                                <Plus className="w-4 h-4 mr-2" /> Add Mention
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {(data.media_mentions || []).map((mention: string, index: number) => (
                            <div key={index} className="flex gap-2">
                                <Input
                                    value={mention}
                                    onChange={(e) => updateArrayItem('media_mentions', index, e.target.value)}
                                    placeholder="e.g., Featured in Forbes, Seen on Shark Tank, Inc. 5000 Company"
                                    className="bg-white"
                                />
                                <Button variant="ghost" size="icon" onClick={() => removeFromArray('media_mentions', index)}>
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Guarantees */}
                <Card className="border-green-200 bg-green-50/30">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <Shield className="w-5 h-5 text-green-600" />
                                    Guarantees Offered
                                </CardTitle>
                                <CardDescription>What guarantees do you provide?</CardDescription>
                            </div>
                            <Button onClick={() => addToArray('guarantees')} size="sm" variant="outline">
                                <Plus className="w-4 h-4 mr-2" /> Add Guarantee
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {(data.guarantees || []).map((guarantee: string, index: number) => (
                            <div key={index} className="flex gap-2">
                                <Input
                                    value={guarantee}
                                    onChange={(e) => updateArrayItem('guarantees', index, e.target.value)}
                                    placeholder="e.g., 60-day money-back guarantee, Lifetime warranty, Satisfaction guaranteed or 2x refund"
                                    className="bg-white"
                                />
                                <Button variant="ghost" size="icon" onClick={() => removeFromArray('guarantees', index)}>
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Transparency Rules */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <FileCheck className="w-5 h-5" />
                                    Transparency & Honesty Rules
                                </CardTitle>
                                <CardDescription>What do you openly share vs keep private?</CardDescription>
                            </div>
                            <Button onClick={() => addToArray('transparency_rules')} size="sm" variant="outline">
                                <Plus className="w-4 h-4 mr-2" /> Add Rule
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {(data.transparency_rules || []).map((rule: string, index: number) => (
                            <div key={index} className="flex gap-2">
                                <Input
                                    value={rule}
                                    onChange={(e) => updateArrayItem('transparency_rules', index, e.target.value)}
                                    placeholder="e.g., We always show real customer photos, We publish ingredient sources, We share revenue publicly"
                                />
                                <Button variant="ghost" size="icon" onClick={() => removeFromArray('transparency_rules', index)}>
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Security Signals */}
                <Card>
                    <CardHeader>
                        <CardTitle>Security & Privacy Signals</CardTitle>
                        <CardDescription>How do you communicate security?</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Textarea
                            value={data.security_signals || ""}
                            onChange={(e) => updateField('security_signals', e.target.value)}
                            placeholder="e.g., SSL Encrypted, PCI Compliant, We never sell your data, GDPR compliant"
                            className="min-h-[100px]"
                        />
                    </CardContent>
                </Card>
            </div>
        </Shell>
    );
}

