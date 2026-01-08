// Evidence Badge component

import React from 'react';
import { EvidenceReference } from '@/types/models';

interface EvidenceBadgeProps {
  evidence: EvidenceReference;
  onClick?: () => void;
}

export const EvidenceBadge: React.FC<EvidenceBadgeProps> = ({
  evidence,
  onClick,
}) => {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-full hover:bg-blue-200 transition-colors"
      title={`Source: ${evidence.source_url}\nSnippet: ${evidence.snippet}`}
    >
      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
      Evidence
    </button>
  );
};


