'use client';

import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ShoppingBag, Zap, Tag, Library } from "lucide-react";
import Link from "next/link";
import { ConnectStorePrompt } from "@/components/commerce/ConnectStorePrompt";
import { useWooCommerceIntegration } from "@/hooks/useWooCommerceIntegration";
import { Loader2 } from "lucide-react";

export default function CatalogOverviewPage() {
    const { isConnected, isLoading } = useWooCommerceIntegration();

    if (isLoading) {
        return (
            <Shell>
                <div className="flex items-center justify-center h-[50vh]">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
            </Shell>
        );
    }

    if (isConnected === false) {
        return (
            <Shell>
                <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div>
                        <h1 className="text-4xl font-display font-black text-foreground tracking-tight">Catalog Overview</h1>
                        <p className="text-muted-foreground text-lg">Manage your products and store.</p>
                    </div>
                    <ConnectStorePrompt />
                </div>
            </Shell>
        );
    }

    return (
        <Shell>
            <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-widest">
                            <ShoppingBag className="w-3 h-3" /> Catalog Center
                        </div>
                        <h1 className="text-4xl font-display font-black text-foreground tracking-tight">Catalog Overview</h1>
                        <p className="text-muted-foreground text-lg">
                            Manage your products, collections, and offers across all channels.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Products Card */}
                    <Link href="/catalog/products" className="group">
                        <Card className="h-full hover:shadow-lg transition-all hover:border-indigo-200">
                            <CardHeader>
                                <div className="h-10 w-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                    <ShoppingBag className="w-6 h-6" />
                                </div>
                                <CardTitle>Products</CardTitle>
                                <CardDescription>Manage inventory and pricing.</CardDescription>
                            </CardHeader>
                        </Card>
                    </Link>

                    {/* Collections Card */}
                    <Link href="/catalog/collections" className="group">
                        <Card className="h-full hover:shadow-lg transition-all hover:border-purple-200">
                            <CardHeader>
                                <div className="h-10 w-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                    <Zap className="w-6 h-6" />
                                </div>
                                <CardTitle>Collections</CardTitle>
                                <CardDescription>Organize products into groups.</CardDescription>
                            </CardHeader>
                        </Card>
                    </Link>

                    {/* Offers Card */}
                    <Link href="/catalog/offers" className="group">
                        <Card className="h-full hover:shadow-lg transition-all hover:border-rose-200">
                            <CardHeader>
                                <div className="h-10 w-10 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                    <Tag className="w-6 h-6" />
                                </div>
                                <CardTitle>Offers</CardTitle>
                                <CardDescription>Coupons and discounts.</CardDescription>
                            </CardHeader>
                        </Card>
                    </Link>

                    {/* Assets Card */}
                    <Link href="/catalog/assets" className="group">
                        <Card className="h-full hover:shadow-lg transition-all hover:border-emerald-200">
                            <CardHeader>
                                <div className="h-10 w-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                    <Library className="w-6 h-6" />
                                </div>
                                <CardTitle>Assets</CardTitle>
                                <CardDescription>Product images and media.</CardDescription>
                            </CardHeader>
                        </Card>
                    </Link>
                </div>
            </div>
        </Shell>
    );
}
