
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Subtitles, Loader2, Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SubtitlesTool() {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleGenerate = () => {
        setIsProcessing(true);
        // Mock processing
        setTimeout(() => {
            setIsProcessing(false);
            toast.success("Subtitles generated!");
        }, 2000);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card>
                <CardHeader>
                    <CardTitle>Subtitle Generator</CardTitle>
                    <CardDescription>Auto-generate subtitles for your videos.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="subtitle-upload">Upload Video</Label>
                        <Input
                            id="subtitle-upload"
                            type="file"
                            accept="video/*"
                            onChange={handleFileChange}
                        />
                    </div>
                </CardContent>
                <CardFooter>
                    <Button
                        onClick={handleGenerate}
                        disabled={!selectedFile || isProcessing}
                        className="w-full"
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Subtitles className="w-4 h-4 mr-2" />
                                Generate Subtitles
                            </>
                        )}
                    </Button>
                </CardFooter>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Transcript</CardTitle>
                    <CardDescription>Edit generated subtitles here.</CardDescription>
                </CardHeader>
                <CardContent className="min-h-[300px] flex items-center justify-center border-dashed border-2 rounded-lg m-4">
                    <p className="text-muted-foreground">Upload a video to see transcript</p>
                </CardContent>
            </Card>
        </div>
    );
}
