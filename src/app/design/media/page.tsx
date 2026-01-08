'use client';

import { Shell } from "@/components/layout/Shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Filter, Download, MoreVertical, Image as ImageIcon, Video, FileText, Grid, List } from "lucide-react";
import { useProject } from "@/contexts/ProjectContext";
import { useState } from "react";

export default function MediaLibraryPage() {
    const { currentProject } = useProject();
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    // Mock assets
    const assets = [
        { id: 1, type: 'image', name: 'Summer Campaign Hero.png', date: '2 mins ago', size: '2.4 MB' },
        { id: 2, type: 'video', name: 'Product Demo - Vertical.mp4', date: '1 hour ago', size: '15.8 MB' },
        { id: 3, type: 'copy', name: 'Ad Copy Variations.txt', date: '3 hours ago', size: '12 KB' },
        { id: 4, type: 'image', name: 'Lifestyle Shot 1.jpg', date: '1 day ago', size: '1.8 MB' },
        { id: 5, type: 'video', name: 'UGC Testimonial.mp4', date: '2 days ago', size: '24.5 MB' },
        { id: 6, type: 'image', name: 'Product White BG.png', date: '2 days ago', size: '1.2 MB' },
    ];

    const getIcon = (type: string) => {
        switch (type) {
            case 'image': return <ImageIcon className="w-8 h-8 text-blue-500" />;
            case 'video': return <Video className="w-8 h-8 text-purple-500" />;
            case 'copy': return <FileText className="w-8 h-8 text-orange-500" />;
            default: return <ImageIcon className="w-8 h-8 text-gray-500" />;
        }
    };

    return (
        <Shell>
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-display font-black text-foreground tracking-tight">Media Library</h1>
                        <p className="text-muted-foreground text-lg">
                            Manage all your AI-generated assets in one place
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="bg-white border rounded-lg p-1 flex">
                            <Button
                                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                                size="sm"
                                className="h-8 px-2"
                                onClick={() => setViewMode('grid')}
                            >
                                <Grid className="w-4 h-4" />
                            </Button>
                            <Button
                                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                                size="sm"
                                className="h-8 px-2"
                                onClick={() => setViewMode('list')}
                            >
                                <List className="w-4 h-4" />
                            </Button>
                        </div>
                        <Button>
                            <Download className="w-4 h-4 mr-2" />
                            Download Selected
                        </Button>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input placeholder="Search assets..." className="pl-9 bg-white" />
                    </div>
                    <Button variant="outline" size="icon">
                        <Filter className="w-4 h-4" />
                    </Button>
                </div>

                <Tabs defaultValue="all" className="w-full">
                    <TabsList className="bg-white border">
                        <TabsTrigger value="all">All Assets</TabsTrigger>
                        <TabsTrigger value="images">Images</TabsTrigger>
                        <TabsTrigger value="videos">Videos</TabsTrigger>
                        <TabsTrigger value="copy">Copy</TabsTrigger>
                    </TabsList>

                    <TabsContent value="all" className="mt-6">
                        {viewMode === 'grid' ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                {assets.map((asset) => (
                                    <Card key={asset.id} className="group cursor-pointer hover:shadow-md transition-shadow">
                                        <CardContent className="p-4 flex flex-col items-center gap-4">
                                            <div className="w-full aspect-square bg-muted/30 rounded-lg flex items-center justify-center relative overflow-hidden">
                                                {/* In a real app, this would be a thumbnail */}
                                                <div className="group-hover:scale-110 transition-transform duration-300">
                                                    {getIcon(asset.type)}
                                                </div>
                                            </div>
                                            <div className="w-full">
                                                <div className="flex items-center justify-between mb-1">
                                                    <p className="font-medium text-sm truncate" title={asset.name}>{asset.name}</p>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <MoreVertical className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                                <div className="flex justify-between text-xs text-muted-foreground">
                                                    <span>{asset.date}</span>
                                                    <span>{asset.size}</span>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {assets.map((asset) => (
                                    <div key={asset.id} className="flex items-center justify-between p-4 bg-white border rounded-lg hover:shadow-sm transition-shadow group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded bg-muted/30 flex items-center justify-center">
                                                {getIcon(asset.type)}
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm">{asset.name}</p>
                                                <p className="text-xs text-muted-foreground capitalize">{asset.type} • {asset.size}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <p className="text-sm text-muted-foreground">{asset.date}</p>
                                            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                <MoreVertical className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </Shell>
    );
}
