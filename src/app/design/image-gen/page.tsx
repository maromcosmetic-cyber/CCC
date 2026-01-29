"use client";

import { useState, useEffect } from "react";
import { Shell } from "@/components/layout/Shell";
import { useProject } from '@/contexts/ProjectContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, Image as ImageIcon, Sparkles } from 'lucide-react';
import { ImageType, AudienceSegment, Product } from '@/types/models';
import { PageLoading } from '@/components/ui/page-loading';

export default function ImageGenPage() {
  const { currentProject, loading } = useProject();
  
  if (loading) {
    return (
      <Shell>
        <PageLoading message="Loading project data..." />
      </Shell>
    );
  }
  const [audiences, setAudiences] = useState<AudienceSegment[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedAudienceId, setSelectedAudienceId] = useState<string>('');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [individualImageType, setIndividualImageType] = useState<ImageType>('product_only');
  const [individualProductId, setIndividualProductId] = useState<string>('');
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [isGeneratingIndividual, setIsGeneratingIndividual] = useState(false);
  const [generationJobId, setGenerationJobId] = useState<string | null>(null);
  const [generationStatus, setGenerationStatus] = useState<any>(null);
  const [generatedImages, setGeneratedImages] = useState<any[]>([]);

  // Fetch audiences
  useEffect(() => {
    if (!currentProject?.id) return;

    fetch(`/api/projects/${currentProject.id}/audiences`)
      .then((res) => res.json())
      .then((data) => {
        if (data.audiences) {
          setAudiences(data.audiences);
        }
      })
      .catch((err) => console.error('Failed to fetch audiences:', err));
  }, [currentProject?.id]);

  // Fetch products
  useEffect(() => {
    if (!currentProject?.id) return;

    fetch(`/api/projects/${currentProject.id}/commerce/products`)
      .then((res) => res.json())
      .then((data) => {
        if (data.products) {
          setProducts(data.products);
        }
      })
      .catch((err) => console.error('Failed to fetch products:', err));
  }, [currentProject?.id]);

  // Poll generation status
  useEffect(() => {
    if (!generationJobId || !currentProject?.id || !selectedAudienceId) return;

    const interval = setInterval(() => {
      fetch(`/api/projects/${currentProject.id}/audiences/${selectedAudienceId}/generations/${generationJobId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.generation) {
            setGenerationStatus(data.generation);
            setGeneratedImages(data.generation.generated_images || []);

            if (data.generation.status === 'completed' || data.generation.status === 'failed') {
              setIsGeneratingAll(false);
              clearInterval(interval);
            }
          }
        })
        .catch((err) => console.error('Failed to fetch generation status:', err));
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(interval);
  }, [generationJobId, currentProject?.id, selectedAudienceId]);

  const handleGenerateAll = async () => {
    if (!selectedAudienceId || selectedProducts.length === 0) {
      alert('Please select an audience and at least one product');
      return;
    }

    setIsGeneratingAll(true);

    try {
      const response = await fetch(
        `/api/projects/${currentProject?.id}/audiences/${selectedAudienceId}/generate-images`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product_ids: selectedProducts,
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.job_id) {
        setGenerationJobId(data.job_id);
      } else {
        alert(data.error || 'Failed to start generation');
        setIsGeneratingAll(false);
      }
    } catch (error) {
      console.error('Generate all error:', error);
      alert('Failed to start image generation');
      setIsGeneratingAll(false);
    }
  };

  const handleGenerateIndividual = async () => {
    if (!selectedAudienceId || !individualProductId) {
      alert('Please select an audience and a product');
      return;
    }

    setIsGeneratingIndividual(true);

    try {
      const response = await fetch(
        `/api/projects/${currentProject?.id}/audiences/${selectedAudienceId}/generate-image`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product_id: individualProductId,
            image_type: individualImageType,
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.image_id) {
        // Refresh generated images
        setGeneratedImages([...generatedImages, {
          id: data.image_id,
          storage_url: data.storage_url,
          image_type: individualImageType,
          product_ids: [individualProductId],
        }]);
        alert('Image generated successfully!');
      } else {
        alert(data.error || 'Failed to generate image');
      }
    } catch (error) {
      console.error('Generate individual error:', error);
      alert('Failed to generate image');
    } finally {
      setIsGeneratingIndividual(false);
    }
  };

  const toggleProduct = (productId: string) => {
    setSelectedProducts((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const selectedAudience = audiences.find((a) => a.id === selectedAudienceId);

  return (
    <Shell>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Product Image Generator</h1>
            <p className="text-muted-foreground mt-2">
              Generate brand-aligned product images for your audiences
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Configuration Panel */}
        <div className="space-y-6">
          {/* Audience Selector */}
          <Card>
            <CardHeader>
              <CardTitle>Audience</CardTitle>
              <CardDescription>Select the target audience for image generation</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedAudienceId} onValueChange={setSelectedAudienceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an audience" />
                </SelectTrigger>
                <SelectContent>
                  {audiences.map((audience) => (
                    <SelectItem key={audience.id} value={audience.id}>
                      {audience.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedAudience && (
                <p className="text-sm text-muted-foreground mt-2">{selectedAudience.description}</p>
              )}
            </CardContent>
          </Card>

          {/* Product Multi-Selector */}
          <Card>
            <CardHeader>
              <CardTitle>Products</CardTitle>
              <CardDescription>Select products to feature in images</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {products.map((product) => (
                  <div key={product.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={product.id}
                      checked={selectedProducts.includes(product.id)}
                      onCheckedChange={() => toggleProduct(product.id)}
                    />
                    <Label
                      htmlFor={product.id}
                      className="flex-1 flex items-center space-x-2 cursor-pointer"
                    >
                      {product.images?.[0]?.url && (
                        <img
                          src={product.images[0].url}
                          alt={product.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                      )}
                      <span>{product.name}</span>
                    </Label>
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                {selectedProducts.length} product(s) selected
              </p>
            </CardContent>
          </Card>

          {/* Generate All Button */}
          <Card>
            <CardHeader>
              <CardTitle>Generate All Images</CardTitle>
              <CardDescription>Generate 10-15 images covering all campaign needs</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleGenerateAll}
                disabled={isGeneratingAll || !selectedAudienceId || selectedProducts.length === 0}
                className="w-full"
                size="lg"
              >
                {isGeneratingAll ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate All Images (10-15)
                  </>
                )}
              </Button>
              {generationStatus && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Status:</span>
                    <Badge variant={generationStatus.status === 'completed' ? 'default' : 'secondary'}>
                      {generationStatus.status}
                    </Badge>
                  </div>
                  {generationStatus.progress && (
                    <div className="text-sm text-muted-foreground">
                      {generationStatus.progress.current} / {generationStatus.progress.total} images
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Individual Image Generation */}
          <Card>
            <CardHeader>
              <CardTitle>Generate Individual Image</CardTitle>
              <CardDescription>Generate a single image of a specific type</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Image Type</Label>
                <Select value={individualImageType} onValueChange={(v) => setIndividualImageType(v as ImageType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="product_only">Product Only</SelectItem>
                    <SelectItem value="product_persona">Product + Persona</SelectItem>
                    <SelectItem value="ugc_style">UGC Style</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Product</Label>
                <Select value={individualProductId} onValueChange={setIndividualProductId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleGenerateIndividual}
                disabled={isGeneratingIndividual || !selectedAudienceId || !individualProductId}
                className="w-full"
              >
                {isGeneratingIndividual ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <ImageIcon className="mr-2 h-4 w-4" />
                    Generate Image
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Generated Images Gallery */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Generated Images</CardTitle>
              <CardDescription>View and manage generated images</CardDescription>
            </CardHeader>
            <CardContent>
              {generatedImages.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ImageIcon className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>No images generated yet</p>
                  <p className="text-sm mt-2">Select an audience and products to get started</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {generatedImages.map((image: any) => (
                    <div key={image.id} className="space-y-2">
                      <img
                        src={image.storage_url}
                        alt="Generated"
                        className="w-full aspect-square object-cover rounded-lg"
                      />
                      <div className="flex items-center justify-between text-xs">
                        <Badge variant="outline">{image.image_type}</Badge>
                        <a
                          href={image.storage_url}
                          download
                          className="text-primary hover:underline"
                        >
                          Download
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      </div>
    </Shell>
  );
}
