'use client';

import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Sparkles, Zap, FileText, Library, ArrowRight } from "lucide-react";

export default function DesignOverviewPage() {
    const router = useRouter();

    const tools = [
        {
            title: "AI Studio",
            description: "Complete AI-powered creative suite with multiple tools",
            icon: Sparkles,
            href: "/design/ai-studio",
            color: "text-purple-600",
            bgColor: "bg-purple-500/10",
            borderColor: "border-purple-500/20",
        },
        {
            title: "Creative Kit",
            description: "Generate complete creative asset packages for campaigns",
            icon: Zap,
            href: "/design/creative-kit",
            color: "text-blue-600",
            bgColor: "bg-blue-500/10",
            borderColor: "border-blue-500/20",
        },
        {
            title: "UGC Video Generator",
            description: "Create authentic user-generated content videos with AI",
            icon: FileText,
            href: "/design/ugc-video",
            color: "text-green-600",
            bgColor: "bg-green-500/10",
            borderColor: "border-green-500/20",
        },
        {
            title: "Media Library",
            description: "Manage and organize all your creative assets",
            icon: Library,
            href: "/design/media",
            color: "text-orange-600",
            bgColor: "bg-orange-500/10",
            borderColor: "border-orange-500/20",
        },
    ];

    return (
        <Shell>
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div>
                    <h1 className="text-4xl font-display font-black text-foreground tracking-tight">Design Tools</h1>
                    <p className="text-muted-foreground text-lg mt-1">
                        AI-powered creative tools to generate stunning content for your campaigns
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {tools.map((tool) => (
                        <Card
                            key={tool.href}
                            className={`glass-card hover:shadow-lg transition-all cursor-pointer ${tool.borderColor}`}
                            onClick={() => router.push(tool.href)}
                        >
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className={`w-12 h-12 rounded-lg ${tool.bgColor} flex items-center justify-center`}>
                                        <tool.icon className={`w-6 h-6 ${tool.color}`} />
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <ArrowRight className="w-4 h-4" />
                                    </Button>
                                </div>
                                <CardTitle className="mt-4">{tool.title}</CardTitle>
                                <CardDescription>{tool.description}</CardDescription>
                            </CardHeader>
                        </Card>
                    ))}
                </div>

                <Card className="glass-card bg-primary/5 border-primary/20">
                    <CardContent className="p-6">
                        <div className="flex gap-4">
                            <Sparkles className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                            <div className="space-y-1">
                                <h3 className="font-bold text-sm">AI-Powered Creative Suite</h3>
                                <p className="text-sm text-muted-foreground">
                                    All design tools use advanced AI to help you create professional-quality content in minutes.
                                    Generate videos, images, and complete creative kits tailored to your brand and audience.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </Shell>
    );
}
