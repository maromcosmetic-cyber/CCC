'use client';

import { Shell } from "@/components/layout/Shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, Trash2, Mail } from "lucide-react";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/auth/client";
import { useProject } from "@/contexts/ProjectContext";

export default function SubscribersPage() {
    const { currentProject } = useProject();
    const [subscribers, setSubscribers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    useEffect(() => {
        if (!currentProject) return;
        fetchSubscribers();
    }, [currentProject]);

    const fetchSubscribers = async () => {
        setLoading(true);
        const supabase = createClient();
        const { data, error } = await supabase
            .from('email_subscribers')
            .select('*')
            .eq('project_id', currentProject?.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error(error);
            // If table doesn't exist yet, we handle gracefully
        } else {
            setSubscribers(data || []);
        }
        setLoading(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure?")) return;
        const supabase = createClient();
        await supabase.from('email_subscribers').delete().eq('id', id);
        fetchSubscribers();
    };

    const filtered = subscribers.filter(s =>
        s.email.toLowerCase().includes(search.toLowerCase()) ||
        (s.first_name || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <Shell>
            <div className="max-w-6xl mx-auto space-y-8 pb-20">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-display font-bold">Subscribers</h1>
                        <p className="text-muted-foreground">Manage your email list.</p>
                    </div>
                    <Button><Plus className="w-4 h-4 mr-2" /> Add Subscriber</Button>
                </div>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-base font-medium">All Contacts ({subscribers.length})</CardTitle>
                        <div className="relative w-64">
                            <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search emails..."
                                className="pl-8"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Joined</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8">Loading...</TableCell>
                                    </TableRow>
                                ) : filtered.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                            No subscribers found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filtered.map((sub) => (
                                        <TableRow key={sub.id}>
                                            <TableCell className="font-medium">{sub.email}</TableCell>
                                            <TableCell>{sub.first_name} {sub.last_name}</TableCell>
                                            <TableCell>
                                                <span className={`px-2 py-1 rounded-full text-xs ${sub.status === 'subscribed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                                    {sub.status}
                                                </span>
                                            </TableCell>
                                            <TableCell>{new Date(sub.created_at).toLocaleDateString()}</TableCell>
                                            <TableCell>
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(sub.id)}>
                                                    <Trash2 className="w-4 h-4 text-red-500" />
                                                </Button>
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
