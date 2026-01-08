
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Upload, Video } from "lucide-react";
import { toast } from "sonner"; // Assuming sonner is set up, fallback to simple alert if not

export default function ImageToVideoPage() {
    const [prompt, setPrompt] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleGenerate = async () => {
        if (!selectedFile) {
            toast.error("Please select an image first.");
            return;
        }
        if (!prompt) {
            toast.error("Please enter a prompt.");
            return;
        }

        setLoading(true);
        setError(null);
        setVideoUrl(null);

        const formData = new FormData();
        formData.append("image", selectedFile);
        formData.append("prompt", prompt);

        try {
            const response = await fetch("/api/ai/video/image-to-video", {
                method: "POST",
                body: formData,
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
                <h1 className="text-3xl font-bold tracking-tight">Image to Video</h1>
                <p className="text-muted-foreground">
                    Animate your images using Veo 3 Fast model.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="h-fit">
                    <CardHeader>
                        <CardTitle>Configuration</CardTitle>
                        <CardDescription>Upload an image and describe how it should move.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="image-upload">Input Image</Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    id="image-upload"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="cursor-pointer"
                                />
                            </div>
                            {selectedFile && (
                                <div className="mt-2 rounded-md overflow-hidden border aspect-video relative group">
                                    <img
                                        src={URL.createObjectURL(selectedFile)}
                                        alt="Preview"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="prompt">Motion Prompt</Label>
                            <Input
                                id="prompt"
                                placeholder="Describe the motion (e.g., 'Camera pans right, waves moving')"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
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
                            disabled={loading || !selectedFile || !prompt}
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
