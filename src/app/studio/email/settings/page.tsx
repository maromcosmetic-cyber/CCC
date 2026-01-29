'use client';

import { Shell } from "@/components/layout/Shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/auth/client";
import { useProject } from "@/contexts/ProjectContext";
import { Save, Server } from "lucide-react";

export default function EmailSettingsPage() {
    const { currentProject } = useProject();
    const [settings, setSettings] = useState<any>({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!currentProject) return;
        fetchSettings();
        checkOAuthCallback();
    }, [currentProject]);

    const checkOAuthCallback = async () => {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.provider_token) {
            console.log("Found provider token:", session.provider_token);
            // We have a token. Identify if it's new and save it.
            // Ideally we only do this if we initiated it.
            // For now, we update state. logic in handleSave will persist it if user clicks save? 
            // Or auto save? Auto save is better for OAuth flow return.

            if (currentProject?.id) {
                const updates: any = {
                    project_id: currentProject.id,
                    gmail_access_token: session.provider_token,
                };
                if (session.provider_refresh_token) {
                    updates.gmail_refresh_token = session.provider_refresh_token;
                }

                // If we don't have sender email, use the google one
                if (session.user.email) {
                    updates.sender_email = session.user.email;
                    updates.sender_name = session.user.user_metadata?.full_name || session.user.email.split('@')[0];
                }

                await supabase.from('email_settings').upsert(updates, { onConflict: 'project_id' });
                // Reload settings
                fetchSettings();
                // success alert
                // alert("Gmail connected successfully!"); // intrusive?
            }
        }
    };

    const fetchSettings = async () => {
        if (!currentProject?.id) return;
        const supabase = createClient();
        const { data } = await supabase
            .from('email_settings')
            .select('*')
            .eq('project_id', currentProject.id)
            .single();
        if (data) setSettings(data);
    };

    const handleSave = async () => {
        setLoading(true);
        const supabase = createClient();
        const payload = {
            project_id: currentProject?.id,
            ...settings
        };

        let error;
        if (settings.id) {
            // @ts-ignore
            const { error: e } = await supabase.from('email_settings').update(payload).eq('id', settings.id);
            error = e;
        } else {
            // @ts-ignore
            const { error: e } = await supabase.from('email_settings').insert([payload]);
            error = e;
        }

        if (error) {
            alert("Error saving settings: " + error.message);
        } else {
            alert("Settings saved successfully");
        }
        setLoading(false);
    };

    return (
        <Shell>
            <div className="max-w-4xl mx-auto space-y-8 pb-20">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-display font-bold">Email Settings</h1>
                        <p className="text-muted-foreground">Configure your SMTP server for sending emails.</p>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Server className="w-5 h-5" /> SMTP Configuration</CardTitle>
                        <CardDescription>Connect to providers like Gmail, Outlook, Amazon SES, or WP SMTP.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">

                        {/* Gmail OAuth Section */}
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                            <h3 className="font-semibold text-blue-900 mb-2">Gmail Integration (Recommended)</h3>
                            <p className="text-sm text-blue-700 mb-4">Sign in with Google to send emails directly without configuring SMTP manually.</p>
                            {settings.gmail_access_token ? (
                                <div className="flex items-center gap-2 text-green-700 bg-green-50 px-3 py-2 rounded border border-green-200 w-fit">
                                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                    Gmail Connected via OAuth
                                    <Button variant="ghost" size="sm" className="h-6 ml-2 text-green-800" onClick={() => setSettings({ ...settings, gmail_access_token: null })}>Disconnect</Button>
                                </div>
                            ) : (
                                <Button
                                    variant="outline"
                                    className="bg-white hover:bg-gray-50 text-gray-700 border-gray-300"
                                    onClick={async () => {
                                        const supabase = createClient();
                                        await supabase.auth.signInWithOAuth({
                                            provider: 'google',
                                            options: {
                                                scopes: 'https://www.googleapis.com/auth/gmail.send',
                                                redirectTo: `${window.location.href}`,
                                                queryParams: {
                                                    access_type: 'offline',
                                                    prompt: 'consent'
                                                }
                                            }
                                        });
                                    }}
                                >
                                    <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                                    Connect Gmail Account
                                </Button>
                            )}
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                            <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-muted-foreground">Or Manual SMTP</span></div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Sender Name</label>
                                <Input
                                    placeholder="e.g. My Brand"
                                    value={settings.sender_name || ''}
                                    onChange={e => setSettings({ ...settings, sender_name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Sender Email</label>
                                <Input
                                    placeholder="noreply@mybrand.com"
                                    value={settings.sender_email || ''}
                                    onChange={e => setSettings({ ...settings, sender_email: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2 col-span-2">
                                <label className="text-sm font-medium">SMTP Host</label>
                                <Input
                                    placeholder="smtp.gmail.com"
                                    value={settings.smtp_host || ''}
                                    onChange={e => setSettings({ ...settings, smtp_host: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Port</label>
                                <Input
                                    placeholder="587"
                                    value={settings.smtp_port || ''}
                                    onChange={e => setSettings({ ...settings, smtp_port: parseInt(e.target.value) })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">SMTP Username</label>
                                <Input
                                    placeholder="user@example.com"
                                    value={settings.smtp_user || ''}
                                    onChange={e => setSettings({ ...settings, smtp_user: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">SMTP Password</label>
                                <Input
                                    type="password"
                                    placeholder="••••••••"
                                    value={settings.smtp_pass || ''}
                                    onChange={e => setSettings({ ...settings, smtp_pass: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="pt-4">
                            <Button onClick={handleSave} disabled={loading}>
                                <Save className="w-4 h-4 mr-2" />
                                {loading ? 'Saving...' : 'Save Configuration'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </Shell>
    );
}
