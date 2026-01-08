
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Wand2, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SkinEnhancerTool() {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleEnhance = () => {
        setIsProcessing(true);
        // Mock processing
        setTimeout(() => {
            setIsProcessing(false);
            toast.success("Skin enhancement completed!");
        }, 2000);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card>
                <CardHeader>
                    <CardTitle>AI Skin Enhancer</CardTitle>
                    <CardDescription>Automatically retouch facial features in photos and videos.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="enhance-upload">Upload Media</Label>
                        <Input
                            id="enhance-upload"
                            type="file"
                            accept="image/*,video/*"
                            onChange={handleFileChange}
                        />
                    </div>

                    {selectedFile && (
                        <div className="aspect-video bg-muted rounded-md flex items-center justify-center relative overflow-hidden">
                            <img
                                src={URL.createObjectURL(selectedFile)}
                                alt="Preview"
                                className="w-full h-full object-contain"
                            />
                        </div>
                    )}
                </CardContent>
                <CardFooter>
                    <Button
                        onClick={handleEnhance}
                        disabled={!selectedFile || isProcessing}
                        className="w-full"
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Enhancing...
                            </>
                        ) : (
                            <>
                                <Wand2 className="w-4 h-4 mr-2" />
                                Enhance Skin
                            </>
                        )}
                    </Button>
                </CardFooter>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Result</CardTitle>
                    <CardDescription>Enhanced media will appear here.</CardDescription>
                </CardHeader>
                <CardContent className="min-h-[300px] flex items-center justify-center border-dashed border-2 rounded-lg m-4">
                    <p className="text-muted-foreground">No result yet</p>
                </CardContent>
            </Card>
        </div>
    );
}
