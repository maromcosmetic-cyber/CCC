'use client';

import { Shell } from "@/components/layout/Shell";
import { BookOpen, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PlaybookPage() {
    return (
        <Shell>
            <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-widest">
                            <BookOpen className="w-3 h-3" /> Strategy
                        </div>
                        <h1 className="text-4xl font-display font-black text-foreground tracking-tight">Brand Playbook</h1>
                        <p className="text-muted-foreground text-lg">
                            Your automatically generated brand bible.
                        </p>
                    </div>
                    <Button className="gap-2">
                        <Download className="w-4 h-4" /> Export PDF
                    </Button>
                </div>

                <div className="aspect-[3/4] max-w-2xl mx-auto bg-white shadow-xl border rounded-sm p-12 overflow-hidden relative">
                    {/* Fake Document */}
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <BookOpen className="w-32 h-32" />
                    </div>
                    <div className="h-full flex flex-col justify-between">
                        <div className="space-y-8">
                            <div className="w-24 h-24 bg-black/10 rounded-full" />
                            <div className="space-y-2">
                                <div className="h-12 w-3/4 bg-black/80" />
                                <div className="h-6 w-1/2 bg-black/40" />
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="h-px bg-black/20" />
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>© 2026 Acme Corp</span>
                                <span>Confidential</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Shell>
    );
}
