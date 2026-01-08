'use client';

import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Layers, Fingerprint, Mic2, Users, BookOpen, AlertCircle, CheckCircle2, Palette, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useProject } from "@/contexts/ProjectContext";

export default function BrandOverviewPage() {
    const { currentProject } = useProject();

    return (
        <Shell>
            <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-widest">
                            <Layers className="w-3 h-3" /> Brand Center
                        </div>
                        <h1 className="text-4xl font-display font-black text-foreground tracking-tight">Brand Overview</h1>
                        <p className="text-muted-foreground text-lg">
                            Manage your brand identity, voice, and strategic assets.
                        </p>
                    </div>

                    <Card className="w-[300px] border-indigo-100 bg-indigo-50/50">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center text-indigo-600 shadow-sm font-bold text-lg">
                                0%
                            </div>
                            <div>
                                <p className="font-semibold text-sm">Brand Completeness</p>
                                <Progress value={0} className="h-2 w-24 mt-1" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Identity Card */}
                    <Link href="/brand/identity" className="group">
                        <Card className="h-full hover:shadow-lg transition-all hover:border-indigo-200">
                            <CardHeader>
                                <div className="h-10 w-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                    <Fingerprint className="w-6 h-6" />
                                </div>
                                <CardTitle>Identity & DNA</CardTitle>
                                <CardDescription>Strategic blueprint, problem, and audience.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Mission & Values</li>
                                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Product Deep Dive</li>
                                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Target Audience</li>
                                </ul>
                            </CardContent>
                        </Card>
                    </Link>

                    {/* Visuals Card (NEW) */}
                    <Link href="/brand/visuals" className="group">
                        <Card className="h-full hover:shadow-lg transition-all hover:border-purple-200">
                            <CardHeader>
                                <div className="h-10 w-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                    <Palette className="w-6 h-6" />
                                </div>
                                <CardTitle>Visual Identity</CardTitle>
                                <CardDescription>Colors, typography, logo, and aesthetic.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Brand Colors</li>
                                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Typography</li>
                                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Design System Rules</li>
                                </ul>
                            </CardContent>
                        </Card>
                    </Link>

                    {/* Voice Card */}
                    <Link href="/brand/voice" className="group">
                        <Card className="h-full hover:shadow-lg transition-all hover:border-rose-200">
                            <CardHeader>
                                <div className="h-10 w-10 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                    <Mic2 className="w-6 h-6" />
                                </div>
                                <CardTitle>Voice & Tone</CardTitle>
                                <CardDescription>Personality, guardrails, and keywords.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Brand Archetype</li>
                                    <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-amber-500" /> Strict Guardrails</li>
                                    <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-amber-500" /> Forbidden Topics</li>
                                </ul>
                            </CardContent>
                        </Card>
                    </Link>

                    {/* Playbook Card */}
                    <Link href="/brand/playbook" className="group">
                        <Card className="h-full hover:shadow-lg transition-all hover:border-emerald-200">
                            <CardHeader>
                                <div className="h-10 w-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                    <BookOpen className="w-6 h-6" />
                                </div>
                                <CardTitle>Brand Playbook</CardTitle>
                                <CardDescription>Your master strategy document.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-sm text-muted-foreground">
                                    <p className="mb-4">Generate a comprehensive PDF guide for your team and agencies.</p>
                                    <Button variant="outline" size="sm" className="w-full">View Playbook</Button>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                </div>
            </div>
        </Shell>
    );
}
