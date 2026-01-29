'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles, Download, CheckCircle2, Archive, Image as ImageIcon, Filter, MessageSquare, Send, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { GeneratedAd, AdTemplate, AudienceSegment } from '@/types/models';
import { AdPreview } from './AdPreview';
import { SignedImage } from '@/components/ui/signed-image';
import { createClient } from '@/lib/auth/client';

interface GeneratedAdsSectionProps {
  projectId: string;
  templates: AdTemplate[];
  audiences: AudienceSegment[];
  products: any[];
}

interface PersonaImage {
  id: string;
  storage_url: string;
  storage_path?: string;
  storage_bucket?: string;
  image_type?: string;
}

export function GeneratedAdsSection({ projectId, templates, audiences, products }: GeneratedAdsSectionProps) {
  const [ads, setAds] = useState<GeneratedAd[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [filters, setFilters] = useState({
    audience_segment_id: '',
    product_id: '',
    status: ''
  });
  const [generateForm, setGenerateForm] = useState({
    audience_segment_id: '',
    image_id: '',
    hook: '',
    headline: '',
    body_copy: '',
    cta: ''
  });
  const [generationJobs, setGenerationJobs] = useState<Record<string, any>>({});
  const [availableImages, setAvailableImages] = useState<PersonaImage[]>([]);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [isGeneratingCopy, setIsGeneratingCopy] = useState(false);
  const [layoutChanges, setLayoutChanges] = useState<any>(null); // Keep for internal logic, but UI will be hidden


  // Sync with parent templates prop - REMOVED

  // Fetch templates if not provided - REMOVED

  // Fetch images when audience is selected
  useEffect(() => {
    if (projectId && generateForm.audience_segment_id) {
      fetchAudienceImages();
    } else {
      setAvailableImages([]);
    }
  }, [projectId, generateForm.audience_segment_id]);

  // Update selected template - REMOVED

  // Auto-generate copy logic simplified/removed for now as it depended on template
  // We can re-enable it to just generate text based on audience later.

  const generateCopy = async () => {
    /* Deprecated frontend generation */
  };

  const fetchAudienceImages = async () => {
    if (!projectId || !generateForm.audience_segment_id) return;

    setIsLoadingImages(true);
    try {
      const supabase = createClient();
      const audience = audiences.find(a => a.id === generateForm.audience_segment_id);
      if (!audience) return;

      // Fetch images for this audience/persona
      const { data: images, error } = await supabase
        .from('media_assets')
        .select('id, storage_url, storage_path, storage_bucket, image_type, approved')
        .eq('project_id', projectId)
        .eq('audience_id', generateForm.audience_segment_id)
        .eq('approved', true)
        .not('storage_url', 'is', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching images:', error);
      } else if (images && images.length > 0) {
        setAvailableImages(images as PersonaImage[]);
      } else {
        setAvailableImages((images || []) as PersonaImage[]);
      }
    } catch (error) {
      console.error('Error fetching audience images:', error);
    } finally {
      setIsLoadingImages(false);
    }
  };

  // fetchTemplates REMOVED

  useEffect(() => {
    if (projectId) {
      fetchAds();
    } else {
      setIsLoading(false);
    }
  }, [projectId, filters]);

  const fetchAds = async () => {
    if (!projectId) return;

    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.audience_segment_id) params.append('audience_segment_id', filters.audience_segment_id);
      if (filters.product_id) params.append('product_id', filters.product_id);
      if (filters.status) params.append('status', filters.status);

      const response = await fetch(`/api/projects/${projectId}/ads?${params.toString()}`);
      const data = await response.json();
      if (response.ok) {
        setAds(data.ads || []);
      } else if (response.status !== 404) {
        // Only show error for actual errors, not for "not found" (which is expected if no ads exist)
        console.error('Failed to load ads:', data);
        // Don't show toast for initial load - it's expected that there might be no data
      }
    } catch (error) {
      console.error('Error fetching ads:', error);
      // Don't show toast for initial load errors
    } finally {
      setIsLoading(false);
    }
  };

  // Chat function removed to enforce deterministic flow


  const handleGenerate = async () => {
    if (!generateForm.audience_segment_id || !generateForm.image_id) {
      toast.error('Please select an audience and image');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/ads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // template_id: generateForm.template_id, // REMOVED
          audience_segment_id: generateForm.audience_segment_id,
          image_id: generateForm.image_id,
          hook: generateForm.hook || null,
          headline: generateForm.headline || null,
          body_copy: generateForm.body_copy || null,
          cta: generateForm.cta || null,
          layout_changes: layoutChanges
        })
      });
      const data = await response.json();
      if (response.ok) {
        toast.success('Ad generation started!');
        setShowGenerateDialog(false);
        setGenerationJobs(prev => ({
          ...prev,
          [data.job_id]: { status: 'processing', progress: 0 }
        }));
        // Poll for updates
        pollGenerationStatus(data.job_id);
        // Reset form
        setGenerateForm({
          audience_segment_id: '',
          image_id: '',
          hook: '',
          headline: '',
          body_copy: '',
          cta: ''
        });
        setLayoutChanges(null);
      } else {
        toast.error(data.error || 'Failed to start generation');
      }
    } catch (error) {
      console.error('Error generating ads:', error);
      toast.error('Failed to start generation');
    } finally {
      setIsGenerating(false);
    }
  };

  const pollGenerationStatus = async (jobId: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/ads/generations/${jobId}`);
        const data = await response.json();
        if (response.ok) {
          setGenerationJobs(prev => ({
            ...prev,
            [jobId]: { status: data.status, ads: data.ads }
          }));
          if (data.status === 'completed') {
            clearInterval(interval);
            await fetchAds();
          }
        }
      } catch (error) {
        console.error('Error polling generation status:', error);
        clearInterval(interval);
      }
    }, 3000);

    // Stop polling after 5 minutes
    setTimeout(() => clearInterval(interval), 5 * 60 * 1000);
  };

  const handleStatusUpdate = async (adId: string, newStatus: 'draft' | 'approved' | 'archived') => {
    try {
      const response = await fetch(`/api/projects/${projectId}/ads/${adId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (response.ok) {
        toast.success('Ad status updated');
        await fetchAds();
      } else {
        toast.error('Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Generated Ads</h3>
          <p className="text-sm text-muted-foreground">
            {ads.length} ads generated • {ads.filter(a => a.status === 'approved').length} approved
          </p>
        </div>
        <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2" disabled={audiences.length === 0}>
              <Sparkles className="w-4 h-4" />
              Generate Ads
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Create Ad</DialogTitle>
              <DialogDescription>
                Select template, audience, and image. Edit copy and see live preview.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 grid grid-cols-2 gap-6 overflow-hidden">
              {/* Left: Settings */}
              <div className="space-y-4 overflow-y-auto pr-4 border-r">
                <div className="grid grid-cols-2 gap-4">
                  {/* Template Selection Removed */}
                  <div>
                    <Label htmlFor="audience">Audience *</Label>
                    <Select
                      value={generateForm.audience_segment_id}
                      onValueChange={(value) => {
                        setGenerateForm({
                          ...generateForm,
                          audience_segment_id: value,
                          image_id: '',
                          hook: '',
                          headline: '',
                          body_copy: '',
                          cta: ''
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select audience" />
                      </SelectTrigger>
                      <SelectContent>
                        {audiences.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="image">Select Image *</Label>
                  {isLoadingImages ? (
                    <div className="flex items-center justify-center py-8 border rounded-lg mt-2">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : availableImages.length === 0 ? (
                    <div className="py-8 border rounded-lg text-center text-sm text-muted-foreground mt-2">
                      {generateForm.audience_segment_id
                        ? 'No images available for this audience. Generate images in the Images tab first.'
                        : 'Select an audience to see available images'}
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-2 mt-2 max-h-48 overflow-y-auto p-2 border rounded-lg">
                      {availableImages.map((image) => (
                        <div
                          key={image.id}
                          className={`relative aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${generateForm.image_id === image.id
                            ? 'border-primary ring-2 ring-primary'
                            : 'border-muted hover:border-primary/50'
                            }`}
                          onClick={() => setGenerateForm({ ...generateForm, image_id: image.id })}
                        >
                          <SignedImage
                            storageUrl={image.storage_url}
                            storagePath={image.storage_path}
                            storageBucket={image.storage_bucket}
                            alt="Select image"
                            className="w-full h-full object-cover"
                            fallbackSrc="/placeholder-image.png"
                          />
                          {generateForm.image_id === image.id && (
                            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                              <CheckCircle2 className="w-6 h-6 text-primary" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="hook">Hook (Optional - AI will generate if empty)</Label>
                  </div>
                  <Input
                    id="hook"
                    value={generateForm.hook}
                    onChange={(e) => setGenerateForm({ ...generateForm, hook: e.target.value })}
                    placeholder={isGeneratingCopy ? "Generating..." : "AI will generate if empty"}
                  />

                  <div className="flex items-center justify-between">
                    <Label htmlFor="headline">Headline (Optional - AI will generate if empty)</Label>
                    {isGeneratingCopy && (
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                  <Input
                    id="headline"
                    value={generateForm.headline}
                    onChange={(e) => setGenerateForm({ ...generateForm, headline: e.target.value })}
                    placeholder={isGeneratingCopy ? "Generating..." : "AI will generate if empty"}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="body_copy">Body Copy (Optional - AI will generate if empty)</Label>
                  <Textarea
                    id="body_copy"
                    value={generateForm.body_copy}
                    onChange={(e) => setGenerateForm({ ...generateForm, body_copy: e.target.value })}
                    placeholder={isGeneratingCopy ? "Generating..." : "AI will generate if empty"}
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cta">CTA (Optional - AI will generate if empty)</Label>
                  <Input
                    id="cta"
                    value={generateForm.cta}
                    onChange={(e) => setGenerateForm({ ...generateForm, cta: e.target.value })}
                    placeholder={isGeneratingCopy ? "Generating..." : "AI will generate if empty"}
                  />
                </div>

                {/* Chat Section Removed - Manual Layout Control Blocked */}
                <div className="space-y-2 pt-4 border-t text-center text-xs text-muted-foreground">
                  <p>Layout is strictly controlled by template rules.</p>
                </div>
              </div>

              {/* Right: Preview */}
              <div className="overflow-y-auto pr-4">
                <div className="sticky top-0 bg-background pb-4 z-10">
                  <Label className="text-base font-semibold">Image Preview</Label>
                </div>
                {generateForm.image_id ? (
                  <div className="space-y-4">
                    <div className="relative aspect-square rounded-lg overflow-hidden border">
                      <SignedImage
                        storageUrl={availableImages.find(img => img.id === generateForm.image_id)?.storage_url}
                        storagePath={availableImages.find(img => img.id === generateForm.image_id)?.storage_path}
                        storageBucket={availableImages.find(img => img.id === generateForm.image_id)?.storage_bucket}
                        alt="Selected image"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-black/60 p-4 text-white">
                        <p className="text-xs font-semibold uppercase opacity-70">AI Layout Preview</p>
                        <p className="text-sm">Layout will be automatically optimized for this image based on visual noise and contrast.</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-24 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                    <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-sm">Select an image to see preview</p>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowGenerateDialog(false);
                setLayoutChanges(null);
              }}>
                Cancel
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !generateForm.audience_segment_id || !generateForm.image_id}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Ad
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filters:</span>
            </div>
            {/* Template filter removed */}
            <Select
              value={filters.status || "all"}
              onValueChange={(value) => setFilters({ ...filters, status: value === "all" ? "" : value })}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Ads Gallery */}
      {ads.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <ImageIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mb-4">
              No ads generated yet.
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Generate ads from templates to start creating high-converting ad creatives.
            </p>
            <Button onClick={() => setShowGenerateDialog(true)}>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Ads
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ads.map((ad) => (
            <Card key={ad.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-sm line-clamp-1">
                      {ad.assets_json.headline || 'Ad'}
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">
                      {ad.metadata_json.platform} • {ad.ad_type}
                    </CardDescription>
                  </div>
                  <Badge variant={ad.status === 'approved' ? 'default' : 'secondary'}>
                    {ad.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {ad.assets_json.image_url && (
                  <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-muted">
                    <img
                      src={ad.assets_json.rendered_image_url || ad.assets_json.image_url}
                      alt={ad.assets_json.headline}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
                <div className="space-y-2 text-sm">
                  <p className="font-medium line-clamp-2">{ad.assets_json.headline}</p>
                  <p className="text-muted-foreground text-xs line-clamp-2">
                    {ad.assets_json.body_copy}
                  </p>
                  <Badge variant="outline" className="text-xs">
                    {ad.assets_json.cta}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleStatusUpdate(ad.id, 'approved')}
                    disabled={ad.status === 'approved'}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleStatusUpdate(ad.id, 'archived')}
                    disabled={ad.status === 'archived'}
                  >
                    <Archive className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(ad.assets_json.rendered_image_url || ad.assets_json.image_url, '_blank')}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>

                {/* Intelligence Badge */}
                {ad.metadata_json?.strategy && (
                  <div className="bg-muted/50 p-2 rounded text-xs space-y-1">
                    <div className="flex items-center gap-2 border-b pb-1 mb-1">
                      <Sparkles className="w-3 h-3 text-purple-500" />
                      <span className="font-semibold text-purple-700 dark:text-purple-300">
                        {ad.metadata_json.strategy.angle.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <p className="opacity-80 line-clamp-2" title={ad.metadata_json.strategy.rationale}>
                      {ad.metadata_json.strategy.rationale}
                    </p>
                  </div>
                )}

                {/* QA Status */}
                {ad.metadata_json?.qa_results && (
                  <div className="flex items-center gap-2 text-xs">
                    {ad.metadata_json.qa_results.passed ? (
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="w-3 h-3" /> QA Passed
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-amber-600" title={ad.metadata_json.qa_results.issues?.join(', ')}>
                        ⚠️ QA Issues
                      </span>
                    )}
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
