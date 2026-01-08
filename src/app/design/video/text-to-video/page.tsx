
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Upload, Video } from "lucide-react";
import { toast } from "sonner";

export default function TextToVideoPage() {
    const [prompt, setPrompt] = useState("");
    const [loading, setLoading] = useState(false);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!prompt) {
            toast.error("Please enter a prompt.");
            return;
        }

        setLoading(true);
        setError(null);
        setVideoUrl(null);

        try {
            const response = await fetch("/api/ai/video/text-to-video", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to generate video");
            }

            setVideoUrl(data.url);
            toast.success("Video generated successfully!");
        } catch (err: any) {
            console.error(err);
            setError(err.message || "An unexpected error occurred");
            toast.error(err.message || "An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container max-w-4xl py-8 space-y-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Text to Video</h1>
                <p className="text-muted-foreground">
                    Turn your text descriptions into video using Veo 3 Fast.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="h-fit">
                    <CardHeader>
                        <CardTitle>Configuration</CardTitle>
                        <CardDescription>Describe the video you want to create.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="prompt">Prompt</Label>
                            <Input
                                id="prompt"
                                placeholder="A cinematic drone shot of a futuristic city..."
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                className="h-24" // Make it look a bit like a textarea if input supports it, otherwise class might be ignored for height on input type=text
                            // actually input is bad for multi-line. Should use Textarea if available. I'll stick to Input for safety or check components.
                            />
                        </div>

                        {error && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Error</AlertTitle>
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                    </CardContent>
                    <CardFooter>
                        <Button
                            onClick={handleGenerate}
                            disabled={loading || !prompt}
                            className="w-full"
                        >
                            {loading ? (
                                <>
                                    <Spinner className="mr-2 h-4 w-4" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Video className="mr-2 h-4 w-4" />
                                    Generate Video
                                </>
                            )}
                        </Button>
                    </CardFooter>
                </Card>

                <Card className="h-full min-h-[400px] flex flex-col">
                    <CardHeader>
                        <CardTitle>Result</CardTitle>
                        <CardDescription>Your generated video will appear here.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col items-center justify-center p-6 border-dashed border-2 m-4 rounded-lg bg-muted/20">
                        {loading ? (
                            <div className="text-center space-y-4">
                                <Spinner className="h-10 w-10 mx-auto text-primary" />
                                <p className="text-sm text-muted-foreground animate-pulse">
                                    Generating video using Veo 3 Fast...<br />
                                    This usually takes 30-60 seconds.
                                </p>
                            </div>
                        ) : videoUrl ? (
                            <div className="w-full space-y-4">
                                <video
                                    controls
                                    className="w-full rounded-lg shadow-lg"
                                    src={videoUrl}
                                >
                                    Your browser does not support the video tag.
                                </video>
                                <a href={videoUrl} download className="block">
                                    <Button variant="outline" className="w-full">
                                        <Upload className="mr-2 h-4 w-4 rotate-180" />
                                        Download Video
                                    </Button>
                                </a>
                            </div>
                        ) : (
                            <div className="text-center text-muted-foreground">
                                <Video className="h-12 w-12 mx-auto mb-2 opacity-20" />
                                <p>No video generated yet</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
