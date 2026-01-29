"use client";

import { Shell } from "@/components/layout/Shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Wand2 } from "lucide-react";
import Link from "next/link";

export default function AdCopyPage() {
    return (
        <Shell>
            <div className="space-y-6 max-w-4xl mx-auto">
                <Link href="/studio/copywriter">
                    <Button variant="ghost" className="mb-4 pl-0 hover:pl-2 transition-all">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
                    </Button>
                </Link>

                <div>
                    <h1 className="text-3xl font-display font-black tracking-tight mb-2">Ad Copy Generator</h1>
                    <p className="text-muted-foreground">
                        Generate high-converting headlines, hooks, and body copy for Meta, TikTok, and Google Ads.
                    </p>
                </div>

                <Card className="border-dashed">
                    <CardHeader className="text-center py-12">
                        <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
                            <Wand2 className="w-8 h-8 text-blue-600" />
                        </div>
                        <CardTitle>AI Generator Ready</CardTitle>
                        <CardDescription className="max-w-md mx-auto mt-2">
                            The CCC Copyright Engine is ready to generate copy.
                            <br />
                            (This is a placeholder for the full form integration).
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center pb-12">
                        <Button>Start Generation</Button>
                    </CardContent>
                </Card>
            </div>
        </Shell>
    );
}
