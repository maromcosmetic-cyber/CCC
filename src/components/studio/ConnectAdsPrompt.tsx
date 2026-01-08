import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutDashboard, ArrowRight } from "lucide-react";
import Link from "next/link";

export function ConnectAdsPrompt() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 animate-in fade-in duration-700">
            <div className="w-24 h-24 rounded-3xl bg-blue-100 flex items-center justify-center mb-4 shadow-lg border-4 border-white">
                <LayoutDashboard className="w-10 h-10 text-blue-600" />
            </div>

            <div className="text-center space-y-2 max-w-md">
                <h2 className="text-2xl font-display font-bold text-slate-900 tracking-tight">
                    Connect Your Ad Account
                </h2>
                <p className="text-slate-500 text-lg leading-relaxed">
                    Link your Meta Ads account to create, manage, and analyze your campaigns directly from the studio.
                </p>
            </div>

            <div className="flex gap-4">
                <Link href="/settings/integrations">
                    <Button size="lg" className="h-12 px-8 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-full shadow-md shadow-blue-200 gap-2">
                        Connect Ad Account <ArrowRight className="w-4 h-4" />
                    </Button>
                </Link>
            </div>

            <div className="grid grid-cols-3 gap-6 mt-8 w-full max-w-2xl">
                <Card className="bg-slate-50 border-slate-200/60 shadow-none">
                    <CardHeader className="py-4">
                        <CardTitle className="text-sm font-semibold text-slate-700 text-center">Campaign Management</CardTitle>
                    </CardHeader>
                    <CardContent className="pb-4 text-center">
                        <span className="text-xs text-slate-500">Create & Edit Campaigns</span>
                    </CardContent>
                </Card>
                <Card className="bg-slate-50 border-slate-200/60 shadow-none">
                    <CardHeader className="py-4">
                        <CardTitle className="text-sm font-semibold text-slate-700 text-center">Real-time Analytics</CardTitle>
                    </CardHeader>
                    <CardContent className="pb-4 text-center">
                        <span className="text-xs text-slate-500">Track ROAS & Spend</span>
                    </CardContent>
                </Card>
                <Card className="bg-slate-50 border-slate-200/60 shadow-none">
                    <CardHeader className="py-4">
                        <CardTitle className="text-sm font-semibold text-slate-700 text-center">AI Optimization</CardTitle>
                    </CardHeader>
                    <CardContent className="pb-4 text-center">
                        <span className="text-xs text-slate-500">Auto-optimize Creatives</span>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
