'use client';

import { Shell } from "@/components/layout/Shell";
import { Card, CardContent } from "@/components/ui/card";
import { UserCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PersonasPage() {
    return (
        <Shell>
            <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-purple-600 font-bold text-xs uppercase tracking-widest">
                            <UserCircle className="w-3 h-3" /> Target Avatars
                        </div>
                        <h1 className="text-4xl font-display font-black text-foreground tracking-tight">Personas & Presenters</h1>
                        <p className="text-muted-foreground text-lg">
                            Define your Ideal Customer Profiles (ICPs) and Brand Ambassadors.
                        </p>
                    </div>
                    <Button>
                        <Plus className="w-4 h-4 mr-2" /> New Persona
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Placeholder Personas */}
                    {[1, 2, 3].map((i) => (
                        <Card key={i} className="hover:shadow-md transition-shadow cursor-pointer">
                            <CardContent className="p-6 space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="h-16 w-16 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold text-xl">
                                        P{i}
                                    </div>
                                    <div>
                                        <h3 className="font-bold">Persona {i}</h3>
                                        <p className="text-sm text-muted-foreground">Primary Decision Maker</p>
                                    </div>
                                </div>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between border-b pb-1">
                                        <span className="text-muted-foreground">Age</span>
                                        <span>25-34</span>
                                    </div>
                                    <div className="flex justify-between border-b pb-1">
                                        <span className="text-muted-foreground">Role</span>
                                        <span>Marketing Manager</span>
                                    </div>
                                    <div className="pt-2 text-muted-foreground">
                                        "I need tools that save me time and make me look good."
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </Shell>
    );
}
