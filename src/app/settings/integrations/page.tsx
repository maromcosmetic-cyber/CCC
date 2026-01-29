'use client';

import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useProject } from "@/contexts/ProjectContext";
import { useState, useEffect } from "react";
import { Facebook, ShoppingCart, ShoppingBag, CheckCircle2, XCircle, Loader2, Eye, EyeOff, Activity } from "lucide-react";

interface Integration {
    id: string;
    platform: string;
    status: 'connected' | 'disconnected' | 'error';
    last_synced?: string;
}

export default function IntegrationsPage() {
    const { currentProject } = useProject();
    const [integrations, setIntegrations] = useState<Integration[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [testing, setTesting] = useState<string | null>(null);

    // Meta Ads fields
    const [metaAccessToken, setMetaAccessToken] = useState('');
    const [metaAppId, setMetaAppId] = useState('');
    const [metaAppSecret, setMetaAppSecret] = useState('');
    const [metaAdAccountId, setMetaAdAccountId] = useState('');
    const [showMetaSecret, setShowMetaSecret] = useState(false);

    // WooCommerce fields
    const [wooStoreUrl, setWooStoreUrl] = useState('');
    const [wooApiVersion, setWooApiVersion] = useState('v3');
    const [wooConsumerKey, setWooConsumerKey] = useState('');
    const [wooConsumerSecret, setWooConsumerSecret] = useState('');
    const [showWooSecret, setShowWooSecret] = useState(false);
    const [wooStatusMsg, setWooStatusMsg] = useState('');

    // Shopify fields
    const [shopifyStoreUrl, setShopifyStoreUrl] = useState('');
    const [shopifyApiKey, setShopifyApiKey] = useState('');
    const [shopifyPassword, setShopifyPassword] = useState('');

    const [showShopifyPassword, setShowShopifyPassword] = useState(false);

    // Microsoft Clarity fields
    const [clarityProjectId, setClarityProjectId] = useState('');
    const [clarityApiToken, setClarityApiToken] = useState('');
    const [showClarityToken, setShowClarityToken] = useState(false);

    // WordPress fields
    const [wordpressSiteUrl, setWordpressSiteUrl] = useState('');
    const [wordpressUsername, setWordpressUsername] = useState('');
    const [wordpressAppPassword, setWordpressAppPassword] = useState('');
    const [showWordpressPassword, setShowWordpressPassword] = useState(false);

    useEffect(() => {
        if (currentProject) {
            fetchIntegrations();
        }
    }, [currentProject]);

    const fetchIntegrations = async () => {
        if (!currentProject) return;

        try {
            const response = await fetch(`/api/projects/${currentProject.id}/integrations`);
            if (response.ok) {
                const data = await response.json();
                const ints = data.integrations || [];
                setIntegrations(ints);

                // Populate fields from config
                ints.forEach((i: any) => {
                    if (i.config) {
                        if (i.provider_type === 'woocommerce') {
                            setWooStoreUrl(i.config.store_url || '');
                            setWooApiVersion(i.config.api_version || 'wc/v3');
                            setWooConsumerKey(i.config.consumer_key || '');
                        }
                        if (i.provider_type === 'meta') {
                            setMetaAppId(i.config.app_id || '');
                            setMetaAdAccountId(i.config.ad_account_id || '');
                        }
                        if (i.provider_type === 'google_analytics') {
                            setGaMeasurementId(i.config.measurement_id || '');
                        }
                        if (i.provider_type === 'google_business') {
                            setGbLocationId(i.config.location_id || '');
                        }
                        if (i.provider_type === 'wordpress') {
                            setWordpressSiteUrl(i.config.site_url || '');
                            setWordpressUsername(i.config.username || '');
                        }
                        if (i.provider_type === 'microsoft_clarity') {
                            setClarityProjectId(i.config?.project_id || '');
                        }
                    }
                });
            }
        } catch (error) {
            console.error('Error fetching integrations:', error);
        } finally {
            setLoading(false);
        }
    };

    const saveMetaIntegration = async () => {
        if (!currentProject) return;

        setSaving('meta');
        try {
            const response = await fetch(`/api/projects/${currentProject.id}/integrations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider_type: 'meta',
                    credentials: {
                        access_token: metaAccessToken,
                        app_id: metaAppId,
                        app_secret: metaAppSecret,
                        ad_account_id: metaAdAccountId,
                    },
                    config: {
                        app_id: metaAppId,
                        ad_account_id: metaAdAccountId
                    }
                }),
            });

            if (response.ok) {
                await fetchIntegrations();
                alert('Meta Ads integration saved successfully!');
                // Clear form
                setMetaAccessToken('');
                setMetaAppId('');
                setMetaAppSecret('');
                setMetaAdAccountId('');
            } else {
                const error = await response.json();
                alert(`Error: ${error.error || 'Failed to save integration'}`);
            }
        } catch (error) {
            console.error('Error saving Meta integration:', error);
            alert('Failed to save integration');
        } finally {
            setSaving(null);
        }
    };

    const [disconnecting, setDisconnecting] = useState<string | null>(null);

    const disconnectIntegration = async (providerType: string) => {
        if (!currentProject) return;
        if (!confirm('Are you sure you want to disconnect? This will remove your credentials.')) return;

        setDisconnecting(providerType);
        try {
            const response = await fetch(`/api/projects/${currentProject.id}/integrations?provider_type=${providerType}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                await fetchIntegrations();
                alert(`${providerType} disconnected successfully`);
                // Clear local state if it matches
                if (providerType === 'meta') {
                    setMetaAccessToken('');
                    setMetaAppId('');
                    setMetaAppSecret('');
                    setMetaAdAccountId('');
                }
            } else {
                alert('Failed to disconnect');
            }
        } catch (error) {
            console.error('Error disconnecting:', error);
            alert('Error disconnecting');
        } finally {
            setDisconnecting(null);
        }
    };

    const saveWooCommerceIntegration = async (e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        console.log('CCC Debug: Saving WooCommerce integration...');
        if (!currentProject) {
            console.error('CCC Debug: No current project');
            return;
        }

        setSaving('woocommerce');
        try {
            const response = await fetch(`/api/projects/${currentProject.id}/integrations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider_type: 'woocommerce',
                    credentials: {
                        store_url: wooStoreUrl,
                        consumer_key: wooConsumerKey,
                        ...(wooConsumerSecret ? { consumer_secret: wooConsumerSecret } : {}),
                        api_version: wooApiVersion,
                    },
                    config: {
                        store_url: wooStoreUrl,
                        consumer_key: wooConsumerKey,
                        api_version: wooApiVersion
                    }
                }),
            });

            if (response.ok) {
                await fetchIntegrations();
                setWooStatusMsg('Saved successfully!');
                setTimeout(() => setWooStatusMsg(''), 3000);
                // Clear form
                // setWooStoreUrl(''); // KEEP DATA so user sees it
                // setWooConsumerKey('');
                setWooConsumerSecret('');
            } else {
                const error = await response.json();
                setWooStatusMsg(`Error: ${error.error || 'Failed'}`);
            }
        } catch (error) {
            console.error('Error saving WooCommerce integration:', error);
            setWooStatusMsg('Failed to save integration');
        } finally {
            setSaving(null);
        }
    };

    // Google Analytics fields
    const [gaMeasurementId, setGaMeasurementId] = useState('');
    const [gaApiSecret, setGaApiSecret] = useState('');
    const [showGaSecret, setShowGaSecret] = useState(false);

    // Google Business fields
    const [gbLocationId, setGbLocationId] = useState('');

    const saveGoogleAnalyticsIntegration = async () => {
        if (!currentProject) return;

        setSaving('google_analytics');
        try {
            const response = await fetch(`/api/projects/${currentProject.id}/integrations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider_type: 'google_analytics',
                    credentials: {
                        measurement_id: gaMeasurementId,
                        api_secret: gaApiSecret,
                    },
                }),
            });

            if (response.ok) {
                await fetchIntegrations();
                alert('Google Analytics integration saved successfully!');
                setGaMeasurementId('');
                setGaApiSecret('');
            } else {
                const error = await response.json();
                alert(`Error: ${error.error || 'Failed to save integration'}`);
            }
        } catch (error) {
            console.error('Error saving GA integration:', error);
            alert('Failed to save integration');
        } finally {
            setSaving(null);
        }
    };

    const saveGoogleBusinessIntegration = async () => {
        if (!currentProject) return;

        setSaving('google_business');
        try {
            const response = await fetch(`/api/projects/${currentProject.id}/integrations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider_type: 'google_business',
                    credentials: {
                        location_id: gbLocationId,
                    },
                }),
            });

            if (response.ok) {
                await fetchIntegrations();
                alert('Google Business Profile integration saved successfully!');
                setGbLocationId('');
            } else {
                const error = await response.json();
                alert(`Error: ${error.error || 'Failed to save integration'}`);
            }
        } catch (error) {
            console.error('Error saving GBP integration:', error);
            alert('Failed to save integration');
        } finally {
            setSaving(null);
        }
    };

    const connectGoogleBusinessOAuth = () => {
        if (!currentProject) return;

        const clientId = '922377577842-9q3bbr33jlgdk6gv2rsqp8nnhpr39p86.apps.googleusercontent.com';
        const redirectUri = `${window.location.origin}/api/auth/google/callback`;
        const scope = 'https://www.googleapis.com/auth/business.manage';
        const state = currentProject.id;

        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            response_type: 'code',
            scope: scope,
            state: state,
            access_type: 'offline',
            prompt: 'consent',
        })}`;

        window.location.href = authUrl;
    };

    const saveClarityIntegration = async () => {
        if (!currentProject) return;

        setSaving('microsoft_clarity');
        try {
            const response = await fetch(`/api/projects/${currentProject.id}/integrations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider_type: 'microsoft_clarity',
                    credentials: {
                        project_id: clarityProjectId,
                        api_token: clarityApiToken,
                    },
                    config: {
                        project_id: clarityProjectId,
                    },
                }),
            });

            if (response.ok) {
                await fetchIntegrations();
                alert('Microsoft Clarity integration saved successfully!');
                setClarityApiToken(''); // Clear token input to show saved state
            } else {
                const error = await response.json();
                alert(`Error: ${error.error || 'Failed to save integration'}`);
            }
        } catch (error) {
            console.error('Error saving Clarity integration:', error);
            alert('Failed to save integration');
        } finally {
            setSaving(null);
        }
    };

    const saveWordPressIntegration = async () => {
        if (!currentProject) return;

        setSaving('wordpress');
        try {
            const response = await fetch(`/api/projects/${currentProject.id}/integrations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider_type: 'wordpress',
                    credentials: {
                        site_url: wordpressSiteUrl,
                        username: wordpressUsername,
                        application_password: wordpressAppPassword,
                    },
                    config: {
                        site_url: wordpressSiteUrl,
                        username: wordpressUsername,
                    },
                }),
            });

            if (response.ok) {
                await fetchIntegrations();
                alert('WordPress integration saved successfully!');
                setWordpressAppPassword('');
            } else {
                const error = await response.json();
                alert(`Error: ${error.error || 'Failed to save integration'}`);
            }
        } catch (error) {
            console.error('Error saving WordPress integration:', error);
            alert('Failed to save integration');
        } finally {
            setSaving(null);
        }
    };



    const testConnection = async (platform: string) => {
        if (!currentProject) return;

        setTesting(platform);
        try {
            const response = await fetch(`/api/projects/${currentProject.id}/integrations/${platform}/test`, {
                method: 'POST',
            });

            if (response.ok) {
                alert(`${platform} connection test successful!`);
                await fetchIntegrations();
            } else {
                const error = await response.json();
                alert(`Connection test failed: ${error.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error testing connection:', error);
            alert('Connection test failed');
        } finally {
            setTesting(null);
        }
    };

    const getIntegrationStatus = (platform: string) => {
        const integration = integrations.find(i => i.platform === platform || (i as any).provider_type === platform);
        return integration?.status || 'disconnected';
    };

    const StatusBadge = ({ status }: { status: string }) => {
        if (status === 'connected' || status === 'active') {
            return (
                <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Connected
                </Badge>
            );
        }
        if (status === 'error') {
            return (
                <Badge className="bg-red-500/10 text-red-600 border-red-500/20">
                    <XCircle className="w-3 h-3 mr-1" />
                    Error
                </Badge>
            );
        }
        return (
            <Badge variant="outline" className="text-muted-foreground">
                Not Connected
            </Badge>
        );
    };

    if (!currentProject) {
        return (
            <Shell>
                <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">Please select a project first</p>
                </div>
            </Shell>
        );
    }

    return (
        <Shell>
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="space-y-2">
                    <h1 className="text-4xl font-display font-black text-foreground tracking-tight">Integrations</h1>
                    <p className="text-muted-foreground text-lg">
                        Connect your advertising and eCommerce platforms for {currentProject.name}
                    </p>
                </div>

                {/* Meta Ads Integration */}
                <Card className="glass-card">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                    <Facebook className="w-6 h-6 text-blue-600" />
                                </div>
                                <div>
                                    <CardTitle>Meta Ads</CardTitle>
                                    <CardDescription>Connect your Facebook & Instagram advertising account</CardDescription>
                                </div>
                            </div>
                            <StatusBadge status={getIntegrationStatus('meta')} />
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="meta-access-token">Access Token *</Label>
                            <Input
                                id="meta-access-token"
                                type="password"
                                value={metaAccessToken}
                                onChange={(e) => setMetaAccessToken(e.target.value)}
                                placeholder="Enter your Meta access token"
                                className="h-11"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="meta-app-id">App ID *</Label>
                                <Input
                                    id="meta-app-id"
                                    value={metaAppId}
                                    onChange={(e) => setMetaAppId(e.target.value)}
                                    placeholder="1234567890"
                                    className="h-11"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="meta-app-secret">App Secret *</Label>
                                <div className="relative">
                                    <Input
                                        id="meta-app-secret"
                                        type={showMetaSecret ? 'text' : 'password'}
                                        value={metaAppSecret}
                                        onChange={(e) => setMetaAppSecret(e.target.value)}
                                        placeholder={metaAppId ? "•••••••••••••••• (Saved)" : "Enter app secret"}
                                        className="h-11 pr-10"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-0 top-0 h-11 w-10"
                                        onClick={() => setShowMetaSecret(!showMetaSecret)}
                                    >
                                        {showMetaSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="meta-ad-account">Ad Account ID *</Label>
                            <Input
                                id="meta-ad-account"
                                value={metaAdAccountId}
                                onChange={(e) => setMetaAdAccountId(e.target.value)}
                                placeholder="act_1234567890"
                                className="h-11"
                            />
                            <p className="text-xs text-muted-foreground">
                                Find this in your Meta Business Manager under Ad Accounts
                            </p>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <Button
                                type="button"
                                onClick={saveMetaIntegration}
                                disabled={!!saving || !metaAccessToken || !metaAppId || !metaAppSecret || !metaAdAccountId}
                                className="flex-1"
                            >
                                {saving === 'meta' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                Save Integration
                            </Button>
                            {getIntegrationStatus('meta') !== 'disconnected' && (
                                <Button
                                    variant="destructive"
                                    onClick={() => disconnectIntegration('meta')}
                                    disabled={!!disconnecting}
                                >
                                    {disconnecting === 'meta' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                    Disconnect
                                </Button>
                            )}
                            <Button
                                variant="outline"
                                onClick={() => testConnection('meta')}
                                disabled={testing === 'meta' || getIntegrationStatus('meta') === 'disconnected'}
                            >
                                {testing === 'meta' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                Test Connection
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Custom Store Integration */}
                <Card className="glass-card">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                    <ShoppingBag className="w-6 h-6 text-emerald-600" />
                                </div>
                                <div>
                                    <CardTitle>Custom Store</CardTitle>
                                    <CardDescription>Connect a custom WooCommerce-compatible store</CardDescription>
                                </div>
                            </div>
                            <StatusBadge status={getIntegrationStatus('woocommerce')} />
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <form onSubmit={(e) => { e.preventDefault(); console.log('Prevented form submit'); }}>
                            <div className="space-y-2">
                                <Label htmlFor="woo-store-url">Store URL *</Label>
                                <Input
                                    id="woo-store-url"
                                    type="url"
                                    value={wooStoreUrl}
                                    onChange={(e) => setWooStoreUrl(e.target.value)}
                                    placeholder="https://yourstore.com"
                                    className="h-11"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="woo-api-version">API Version</Label>
                                <Input
                                    id="woo-api-version"
                                    value={wooApiVersion}
                                    onChange={(e) => setWooApiVersion(e.target.value)}
                                    placeholder="v3"
                                    className="h-11"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Default: wc/v3. Change if your store uses a different version.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="woo-consumer-key">Consumer Key *</Label>
                                <Input
                                    id="woo-consumer-key"
                                    value={wooConsumerKey}
                                    onChange={(e) => setWooConsumerKey(e.target.value)}
                                    placeholder="ck_..."
                                    className="h-11"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="woo-consumer-secret">Consumer Secret *</Label>
                                <div className="relative">
                                    <Input
                                        id="woo-consumer-secret"
                                        type={showWooSecret ? 'text' : 'password'}
                                        value={wooConsumerSecret}
                                        onChange={(e) => setWooConsumerSecret(e.target.value)}
                                        placeholder={wooConsumerKey ? "•••••••••••••••• (Saved)" : "cs_..."}
                                        className="h-11 pr-10"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-0 top-0 h-11 w-10"
                                        onClick={() => setShowWooSecret(!showWooSecret)}
                                    >
                                        {showWooSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Generate API keys in WooCommerce → Settings → Advanced → REST API
                                </p>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <Button
                                    type="button"
                                    onClick={saveWooCommerceIntegration}
                                    disabled={!!saving || !wooStoreUrl || !wooConsumerKey}
                                    className="flex-1"
                                >
                                    {saving === 'woocommerce' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                    Save Integration
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => testConnection('woocommerce')}
                                    disabled={testing === 'woocommerce' || getIntegrationStatus('woocommerce') === 'disconnected'}
                                >
                                    {testing === 'woocommerce' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                    Test Connection
                                </Button>
                            </div>
                            {wooStatusMsg && <p className="text-sm font-medium text-blue-600 mt-2">{wooStatusMsg}</p>}
                        </form>
                    </CardContent>
                </Card>

                {/* Google Analytics Integration */}
                <Card className="glass-card">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center">
                                    <div className="text-orange-600 font-bold text-xl">GA</div>
                                </div>
                                <div>
                                    <CardTitle>Google Analytics 4</CardTitle>
                                    <CardDescription>Connect your GA4 property for website traffic</CardDescription>
                                </div>
                            </div>
                            <StatusBadge status={getIntegrationStatus('google_analytics')} />
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="ga-measurement-id">Measurement ID (G-XXXXXXXXXX) *</Label>
                            <Input
                                id="ga-measurement-id"
                                value={gaMeasurementId}
                                onChange={(e) => setGaMeasurementId(e.target.value)}
                                placeholder="G-XXXXXXXXXX"
                                className="h-11"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="ga-api-secret">API Secret *</Label>
                            <div className="relative">
                                <Input
                                    id="ga-api-secret"
                                    type={showGaSecret ? 'text' : 'password'}
                                    value={gaApiSecret}
                                    onChange={(e) => setGaApiSecret(e.target.value)}
                                    placeholder="Enter API Secret"
                                    className="h-11 pr-10"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-0 top-0 h-11 w-10"
                                    onClick={() => setShowGaSecret(!showGaSecret)}
                                >
                                    {showGaSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Found in Admin → Data Streams → (Choose Stream) → Measurement Protocol API secrets
                            </p>
                        </div>
                        <div className="flex gap-3 pt-4">
                            <Button
                                onClick={saveGoogleAnalyticsIntegration}
                                disabled={!!saving || !gaMeasurementId || !gaApiSecret}
                                className="flex-1"
                            >
                                {saving === 'google_analytics' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                Save Integration
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Microsoft Clarity Integration */}
                <Card className="glass-card">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-lg bg-blue-600/10 flex items-center justify-center">
                                    <Activity className="w-6 h-6 text-blue-600" />
                                </div>
                                <div>
                                    <CardTitle>Microsoft Clarity</CardTitle>
                                    <CardDescription>Connect Clarity for heatmaps and session recordings</CardDescription>
                                </div>
                            </div>
                            <StatusBadge status={getIntegrationStatus('microsoft_clarity')} />
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="clarity-project-id">Project ID *</Label>
                            <Input
                                id="clarity-project-id"
                                value={clarityProjectId}
                                onChange={(e) => setClarityProjectId(e.target.value)}
                                placeholder="e.g., k9v..."
                                className="h-11"
                            />
                            <p className="text-xs text-muted-foreground">
                                Find this in Clarity Settings → Overview → Project ID
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="clarity-api-token">API Token (Optional)</Label>
                            <div className="relative">
                                <Input
                                    id="clarity-api-token"
                                    type={showClarityToken ? 'text' : 'password'}
                                    value={clarityApiToken}
                                    onChange={(e) => setClarityApiToken(e.target.value)}
                                    placeholder={['connected', 'active'].includes(getIntegrationStatus('microsoft_clarity')) ? "•••••••• (Saved)" : "Enter API Token"}
                                    className="h-11 pr-10"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-0 top-0 h-11 w-10"
                                    onClick={() => setShowClarityToken(!showClarityToken)}
                                >
                                    {showClarityToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Required for AI Insights. Generate in Clarity Settings → API Tokens.
                            </p>
                        </div>
                        <div className="flex gap-3 pt-4">
                            <Button
                                onClick={saveClarityIntegration}
                                disabled={!!saving || !clarityProjectId}
                                className="flex-1"
                            >
                                {saving === 'microsoft_clarity' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                Save Integration
                            </Button>
                        </div>
                    </CardContent>
                </Card>
                <Card className="glass-card">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                    <div className="text-blue-600 font-bold text-xl">GB</div>
                                </div>
                                <div>
                                    <CardTitle>Google Business Profile</CardTitle>
                                    <CardDescription>Manage reviews and business info</CardDescription>
                                </div>
                            </div>
                            <StatusBadge status={getIntegrationStatus('google_business')} />
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm text-blue-900 mb-3">
                                <strong>Recommended:</strong> Connect automatically with OAuth
                            </p>
                            <Button
                                onClick={connectGoogleBusinessOAuth}
                                className="w-full bg-blue-600 hover:bg-blue-700"
                            >
                                Connect with Google
                            </Button>
                        </div>
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">Or enter manually</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="gb-location-id">Location ID (or type "DEMO" for testing)</Label>
                            <Input
                                id="gb-location-id"
                                value={gbLocationId}
                                onChange={(e) => setGbLocationId(e.target.value)}
                                placeholder="Enter Location ID or DEMO"
                                className="h-11"
                            />
                        </div>
                        <div className="flex gap-3 pt-4">
                            <Button
                                onClick={saveGoogleBusinessIntegration}
                                disabled={!!saving || !gbLocationId}
                                className="flex-1"
                            >
                                {saving === 'google_business' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                Save Integration
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* WordPress Integration */}
                <Card className="glass-card">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-lg bg-blue-600/10 flex items-center justify-center">
                                    <div className="text-blue-600 font-bold text-xl">WP</div>
                                </div>
                                <div>
                                    <CardTitle>WordPress</CardTitle>
                                    <CardDescription>Sync legal pages to your WordPress site</CardDescription>
                                </div>
                            </div>
                            <StatusBadge status={getIntegrationStatus('wordpress')} />
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="wordpress-site-url">Site URL *</Label>
                            <Input
                                id="wordpress-site-url"
                                value={wordpressSiteUrl}
                                onChange={(e) => setWordpressSiteUrl(e.target.value)}
                                placeholder="https://maromcosmetic.com"
                                className="h-11"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="wordpress-username">WordPress Username *</Label>
                            <Input
                                id="wordpress-username"
                                value={wordpressUsername}
                                onChange={(e) => setWordpressUsername(e.target.value)}
                                placeholder="admin"
                                className="h-11"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="wordpress-app-password">Application Password *</Label>
                            <div className="relative">
                                <Input
                                    id="wordpress-app-password"
                                    type={showWordpressPassword ? "text" : "password"}
                                    value={wordpressAppPassword}
                                    onChange={(e) => setWordpressAppPassword(e.target.value)}
                                    placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
                                    className="h-11 pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowWordpressPassword(!showWordpressPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                >
                                    {showWordpressPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Generate in WordPress: Users → Profile → Application Passwords
                            </p>
                        </div>
                        <div className="flex gap-3 pt-4">
                            <Button
                                onClick={saveWordPressIntegration}
                                disabled={!!saving || !wordpressSiteUrl || !wordpressUsername}
                                className="flex-1"
                            >
                                {saving === 'wordpress' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                Save Integration
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Shopify Integration */}
                <Card className="glass-card opacity-50">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                                    <ShoppingBag className="w-6 h-6 text-green-600" />
                                </div>
                                <div>
                                    <CardTitle>Shopify</CardTitle>
                                    <CardDescription>Connect your Shopify store (Coming Soon)</CardDescription>
                                </div>
                            </div>
                            <Badge variant="outline">Coming Soon</Badge>
                        </div>
                    </CardHeader>
                </Card>
            </div>
        </Shell >
    );
}
