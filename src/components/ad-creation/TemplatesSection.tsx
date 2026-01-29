'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, FileText, Edit, Trash2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { AdTemplate, VisualGuideline } from '@/types/models';

interface TemplatesSectionProps {
  projectId: string;
  guidelines: VisualGuideline[];
  onTemplateSelect?: (template: AdTemplate) => void;
  onTemplatesUpdated?: (templates: AdTemplate[]) => void;
}

export function TemplatesSection({ projectId, guidelines, onTemplateSelect, onTemplatesUpdated }: TemplatesSectionProps) {
  const [templates, setTemplates] = useState<AdTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [localGuidelines, setLocalGuidelines] = useState<VisualGuideline[]>(guidelines || []);
  const [createForm, setCreateForm] = useState({
    name: '',
    template_type: 'static_image' as const,
    platform: 'meta' as const,
    guideline_id: ''
  });

  // Sync with parent guidelines prop
  useEffect(() => {
    if (guidelines && guidelines.length > 0) {
      setLocalGuidelines(guidelines);
    }
  }, [guidelines]);

  // Fetch guidelines if not provided
  useEffect(() => {
    if (projectId && localGuidelines.length === 0) {
      fetchGuidelines();
    }
  }, [projectId]);

  // Fetch templates
  useEffect(() => {
    if (projectId) {
      fetchTemplates();
    } else {
      setIsLoading(false);
    }
  }, [projectId]);

  const fetchGuidelines = async () => {
    if (!projectId) return;
    
    try {
      const response = await fetch(`/api/projects/${projectId}/ad-guidelines`);
      const data = await response.json();
      if (response.ok && data.guidelines && data.guidelines.length > 0) {
        setLocalGuidelines(data.guidelines);
      }
    } catch (error) {
      console.error('Error fetching guidelines:', error);
    }
  };

  const fetchTemplates = async () => {
    if (!projectId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/ad-templates`);
      const data = await response.json();
      if (response.ok) {
        const fetchedTemplates = data.templates || [];
        setTemplates(fetchedTemplates);
        // Notify parent component of loaded templates
        if (onTemplatesUpdated) {
          onTemplatesUpdated(fetchedTemplates);
        }
      } else if (response.status !== 404) {
        // Only show error for actual errors, not for "not found" (which is expected if no templates exist)
        console.error('Failed to load templates:', data);
        // Don't show toast for initial load - it's expected that there might be no data
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      // Don't show toast for initial load errors
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    const activeGuideline = localGuidelines[0] || guidelines[0];
    const guidelineId = createForm.guideline_id || activeGuideline?.id;
    
    if (!createForm.name || !guidelineId) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/ad-templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guideline_id: guidelineId,
          name: createForm.name,
          template_type: createForm.template_type,
          platform: createForm.platform
        })
      });
      const data = await response.json();
      if (response.ok) {
        toast.success('Template created successfully!');
        setShowCreateDialog(false);
        setCreateForm({ name: '', template_type: 'static_image', platform: 'meta', guideline_id: '' });
        
        // Refresh templates and notify parent
        const refreshResponse = await fetch(`/api/projects/${projectId}/ad-templates`);
        const refreshData = await refreshResponse.json();
        if (refreshResponse.ok) {
          const updatedTemplates = refreshData.templates || [];
          setTemplates(updatedTemplates);
          if (onTemplatesUpdated) {
            onTemplatesUpdated(updatedTemplates);
          }
        }
      } else {
        toast.error(data.error || 'Failed to create template');
      }
    } catch (error) {
      console.error('Error creating template:', error);
      toast.error('Failed to create template');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/ad-templates/${templateId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        toast.success('Template deleted');
        await fetchTemplates();
      } else {
        toast.error('Failed to delete template');
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
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

  const activeGuideline = localGuidelines[0] || guidelines[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Ad Templates</h3>
          <p className="text-sm text-muted-foreground">
            Reusable layout templates created from visual guidelines
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button disabled={!activeGuideline} className="gap-2">
              <Plus className="w-4 h-4" />
              Create Template
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Template from Guidelines</DialogTitle>
              <DialogDescription>
                Generate a new ad template based on visual guidelines
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="name">Template Name</Label>
                <Input
                  id="name"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="e.g., Meta Feed Ad"
                />
              </div>
              <div>
                <Label htmlFor="type">Template Type</Label>
                <Select
                  value={createForm.template_type}
                  onValueChange={(value: any) => setCreateForm({ ...createForm, template_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="static_image">Static Image</SelectItem>
                    <SelectItem value="carousel">Carousel</SelectItem>
                    <SelectItem value="video_thumbnail">Video Thumbnail</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="platform">Platform</Label>
                <Select
                  value={createForm.platform}
                  onValueChange={(value: any) => setCreateForm({ ...createForm, platform: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meta">Meta (Facebook/Instagram)</SelectItem>
                    <SelectItem value="google">Google Ads</SelectItem>
                    <SelectItem value="tiktok">TikTok</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {activeGuideline && (
                <div>
                  <Label>Guideline</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {activeGuideline.category} (auto-selected)
                  </p>
                  <input
                    type="hidden"
                    value={activeGuideline.id}
                    onChange={() => {}}
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={isCreating || !createForm.name}>
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Create Template
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Templates Grid */}
      {templates.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mb-4">
              No templates created yet.
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              {activeGuideline 
                ? 'Create your first template from visual guidelines to start generating ads.'
                : 'Generate visual guidelines first to create templates.'}
            </p>
            {activeGuideline ? (
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Template
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">
                Go to Step 2 (Visual Guidelines) to generate guidelines first.
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <Card key={template.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => onTemplateSelect?.(template)}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{template.name}</CardTitle>
                    <CardDescription className="text-xs mt-1">
                      {template.platform} • {template.template_type}
                    </CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onTemplateSelect?.(template);
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(template.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Image Zones</span>
                    <Badge variant="secondary">
                      {template.layout_json.image_zones?.length || 0}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Text Zones</span>
                    <Badge variant="secondary">
                      {template.layout_json.text_zones?.length || 0}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">CTA Position</span>
                    <Badge variant="outline" className="text-xs">
                      {template.layout_json.cta_position}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
