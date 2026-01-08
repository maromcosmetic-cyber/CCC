'use client';

import { useState, useEffect } from "react";
import { Shell } from "@/components/layout/Shell";
import { Zap, Loader2, Image as ImageIcon, ExternalLink, RefreshCw } from "lucide-react";
import { ConnectStorePrompt } from "@/components/commerce/ConnectStorePrompt";
import { useWooCommerceIntegration } from "@/hooks/useWooCommerceIntegration";
import { useProject } from "@/contexts/ProjectContext";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Image from "next/image";

export default function CollectionsPage() {
    const { isConnected, isLoading: isAuthLoading } = useWooCommerceIntegration();
    const { currentProject } = useProject();
    const [collections, setCollections] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isConnected && currentProject?.id) {
            fetchCollections();
        } else if (!isAuthLoading && !isConnected) {
            setLoading(false);
        }
    }, [isConnected, currentProject?.id, isAuthLoading]);

    const fetchCollections = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/projects/${currentProject!.id}/commerce/collections`);
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Failed to fetch collections");
            setCollections(json.categories || []);
        } catch (err: any) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (isAuthLoading || (loading && isConnected)) {
        return (
            <Shell>
                <div className="flex items-center justify-center h-[50vh]">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
            </Shell>
        );
    }

    if (!isConnected) {
        return (
            <Shell>
                <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="flex items-center gap-2 text-purple-600 font-bold text-xs uppercase tracking-widest">
                        <Zap className="w-3 h-3" /> Catalog
                    </div>
                    <h1 className="text-4xl font-display font-black text-foreground tracking-tight">Collections</h1>
                    <ConnectStorePrompt />
                </div>
            </Shell>
        );
    }

    return (
        <Shell>
            <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-purple-600 font-bold text-xs uppercase tracking-widest">
                            <Zap className="w-3 h-3" /> Catalog
                        </div>
                        <h1 className="text-4xl font-display font-black text-foreground tracking-tight">Collections</h1>
                        <p className="text-muted-foreground">Manage your product categories and groups.</p>
                    </div>
                    <Button onClick={fetchCollections} variant="outline" size="sm">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh
                    </Button>
                </div>

                {error && (
                    <div className="p-8 text-center text-red-500 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-900/20">
                        <p>Error loading collections: {error}</p>
                        <Button onClick={fetchCollections} variant="outline" className="mt-4">Retry</Button>
                    </div>
                )}

                {!error && collections.length === 0 && (
                    <div className="text-center py-20 bg-muted/30 rounded-lg border border-dashed">
                        <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                        <h3 className="text-lg font-medium">No collections found</h3>
                        <p className="text-muted-foreground">Your store doesn't seem to have any product categories yet.</p>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {collections.map((collection) => (
                        <Card key={collection.id} className="glass-card hover:shadow-lg transition-all duration-300 group overflow-hidden">
                            <div className="h-48 relative bg-muted/50 overflow-hidden flex items-center justify-center">
                                {collection.image ? (
                                    <Image
                                        src={collection.image}
                                        alt={collection.name}
                                        fill
                                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                ) : (
                                    <ImageIcon className="w-12 h-12 text-muted-foreground/30" />
                                )}
                                <div className="absolute top-2 right-2">
                                    <Badge variant="secondary" className="bg-white/80 dark:bg-black/80 backdrop-blur">
                                        {collection.count} Products
                                    </Badge>
                                </div>
                            </div>
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    <span className="truncate">{collection.name}</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
                                    {collection.description ?
                                        collection.description.replace(/<[^>]*>?/gm, '') // Strip HTML
                                        : 'No description available.'}
                                </p>
                            </CardContent>
                            <CardFooter className="pt-0">
                                <Button variant="ghost" className="w-full justify-between group-hover:text-primary" asChild>
                                    <a href={collection.link} target="_blank" rel="noopener noreferrer">
                                        View on Store
                                        <ExternalLink className="w-4 h-4 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </a>
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </div>
        </Shell>
    );
}
