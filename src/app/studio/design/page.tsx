
"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Shell } from "@/components/layout/Shell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Video, Sparkles, Mic, Subtitles, Wand2, Layers, Image as ImageIcon, FileText, User } from "lucide-react";

// Import Tools
import TextToVideoTool from "@/components/design/tools/TextToVideoTool";
import ImageToVideoTool from "@/components/design/tools/ImageToVideoTool";
import AdStudioTool from "@/components/design/tools/AdStudioTool";
import LipSyncTool from "@/components/design/tools/LipSyncTool";
import SkinEnhancerTool from "@/components/design/tools/SkinEnhancerTool";
import SubtitlesTool from "@/components/design/tools/SubtitlesTool";
import UGCVideoTool from "@/components/design/tools/UGCVideoTool";
import VoiceStudioTool from "@/components/design/tools/VoiceStudioTool";
import DesignChatTool from "@/components/design/tools/DesignChatTool";

export default function DesignPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const activeTab = searchParams?.get("tab") || "overview";

    // If overview, we could show a dashboard or default to text-to-text. 
    // For now, let's make 'overview' default to 'text-to-video' or show a dashboard.
    // The previous implementation had 'Overview' as a separate page.

    const handleTabChange = (value: string) => {
        router.push(`/studio/design?tab=${value}`);
    };

    return (
        <Shell>
            <div className="space-y-6">
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-bold tracking-tight">AI Design Studio</h1>
                    <p className="text-muted-foreground">Create and enhance content including video, images, and audio.</p>
                </div>

                <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
                    {/* Top bar removed as requested, navigation via sidebar only */}

                    <TabsContent value="overview" className="mt-0 h-full">
                        <DesignChatTool />
                    </TabsContent>

                    <TabsContent value="text-to-video" className="mt-4"><TextToVideoTool /></TabsContent>
                    <TabsContent value="image-to-video" className="mt-4"><ImageToVideoTool /></TabsContent>
                    <TabsContent value="ugc-video" className="mt-4"><UGCVideoTool /></TabsContent>
                    <TabsContent value="ad-studio" className="mt-4"><AdStudioTool /></TabsContent>
                    <TabsContent value="voice-studio" className="mt-4"><VoiceStudioTool /></TabsContent>
                    <TabsContent value="lip-sync" className="mt-4"><LipSyncTool /></TabsContent>
                    <TabsContent value="skin-enhancer" className="mt-4"><SkinEnhancerTool /></TabsContent>
                    <TabsContent value="subtitles" className="mt-4"><SubtitlesTool /></TabsContent>
                </Tabs>
            </div>
        </Shell>
    );
}
