
"use client";

import { useEffect, useState } from "react";
import { useProject } from "@/contexts/ProjectContext";
import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, DollarSign, ShoppingBag, TrendingUp, Calendar } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ConnectStorePrompt } from "@/components/commerce/ConnectStorePrompt";
import { toast } from "sonner";

export default function TransactionsPage() {
    const { currentProject } = useProject();
    const [period, setPeriod] = useState("month");
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!currentProject?.id) return;
        fetchData();
    }, [currentProject?.id, period]);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/projects/${currentProject!.id}/commerce/analytics?period=${period}`);
            const json = await res.json();

            if (!res.ok) {
                // Check if it's a connection error (e.g. 404/400 from helper)
                if (json.error?.includes("Consumer Key") || json.error?.includes("WooCommerce")) {
                    setData(null); // Triggers ConnectStorePrompt logic if using that check
                    setError("not_connected");
                    return;
                }
                throw new Error(json.error || "Failed to fetch data");
            }
            setData(json);
        } catch (err: any) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (error === "not_connected") {
        return (
            <Shell>
                <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="flex items-center gap-2 text-purple-600 font-bold text-xs uppercase tracking-widest">
                        <DollarSign className="w-3 h-3" /> Finance
                    </div>
                    <h1 className="text-4xl font-display font-black text-foreground tracking-tight">Transactions</h1>
                    <ConnectStorePrompt />
                </div>
            </Shell>
        );
    }

    if (loading && !data) {
        return (
            <Shell>
                <div className="flex h-[400px] items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            </Shell>
        );
    }

    if (error) {
        return (
            <Shell>
                <div className="p-8 text-center text-red-500">
                    <p>Error loading transactions: {error}</p>
                    <Button onClick={fetchData} variant="outline" className="mt-4">Retry</Button>
                </div>
            </Shell>
        );
    }

    const { summary, chart_data, recent_orders } = data;
    const currency = summary.currency;

    // Format chart data for Recharts
    const formattedChartData = chart_data.map((item: any) => ({
        name: period === 'day' ? item.date_created : item.date, // simple mapping, refine based on Woo response
        sales: parseFloat(item.total_sales),
        orders: parseInt(item.total_orders)
    }));

    return (
        <Shell>
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Transactions & Finance</h1>
                        <p className="text-muted-foreground">Track your store's revenue and sales performance.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Select value={period} onValueChange={setPeriod}>
                            <SelectTrigger className="w-[180px]">
                                <Calendar className="mr-2 h-4 w-4" />
                                <SelectValue placeholder="Select Period" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="week">Last 7 Days</SelectItem>
                                <SelectItem value="month">Last Month</SelectItem>
                                <SelectItem value="year">Last Year</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {currency}{summary.total_sales.toLocaleString()}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                For selected period
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{summary.total_orders}</div>
                            <p className="text-xs text-muted-foreground">
                                For selected period
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Avg. Order Value</CardTitle>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {currency}{summary.average_order_value.toFixed(2)}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                For selected period
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Chart */}
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Revenue Overview</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={formattedChartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis
                                        dataKey="name"
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) => `${currency}${value}`}
                                    />
                                    <Tooltip
                                        formatter={(value: any) => [`${currency}${value}`, 'Sales']}
                                        labelStyle={{ color: 'black' }}
                                    />
                                    <Bar
                                        dataKey="sales"
                                        fill="#2B71FF"
                                        radius={[4, 4, 0, 0]}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Recent Orders Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Transactions</CardTitle>
                        <CardDescription>Latest orders from your store.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Order ID</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {recent_orders.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">No recent orders found.</TableCell>
                                    </TableRow>
                                ) : (
                                    recent_orders.map((order: any) => (
                                        <TableRow key={order.id}>
                                            <TableCell className="font-medium">#{order.id}</TableCell>
                                            <TableCell>{order.customer}</TableCell>
                                            <TableCell>
                                                <Badge variant={order.status === 'completed' ? 'default' : 'secondary'}>
                                                    {order.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{new Date(order.date_created).toLocaleDateString()}</TableCell>
                                            <TableCell className="text-right">
                                                {order.currency}{order.total}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </Shell>
    );
}
