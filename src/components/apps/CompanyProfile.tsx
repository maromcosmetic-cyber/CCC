// Company Profile App

'use client';

import React from 'react';

interface CompanyProfileProps {
  projectId: string;
}

export const CompanyProfile: React.FC<CompanyProfileProps> = ({ projectId }) => {
  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold text-text-primary mb-4">Company profile</h1>
      <p className="text-sm text-text-muted">Company profile data coming soon</p>
    </div>
  );
};

