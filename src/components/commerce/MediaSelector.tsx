
'use client';

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, Search, CheckCircle2, ImageOff } from "lucide-react";
import { Input } from "@/components/ui/input";

interface MediaAsset {
    id: string;
    storage_url: string;
    created_at: string;
}

interface MediaSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
    onSelect: (url: string) => void;
}

function ImageWithFallback({ src }: { src: string }) {
    const [error, setError] = useState(false);

    if (error) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 text-gray-400 p-2">
                <ImageOff className="w-8 h-8 mb-1" />
                <span className="text-[10px] text-center break-all opacity-50">
                    {src.split('/').pop()}
                </span>
            </div>
        );
    }

    return (
        <img
            src={src}
            alt="Media asset"
            className="w-full h-full object-cover"
            onError={() => setError(true)}
        />
    );
}

export function MediaSelector({ isOpen, onClose, projectId, onSelect }: MediaSelectorProps) {
    const [media, setMedia] = useState<MediaAsset[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedUrl, setSelectedUrl] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetchMedia();
        }
    }, [isOpen]);

    const fetchMedia = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/projects/${projectId}/media?limit=50`);
            const data = await response.json();
            if (data.media) {
                setMedia(data.media);
            }
        } catch (error) {
            console.error("Failed to fetch media:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const response = await fetch(`/api/projects/${projectId}/media/upload`, {
                method: "POST",
                body: formData,
            });
            const data = await response.json();
            if (data.asset) {
                setMedia([data.asset, ...media]);
                setSelectedUrl(data.asset.storage_url);
            }
        } catch (error) {
            console.error("Upload failed:", error);
        } finally {
            setIsUploading(false);
        }
    };

    const confirmSelection = () => {
        if (selectedUrl) {
            onSelect(selectedUrl);
            onClose();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[800px] max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Select or Upload Media</DialogTitle>
                </DialogHeader>

                <div className="flex items-center gap-4 py-4 border-b">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            placeholder="Search media..."
                            className="pl-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div>
                        <input
                            type="file"
                            id="file-upload"
                            className="hidden"
                            accept="image/*"
                            onChange={handleFileUpload}
                            disabled={isUploading}
                        />
                        <Button
                            asChild
                            variant="default"
                            disabled={isUploading}
                        >
                            <label htmlFor="file-upload" className="cursor-pointer">
                                {isUploading ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Upload className="w-4 h-4 mr-2" />
                                )}
                                Upload New
                            </label>
                        </Button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto py-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {media.length === 0 ? (
                                <div className="col-span-full py-10 text-center text-gray-400">
                                    No media found. Upload your first image!
                                </div>
                            ) : (
                                media.map((asset) => (
                                    <div
                                        key={asset.id}
                                        className={`relative aspect-square rounded-lg border-2 overflow-hidden cursor-pointer group transition-all ${selectedUrl === asset.storage_url
                                            ? "border-primary"
                                            : "border-transparent hover:border-gray-200"
                                            }`}
                                        onClick={() => setSelectedUrl(asset.storage_url)}
                                    >
                                        <ImageWithFallback src={asset.storage_url} />
                                        {selectedUrl === asset.storage_url && (
                                            <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                                                <CheckCircle2 className="w-8 h-8 text-primary fill-white" />
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter className="border-t pt-4">
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        onClick={confirmSelection}
                        disabled={!selectedUrl}
                    >
                        Use Selected Image
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
