'use client';

import { useState, useEffect } from "react";
import { Shell } from "@/components/layout/Shell";
import { Tag, Loader2, Plus, Copy, RefreshCw } from "lucide-react";
import { ConnectStorePrompt } from "@/components/commerce/ConnectStorePrompt";
import { useWooCommerceIntegration } from "@/hooks/useWooCommerceIntegration";
import { useProject } from "@/contexts/ProjectContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function OffersPage() {
    const { isConnected, isLoading: isAuthLoading } = useWooCommerceIntegration();
    const { currentProject } = useProject();
    const [coupons, setCoupons] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isConnected && currentProject?.id) {
            fetchCoupons();
        } else if (!isAuthLoading && !isConnected) {
            setLoading(false);
        }
    }, [isConnected, currentProject?.id, isAuthLoading]);

    const fetchCoupons = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/projects/${currentProject!.id}/commerce/coupons`);
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Failed to fetch coupons");
            setCoupons(json.coupons || []);
        } catch (err: any) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const copyCode = (code: string) => {
        navigator.clipboard.writeText(code);
        toast.success("Coupon code copied to clipboard");
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
                    <div className="flex items-center gap-2 text-rose-600 font-bold text-xs uppercase tracking-widest">
                        <Tag className="w-3 h-3" /> Catalog
                    </div>
                    <h1 className="text-4xl font-display font-black text-foreground tracking-tight">Offers</h1>
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
                        <div className="flex items-center gap-2 text-rose-600 font-bold text-xs uppercase tracking-widest">
                            <Tag className="w-3 h-3" /> Offers & Discounts
                        </div>
                        <h1 className="text-4xl font-display font-black text-foreground tracking-tight">Coupons</h1>
                        <p className="text-muted-foreground">Manage your store's promotional codes.</p>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={fetchCoupons} variant="outline" size="sm">
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Refresh
                        </Button>
                        <Button size="sm">
                            <Plus className="w-4 h-4 mr-2" />
                            Create Coupon
                        </Button>
                    </div>
                </div>

                {error && (
                    <div className="p-8 text-center text-red-500 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-900/20">
                        <p>Error loading coupons: {error}</p>
                        <Button onClick={fetchCoupons} variant="outline" className="mt-4">Retry</Button>
                    </div>
                )}

                {!error && (
                    <Card className="glass-card">
                        <CardHeader>
                            <CardTitle>Active Coupons</CardTitle>
                            <CardDescription>List of available discount codes from your store.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Code</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Usage</TableHead>
                                        <TableHead>Expiry</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {coupons.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                                No coupons found. Create one in WooCommerce or click the button above.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        coupons.map((coupon) => (
                                            <TableRow key={coupon.id}>
                                                <TableCell className="font-mono font-medium text-lg text-primary">
                                                    {coupon.code}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="capitalize">
                                                        {coupon.discount_type.replace(/_/g, ' ')}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="font-medium">
                                                    {coupon.discount_type.includes('percent') ? `${coupon.amount}%` : `$${coupon.amount}`}
                                                </TableCell>
                                                <TableCell>{coupon.usage_count} uses</TableCell>
                                                <TableCell>
                                                    {coupon.date_expires ? new Date(coupon.date_expires).toLocaleDateString() : 'Never'}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="icon" onClick={() => copyCode(coupon.code)}>
                                                        <Copy className="w-4 h-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}
            </div>
        </Shell>
    );
}
