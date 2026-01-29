'use client';

import { useState, useEffect } from "react";
import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Globe, Save, Instagram, Facebook, Linkedin, Mail, MessageSquare, Video, Newspaper } from "lucide-react";
import { useProject } from "@/contexts/ProjectContext";

interface PlatformStrategy {
    platform: string;
    role: string;
    content_types: string;
    tone: string;
    frequency: string;
    primary_objective: string;
    secondary_objective: string;
}

export default function PlatformsPage() {
    const { currentProject, updateBrandIdentity } = useProject();
    const [platforms, setPlatforms] = useState<PlatformStrategy[]>([]);

    useEffect(() => {
        if (currentProject?.brandIdentity?.platform_strategy) {
            setPlatforms(currentProject.brandIdentity.platform_strategy);
        } else {
            // Initialize with common platforms
            setPlatforms([
                { platform: 'Instagram', role: '', content_types: '', tone: '', frequency: '', primary_objective: '', secondary_objective: '' },
                { platform: 'Facebook', role: '', content_types: '', tone: '', frequency: '', primary_objective: '', secondary_objective: '' },
                { platform: 'TikTok', role: '', content_types: '', tone: '', frequency: '', primary_objective: '', secondary_objective: '' },
                { platform: 'LinkedIn', role: '', content_types: '', tone: '', frequency: '', primary_objective: '', secondary_objective: '' },
                { platform: 'Email', role: '', content_types: '', tone: '', frequency: '', primary_objective: '', secondary_objective: '' },
                { platform: 'Blog', role: '', content_types: '', tone: '', frequency: '', primary_objective: '', secondary_objective: '' },
                { platform: 'YouTube', role: '', content_types: '', tone: '', frequency: '', primary_objective: '', secondary_objective: '' },
            ]);
        }
    }, [currentProject]);

    const handleSave = () => {
        const brandIdentity = currentProject?.brandIdentity || {};
        updateBrandIdentity({ ...brandIdentity, platform_strategy: platforms });
        alert("Platform Strategy Saved!");
    };

    const updatePlatform = (index: number, field: keyof PlatformStrategy, value: string) => {
        setPlatforms(prev => prev.map((platform, i) =>
            i === index ? { ...platform, [field]: value } : platform
        ));
    };

    const getPlatformIcon = (platform: string) => {
        const icons: { [key: string]: any } = {
            'Instagram': Instagram,
            'Facebook': Facebook,
            'LinkedIn': Linkedin,
            'Email': Mail,
            'TikTok': Video,
            'YouTube': Video,
            'Blog': Newspaper,
            'WhatsApp': MessageSquare
        };
        return icons[platform] || Globe;
    };

    const getPlatformColor = (platform: string) => {
        const colors: { [key: string]: string } = {
            'Instagram': 'bg-pink-100 text-pink-600 border-pink-200',
            'Facebook': 'bg-blue-100 text-blue-600 border-blue-200',
            'LinkedIn': 'bg-blue-100 text-blue-700 border-blue-200',
            'Email': 'bg-green-100 text-green-600 border-green-200',
            'TikTok': 'bg-purple-100 text-purple-600 border-purple-200',
            'YouTube': 'bg-red-100 text-red-600 border-red-200',
            'Blog': 'bg-amber-100 text-amber-600 border-amber-200',
            'WhatsApp': 'bg-green-100 text-green-600 border-green-200'
        };
        return colors[platform] || 'bg-gray-100 text-gray-600 border-gray-200';
    };

    return (
        <Shell>
            <div className="max-w-6xl mx-auto space-y-8 pb-20">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-widest mb-2">
                            <Globe className="w-3 h-3" /> Platform Strategy
                        </div>
                        <h1 className="text-3xl font-display font-bold">Channel & Platform Strategy</h1>
                        <p className="text-muted-foreground">
                            Define how your brand shows up on each platform to prevent cross-platform mismatch.
                        </p>
                    </div>
                    <Button onClick={handleSave}>
                        <Save className="w-4 h-4 mr-2" /> Save Strategy
                    </Button>
                </div>

                <Card className="bg-indigo-50 border-indigo-200">
                    <CardContent className="p-4">
                        <p className="text-sm text-indigo-800">
                            <strong>Platform-Specific Strategy:</strong> AI will adapt tone, content type, and format based on the platform.
                            Example: LinkedIn = Professional + Educational. TikTok = Casual + Entertaining.
                        </p>
                    </CardContent>
                </Card>

                {platforms.map((platform, index) => {
                    const Icon = getPlatformIcon(platform.platform);
                    const colorClass = getPlatformColor(platform.platform);

                    return (
                        <Card key={index} className={`border-2 ${colorClass.split(' ')[2]}`}>
                            <CardHeader className="bg-gradient-to-r from-white to-transparent">
                                <div className="flex items-center gap-3">
                                    <div className={`h-12 w-12 rounded-xl ${colorClass.split(' ').slice(0, 2).join(' ')} flex items-center justify-center shadow-sm`}>
                                        <Icon className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <CardTitle>{platform.platform}</CardTitle>
                                        <CardDescription>Define this platform's role in your strategy</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Role */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-muted-foreground uppercase">Strategic Role</label>
                                        <Input
                                            value={platform.role}
                                            onChange={(e) => updatePlatform(index, 'role', e.target.value)}
                                            placeholder="e.g., Awareness, Conversion, Community, Authority"
                                            className="bg-white"
                                        />
                                    </div>

                                    {/* Frequency */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-muted-foreground uppercase">Posting Frequency</label>
                                        <Input
                                            value={platform.frequency}
                                            onChange={(e) => updatePlatform(index, 'frequency', e.target.value)}
                                            placeholder="e.g., 3x/week, Daily, 2x/day"
                                            className="bg-white"
                                        />
                                    </div>
                                </div>

                                {/* Content Types */}
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground uppercase">Content Types</label>
                                    <Input
                                        value={platform.content_types}
                                        onChange={(e) => updatePlatform(index, 'content_types', e.target.value)}
                                        placeholder="e.g., Carousel posts, Reels, Stories, Long-form articles"
                                        className="bg-white"
                                    />
                                </div>

                                {/* Tone */}
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground uppercase">Tone on This Platform</label>
                                    <Input
                                        value={platform.tone}
                                        onChange={(e) => updatePlatform(index, 'tone', e.target.value)}
                                        placeholder="e.g., Professional, Casual, Educational, Entertaining"
                                        className="bg-white"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Primary Objective */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-muted-foreground uppercase">Primary Objective</label>
                                        <Input
                                            value={platform.primary_objective}
                                            onChange={(e) => updatePlatform(index, 'primary_objective', e.target.value)}
                                            placeholder="e.g., Drive traffic to site, Build email list"
                                            className="bg-white"
                                        />
                                    </div>

                                    {/* Secondary Objective */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-muted-foreground uppercase">Secondary Objective</label>
                                        <Input
                                            value={platform.secondary_objective}
                                            onChange={(e) => updatePlatform(index, 'secondary_objective', e.target.value)}
                                            placeholder="e.g., Increase engagement, Build brand awareness"
                                            className="bg-white"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}

                <Card className="border-green-200 bg-green-50">
                    <CardContent className="p-4">
                        <p className="text-sm text-green-800">
                            <strong>✓ Platform Strategy Defined:</strong> AI will now adapt its output based on the target platform, ensuring consistency with your strategic intent.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </Shell>
    );
}

