'use client';

import { Shell } from "@/components/layout/Shell";
import { Library, Loader2 } from "lucide-react";
import { ConnectStorePrompt } from "@/components/commerce/ConnectStorePrompt";
import { useWooCommerceIntegration } from "@/hooks/useWooCommerceIntegration";

export default function AssetsPage() {
    const { isConnected, isLoading } = useWooCommerceIntegration();

    if (isLoading) {
        return (
            <Shell>
                <div className="flex items-center justify-center h-[50vh]">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
            </Shell>
        );
    }

    if (isConnected === false) {
        return (
            <Shell>
                <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-widest">
                        <Library className="w-3 h-3" /> Catalog
                    </div>
                    <h1 className="text-4xl font-display font-black text-foreground tracking-tight">Assets</h1>
                    <ConnectStorePrompt />
                </div>
            </Shell>
        );
    }

    return (
        <Shell>
            <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-widest">
                    <Library className="w-3 h-3" /> Catalog
                </div>
                <h1 className="text-4xl font-display font-black text-foreground tracking-tight">Assets</h1>
                <p className="text-muted-foreground">Product Assets Placeholder</p>
            </div>
        </Shell>
    );
}
