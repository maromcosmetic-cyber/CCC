// Products App

'use client';

import React from 'react';

interface ProductsProps {
  projectId: string;
}

export const Products: React.FC<ProductsProps> = ({ projectId }) => {
  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold text-text-primary mb-4">Products</h1>
      <p className="text-sm text-text-muted">Product management coming soon</p>
    </div>
  );
};

