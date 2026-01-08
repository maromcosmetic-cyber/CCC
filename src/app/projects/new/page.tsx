'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Sparkles } from 'lucide-react';

export default function CreateProjectPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    website_url: '',
    monthly_budget_amount: '',
    monthly_budget_currency: 'USD',
    industry: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateUrl = (url: string): boolean => {
    try {
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validation
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!formData.website_url.trim()) {
      newErrors.website_url = 'Website URL is required';
    } else if (!validateUrl(formData.website_url)) {
      newErrors.website_url = 'Invalid URL';
    }
    if (!formData.monthly_budget_amount || parseFloat(formData.monthly_budget_amount) <= 0) {
      newErrors.monthly_budget_amount = 'Budget must be greater than 0';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name,
          website_url: formData.website_url,
          monthly_budget_amount: parseFloat(formData.monthly_budget_amount),
          monthly_budget_currency: formData.monthly_budget_currency,
          industry: formData.industry || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create project');
      }

      const data = await response.json();

      // Redirect to Studio Overview
      window.location.href = '/studio/overview';
    } catch (error) {
      setErrors({ submit: error instanceof Error ? error.message : 'Failed to create project' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Shell>
      <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="rounded-xl"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest">
            <Sparkles className="w-3 h-3" /> New Project Setup
          </div>
          <h1 className="text-4xl font-display font-black text-foreground tracking-tight">Create Project</h1>
          <p className="text-muted-foreground text-lg">
            Set up a new eCommerce project to start managing campaigns and generating content.
          </p>
        </div>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
            <CardDescription>
              Enter your project information. We'll scrape your website to build a company profile.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Project Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="My eCommerce Store"
                  className="h-11"
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="website_url">Website URL *</Label>
                <Input
                  id="website_url"
                  type="url"
                  value={formData.website_url}
                  onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                  placeholder="https://example.com"
                  className="h-11"
                />
                {errors.website_url && (
                  <p className="text-sm text-destructive">{errors.website_url}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  We'll analyze your website to understand your brand and products
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="monthly_budget_amount">Monthly Budget *</Label>
                  <Input
                    id="monthly_budget_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.monthly_budget_amount}
                    onChange={(e) => setFormData({ ...formData, monthly_budget_amount: e.target.value })}
                    placeholder="5000"
                    className="h-11"
                  />
                  {errors.monthly_budget_amount && (
                    <p className="text-sm text-destructive">{errors.monthly_budget_amount}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    value={formData.monthly_budget_currency}
                    onValueChange={(value) => setFormData({ ...formData, monthly_budget_currency: value })}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                      <SelectItem value="CAD">CAD</SelectItem>
                      <SelectItem value="AUD">AUD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="industry">Industry (Optional)</Label>
                <Input
                  id="industry"
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  placeholder="E-commerce, Fashion, Electronics, etc."
                  className="h-11"
                />
              </div>

              {errors.submit && (
                <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">
                  {errors.submit}
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 h-11 rounded-xl font-bold"
                >
                  {isLoading ? 'Creating Project...' : 'Create Project'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  className="rounded-xl h-11 px-8"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="glass-card bg-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex gap-4">
              <Sparkles className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="font-bold text-sm">What happens next?</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• We'll scrape your website to understand your brand</li>
                  <li>• AI will generate a comprehensive company profile</li>
                  <li>• You'll be able to create campaigns, audiences, and content</li>
                  <li>• All features will be ready in a few minutes</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}
