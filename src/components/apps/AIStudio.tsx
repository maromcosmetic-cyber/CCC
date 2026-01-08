// AI Studio App

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/shared/Button';
import { Input } from '@/components/shared/Input';
import { Select } from '@/components/shared/Select';

interface AIStudioProps {
  projectId: string;
}

export const AIStudio: React.FC<AIStudioProps> = ({ projectId }) => {
  const [activeTab, setActiveTab] = useState<'creative-kit' | 'ugc-video'>('creative-kit');
  const [ugcStep, setUgcStep] = useState(1);

  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold text-text-primary mb-6">AI Studio</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border-subtle">
        <button
          onClick={() => setActiveTab('creative-kit')}
          className={`px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === 'creative-kit' 
              ? 'text-accent border-b-2 border-accent' 
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          Creative kit
        </button>
        <button
          onClick={() => {
            setActiveTab('ugc-video');
            setUgcStep(1);
          }}
          className={`px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === 'ugc-video' 
              ? 'text-accent border-b-2 border-accent' 
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          UGC video generator
        </button>
      </div>

      {/* Creative Kit Tab */}
      {activeTab === 'creative-kit' && (
        <div>
          <p className="text-sm text-text-muted mb-4">Generate creative assets for your campaigns</p>
          <Button size="sm">Generate creative kit</Button>
        </div>
      )}

      {/* UGC Video Generator Tab */}
      {activeTab === 'ugc-video' && (
        <div>
          <div className="mb-6">
            <div className="flex gap-1 mb-2">
              {[1, 2, 3, 4, 5].map((step) => (
                <div
                  key={step}
                  className={`flex-1 h-1 rounded ${
                    step <= ugcStep ? 'bg-accent' : 'bg-border-subtle'
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-text-muted">Step {ugcStep} of 5</p>
          </div>

          {ugcStep === 1 && (
            <div className="space-y-4">
              <h2 className="text-sm font-medium text-text-primary">Step 1: Location</h2>
              <Input label="Location" placeholder="Coffee shop in Chiang Mai" />
              <Button onClick={() => setUgcStep(2)} size="sm">Next</Button>
            </div>
          )}

          {ugcStep === 2 && (
            <div className="space-y-4">
              <h2 className="text-sm font-medium text-text-primary">Step 2: Character</h2>
              <Select
                label="Select character"
                options={[
                  { value: 'char1', label: 'Character 1' },
                  { value: 'char2', label: 'Character 2' },
                ]}
              />
              <Button onClick={() => setUgcStep(3)} size="sm">Next</Button>
            </div>
          )}

          {ugcStep === 3 && (
            <div className="space-y-4">
              <h2 className="text-sm font-medium text-text-primary">Step 3: Voice & script</h2>
              <Input label="Script" placeholder="Enter your script text" />
              <Select
                label="Voice"
                options={[
                  { value: 'voice1', label: 'Voice 1' },
                  { value: 'voice2', label: 'Voice 2' },
                ]}
              />
              <Button onClick={() => setUgcStep(4)} size="sm">Next</Button>
            </div>
          )}

          {ugcStep === 4 && (
            <div className="space-y-4">
              <h2 className="text-sm font-medium text-text-primary">Step 4: Product</h2>
              <Select
                label="Select product"
                options={[
                  { value: 'prod1', label: 'Product 1' },
                  { value: 'prod2', label: 'Product 2' },
                ]}
              />
              <Button onClick={() => setUgcStep(5)} size="sm">Next</Button>
            </div>
          )}

          {ugcStep === 5 && (
            <div className="space-y-4">
              <h2 className="text-sm font-medium text-text-primary">Step 5: Generate</h2>
              <p className="text-sm text-text-muted">Ready to generate your UGC video</p>
              <Button size="sm">Generate video</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

