'use client';

import { Shell } from "@/components/layout/Shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useProject } from "@/contexts/ProjectContext";
import { Plus, RefreshCw, Search, ShoppingBag, AlertCircle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import Image from "next/image";
import { ConnectStorePrompt } from "@/components/commerce/ConnectStorePrompt";
import { useWooCommerceIntegration } from "@/hooks/useWooCommerceIntegration";

interface Product {
    id: number;
    name: string;
    description: string;
    price: string;
    regular_price: string;
    sale_price: string;
    stock_quantity: number | null;
    stock_status: string;
    images: { src: string }[];
    status: string;
}

export default function ProductsPage() {
    const { currentProject } = useProject();
    const { isConnected, isLoading: isAuthLoading } = useWooCommerceIntegration();
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchProducts = async () => {
        if (!currentProject) return;

        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/projects/${currentProject.id}/commerce/products`);
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to fetch products');
            }
            const data = await res.json();
            setProducts(data);
        } catch (err: any) {
            console.error(err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        // Only fetch if connected (or if status is known)
        if (isConnected) {
            fetchProducts();
        }
    }, [currentProject, isConnected]);

    // Show loading while checking connection
    if (isAuthLoading) {
        return (
            <Shell>
                <div className="flex items-center justify-center h-[50vh]">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
            </Shell>
        );
    }

    // Show prompt if definitely disconnected
    if (isConnected === false) {
        return (
            <Shell>
                <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <h1 className="text-3xl font-display font-bold text-foreground">Products</h1>
                            <p className="text-muted-foreground">
                                Manage your full product catalog synced with WooCommerce.
                            </p>
                        </div>
                    </div>
                    <ConnectStorePrompt />
                </div>
            </Shell>
        );
    }

    // Fallback if isConnected is true but fetch failed (e.g. key revoked)
    const showConnectPrompt = error && (error.includes("integration not configured") || error.includes("The string did not match"));

    return (
        <Shell>
            <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-display font-bold text-foreground">Products</h1>
                        <p className="text-muted-foreground">
                            Manage your full product catalog synced with WooCommerce.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={fetchProducts} disabled={isLoading}>
                            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                            Sync
                        </Button>
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Product
                        </Button>
                    </div>
                </div>

                {showConnectPrompt ? (
                    <ConnectStorePrompt />
                ) : error ? (
                    <Card className="border-red-200 bg-red-50">
                        <CardContent className="flex items-center gap-2 p-4 text-red-700">
                            <AlertCircle className="w-5 h-5" />
                            <p>{error}</p>
                        </CardContent>
                    </Card>
                ) : null}

                {!showConnectPrompt && !error && (
                    <>
                        <div className="flex items-center space-x-2">
                            <div className="relative flex-1 max-w-sm">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search products..."
                                    className="pl-8"
                                />
                            </div>
                        </div>

                        <div className="rounded-md border bg-white">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[80px]">Image</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>SKU</TableHead>
                                        <TableHead>Stock</TableHead>
                                        <TableHead>Price</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading && products.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-24 text-center">
                                                Loading products from WooCommerce...
                                            </TableCell>
                                        </TableRow>
                                    ) : products.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-24 text-center">
                                                No products found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        products.map((product) => (
                                            <TableRow key={product.id}>
                                                <TableCell>
                                                    {product.images[0] ? (
                                                        <div className="h-10 w-10 relative overflow-hidden rounded-md border">
                                                            <Image
                                                                src={product.images[0].src}
                                                                alt={product.name}
                                                                fill
                                                                className="object-cover"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className="h-10 w-10 bg-muted rounded-md flex items-center justify-center">
                                                            <ShoppingBag className="w-4 h-4 text-muted-foreground" />
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="font-medium">{product.name}</TableCell>
                                                <TableCell className="text-muted-foreground">N/A</TableCell>
                                                <TableCell>
                                                    {product.stock_quantity ?? '∞'} <span className="text-xs text-muted-foreground">({product.stock_status})</span>
                                                </TableCell>
                                                <TableCell>
                                                    {product.sale_price ? (
                                                        <div className="flex flex-col">
                                                            <span className="text-red-500 font-bold">${product.sale_price}</span>
                                                            <span className="text-xs line-through text-muted-foreground">${product.regular_price}</span>
                                                        </div>
                                                    ) : (
                                                        <span>${product.price}</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium capitalize 
                                                    ${product.status === 'publish' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-800'}`}>
                                                        {product.status}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="sm">Edit</Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </>
                )}
            </div>
        </Shell>
    );
}
