'use client';

import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProject } from "@/contexts/ProjectContext";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    Plus,
    Facebook,
    Search as GoogleIcon,
    TrendingUp,
    DollarSign,
    Eye,
    MousePointerClick,
    Loader2,
    Play,
    Pause,
    MoreVertical
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useMetaIntegration } from "@/hooks/useMetaIntegration";
import { ConnectAdsPrompt } from "@/components/studio/ConnectAdsPrompt";

interface Campaign {
    id: string;
    name: string;
    platform: string;
    status: 'active' | 'paused' | 'draft' | 'completed';
    objective: string;
    daily_budget_amount?: number;
    daily_budget_currency?: string;
    start_date?: string;
    end_date?: string;
    created_at: string;
    stats?: {
        spend: number;
        impressions: number;
        clicks: number;
        conversions: number;
        cpc: number;
        ctr: number;
        roas: number;
    };
}

export default function CampaignsPage() {
    const { currentProject } = useProject();
    const router = useRouter();
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [platformFilter, setPlatformFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');

    // Check Integration Status
    const { isConnected, isLoading: isIntegrationLoading } = useMetaIntegration();

    useEffect(() => {
        if (currentProject) {
            fetchCampaigns();
        }
    }, [currentProject, platformFilter, statusFilter]);

    const fetchCampaigns = async () => {
        if (!currentProject) return;

        setLoading(true);
        try {
            let url = `/api/projects/${currentProject.id}/campaigns`;
            const params = new URLSearchParams();
            if (platformFilter !== 'all') params.append('platform', platformFilter);
            if (statusFilter !== 'all') params.append('status', statusFilter);
            if (params.toString()) url += `?${params.toString()}`;

            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                setCampaigns(data.campaigns || []);
            }
        } catch (error) {
            console.error('Error fetching campaigns:', error);
        } finally {
            setLoading(false);
        }
    };

    const getPlatformIcon = (platform: string) => {
        switch (platform) {
            case 'meta':
                return <Facebook className="w-5 h-5 text-blue-600" />;
            case 'google_ads':
                return <GoogleIcon className="w-5 h-5 text-red-600" />;
            default:
                return <TrendingUp className="w-5 h-5 text-gray-600" />;
        }
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, { className: string; label: string }> = {
            active: { className: 'bg-green-500/10 text-green-600 border-green-500/20', label: 'Active' },
            paused: { className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20', label: 'Paused' },
            draft: { className: 'bg-gray-500/10 text-gray-600 border-gray-500/20', label: 'Draft' },
            completed: { className: 'bg-blue-500/10 text-blue-600 border-blue-500/20', label: 'Completed' },
        };
        const variant = variants[status] || variants.draft;
        return <Badge className={variant.className}>{variant.label}</Badge>;
    };

    const formatCurrency = (amount: number, currency: string = 'USD') => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const formatNumber = (num: number) => {
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
        return num.toString();
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



    if (isIntegrationLoading) {
        return (
            <Shell>
                <div className="flex items-center justify-center h-[60vh]">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
            </Shell>
        );
    }

    if (!isConnected) {
        return (
            <Shell>
                <ConnectAdsPrompt />
            </Shell>
        );
    }


    return (
        <Shell>
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-display font-black text-foreground tracking-tight">Campaigns</h1>
                        <p className="text-muted-foreground text-lg mt-1">
                            Manage your advertising campaigns across platforms
                        </p>
                    </div>
                    <Button
                        onClick={() => router.push('/studio/campaigns/new')}
                        className="h-11 px-6 gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        Create Campaign
                    </Button>
                </div>

                {/* Filters */}
                <Card className="glass-card">
                    <CardContent className="p-4">
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <Select value={platformFilter} onValueChange={setPlatformFilter}>
                                    <SelectTrigger className="h-10">
                                        <SelectValue placeholder="All Platforms" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Platforms</SelectItem>
                                        <SelectItem value="meta">Meta Ads</SelectItem>
                                        <SelectItem value="google_ads">Google Ads</SelectItem>
                                        <SelectItem value="tiktok">TikTok</SelectItem>
                                        <SelectItem value="lazada">Lazada</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex-1">
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="h-10">
                                        <SelectValue placeholder="All Statuses" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Statuses</SelectItem>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="paused">Paused</SelectItem>
                                        <SelectItem value="draft">Draft</SelectItem>
                                        <SelectItem value="completed">Completed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Campaigns List */}
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : campaigns.length === 0 ? (
                    <Card className="glass-card">
                        <CardContent className="p-12 text-center">
                            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                                <TrendingUp className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">No campaigns yet</h3>
                            <p className="text-muted-foreground mb-6">
                                Create your first campaign to start advertising
                            </p>
                            <Button onClick={() => router.push('/studio/campaigns/new')}>
                                <Plus className="w-4 h-4 mr-2" />
                                Create Campaign
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4">
                        {campaigns.map((campaign) => (
                            <Card key={campaign.id} className="glass-card hover:shadow-lg transition-shadow cursor-pointer">
                                <CardContent className="p-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-start gap-4">
                                            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                                                {getPlatformIcon(campaign.platform)}
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-semibold mb-1">{campaign.name}</h3>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <span className="capitalize">{campaign.platform.replace('_', ' ')}</span>
                                                    <span>•</span>
                                                    <span className="capitalize">{campaign.objective}</span>
                                                    {campaign.daily_budget_amount && (
                                                        <>
                                                            <span>•</span>
                                                            <span>
                                                                {formatCurrency(campaign.daily_budget_amount, campaign.daily_budget_currency)}/day
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {getStatusBadge(campaign.status)}
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <MoreVertical className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem>
                                                        <Eye className="w-4 h-4 mr-2" />
                                                        View Details
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem>
                                                        {campaign.status === 'active' ? (
                                                            <>
                                                                <Pause className="w-4 h-4 mr-2" />
                                                                Pause Campaign
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Play className="w-4 h-4 mr-2" />
                                                                Resume Campaign
                                                            </>
                                                        )}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="text-red-600">
                                                        Delete Campaign
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>

                                    {/* Stats */}
                                    {campaign.stats && (
                                        <div className="grid grid-cols-4 gap-4 pt-4 border-t">
                                            <div>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                                                    <DollarSign className="w-4 h-4" />
                                                    Spend
                                                </div>
                                                <div className="text-lg font-semibold">
                                                    {formatCurrency(campaign.stats.spend, campaign.daily_budget_currency)}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                                                    <Eye className="w-4 h-4" />
                                                    Impressions
                                                </div>
                                                <div className="text-lg font-semibold">
                                                    {formatNumber(campaign.stats.impressions)}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                                                    <MousePointerClick className="w-4 h-4" />
                                                    Clicks
                                                </div>
                                                <div className="text-lg font-semibold">
                                                    {formatNumber(campaign.stats.clicks)}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    CTR: {campaign.stats.ctr.toFixed(2)}%
                                                </div>
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                                                    <TrendingUp className="w-4 h-4" />
                                                    ROAS
                                                </div>
                                                <div className="text-lg font-semibold">
                                                    {campaign.stats.roas.toFixed(2)}x
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    CPC: {formatCurrency(campaign.stats.cpc, campaign.daily_budget_currency)}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </Shell>
    );
}
