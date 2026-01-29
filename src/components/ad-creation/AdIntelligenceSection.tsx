'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, TrendingUp, Eye, Calendar, Globe } from 'lucide-react';
import { toast } from 'sonner';

interface CompetitorAdData {
  id: string;
  name: string;
  url: string;
  total_ads: number;
  platforms: string[];
  ad_frequency: string;
  ads: Array<{
    ad_creative_body?: string;
    ad_creative_link_title?: string;
    platform: string;
    longevity_days?: number;
    ad_snapshot_url?: string;
  }>;
  has_active_ads: boolean;
  last_analyzed_at?: string;
}

interface AdIntelligenceSectionProps {
  projectId: string;
}

export function AdIntelligenceSection({ projectId }: AdIntelligenceSectionProps) {
  const [competitors, setCompetitors] = useState<CompetitorAdData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    if (projectId) {
      fetchCompetitors();
    } else {
      setIsLoading(false);
    }
  }, [projectId]);

  const fetchCompetitors = async () => {
    if (!projectId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/ad-intelligence`);
      const data = await response.json();
      if (response.ok) {
        setCompetitors(data.competitors || []);
      } else if (response.status !== 404) {
        // Only show error for actual errors, not for "not found" (which is expected if no competitors exist)
        console.error('Failed to load competitor intelligence:', data);
        // Don't show toast for initial load - it's expected that there might be no data
      }
    } catch (error) {
      console.error('Error fetching competitors:', error);
      // Don't show toast for initial load errors
    } finally {
      setIsLoading(false);
    }
  };

  const handleScan = async () => {
    setIsScanning(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/ad-intelligence`, {
        method: 'POST'
      });
      const data = await response.json();
      if (response.ok) {
        toast.success(`Scanned ${data.scanned} competitors`);
        await fetchCompetitors();
      } else {
        toast.error(data.error || 'Failed to scan competitor ads');
      }
    } catch (error) {
      console.error('Error scanning ads:', error);
      toast.error('Failed to scan competitor ads');
    } finally {
      setIsScanning(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const totalAds = competitors.reduce((sum, comp) => sum + comp.total_ads, 0);
  const competitorsWithAds = competitors.filter(c => c.has_active_ads);

  return (
    <div className="space-y-6">
      {/* Header with Scan Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Competitor Ad Intelligence</h3>
          <p className="text-sm text-muted-foreground">
            {competitorsWithAds.length} competitors with active ads • {totalAds} total ads found
          </p>
        </div>
        <Button
          onClick={handleScan}
          disabled={isScanning}
          variant="outline"
          className="gap-2"
        >
          {isScanning ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Scanning...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Scan Competitor Ads
            </>
          )}
        </Button>
      </div>

      {/* Competitors Grid */}
      {competitors.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              No competitors found. Add competitors in Brand → Competitors first.
            </p>
            <Button variant="outline" onClick={handleScan}>
              Scan for Ads
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {competitors.map((competitor) => (
            <Card key={competitor.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{competitor.name}</CardTitle>
                    <CardDescription className="text-xs mt-1">{competitor.url}</CardDescription>
                  </div>
                  {competitor.has_active_ads && (
                    <Badge variant="default" className="bg-green-500">
                      Active
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {competitor.has_active_ads ? (
                  <>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="flex items-center gap-1 text-muted-foreground mb-1">
                          <TrendingUp className="w-3 h-3" />
                          <span className="text-xs">Total Ads</span>
                        </div>
                        <p className="font-semibold text-lg">{competitor.total_ads}</p>
                      </div>
                      <div>
                        <div className="flex items-center gap-1 text-muted-foreground mb-1">
                          <Globe className="w-3 h-3" />
                          <span className="text-xs">Platforms</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {competitor.platforms.slice(0, 2).map((platform) => (
                            <Badge key={platform} variant="secondary" className="text-xs">
                              {platform}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Sample Ads */}
                    {competitor.ads.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">Sample Ads</p>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {competitor.ads.slice(0, 3).map((ad, idx) => (
                            <div
                              key={idx}
                              className="p-2 bg-muted/50 rounded text-xs space-y-1"
                            >
                              {ad.ad_creative_link_title && (
                                <p className="font-medium line-clamp-1">
                                  {ad.ad_creative_link_title}
                                </p>
                              )}
                              {ad.ad_creative_body && (
                                <p className="text-muted-foreground line-clamp-2">
                                  {ad.ad_creative_body}
                                </p>
                              )}
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                {ad.longevity_days && ad.longevity_days > 0 && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {ad.longevity_days} days
                                  </span>
                                )}
                                <Badge variant="outline" className="text-xs">
                                  {ad.platform}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    <Eye className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No active ads detected</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
