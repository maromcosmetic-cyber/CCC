'use client';

import { Shell } from "@/components/layout/Shell";
import { useEffect, useState } from "react";
import { useProject } from "@/contexts/ProjectContext";
import { createClient } from "@/lib/auth/client";
import { SignedImage } from "@/components/ui/signed-image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ImageIcon, Download, Trash2, Maximize2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
// import { PersonaImage } from "@/types/models";

export default function MediaPage() {
    const { currentProject } = useProject();
    const [images, setImages] = useState<any[]>([]);
    const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    const fetchImages = async () => {
        if (!currentProject?.id) return;

        setIsLoading(true);
        try {
            const response = await fetch(`/api/projects/${currentProject.id}/media`);
            const data = await response.json();

            if (!response.ok) {
                console.error('Error fetching media:', data.error);
                toast.error(`Failed to load media assets: ${data.error}`);
            } else {
                const mediaAssets = data.media || [];
                setImages(mediaAssets);

                // Create signed URLs in parallel
                const signedUrlPromises = mediaAssets
                    .filter((image: any) => image.storage_path && image.storage_bucket)
                    .map(async (image: any) => {
                        const key = `${image.storage_bucket}/${image.storage_path}`;
                        try {
                            const signedUrlResponse = await fetch(
                                `/api/media/signed-url?bucket=${encodeURIComponent(image.storage_bucket)}&path=${encodeURIComponent(image.storage_path)}&expiresIn=3600`
                            );
                            if (signedUrlResponse.ok) {
                                const { signedUrl } = await signedUrlResponse.json();
                                return { key, signedUrl };
                            }
                        } catch (err) {
                            console.error('Failed to create signed URL:', err);
                        }
                        return null;
                    });

                const results = await Promise.all(signedUrlPromises);
                const newSignedUrls: Record<string, string> = {};

                results.forEach((result: any) => {
                    if (result) {
                        newSignedUrls[result.key] = result.signedUrl;
                    }
                });

                if (Object.keys(newSignedUrls).length > 0) {
                    setSignedUrls(prev => ({ ...prev, ...newSignedUrls }));
                }
            }
        } catch (err) {
            console.error('Failed to fetch media:', err);
            toast.error('Network error loading media');
        } finally {
            setIsLoading(false);
        }
    };


    useEffect(() => {
        fetchImages();
    }, [currentProject?.id]);

    const filteredImages = images.filter(img =>
        (img.persona_name && img.persona_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (img.image_type && img.image_type.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <Shell>
            <div className="h-[calc(100vh-2rem)] flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Header */}
                <div className="flex items-center justify-between shrink-0">
                    <div>
                        <h1 className="text-3xl font-display font-bold">Media Library</h1>
                        <p className="text-muted-foreground">Manage all your generated assets and creative files</p>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="flex items-center gap-4 bg-white p-4 rounded-xl border shadow-sm">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by persona or type..."
                            className="pl-9"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="ml-auto text-sm text-muted-foreground">
                        {filteredImages.length} assets found
                    </div>
                </div>

                {/* Gallery */}
                <div className="flex-1 overflow-y-auto pr-2 pb-20">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-64">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
                            <p className="text-muted-foreground">Loading your library...</p>
                        </div>
                    ) : filteredImages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-xl bg-slate-50">
                            <ImageIcon className="w-12 h-12 text-slate-300 mb-2" />
                            <p className="text-muted-foreground font-medium">No media assets found</p>
                            <p className="text-sm text-slate-400">Generate images in the Campaign Studio to see them here.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            {filteredImages.map((image) => (
                                <Card key={image.id} className="group overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow">
                                    <CardContent className="p-0 relative aspect-square bg-slate-100">
                                        <SignedImage
                                            storageUrl={image.storage_url}
                                            storagePath={image.storage_path}
                                            storageBucket={image.storage_bucket}
                                            signedUrl={image.storage_path && image.storage_bucket ? signedUrls[`${image.storage_bucket}/${image.storage_path}`] : undefined}
                                            alt={image.persona_name || 'Asset'}
                                            className="w-full h-full object-cover"
                                        />

                                        {/* Overlay */}
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full bg-white/90 hover:bg-white text-black">
                                                        <Maximize2 className="w-4 h-4" />
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black/95 border-0 text-white">
                                                    <div className="relative w-full h-[80vh] flex items-center justify-center">
                                                        <SignedImage
                                                            storageUrl={image.storage_url}
                                                            storagePath={image.storage_path}
                                                            storageBucket={image.storage_bucket}
                                                            signedUrl={image.storage_path && image.storage_bucket ? signedUrls[`${image.storage_bucket}/${image.storage_path}`] : undefined}
                                                            alt={image.persona_name || 'Asset'}
                                                            className="max-w-full max-h-full object-contain"
                                                        />
                                                    </div>
                                                </DialogContent>
                                            </Dialog>

                                            {/* Download Button (Simplified) */}
                                            {image.storage_url && (
                                                <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full bg-white/90 hover:bg-white text-black" onClick={() => window.open(image.storage_url, '_blank')}>
                                                    <Download className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>

                                        {/* Badges */}
                                        <div className="absolute bottom-2 left-2 flex flex-col gap-1 items-start">
                                            {image.persona_name && (
                                                <Badge variant="secondary" className="bg-black/50 text-white hover:bg-black/60 backdrop-blur-sm border-0 text-[10px]">
                                                    {image.persona_name}
                                                </Badge>
                                            )}
                                            {image.image_type && (
                                                <Badge variant="outline" className="bg-white/90 text-black backdrop-blur-sm border-0 text-[10px]">
                                                    {image.image_type}
                                                </Badge>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </Shell>
    );
}
