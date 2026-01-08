"use client";

import { useEffect, useState } from "react";
import { useProject } from "@/contexts/ProjectContext";
import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, FileText, ExternalLink, Save, Settings } from "lucide-react";
import { toast } from "sonner";

interface WordPressPage {
    id: number;
    title: {
        rendered: string;
    };
    content: {
        rendered: string;
    };
    slug: string;
    link: string;
}

interface LegalPageConfig {
    type: string;
    label: string;
    wordpressPageId?: number;
}

const LEGAL_PAGE_TYPES = [
    { type: 'privacy', label: 'Privacy Policy', slug: 'privacy-policy' },
    { type: 'terms', label: 'Terms & Conditions', slug: 'terms-conditions' },
    { type: 'refund', label: 'Refund & Return Policy', slug: 'refund-return-policy' },
    { type: 'shipping', label: 'Shipping & Delivery Policy', slug: 'shipping-delivery-policy' },
    { type: 'payment', label: 'Payment Policy', slug: 'payment-policy' },
    { type: 'company', label: 'Company Details', slug: 'company-details' },
    { type: 'cookies', label: 'Cookie Policy', slug: 'cookie-policy' },
    { type: 'accessibility', label: 'Accessibility', slug: 'accessibility' },
];

// Helper function to convert HTML to plain text
const htmlToText = (html: string): string => {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || '';
};

// Helper function to convert plain text to HTML paragraphs
const textToHtml = (text: string): string => {
    return text.split('\n\n').map(para => `<p>${para.replace(/\n/g, '<br>')}</p>`).join('\n');
};

export default function LegalPagesPage() {
    const { currentProject } = useProject();
    const [allPages, setAllPages] = useState<WordPressPage[]>([]);
    const [legalPages, setLegalPages] = useState<LegalPageConfig[]>(LEGAL_PAGE_TYPES);
    const [loading, setLoading] = useState(true);
    const [selectedType, setSelectedType] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState("");
    const [editContent, setEditContent] = useState("");
    const [saving, setSaving] = useState(false);
    const [configuring, setConfiguring] = useState(false);

    useEffect(() => {
        if (currentProject) {
            fetchAllPages();
            loadConfig();
        }
    }, [currentProject]);

    const fetchAllPages = async () => {
        if (!currentProject) return;

        setLoading(true);
        try {
            const response = await fetch(`/api/projects/${currentProject.id}/wordpress/pages`);
            if (!response.ok) throw new Error('Failed to fetch pages');

            const data = await response.json();
            setAllPages(data.pages || []);
        } catch (error) {
            console.error('Error fetching pages:', error);
            toast.error('Failed to load WordPress pages');
        } finally {
            setLoading(false);
        }
    };

    const loadConfig = async () => {
        if (!currentProject) return;
        try {
            const res = await fetch(`/api/projects/${currentProject.id}/legal-pages`);
            const data = await res.json();
            if (data.pages) {
                const newConfig = LEGAL_PAGE_TYPES.map(typeDef => {
                    const found = data.pages.find((p: any) => p.page_type === typeDef.type);
                    return {
                        ...typeDef,
                        wordpressPageId: found ? found.wordpress_page_id : undefined
                    };
                });
                setLegalPages(newConfig);
            }
        } catch (e) {
            console.error("Failed to load legal config", e);
        }
    };

    const assignPage = async (type: string, pageId: number) => {
        if (!currentProject) return;
        const wpPage = allPages.find(p => p.id === pageId);
        if (!wpPage) return;

        try {
            await fetch(`/api/projects/${currentProject.id}/legal-pages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    page_type: type,
                    wordpress_page_id: pageId,
                    title: wpPage.title.rendered,
                    content: wpPage.content.rendered,
                    wordpress_slug: wpPage.slug
                })
            });

            const updated = legalPages.map(p =>
                p.type === type ? { ...p, wordpressPageId: pageId } : p
            );
            setLegalPages(updated);
            toast.success('Page assigned successfully!');
        } catch (error) {
            console.error('Error assigning page:', error);
            toast.error('Failed to assign page');
        }
    };

    const createNewPage = async (type: string) => {
        if (!currentProject) return;

        const pageType = LEGAL_PAGE_TYPES.find(p => p.type === type);
        if (!pageType) return;

        try {
            const response = await fetch(
                `/api/projects/${currentProject.id}/wordpress/pages`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title: pageType.label,
                        content: `<h1>${pageType.label}</h1><p>This page is under construction.</p>`,
                        slug: pageType.slug,
                    }),
                }
            );

            if (!response.ok) throw new Error('Failed to create page');

            const data = await response.json();
            toast.success('Page created successfully!');

            // Refresh pages and assign the new one
            await fetchAllPages();
            assignPage(type, data.page_id);
        } catch (error) {
            console.error('Error creating page:', error);
            toast.error('Failed to create page');
        }
    };

    const handleSelectPage = (type: string) => {
        const config = legalPages.find(p => p.type === type);
        if (!config?.wordpressPageId) {
            toast.error('Please assign a WordPress page first');
            return;
        }

        const page = allPages.find(p => p.id === config.wordpressPageId);
        if (!page) {
            toast.error('WordPress page not found');
            return;
        }

        setSelectedType(type);
        setEditTitle(page.title.rendered);
        setEditContent(htmlToText(page.content.rendered));
    };

    const handleSave = async () => {
        if (!currentProject || !selectedType) return;

        const config = legalPages.find(p => p.type === selectedType);
        if (!config?.wordpressPageId) return;

        setSaving(true);
        try {
            const response = await fetch(
                `/api/projects/${currentProject.id}/wordpress/pages/${config.wordpressPageId}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title: editTitle,
                        content: textToHtml(editContent),
                    }),
                }
            );

            if (!response.ok) throw new Error('Failed to save page');

            toast.success('Page updated on WordPress successfully!');
            await fetchAllPages();
        } catch (error) {
            console.error('Error saving page:', error);
            toast.error('Failed to save page');
        } finally {
            setSaving(false);
        }
    };

    const getAssignedPage = (type: string) => {
        const config = legalPages.find(p => p.type === type);
        if (!config?.wordpressPageId) return null;
        return allPages.find(p => p.id === config.wordpressPageId);
    };

    if (!currentProject) {
        return (
            <Shell>
                <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">Please select a project first</p>
                </div>
            </Shell>
        );
    }

    return (
        <Shell>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Legal Pages</h1>
                        <p className="text-muted-foreground">
                            Manage your legal pages from the dashboard
                        </p>
                    </div>
                    <Button
                        onClick={() => setConfiguring(!configuring)}
                        variant="outline"
                    >
                        <Settings className="w-4 h-4 mr-2" />
                        {configuring ? 'Done' : 'Configure Pages'}
                    </Button>
                </div>

                {configuring ? (
                    <Card>
                        <CardHeader>
                            <CardTitle>Assign WordPress Pages</CardTitle>
                            <CardDescription>
                                Select which WordPress page corresponds to each legal page type
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {loading ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                </div>
                            ) : (
                                legalPages.map((config) => (
                                    <div key={config.type} className="flex items-center gap-4">
                                        <Label className="w-40">{config.label}</Label>
                                        <Select
                                            value={config.wordpressPageId?.toString() || ''}
                                            onValueChange={(value) => assignPage(config.type, parseInt(value))}
                                        >
                                            <SelectTrigger className="flex-1">
                                                <SelectValue placeholder="Select a WordPress page..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {[...allPages]
                                                    .sort((a, b) => a.title.rendered.localeCompare(b.title.rendered))
                                                    .map((page) => (
                                                        <SelectItem key={page.id} value={page.id.toString()}>
                                                            {page.title.rendered} (/{page.slug})
                                                        </SelectItem>
                                                    ))}
                                            </SelectContent>
                                        </Select>
                                        <Button
                                            onClick={() => createNewPage(config.type)}
                                            variant="outline"
                                            size="sm"
                                        >
                                            Create New
                                        </Button>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Legal Pages List */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Legal Pages</CardTitle>
                                <CardDescription>Select a page to edit</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {legalPages.map((config) => {
                                    const page = getAssignedPage(config.type);
                                    const isSelected = selectedType === config.type;

                                    return (
                                        <button
                                            key={config.type}
                                            onClick={() => handleSelectPage(config.type)}
                                            disabled={!page}
                                            className={`w-full text-left p-3 rounded-lg border transition-colors ${isSelected
                                                ? 'border-blue-500 bg-blue-50'
                                                : page
                                                    ? 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                                    : 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <FileText className="w-4 h-4" />
                                                    <span className="font-medium">{config.label}</span>
                                                </div>
                                                {page && (
                                                    <a
                                                        href={page.link}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="text-blue-600 hover:text-blue-800"
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
                                                    </a>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {page ? `/${page.slug}` : 'Not assigned'}
                                            </p>
                                        </button>
                                    );
                                })}
                            </CardContent>
                        </Card>

                        {/* Editor */}
                        <Card className="lg:col-span-2">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle>
                                            {selectedType
                                                ? legalPages.find(p => p.type === selectedType)?.label
                                                : 'Select a page to edit'}
                                        </CardTitle>
                                        {selectedType && getAssignedPage(selectedType) && (
                                            <CardDescription>
                                                <a
                                                    href={getAssignedPage(selectedType)!.link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                                                >
                                                    View on website
                                                    <ExternalLink className="w-3 h-3" />
                                                </a>
                                            </CardDescription>
                                        )}
                                    </div>
                                    {selectedType && (
                                        <Button
                                            onClick={handleSave}
                                            disabled={saving || !editContent.trim()}
                                        >
                                            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                            Save to WordPress
                                        </Button>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent>
                                {selectedType ? (
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="page-title">Page Title</Label>
                                            <Input
                                                id="page-title"
                                                value={editTitle}
                                                onChange={(e) => setEditTitle(e.target.value)}
                                                placeholder="Enter page title"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="page-content">Content</Label>
                                            <Textarea
                                                id="page-content"
                                                value={editContent}
                                                onChange={(e) => setEditContent(e.target.value)}
                                                placeholder="Enter page content as plain text..."
                                                rows={20}
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Write in plain text. Press Enter twice for new paragraphs. Text will be converted to HTML automatically when saved.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-12 text-center">
                                        <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                                        <p className="text-muted-foreground">
                                            Select a legal page from the list to start editing
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </Shell>
    );
}
