'use client';

import { Shell } from "@/components/layout/Shell";
import { useMetaIntegration } from "@/hooks/useMetaIntegration";
import { ConnectAdsPrompt } from "@/components/studio/ConnectAdsPrompt";
import { Loader2, CheckSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function ApprovalsPage() {
    const { isConnected, isLoading } = useMetaIntegration();

    if (isLoading) {
        return (
            <Shell>
                <div className="flex justify-center items-center h-[60vh]">
                    <Loader2 className="animate-spin w-8 h-8 text-blue-600" />
                </div>
            </Shell>
        );
    }

    if (!isConnected) {
        return (
            <Shell>
                <ConnectAdsPrompt />
            </Shell>
        );
    }

    return (
        <Shell>
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <h1 className="text-4xl font-display font-black text-foreground tracking-tight">Approvals</h1>
                <Card className="glass-card border-dashed">
                    <CardContent className="flex flex-col items-center justify-center p-12 text-center min-h-[400px]">
                        <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mb-4">
                            <CheckSquare className="w-8 h-8 text-amber-600" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Pending Approvals</h3>
                        <p className="text-muted-foreground max-w-md">
                            Review and approve campaigns before they go live.
                            No items pending your review.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </Shell>
    );
}
