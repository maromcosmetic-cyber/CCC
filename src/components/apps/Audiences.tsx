// Audiences App

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/shared/Button';
import { Modal } from '@/components/shared/Modal';

interface AudiencesProps {
  projectId: string;
}

export const Audiences: React.FC<AudiencesProps> = ({ projectId }) => {
  const [audiences, setAudiences] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  useEffect(() => {
    fetchAudiences();
  }, [projectId]);

  const fetchAudiences = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/audiences`);
      const data = await response.json();
      setAudiences(data.audiences || []);
    } catch (error) {
      console.error('Failed to fetch audiences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-text-primary">Audiences</h1>
        <Button onClick={() => setShowGenerateModal(true)} size="sm">Generate audience</Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-text-muted text-sm">Loading audiences...</div>
      ) : audiences.length === 0 ? (
        <div className="text-center py-8 text-text-muted text-sm">No audiences found</div>
      ) : (
        <div className="space-y-2">
          {audiences.map((audience) => (
            <div key={audience.id} className="bg-bg-elevated border border-border-subtle rounded-md p-4">
              <h3 className="text-sm font-medium text-text-primary">{audience.name}</h3>
              <p className="text-xs text-text-muted mt-1">{audience.description}</p>
              {audience.ai_suggested && (
                <span className="inline-block mt-2 px-2 py-1 bg-accent/20 text-accent border border-accent/30 rounded text-xs font-mono">
                  System recommendation
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        title="Generate AI-Enhanced Audience"
      >
        <p className="mb-4 text-sm text-text-muted">This will generate an audience based on your company profile.</p>
        <Button onClick={() => setShowGenerateModal(false)} size="sm">Generate</Button>
      </Modal>
    </div>
  );
};

