// Media Library App

'use client';

import React from 'react';

interface MediaLibraryProps {
  projectId: string;
}

export const MediaLibrary: React.FC<MediaLibraryProps> = ({ projectId }) => {
  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold text-text-primary mb-4">Media library</h1>
      <p className="text-sm text-text-muted">Media assets coming soon</p>
    </div>
  );
};

