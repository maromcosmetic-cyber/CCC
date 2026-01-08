'use client';

import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Mail, Building } from "lucide-react";
import { useEffect, useState } from "react";

export default function ProfilePage() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const response = await fetch('/api/auth/user');
                if (response.ok) {
                    const data = await response.json();
                    setUser(data.user);
                }
            } catch (error) {
                console.error('Error fetching user:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchUser();
    }, []);

    if (loading) {
        return (
            <Shell>
                <div className="flex items-center justify-center h-full">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
                </div>
            </Shell>
        );
    }

    return (
        <Shell>
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="space-y-2">
                    <h1 className="text-4xl font-display font-black text-foreground tracking-tight">Profile</h1>
                    <p className="text-muted-foreground text-lg">
                        Manage your account information and preferences
                    </p>
                </div>

                <Card className="glass-card">
                    <CardHeader>
                        <CardTitle>Personal Information</CardTitle>
                        <CardDescription>
                            Your account details and contact information
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center gap-6">
                            <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-white font-bold text-2xl">
                                {user?.email?.slice(0, 2).toUpperCase() || 'U'}
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg">
                                    {user?.user_metadata?.name || user?.email?.split('@')[0] || 'User'}
                                </h3>
                                <p className="text-sm text-muted-foreground">{user?.email}</p>
                            </div>
                        </div>

                        <div className="grid gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">
                                    <User className="w-4 h-4 inline mr-2" />
                                    Full Name
                                </Label>
                                <Input
                                    id="name"
                                    value={user?.user_metadata?.name || ''}
                                    disabled
                                    className="h-11"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">
                                    <Mail className="w-4 h-4 inline mr-2" />
                                    Email Address
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={user?.email || ''}
                                    disabled
                                    className="h-11"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="created">
                                    Account Created
                                </Label>
                                <Input
                                    id="created"
                                    value={user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    }) : 'N/A'}
                                    disabled
                                    className="h-11"
                                />
                            </div>
                        </div>

                        <div className="pt-4">
                            <p className="text-sm text-muted-foreground">
                                To update your profile information, please contact support.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="glass-card border-rose-500/20 bg-rose-500/5">
                    <CardHeader>
                        <CardTitle className="text-rose-600">Danger Zone</CardTitle>
                        <CardDescription>
                            Irreversible actions for your account
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button variant="destructive" disabled>
                            Delete Account
                        </Button>
                        <p className="text-sm text-muted-foreground mt-2">
                            Contact support to delete your account
                        </p>
                    </CardContent>
                </Card>
            </div>
        </Shell>
    );
}
