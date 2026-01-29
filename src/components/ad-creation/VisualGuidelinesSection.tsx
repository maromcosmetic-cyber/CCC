'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, CheckCircle2, AlertCircle, Palette, Layout, Target } from 'lucide-react';
import { toast } from 'sonner';
import { VisualGuideline } from '@/types/models';

interface VisualGuidelinesSectionProps {
  projectId: string;
  onGuidelinesGenerated?: (guideline: VisualGuideline) => void;
  onGuidelinesLoaded?: (guidelines: VisualGuideline[]) => void;
}

export function VisualGuidelinesSection({ projectId, onGuidelinesGenerated, onGuidelinesLoaded }: VisualGuidelinesSectionProps) {
  const [guidelines, setGuidelines] = useState<VisualGuideline[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<string>('');
  const [progressStep, setProgressStep] = useState<number>(0);

  useEffect(() => {
    if (projectId) {
      fetchGuidelines();
    } else {
      setIsLoading(false);
    }
  }, [projectId]);

  const fetchGuidelines = async () => {
    if (!projectId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/ad-guidelines`);
      const data = await response.json();
      if (response.ok) {
        console.log('Fetched guidelines:', data.guidelines);
        const fetchedGuidelines = data.guidelines || [];
        setGuidelines(fetchedGuidelines);
        // Notify parent component of loaded guidelines
        if (onGuidelinesLoaded && fetchedGuidelines.length > 0) {
          onGuidelinesLoaded(fetchedGuidelines);
        }
      } else if (response.status !== 404) {
        // Only show error for actual errors, not for "not found" (which is expected if no guidelines exist)
        console.error('Failed to load guidelines:', data);
        // Don't show toast for initial load - it's expected that there might be no data
      }
    } catch (error) {
      console.error('Error fetching guidelines:', error);
      // Don't show toast for initial load errors
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setProgressStep(0);
    setGenerationProgress('🔍 Scanning competitor ad libraries...');

    // Progress steps with timers to show what AI is doing
    const progressSteps = [
      { delay: 2000, message: '📊 Analyzing competitor ad patterns...', step: 1 },
      { delay: 5000, message: '🎨 Extracting visual composition rules...', step: 2 },
      { delay: 8000, message: '📈 Calculating performance signals...', step: 3 },
      { delay: 12000, message: '🎯 Identifying market patterns...', step: 4 },
      { delay: 15000, message: '🔗 Aligning with brand identity...', step: 5 },
      { delay: 18000, message: '✨ Generating visual guidelines...', step: 6 },
    ];

    const timers = progressSteps.map(step =>
      setTimeout(() => {
        setGenerationProgress(step.message);
        setProgressStep(step.step);
      }, step.delay)
    );

    try {
      const response = await fetch(`/api/projects/${projectId}/ad-guidelines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      
      // Clear all timers
      timers.forEach(clearTimeout);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        setGenerationProgress('');
        setProgressStep(0);
        setIsGenerating(false);
        toast.error(errorData.error || `Failed to generate guidelines (${response.status})`);
        console.error('Guidelines generation failed:', errorData);
        return;
      }

      const data = await response.json();
      
      if (data.success && data.guideline) {
        setProgressStep(7);
        setGenerationProgress('✅ Guidelines generated successfully!');
        
        console.log('Guidelines generated successfully:', data.guideline);
        
        // Update guidelines state immediately
        setGuidelines([data.guideline]);
        
        // Call callback if provided
        if (onGuidelinesGenerated) {
          onGuidelinesGenerated(data.guideline);
        }
        
        // Wait a moment to show success message, then clear and refresh
        setTimeout(async () => {
          setGenerationProgress('');
          setProgressStep(0);
          toast.success('Visual guidelines generated successfully!');
          
          // Refresh from server to ensure we have latest data with all fields
          await fetchGuidelines();
          
          // Make sure isGenerating is set to false after refresh
          setIsGenerating(false);
        }, 1500);
      } else {
        setGenerationProgress('');
        setProgressStep(0);
        setIsGenerating(false);
        console.error('Unexpected response format:', data);
        toast.error(data.error || 'Guidelines generated but response format was unexpected');
        // Still try to fetch in case it was saved
        await fetchGuidelines();
      }
    } catch (error: any) {
      timers.forEach(clearTimeout);
      setGenerationProgress('');
      setProgressStep(0);
      setIsGenerating(false);
      console.error('Error generating guidelines:', error);
      toast.error(`Failed to generate guidelines: ${error.message || 'Network error'}`);
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

  const activeGuideline = guidelines[0]; // Use most recent

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Visual Guidelines</h3>
          <p className="text-sm text-muted-foreground">
            Market-derived patterns combined with brand identity
          </p>
        </div>
        {!activeGuideline && (
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="animate-pulse">Generating...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Guidelines
              </>
            )}
          </Button>
        )}
      </div>

      {isGenerating && !activeGuideline ? (
        <Card className="border-dashed">
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center text-center space-y-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-full border-4 border-primary/20 animate-pulse" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="w-10 h-10 animate-spin text-primary" />
                </div>
              </div>
              <div className="space-y-2 max-w-md">
                <p className="font-medium text-foreground animate-pulse">
                  {generationProgress || '🔍 Starting analysis...'}
                </p>
                <p className="text-xs text-muted-foreground">
                  AI is analyzing competitor ads and extracting visual patterns...
                </p>
                <div className="w-full bg-secondary rounded-full h-2 overflow-hidden mt-4">
                  <div 
                    className="h-full bg-primary transition-all duration-500 ease-out rounded-full"
                    style={{ 
                      width: `${Math.min(95, (progressStep / 7) * 100)}%` 
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Step {progressStep} of 7
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : activeGuideline ? (
        <div className="space-y-4">
          {/* Status Card */}
          <Card className="bg-green-50 border-green-200">
            <CardContent className="py-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-semibold text-green-900">Guidelines Generated</p>
                  <p className="text-sm text-green-700">
                    Category: {activeGuideline.category} • Created {new Date(activeGuideline.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Market Patterns */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Layout className="w-4 h-4" />
                Market Patterns
              </CardTitle>
              <CardDescription>
                Visual patterns extracted from competitor ads
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeGuideline.guideline_json.market_patterns && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Image Placement</p>
                    <Badge variant="outline">
                      {activeGuideline.guideline_json.market_patterns.image_placement || 'center'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Text Hierarchy</p>
                    <Badge variant="outline">
                      {activeGuideline.guideline_json.market_patterns.text_hierarchy || 'headline_first'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">CTA Position</p>
                    <Badge variant="outline">
                      {activeGuideline.guideline_json.market_patterns.cta_position || 'bottom'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Visual Density</p>
                    <Badge variant="outline">
                      {activeGuideline.guideline_json.market_patterns.visual_density || 'moderate'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Background</p>
                    <Badge variant="outline">
                      {activeGuideline.guideline_json.market_patterns.background_style || 'clean'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Colors</p>
                    <div className="flex gap-1">
                      {activeGuideline.guideline_json.market_patterns.dominant_colors?.slice(0, 3).map((color, i) => (
                        <div
                          key={i}
                          className="w-6 h-6 rounded border"
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Performance Signals */}
              {activeGuideline.guideline_json.performance_signals && (
                <div className="pt-4 border-t">
                  <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                    <Target className="w-3 h-3" />
                    Performance Signals
                  </p>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Longevity</p>
                      <p className="font-semibold">
                        {activeGuideline.guideline_json.performance_signals.longevity_days || 0} days
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Platforms</p>
                      <p className="font-semibold">
                        {activeGuideline.guideline_json.performance_signals.platform_coverage?.length || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Frequency Score</p>
                      <p className="font-semibold">
                        {activeGuideline.guideline_json.performance_signals.frequency_score || 0}/10
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Brand Alignment */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Brand Alignment
              </CardTitle>
              <CardDescription>
                How brand rules override and adapt market patterns
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeGuideline.brand_alignment_json.overrides && 
               Object.keys(activeGuideline.brand_alignment_json.overrides).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Brand Overrides</p>
                  <div className="space-y-2">
                    {Object.entries(activeGuideline.brand_alignment_json.overrides).map(([key, value]) => (
                      <div key={key} className="p-2 bg-amber-50 rounded text-sm">
                        <p className="font-medium text-amber-900">{key}</p>
                        <p className="text-amber-700 text-xs">{String(value)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeGuideline.brand_alignment_json.adaptations && 
               Object.keys(activeGuideline.brand_alignment_json.adaptations).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Brand Adaptations</p>
                  <div className="space-y-2">
                    {Object.entries(activeGuideline.brand_alignment_json.adaptations).map(([key, value]) => (
                      <div key={key} className="p-2 bg-blue-50 rounded text-sm">
                        <p className="font-medium text-blue-900">{key}</p>
                        <p className="text-blue-700 text-xs">{String(value)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mb-4">
              No visual guidelines generated yet.
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Generate guidelines from competitor ad intelligence to extract performance-proven visual patterns.
            </p>
            <Button onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  <span className="animate-pulse">Generating...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Guidelines
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
