// Campaigns App

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/shared/Button';
import { Select } from '@/components/shared/Select';

interface CampaignsProps {
  projectId: string;
}

export const Campaigns: React.FC<CampaignsProps> = ({ projectId }) => {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCampaigns();
  }, [projectId, platformFilter]);

  const fetchCampaigns = async () => {
    setIsLoading(true);
    try {
      const url = `/api/projects/${projectId}/campaigns${platformFilter !== 'all' ? `?platform=${platformFilter}` : ''}`;
      const response = await fetch(url);
      const data = await response.json();
      setCampaigns(data.campaigns || []);
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-text-primary">Campaigns</h1>
        <Button size="sm">Create campaign</Button>
      </div>

      <div className="mb-4">
        <Select
          value={platformFilter}
          onChange={(e) => setPlatformFilter(e.target.value)}
          options={[
            { value: 'all', label: 'All platforms' },
            { value: 'meta', label: 'Meta' },
            { value: 'google_ads', label: 'Google Ads' },
            { value: 'lazada', label: 'Lazada' },
            { value: 'tiktok', label: 'TikTok' },
          ]}
        />
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-text-muted text-sm">Loading campaigns...</div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-8 text-text-muted text-sm">No campaigns found</div>
      ) : (
        <div className="space-y-2">
          {campaigns.map((campaign) => (
            <div key={campaign.id} className="bg-bg-elevated border border-border-subtle rounded-md p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-text-primary">{campaign.name}</h3>
                  <p className="text-xs text-text-muted font-mono mt-0.5">{campaign.platform}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  campaign.status === 'active' 
                    ? 'bg-accent/20 text-accent border border-accent/30' 
                    : 'bg-bg-secondary text-text-muted border border-border-subtle'
                }`}>
                  {campaign.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

