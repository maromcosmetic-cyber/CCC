// Control System App - Manage Integrations & API Keys

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/shared/Button';
import { Input } from '@/components/shared/Input';
import { Select } from '@/components/shared/Select';
import { Modal } from '@/components/shared/Modal';
import { USER_MANAGED_PROVIDERS } from '@/lib/integrations/config';

interface ControlSystemProps {
  projectId: string;
}

interface Integration {
  id: string;
  provider_type: string;
  status: string;
  last_sync_at?: string;
}

// Only show user-managed providers in Control System
// Platform-managed providers (Firecrawl, LLM, Image, ElevenLabs, SyncLabs) are automatically configured
const PROVIDER_CONFIGS: Record<string, {
  name: string;
  description?: string;
  fields: Array<{ key: string; label: string; type: 'text' | 'password' | 'url' | 'select'; options?: Array<{ value: string; label: string }> }>;
}> = {
  meta: {
    name: 'Meta (Facebook/Instagram)',
    description: 'For managing Meta Ads campaigns',
    fields: [
      { key: 'access_token', label: 'Access Token', type: 'password' },
      { key: 'app_id', label: 'App ID', type: 'text' },
    ],
  },
  google_ads: {
    name: 'Google Ads',
    description: 'For managing Google Ads campaigns',
    fields: [
      { key: 'client_id', label: 'Client ID', type: 'text' },
      { key: 'client_secret', label: 'Client Secret', type: 'password' },
      { key: 'refresh_token', label: 'Refresh Token', type: 'password' },
    ],
  },
  lazada: {
    name: 'Lazada',
    description: 'For managing Lazada campaigns',
    fields: [
      { key: 'app_key', label: 'App Key', type: 'text' },
      { key: 'app_secret', label: 'App Secret', type: 'password' },
    ],
  },
  tiktok: {
    name: 'TikTok Ads',
    description: 'For managing TikTok Ads campaigns',
    fields: [
      { key: 'access_token', label: 'Access Token', type: 'password' },
      { key: 'app_id', label: 'App ID', type: 'text' },
    ],
  },
  woocommerce: {
    name: 'WooCommerce',
    description: 'For syncing products from your WooCommerce store',
    fields: [
      { key: 'store_url', label: 'Store URL', type: 'url' },
      { key: 'consumer_key', label: 'Consumer Key', type: 'text' },
      { key: 'consumer_secret', label: 'Consumer Secret', type: 'password' },
    ],
  },
};

export const ControlSystem: React.FC<ControlSystemProps> = ({ projectId }) => {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    fetchIntegrations();
  }, [projectId]);

  const fetchIntegrations = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/integrations`);
      const data = await response.json();
      setIntegrations(data.integrations || []);
    } catch (error) {
      console.error('Failed to fetch integrations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfigure = (providerType: string) => {
    setSelectedProvider(providerType);
    setCredentials({});
    setTestResult(null);
    setShowConfigModal(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/integrations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider_type: selectedProvider,
          credentials,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save integration');
      }

      await fetchIntegrations();
      setShowConfigModal(false);
      setCredentials({});
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/integrations/${selectedProvider}/test`, {
        method: 'POST',
      });

      const result = await response.json();
      setTestResult(result);
    } catch (error) {
      setTestResult({ success: false, message: 'Test failed' });
    }
  };

  const handleDelete = async (providerType: string) => {
    if (!confirm(`Are you sure you want to delete ${PROVIDER_CONFIGS[providerType]?.name || providerType} integration?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/integrations?provider_type=${providerType}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete integration');
      }

      await fetchIntegrations();
    } catch (error) {
      alert('Failed to delete integration');
    }
  };

  const config = PROVIDER_CONFIGS[selectedProvider];

  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold text-text-primary mb-2">Control system</h1>
      <p className="text-sm text-text-muted mb-6">Manage your API integrations and credentials</p>
      <div className="mb-6 p-3 bg-accent/10 border border-accent/30 rounded-md">
        <p className="text-xs text-text-secondary">
          <span className="font-medium text-text-primary">Platform services:</span> AI features (LLM, Image Generation, TTS, Lip-Sync) and web scraping (Firecrawl) are automatically configured by the platform. You only need to configure your business API keys below.
        </p>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-text-muted text-sm">Loading integrations...</div>
      ) : (
        <div className="space-y-3">
          {Object.entries(PROVIDER_CONFIGS).map(([providerType, config]) => {
            const integration = integrations.find((i) => i.provider_type === providerType);
            const status = integration?.status || 'inactive';

            return (
              <div key={providerType} className="bg-bg-elevated border border-border-subtle rounded-md p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-text-primary">{config.name}</h3>
                    <p className="text-xs text-text-muted mt-0.5">
                      Status: <span className={`font-mono ${status === 'active' ? 'text-accent' : 'text-text-muted'}`}>{status}</span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleConfigure(providerType)}
                    >
                      {integration ? 'Update' : 'Configure'}
                    </Button>
                    {integration && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(providerType)}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        title={config ? `Configure ${config.name}` : 'Configure Integration'}
        size="lg"
      >
        {config && (
          <div className="space-y-4">
            {config.description && (
              <p className="text-sm text-text-muted mb-4">{config.description}</p>
            )}
            {config.fields.map((field) => {
              if (field.type === 'select') {
                return (
                  <Select
                    key={field.key}
                    label={field.label}
                    value={credentials[field.key] || ''}
                    onChange={(e) =>
                      setCredentials({ ...credentials, [field.key]: e.target.value })
                    }
                    options={field.options || []}
                  />
                );
              }
              return (
                <Input
                  key={field.key}
                  label={field.label}
                  type={field.type}
                  value={credentials[field.key] || ''}
                  onChange={(e) =>
                    setCredentials({ ...credentials, [field.key]: e.target.value })
                  }
                  placeholder={`Enter ${field.label.toLowerCase()}`}
                />
              );
            })}

            {testResult && (
              <div
                className={`p-3 rounded-md border text-xs ${
                  testResult.success 
                    ? 'bg-accent/10 border-accent/30 text-accent' 
                    : 'bg-red-500/10 border-red-500/30 text-red-400'
                }`}
              >
                {testResult.message}
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleSave} isLoading={isSaving}>
                Save
              </Button>
              <Button variant="secondary" onClick={handleTest}>
                Test Connection
              </Button>
              <Button variant="ghost" onClick={() => setShowConfigModal(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
