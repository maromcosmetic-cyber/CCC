'use client';

import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Bell, Shield, Palette, Key, ArrowRight, Save, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useProject } from "@/contexts/ProjectContext";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/auth/client";
import { toast } from "sonner";

// New Components
import SMTPSettingsCard from "@/components/settings/SMTPSettingsCard";
import ReportingSettingsCard from "@/components/settings/ReportingSettingsCard";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


export default function SettingsPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { currentProject } = useProject();
    const [settings, setSettings] = useState<any>({});
    const [loading, setLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Get default tab from URL or default to 'general'
    const defaultTab = searchParams.get('tab') || 'general';
    const [activeTab, setActiveTab] = useState(defaultTab);

    useEffect(() => {
        if (!currentProject?.id) return;
        fetchSettings();
        checkOAuthCallback();
    }, [currentProject?.id]);

    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab) setActiveTab(tab);
    }, [searchParams]);

    const checkOAuthCallback = async () => {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.provider_token) {
            console.log("Found provider token:", session.provider_token);

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
                toast.success("Gmail connected successfully!");

                // Clear query params
                const newUrl = window.location.pathname + '?tab=integrations';
                window.history.replaceState({}, document.title, newUrl);
            }
        }
    };

    const fetchSettings = async () => {
        setLoading(true);
        const supabase = createClient();
        const { data } = await supabase
            .from('email_settings')
            .select('*')
            .eq('project_id', currentProject?.id)
            .single();

        if (data) {
            // Merge with existing state to avoid overwriting partial inputs if any
            setSettings(prev => ({ ...prev, ...data }));
        }
        setLoading(false);
    };

    const handleSave = async () => {
        if (!currentProject?.id) return;
        setIsSaving(true);
        const supabase = createClient();

        const payload = {
            project_id: currentProject.id,
            ...settings
        };

        const { error } = await supabase
            .from('email_settings')
            .upsert(payload, { onConflict: 'project_id' });

        if (error) {
            toast.error("Failed to save settings: " + error.message);
        } else {
            toast.success("Settings saved successfully");
            fetchSettings(); // Refresh
        }
        setIsSaving(false);
    };

    // Update URL when tab changes
    const onTabChange = (value: string) => {
        setActiveTab(value);
        router.push(`/settings?tab=${value}`, { scroll: false });
    };

    return (
        <Shell>
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
                <div className="flex items-center justify-between">
                    <div className="space-y-2">
                        <h1 className="text-4xl font-display font-black text-foreground tracking-tight">Settings</h1>
                        <p className="text-muted-foreground text-lg">
                            Manage your application preferences and configurations
                        </p>
                    </div>
                    <Button onClick={handleSave} disabled={isSaving || loading}>
                        {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Save Changes
                    </Button>
                </div>

                <Tabs value={activeTab} onValueChange={onTabChange} className="space-y-6">
                    <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
                        <TabsTrigger value="general">General</TabsTrigger>
                        <TabsTrigger value="integrations">Integrations</TabsTrigger>
                        <TabsTrigger value="notifications">Notifications</TabsTrigger>
                    </TabsList>

                    <TabsContent value="general" className="space-y-6">
                        {/* Appearance Card */}
                        <Card className="glass-card opacity-80 bg-muted/20">
                            <CardHeader>
                                <CardTitle>
                                    <Palette className="w-5 h-5 inline mr-2" />
                                    Appearance
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label>Theme</Label>
                                        <p className="text-sm text-muted-foreground">Dark Mode is enabled by default</p>
                                    </div>
                                    <Switch defaultChecked disabled />
                                </div>
                            </CardContent>
                        </Card>
                        {/* Reporting Settings */}
                        <ReportingSettingsCard
                            settings={settings}
                            onSettingsChange={(newS) => setSettings(newS)}
                        />
                    </TabsContent>

                    <TabsContent value="integrations" className="space-y-6">
                        {/* SMTP Settings */}
                        <SMTPSettingsCard
                            settings={settings}
                            onUpdate={(data: any) => setSettings({ ...settings, ...data })}
                        />

                        {/* Link to Full Integrations Page */}
                        <Card className="glass-card border-primary/20">
                            <CardHeader>
                                <CardTitle>
                                    <Key className="w-5 h-5 inline mr-2" />
                                    Other API Integrations
                                </CardTitle>
                                <CardDescription>
                                    Connect Meta Ads, WooCommerce, Google Analytics, etc.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium">Advanced Configuration</p>
                                        <p className="text-sm text-muted-foreground">
                                            Manage connection keys and secrets for external platforms
                                        </p>
                                    </div>
                                    <Button onClick={() => router.push('/settings/integrations')}>
                                        Manage Integrations
                                        <ArrowRight className="w-4 h-4 ml-2" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="notifications" className="space-y-6">
                        <Card className="glass-card opacity-80 bg-muted/20">
                            <CardHeader>
                                <CardTitle>
                                    <Bell className="w-5 h-5 inline mr-2" />
                                    System Notifications
                                </CardTitle>
                                <CardDescription>
                                    Configure in-app alert preferences
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label>App Alerts</Label>
                                        <p className="text-sm text-muted-foreground">
                                            Receive alerts about campaign status
                                        </p>
                                    </div>
                                    <Switch defaultChecked />
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                <div className="flex justify-end gap-4 pt-4">
                    <Button variant="outline" onClick={() => fetchSettings()}>Discard Changes</Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Save Changes
                    </Button>
                </div>
            </div>
        </Shell>
    );
}
