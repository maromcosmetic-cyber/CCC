'use client';

import { Shell } from "@/components/layout/Shell";
import { Card, CardContent } from "@/components/ui/card";
import { Network, ArrowRight } from "lucide-react";

export default function MappingsPage() {
    return (
        <Shell>
            <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-orange-600 font-bold text-xs uppercase tracking-widest">
                            <Network className="w-3 h-3" /> Strategic Alignment
                        </div>
                        <h1 className="text-4xl font-display font-black text-foreground tracking-tight">Mappings</h1>
                        <p className="text-muted-foreground text-lg">
                            Map your Products to Audiences and Value Propositions.
                        </p>
                    </div>
                </div>

                <div className="rounded-xl border border-dashed p-12 flex flex-col items-center justify-center text-muted-foreground bg-muted/5">
                    <Network className="w-16 h-16 mb-4 opacity-20" />
                    <h3 className="text-lg font-semibold mb-2">Strategy Map Visualization</h3>
                    <p className="max-w-md text-center">
                        This tool will visualizing the connection between your products, features, and user benefits.
                    </p>
                </div>
            </div>
        </Shell>
    );
}
