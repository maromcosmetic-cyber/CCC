'use client';

import { Shell } from "@/components/layout/Shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, FileText } from "lucide-react";

export default function TemplatesPage() {
    return (
        <Shell>
            <div className="max-w-6xl mx-auto space-y-8 pb-20">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-display font-bold">Email Templates</h1>
                        <p className="text-muted-foreground">Select a template to start your campaign.</p>
                    </div>
                    <Button><Plus className="w-4 h-4 mr-2" /> New Template</Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Placeholder Templates */}
                    {[1, 2, 3].map((i) => (
                        <Card key={i} className="hover:border-blue-200 cursor-pointer group">
                            <div className="aspect-[3/4] bg-gray-100 relative group-hover:bg-gray-50 transition-colors">
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="secondary">Edit Template</Button>
                                </div>
                            </div>
                            <CardContent className="p-4">
                                <h3 className="font-semibold">Newsletter Layout {i}</h3>
                                <p className="text-sm text-muted-foreground">Classic single column.</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </Shell>
    );
}
