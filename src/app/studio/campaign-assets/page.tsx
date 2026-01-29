'use client';

import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, Sparkles, Loader2, BrainCircuit, Target, Zap, Heart, Repeat, Share2, Package, UserCircle, BookOpen, AlertCircle, Crosshair, Image as ImageIcon, Megaphone, Check, Archive, ShoppingBag, Maximize2, Star, Wand } from "lucide-react";
import { repairGeneratedImageText } from "@/app/actions/image-refinement";
import { AdIntelligenceSection } from "@/components/ad-creation/AdIntelligenceSection";
import { VisualGuidelinesSection } from "@/components/ad-creation/VisualGuidelinesSection";
import { TemplatesSection } from "@/components/ad-creation/TemplatesSection";
import { GeneratedAdsSection } from "@/components/ad-creation/GeneratedAdsSection";
import { VisualGuideline, AdTemplate } from "@/types/models";
import { useProject } from "@/contexts/ProjectContext";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { ImageType, Product, AudienceSegment } from '@/types/models';
import { useWooCommerceIntegration } from "@/hooks/useWooCommerceIntegration";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { createClient } from "@/lib/auth/client";
import { SignedImage } from "@/components/ui/signed-image";

// AUDIENCE INTERFACE
interface StrategicAudience {
    category: 'Cold' | 'Warm' | 'Hot' | 'Lookalike' | 'Retention';
    name: string;
    hook_concept: string;
    pain_points: string[];
    desires: string[];
    identity_upgrade: string;
    meta_interests: string[];
    age_range?: string;
    awareness_level: string;
    description: string;
    suggested_products?: string[];
}

export default function CampaignAssetsPage() {
    const { currentProject } = useProject();
    const { isConnected: isWooCommerceConnected, isLoading: isWooCommerceLoading } = useWooCommerceIntegration();

    // AUDIENCE STATE
    const [audiences, setAudiences] = useState<StrategicAudience[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [showGenerateDialog, setShowGenerateDialog] = useState(false);
    const [progress, setProgress] = useState("");

    // PERSONA STATE
    const [activeSubTab, setActiveSubTab] = useState("audiences");
    const [personas, setPersonas] = useState<Record<string, any>>({});
    const [activePersonaGenerations, setActivePersonaGenerations] = useState<string[]>([]);
    interface PersonaImage {
        id: string;
        storage_url: string;
        storage_path?: string;
        storage_bucket?: string;
        image_type?: string;
    }
    const [personaImages, setPersonaImages] = useState<Record<string, PersonaImage[]>>({});
    const [loadingPersonaImages, setLoadingPersonaImages] = useState<Record<string, boolean>>({});

    // IMAGE GENERATION STATE
    const [audienceSegments, setAudienceSegments] = useState<AudienceSegment[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [isLoadingProducts, setIsLoadingProducts] = useState(false);
    const [selectedAudienceForImages, setSelectedAudienceForImages] = useState<string>('');
    const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
    const [imageTypes, setImageTypes] = useState<ImageType[]>(['product_only', 'product_persona', 'ugc_style']);
    const [generationJobs, setGenerationJobs] = useState<Record<string, { jobId: string; status: any; images: any[] }>>({});
    const [isGeneratingImages, setIsGeneratingImages] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState<string>(''); // For granular progress updates
    const [repairingId, setRepairingId] = useState<string | null>(null);

    // PRODUCT IMAGES STATE (NEW)
    const [selectedProductForImages, setSelectedProductForImages] = useState<string | null>(null);
    const [selectedIntent, setSelectedIntent] = useState<'primary_hero' | 'gallery_lifestyle' | 'ad_creative' | 'thumbnail'>('primary_hero');
    const [generatedProductImages, setGeneratedProductImages] = useState<any[]>([]);
    const [isGeneratingProductImage, setIsGeneratingProductImage] = useState(false);
    const [expandedImage, setExpandedImage] = useState<{ url: string, path?: string, bucket?: string } | null>(null); // For lightbox

    // IMAGE ADS STATE
    const [guidelines, setGuidelines] = useState<VisualGuideline[]>([]);
    const [templates, setTemplates] = useState<AdTemplate[]>([]);
    const [adSetupProgress, setAdSetupProgress] = useState<{
        isRunning: boolean;
        currentStep: string;
        stepNumber: number;
        totalSteps: number;
    }>({
        isRunning: false,
        currentStep: '',
        stepNumber: 0,
        totalSteps: 3 // Scan → Guidelines → Templates
    });
    const [hasCheckedSetup, setHasCheckedSetup] = useState(false);

    // Auto-setup Image Ads when tab is opened
    useEffect(() => {
        if (!currentProject?.id || activeSubTab !== 'image-ads' || hasCheckedSetup) return;

        const autoSetup = async () => {
            setHasCheckedSetup(true);

            // Check if we already have templates (setup is complete)
            const templatesResponse = await fetch(`/api/projects/${currentProject.id}/ad-templates`);
            const templatesData = await templatesResponse.json();
            if (templatesData.templates && templatesData.templates.length > 0) {
                setTemplates(templatesData.templates);
                return; // Setup already complete
            }

            // Check if we have guidelines
            const guidelinesResponse = await fetch(`/api/projects/${currentProject.id}/ad-guidelines`);
            const guidelinesData = await guidelinesResponse.json();
            if (guidelinesData.guidelines && guidelinesData.guidelines.length > 0) {
                setGuidelines(guidelinesData.guidelines);
                return; // Guidelines exist, can create templates
            }

            // Start background setup: Scan → Guidelines
            setAdSetupProgress({
                isRunning: true,
                currentStep: '🔍 Scanning competitor ad libraries...',
                stepNumber: 1,
                totalSteps: 3
            });

            try {
                // Step 1: Scan competitor ads
                setAdSetupProgress(prev => ({
                    ...prev,
                    currentStep: '🔍 Scanning competitor ad libraries...',
                    stepNumber: 1
                }));

                const scanResponse = await fetch(`/api/projects/${currentProject.id}/ad-intelligence`, {
                    method: 'POST'
                });
                const scanData = await scanResponse.json();

                if (!scanResponse.ok) {
                    throw new Error(scanData.error || 'Failed to scan competitor ads');
                }

                // Step 2: Generate guidelines
                setAdSetupProgress(prev => ({
                    ...prev,
                    currentStep: '📊 Analyzing competitor ad patterns...',
                    stepNumber: 2
                }));

                // Simulate progress steps for guidelines generation
                const progressSteps = [
                    { delay: 2000, message: '🎨 Extracting visual composition rules...' },
                    { delay: 5000, message: '📈 Calculating performance signals...' },
                    { delay: 8000, message: '🎯 Identifying market patterns...' },
                    { delay: 12000, message: '🔗 Aligning with brand identity...' },
                ];

                const timers = progressSteps.map(step =>
                    setTimeout(() => {
                        setAdSetupProgress(prev => ({
                            ...prev,
                            currentStep: step.message
                        }));
                    }, step.delay)
                );

                const guidelinesResponse = await fetch(`/api/projects/${currentProject.id}/ad-guidelines`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({})
                });

                timers.forEach(clearTimeout);

                if (!guidelinesResponse.ok) {
                    const errorData = await guidelinesResponse.json().catch(() => ({ error: 'Unknown error' }));
                    throw new Error(errorData.error || 'Failed to generate guidelines');
                }

                const guidelinesData = await guidelinesResponse.json();
                if (guidelinesData.guidelines && guidelinesData.guidelines.length > 0) {
                    setGuidelines(guidelinesData.guidelines);
                }

                // Step 3: Setup complete
                setAdSetupProgress(prev => ({
                    ...prev,
                    currentStep: '✨ Setup complete! You can now create templates.',
                    stepNumber: 3
                }));

                setTimeout(() => {
                    setAdSetupProgress({
                        isRunning: false,
                        currentStep: '',
                        stepNumber: 0,
                        totalSteps: 3
                    });
                    toast.success('Ad setup complete! You can now create templates.');
                }, 2000);

            } catch (error: any) {
                console.error('Auto-setup error:', error);
                setAdSetupProgress({
                    isRunning: false,
                    currentStep: '',
                    stepNumber: 0,
                    totalSteps: 3
                });
                toast.error(error.message || 'Failed to complete setup. You can try manually.');
            }
        };

        autoSetup();
    }, [currentProject?.id, activeSubTab, hasCheckedSetup]);

    // --- AUDIENCE GENERATION HANDLER ---
    const handleGenerate = async () => {
        if (!currentProject?.id) return;

        setIsGenerating(true);
        setProgress("🧠 Analyzing Brand DNA & Pain Matrix...");

        const timers = [
            setTimeout(() => setProgress("🔍 Applying 'People with Problems' Framework..."), 5000),
            setTimeout(() => setProgress("🎯 Mapping Psychographics..."), 12000),
            setTimeout(() => setProgress("💡 Generating Strategic Hooks..."), 20000),
        ];

        try {
            const response = await fetch('/api/ai/audience-generator', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId: currentProject.id })
            });

            let data;
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                data = await response.json();
            } else {
                throw new Error("Server returned non-JSON response");
            }

            if (response.ok && data.success) {
                setAudiences(data.audiences);
                setShowGenerateDialog(false);
                toast.success('✅ 5 Strategic Audiences Generated!');
            } else {
                toast.error('Generation Failed: ' + (data.error || 'Unknown error'));
            }
        } catch (error: any) {
            console.error('Failed to generate audience:', error);
            toast.error('Network Error: ' + error.message);
        } finally {
            timers.forEach(clearTimeout);
            setIsGenerating(false);
            setProgress("");
        }
    };



    // --- PRODUCT IMAGE GENERATION HANDLER ---
    const handleGenerateProductImage = async () => {
        if (!selectedProductForImages || !currentProject?.id) return;
        setIsGeneratingProductImage(true);

        try {
            // Find the full product object
            const productData = products.find(p => p.id === selectedProductForImages);
            if (!productData) throw new Error("Product data not found");

            const response = await fetch(`/api/projects/${currentProject.id}/product-images/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productId: selectedProductForImages, // This is the WooCommerce ID (source_id)
                    intent: selectedIntent,
                    productDetails: {
                        name: productData.name,
                        description: productData.description,
                        image_url: productData.images?.[0]?.url,
                        price: productData.price,
                        currency: productData.currency
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Generation failed');
            }

            const data = await response.json();
            if (data.success && data.asset) {
                setGeneratedProductImages(prev => [data.asset, ...prev]);
                toast.success("Image generated successfully!");
            }
        } catch (error: any) {
            console.error('Generation error:', error);
            toast.error(error.message || "Generation failed");
        } finally {
            setIsGeneratingProductImage(false);
        }
    }
    const handleGeneratePersona = async (audience: StrategicAudience) => {
        if (!currentProject?.id) return;

        setActivePersonaGenerations(prev => [...prev, audience.name]);

        try {
            const response = await fetch('/api/ai/persona-generator', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: currentProject.id,
                    audienceSegment: audience
                })
            });

            const data = await response.json();

            if (data.success) {
                setPersonas(prev => ({
                    ...prev,
                    [audience.name]: data
                }));
            } else {
                toast.error(`Failed to generate persona for ${audience.name}: ` + data.error);
            }
        } catch (error: any) {
            console.error(error);
            toast.error(`Error generating persona for ${audience.name}`);
        } finally {
            setActivePersonaGenerations(prev => prev.filter(name => name !== audience.name));
        }
    };

    // --- FETCH PERSONA IMAGES ---
    const fetchPersonaImages = useCallback(async (audienceName: string, audienceId?: string) => {
        if (!currentProject?.id) return;

        setLoadingPersonaImages(prev => ({ ...prev, [audienceName]: true }));

        try {
            // Find audience ID if not provided
            let finalAudienceId: string | undefined = audienceId;
            if (!finalAudienceId) {
                const audienceSegment = audienceSegments.find(a => a.name === audienceName);
                finalAudienceId = audienceSegment?.id;
            }

            // Construct API URL with params
            const params = new URLSearchParams();
            if (finalAudienceId) params.append('audienceId', finalAudienceId);
            params.append('personaName', audienceName);

            const response = await fetch(`/api/projects/${currentProject.id}/media?${params.toString()}`);

            if (response.ok) {
                const data = await response.json();
                // Filter out product-only images from the Persona tab view
                const images = (data.media || []).filter((img: any) => img.image_type !== 'product_only');

                if (images.length > 0) {
                    setPersonaImages(prev => ({
                        ...prev,
                        [audienceName]: images
                    }));

                    // signedUrls logic removed
                }
            } else {
                console.error('Failed to fetch persona images API:', await response.text());
            }

        } catch (error) {
            console.error('Failed to fetch persona images:', error);
        } finally {
            setLoadingPersonaImages(prev => ({ ...prev, [audienceName]: false }));
        }
    }, [currentProject?.id, audienceSegments]);

    // Fetch images for all personas when they're loaded or when audience segments change
    useEffect(() => {
        if (!currentProject?.id || audiences.length === 0) return;

        audiences.forEach((audience) => {
            if (personas[audience.name]?.profile) {
                fetchPersonaImages(audience.name);
            }
        });
    }, [personas, audiences, currentProject?.id, fetchPersonaImages]);

    // --- BATCH GENERATE PERSONAS ---
    const handleGenerateAllPersonas = async () => {
        if (!audiences.length) return;

        toast.info("🚀 Starting batch generation for all personas...");

        const promises = audiences.map(audience => handleGeneratePersona(audience));
        await Promise.all(promises);

        toast.success("✅ All personas generated!");
    };

    // Load from Project Context on mount or change
    useEffect(() => {
        if (currentProject?.brandIdentity) {
            if (currentProject.brandIdentity.audiences && Array.isArray(currentProject.brandIdentity.audiences)) {
                setAudiences(currentProject.brandIdentity.audiences);
            } else {
                setAudiences([]);
            }
            if (currentProject.brandIdentity.personas) {
                setPersonas(currentProject.brandIdentity.personas);
            }
        }
    }, [currentProject]);

    // Fetch audience segments for image generation
    useEffect(() => {
        if (!currentProject?.id) return;

        const fetchAudienceSegments = async () => {
            try {
                const res = await fetch(`/api/projects/${currentProject.id}/audiences`);
                const data = await res.json();

                if (data.audiences && data.audiences.length > 0) {
                    setAudienceSegments(data.audiences);
                } else {
                    // If no audience segments exist, try to sync from brand_identity
                    // This happens when audiences were generated but not synced to audience_segments
                    try {
                        const syncRes = await fetch(`/api/projects/${currentProject.id}/audiences`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ sync: true })
                        });
                        const syncData = await syncRes.json();

                        if (syncData.success) {
                            // Refetch after sync
                            const refetchRes = await fetch(`/api/projects/${currentProject.id}/audiences`);
                            const refetchData = await refetchRes.json();
                            if (refetchData.audiences) {
                                setAudienceSegments(refetchData.audiences);
                            }
                        }
                    } catch (syncErr) {
                        console.error('Failed to sync audiences:', syncErr);
                        // Don't show error to user - they can still use the page
                    }
                }
            } catch (err) {
                console.error('Failed to fetch audience segments:', err);
            }
        };

        fetchAudienceSegments();
    }, [currentProject?.id]);

    // Fetch products for image generation
    useEffect(() => {
        if (!currentProject?.id || !isWooCommerceConnected) {
            setProducts([]);
            return;
        }

        setIsLoadingProducts(true);
        fetch(`/api/projects/${currentProject.id}/commerce/products?per_page=100`)
            .then((res) => {
                if (!res.ok) {
                    throw new Error('Failed to fetch products');
                }
                return res.json();
            })
            .then((data) => {
                // WooCommerce API returns array directly, not wrapped in { products: [...] }
                if (Array.isArray(data)) {
                    // Transform WooCommerce products to match expected format
                    const transformedProducts = data.map((product: any) => ({
                        id: String(product.id), // Convert to string
                        name: product.name,
                        description: product.description || product.short_description,
                        price: parseFloat(product.price || 0),
                        currency: product.currency || 'USD',
                        stock_status: product.stock_status === 'instock' ? 'in_stock' : 'out_of_stock',
                        images: (product.images || []).map((img: any) => ({
                            url: img.src || img.url,
                            alt: img.alt || product.name
                        })),
                        metadata: {
                            sku: product.sku,
                            categories: product.categories || []
                        }
                    }));
                    setProducts(transformedProducts);
                } else if (data.products && Array.isArray(data.products)) {
                    setProducts(data.products);
                } else {
                    setProducts([]);
                }
            })
            .catch((err) => {
                console.error('Failed to fetch products:', err);
                toast.error('Failed to load products from WooCommerce');
                setProducts([]);
            })
            .finally(() => {
                setIsLoadingProducts(false);
            });
    }, [currentProject?.id, isWooCommerceConnected]);

    // Fetch templates for Image Ads tab
    useEffect(() => {
        if (!currentProject?.id || activeSubTab !== 'image-ads') return;

        fetch(`/api/projects/${currentProject.id}/ad-templates`)
            .then((res) => res.json())
            .then((data) => {
                if (data.templates) {
                    setTemplates(data.templates || []);
                }
            })
            .catch((err) => console.error('Failed to fetch templates:', err));
    }, [currentProject?.id, activeSubTab]);

    // Auto-start worker on mount (development only) - but don't fail if it doesn't work
    useEffect(() => {
        if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
            fetch('/api/workers/start', { method: 'POST' })
                .then((res) => {
                    if (!res.ok) {
                        return res.json().then(data => {
                            throw new Error(data.error || 'Failed to start worker');
                        });
                    }
                    return res.json();
                })
                .then((data) => {
                    if (data.success) {
                        console.log('✅ Worker started automatically:', data.message);
                    } else {
                        console.warn('⚠️ Could not auto-start worker:', data.error || 'Unknown error');
                        console.warn('💡 Start manually: cd workers && npm run dev');
                    }
                })
                .catch((err) => {
                    // Silently fail - worker might already be running or not needed for test mode
                    console.warn('⚠️ Could not auto-start worker:', err.message || err);
                    console.warn('💡 This is OK - test single image works without worker. For batch generation, start manually: cd workers && npm run dev');
                });
        }
    }, []);

    // Map StrategicAudience name to audience_segment ID
    const getAudienceSegmentId = useCallback((audienceName: string): string | null => {
        const segment = audienceSegments.find(seg => seg.name === audienceName);
        return segment?.id || null;
    }, [audienceSegments]);

    // Poll generation status for images
    useEffect(() => {
        if (!currentProject?.id || !selectedAudienceForImages) return;

        const jobData = generationJobs[selectedAudienceForImages];
        if (!jobData?.jobId) return;

        const startTime = Date.now();
        const TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes timeout

        const interval = setInterval(() => {
            const audienceSegmentId = getAudienceSegmentId(selectedAudienceForImages);
            if (!audienceSegmentId) return;

            // Check for timeout
            const elapsed = Date.now() - startTime;
            if (elapsed > TIMEOUT_MS) {
                toast.error('Image generation is taking longer than expected. The job may have timed out.');
                setIsGeneratingImages(false);
                clearInterval(interval);
                return;
            }

            fetch(`/api/projects/${currentProject.id}/audiences/${audienceSegmentId}/generations/${jobData.jobId}`)
                .then((res) => res.json())
                .then(async (data) => {
                    if (data.generation) {
                        const images = data.generation.generated_images || [];


                        setGenerationJobs(prev => ({
                            ...prev,
                            [selectedAudienceForImages]: {
                                jobId: jobData.jobId,
                                status: data.generation,
                                images: images
                            }
                        }));

                        if (data.generation.status === 'completed' || data.generation.status === 'failed') {
                            setIsGeneratingImages(false);
                            clearInterval(interval);

                            // Refresh persona images after generation completes
                            if (data.generation.status === 'completed' && selectedAudienceForImages) {
                                await fetchPersonaImages(selectedAudienceForImages);
                            }
                            if (data.generation.status === 'completed') {
                                toast.success(`Successfully generated ${data.generation.generated_images?.length || 0} images!`);
                            } else if (data.generation.status === 'failed') {
                                toast.error(`Generation failed: ${data.generation.error_message || 'Unknown error'}`);
                            }
                        }
                    }
                })
                .catch((err) => {
                    console.error('Failed to fetch generation status:', err);
                    // Don't stop polling on transient errors
                });
        }, 3000); // Poll every 3 seconds

        return () => clearInterval(interval);
    }, [generationJobs, currentProject?.id, selectedAudienceForImages, getAudienceSegmentId]);

    // IMAGE REPAIR HANDLER
    const handleRepairImage = async (image: any) => {
        try {
            setRepairingId(image.id);
            toast.info("Repairing text... This takes about 10-15 seconds.");

            // 1. Get Product Reference
            const productId = image.product_ids?.[0];
            const product = products.find(p => p.id === productId);
            if (!product?.image_url) {
                throw new Error("Product reference image not found");
            }

            // Fetch and convert product to base64
            const prodResp = await fetch(product.image_url);
            const prodBlob = await prodResp.blob();
            const productBase64 = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(prodBlob);
            });
            // Clean base64 header
            const cleanProdBase64 = productBase64.split(',')[1];

            // 2. Fetch Generated Image (current state)
            const genResp = await fetch(image.storage_url);
            const genBlob = await genResp.blob();
            const genBase64 = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(genBlob);
            });
            const cleanGenBase64 = genBase64.split(',')[1];

            // 3. Call Server Action
            const result = await repairGeneratedImageText(cleanGenBase64, cleanProdBase64);

            if (result.success && result.base64) {
                // 4. Update State (Optimistic - replace with base64 data URI)
                const newUrl = `data:image/png;base64,${result.base64}`;

                if (selectedAudienceForImages) {
                    setGenerationJobs(prev => {
                        const job = prev[selectedAudienceForImages];
                        if (!job) return prev;

                        const newImages = job.images.map((img: any) =>
                            img.id === image.id ? { ...img, storage_url: newUrl } : img
                        );

                        return {
                            ...prev,
                            [selectedAudienceForImages]: {
                                ...job,
                                images: newImages
                            }
                        };
                    });
                }
                toast.success("Text repaired successfully!");
            } else {
                throw new Error(result.error || "Refinement failed");
            }

        } catch (error: any) {
            console.error("Repair failed:", error);
            toast.error(`Repair failed: ${error.message}`);
        } finally {
            setRepairingId(null);
        }
    };

    // Test single image generation (synchronous, for testing)
    const handleTestSingleImage = async () => {
        if (!currentProject?.id || !selectedAudienceForImages || selectedProducts.length === 0 || imageTypes.length === 0) {
            toast.error('Please select an audience, at least one product, and an image type');
            return;
        }


        let audienceSegmentId = getAudienceSegmentId(selectedAudienceForImages);

        if (!audienceSegmentId) {
            toast.error(`Audience "${selectedAudienceForImages}" not found in database. Please sync audiences first.`);
            return;
        }

        setIsGeneratingImages(true);
        setLoadingProgress("Initializing AI pipeline...");

        // Simulate granular progress steps since the API is single-shot
        const progressTimers = [
            setTimeout(() => setLoadingProgress("🔍 Isolating product from background..."), 3000),
            setTimeout(() => setLoadingProgress("🎨 Generating scene context..."), 8000),
            setTimeout(() => setLoadingProgress("🧹 Applying Fidelity Sandwich (Text Preservation)..."), 15000),
            setTimeout(() => setLoadingProgress("💡 Re-injecting realistic lighting..."), 22000),
            setTimeout(() => setLoadingProgress("✨ Final polish..."), 28000),
        ];

        let response: Response | null = null;
        try {
            response = await fetch(
                `/api/projects/${currentProject.id}/audiences/${audienceSegmentId}/generate-image`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        product_id: selectedProducts[0], // Use first selected product
                        image_type: imageTypes[0], // Use first selected type
                    }),
                }
            );

            if (!response.ok) {
                const errorData = await response.json();

                // Check for Vision API error
                if (errorData.error === 'Cloud Vision API Not Enabled' || errorData.message?.includes('Cloud Vision API')) {
                    const visionError = new Error(errorData.message || errorData.error);
                    (visionError as any).errorData = errorData;
                    throw visionError;
                }

                throw new Error(errorData.error || errorData.message || `Server error: ${response.status}`);
            }

            const data = await response.json();

            if (data.image_id && data.storage_url) {
                toast.success('Test image generated successfully!');

                // Use the data directly from the secure server response
                // bypassing the need for a client-side fetch that might be blocked by RLS
                const imageRecord = {
                    id: data.image_id,
                    storage_url: data.storage_url,
                    storage_path: data.storage_path,
                    storage_bucket: data.storage_bucket,
                    image_type: imageTypes[0],
                };

                // Signed URL logic removed - handled by component

                // Add image to the generated images list
                setGenerationJobs(prev => ({
                    ...prev,
                    [selectedAudienceForImages]: {
                        ...prev[selectedAudienceForImages],
                        images: [...(prev[selectedAudienceForImages]?.images || []), {
                            id: data.image_id,
                            storage_url: data.storage_url,
                            storage_path: data.storage_path,
                            storage_bucket: data.storage_bucket,
                            image_type: imageTypes[0],
                            product_ids: [selectedProducts[0]],
                            created_at: new Date().toISOString(),
                        }]
                    }
                }));

                // Refresh persona images to show the new image in the slider
                if (selectedAudienceForImages) {
                    await fetchPersonaImages(selectedAudienceForImages, audienceSegmentId);
                }
            } else {
                throw new Error(data.error || 'No image returned from server');
            }
        } catch (error: any) {
            console.error('❌ Test image generation error:', error);

            let errorMessage = error.message || 'Failed to generate test image';

            // Check if it's a Vision API or Generative Language API error
            if (errorMessage.includes('Cloud Vision API') || errorMessage.includes('Generative Language API') || errorMessage.includes('not enabled') || error.errorData) {
                const errorData = error.errorData;
                const isGemini = errorMessage.includes('Generative Language') || errorMessage.includes('generativelanguage');
                const apiName = isGemini ? 'Generative Language API (Gemini)' : 'Cloud Vision API';

                if (errorData?.activationUrl) {
                    toast.error(`${apiName} Not Enabled`, {
                        description: errorData.instructions || `Visit: ${errorData.activationUrl}`,
                        duration: 15000,
                        action: {
                            label: 'Enable API',
                            onClick: () => window.open(errorData.activationUrl, '_blank')
                        }
                    });
                } else {
                    // Extract URL from error message if available
                    const urlMatch = errorMessage.match(/https:\/\/[^\s]+/);
                    const defaultUrl = isGemini
                        ? 'https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com'
                        : 'https://console.cloud.google.com/apis/library/vision.googleapis.com';
                    const activationUrl = urlMatch ? urlMatch[0] : defaultUrl;

                    toast.error(`${apiName} Not Enabled`, {
                        description: `Please enable ${apiName}. ${isGemini ? 'This is required for image generation.' : 'This is required to isolate products from backgrounds.'}`,
                        duration: 15000,
                        action: {
                            label: 'Open Console',
                            onClick: () => window.open(activationUrl, '_blank')
                        }
                    });
                }
            } else {
                toast.error(errorMessage);
            }

            // Show more details in console for debugging
            if (error.message?.includes('details')) {
                console.error('Error details:', error);
            }
        } finally {
            progressTimers.forEach(clearTimeout);
            setIsGeneratingImages(false);
            setLoadingProgress('');
        }
    };

    // Image generation handler
    const handleGenerateImages = async () => {
        if (!currentProject?.id || !selectedAudienceForImages || selectedProducts.length === 0) {
            toast.error('Please select an audience and at least one product');
            return;
        }

        let audienceSegmentId = getAudienceSegmentId(selectedAudienceForImages);

        // If segment not found, try to sync audiences first
        if (!audienceSegmentId) {
            console.log('Audience segment not found, attempting sync...', {
                selectedAudience: selectedAudienceForImages,
                availableSegments: audienceSegments.map(s => s.name),
                availableAudiences: audiences.map(a => a.name)
            });

            toast.info('Syncing audiences to database...');
            try {
                const syncRes = await fetch(`/api/projects/${currentProject.id}/audiences`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sync: true })
                });

                if (!syncRes.ok) {
                    const errorData = await syncRes.json();
                    throw new Error(errorData.error || 'Sync failed');
                }

                const syncData = await syncRes.json();
                console.log('Sync response:', syncData);

                if (!syncRes.ok) {
                    throw new Error(syncData.error || 'Sync request failed');
                }

                if (syncData.success) {
                    // Refetch audience segments - wait a bit for DB to be ready
                    await new Promise(resolve => setTimeout(resolve, 500));

                    const refetchRes = await fetch(`/api/projects/${currentProject.id}/audiences`);
                    if (!refetchRes.ok) {
                        throw new Error('Failed to refetch segments');
                    }

                    const refetchData = await refetchRes.json();
                    console.log('Refetched segments:', refetchData.audiences);
                    console.log('Sync stats:', { synced: syncData.synced, errors: syncData.errors, total: syncData.total });

                    if (refetchData.audiences && Array.isArray(refetchData.audiences)) {
                        setAudienceSegments(refetchData.audiences);
                        // Try to get the segment ID again
                        const foundSegment = refetchData.audiences.find((seg: AudienceSegment) => seg.name === selectedAudienceForImages);
                        audienceSegmentId = foundSegment?.id || null;

                        if (audienceSegmentId) {
                            toast.success('Audiences synced successfully!');
                        } else {
                            console.error('Segment still not found after sync:', {
                                lookingFor: selectedAudienceForImages,
                                available: refetchData.audiences.map((s: AudienceSegment) => s.name),
                                syncStats: { synced: syncData.synced, errors: syncData.errors, total: syncData.total }
                            });
                            if (syncData.errors > 0) {
                                throw new Error(`Sync completed with ${syncData.errors} errors. Some audiences may not have been synced.`);
                            }
                        }
                    } else {
                        console.error('No audiences returned after sync');
                        // If sync reported success but synced 0, that's an error
                        if (syncData.synced === 0) {
                            throw new Error(syncData.error || 'Sync completed but no segments were created. Please check server logs or try generating audiences again.');
                        }
                    }
                } else {
                    throw new Error(syncData.error || 'Sync failed');
                }
            } catch (syncErr: any) {
                console.error('Failed to sync audiences:', syncErr);
                toast.error(`Sync failed: ${syncErr.message || 'Unknown error'}. Please try generating audiences again.`);
            }
        }

        if (!audienceSegmentId) {
            toast.error(`Audience "${selectedAudienceForImages}" not found in database. Please generate audiences first or try again.`);
            return;
        }

        setIsGeneratingImages(true);

        try {
            const response = await fetch(
                `/api/projects/${currentProject.id}/audiences/${audienceSegmentId}/generate-images`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        product_ids: selectedProducts,
                        image_types: imageTypes,
                    }),
                }
            );

            const data = await response.json();

            if (response.ok && data.job_id) {
                setGenerationJobs(prev => ({
                    ...prev,
                    [selectedAudienceForImages]: {
                        jobId: data.job_id,
                        status: { status: 'processing' },
                        images: []
                    }
                }));
                toast.success('Image generation started!');
            } else {
                toast.error(data.error || 'Failed to start generation');
                setIsGeneratingImages(false);
            }
        } catch (error) {
            console.error('Generate images error:', error);
            toast.error('Failed to start image generation');
            setIsGeneratingImages(false);
        }
    };

    const toggleProduct = (productId: string) => {
        setSelectedProducts((prev) =>
            prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
        );
    };

    const toggleImageType = (type: ImageType) => {
        setImageTypes((prev) =>
            prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
        );
    };

    const getIconForCategory = (category: string) => {
        switch (category) {
            case 'Cold': return <BrainCircuit className="w-5 h-5 text-blue-500" />;
            case 'Warm': return <Heart className="w-5 h-5 text-pink-500" />;
            case 'Hot': return <Zap className="w-5 h-5 text-amber-500" />;
            case 'Lookalike': return <Users className="w-5 h-5 text-purple-500" />;
            case 'Retention': return <Repeat className="w-5 h-5 text-emerald-500" />;
            default: return <Users className="w-5 h-5" />;
        }
    };

    const getColorForCategory = (category: string) => {
        switch (category) {
            case 'Cold': return "bg-blue-50 border-blue-100 text-blue-700";
            case 'Warm': return "bg-pink-50 border-pink-100 text-pink-700";
            case 'Hot': return "bg-amber-50 border-amber-100 text-amber-700";
            case 'Lookalike': return "bg-purple-50 border-purple-100 text-purple-700";
            case 'Retention': return "bg-emerald-50 border-emerald-100 text-emerald-700";
            default: return "bg-gray-50 border-gray-100 text-gray-700";
        }
    };

    const currentJob = selectedAudienceForImages ? generationJobs[selectedAudienceForImages] : null;
    const generatedImages = currentJob?.images || [];

    return (
        <Shell>
            <div className="h-[calc(100vh-2rem)] flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Header */}
                <div className="flex items-center justify-between shrink-0">
                    <div>
                        <h1 className="text-3xl font-display font-bold">Campaign Assets</h1>
                        <p className="text-muted-foreground">Manage audiences, personas, and generated images</p>
                    </div>

                    {activeSubTab === "audiences" && (
                        <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
                            <DialogTrigger asChild>
                                <Button size="lg" className="rounded-xl font-bold h-12 shadow-lg hover:shadow-xl transition-all">
                                    <Sparkles className="w-5 h-5 mr-2" />
                                    Generate Audiences
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2">
                                        <BrainCircuit className="w-5 h-5 text-blue-600" />
                                        AI Strategy Engine
                                    </DialogTitle>
                                    <DialogDescription>
                                        Our AI will analyze your Brand DNA, Pain Matrix, and Product to build 5 non-generic, high-performance audiences.
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="py-8 flex flex-col items-center justify-center text-center space-y-6">
                                    {isGenerating ? (
                                        <>
                                            <div className="relative">
                                                <div className="w-20 h-20 rounded-full border-4 border-blue-100 animate-pulse" />
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <p className="font-medium text-foreground animate-pulse">{progress}</p>
                                                <p className="text-xs text-muted-foreground">Reading Playbook & Brand Data...</p>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mb-2">
                                                <Target className="w-10 h-10" />
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                Ready to apply the 6-Layer Architecture to your brand.
                                            </p>
                                        </>
                                    )}
                                </div>

                                <DialogFooter>
                                    {!isGenerating && (
                                        <Button onClick={handleGenerate} className="w-full bg-blue-600 hover:bg-blue-700 font-bold">
                                            <Sparkles className="w-4 h-4 mr-2" />
                                            Run Strategy Engine
                                        </Button>
                                    )}
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>

                <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="h-full flex flex-col min-h-0">
                    <TabsList className="w-full justify-start border-b rounded-none p-0 h-auto bg-transparent shrink-0">
                        <TabsTrigger
                            value="audiences"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3 text-sm font-medium"
                        >
                            <Target className="w-4 h-4 mr-2" />
                            Audiences ({(audiences || []).length})
                        </TabsTrigger>
                        <TabsTrigger
                            value="personas"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3 text-sm font-medium"
                        >
                            <UserCircle className="w-4 h-4 mr-2" />
                            Personas
                        </TabsTrigger>
                        <TabsTrigger
                            value="images"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3 text-sm font-medium"
                        >
                            <ImageIcon className="w-4 h-4 mr-2" />
                            Images
                        </TabsTrigger>
                        <TabsTrigger
                            value="image-ads"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3 text-sm font-medium"
                        >
                            <Megaphone className="w-4 h-4 mr-2" />
                            Image Ads
                        </TabsTrigger>

                        <div className="ml-auto flex items-center">
                            {activeSubTab === "personas" && audiences.length > 0 && (
                                <Button
                                    onClick={handleGenerateAllPersonas}
                                    variant="outline"
                                    size="sm"
                                    disabled={activePersonaGenerations.length > 0}
                                    className="gap-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200"
                                >
                                    {activePersonaGenerations.length > 0 ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Generating {activePersonaGenerations.length}...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-4 h-4" />
                                            Generate All Personas
                                        </>
                                    )}
                                </Button>
                            )}
                        </div>
                    </TabsList>

                    {/* --- AUDIENCES TAB --- */}
                    <TabsContent value="audiences" className="flex-1 mt-6 overflow-hidden">
                        <div className="h-full overflow-y-auto pr-4 pb-20">
                            {(!audiences || audiences.length === 0) ? (
                                <Card className="border-dashed bg-muted/20">
                                    <CardContent className="py-20 flex flex-col items-center justify-center text-center space-y-6">
                                        <div className="w-24 h-24 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                                            <Users className="w-12 h-12 text-blue-400" />
                                        </div>
                                        <div className="max-w-md space-y-2">
                                            <h3 className="text-2xl font-bold">No Strategic Data Yet</h3>
                                            <p className="text-muted-foreground">
                                                Run the AI Strategy Engine to generate your Cold, Warm, Hot, and Retention audiences.
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {(Array.isArray(audiences) ? audiences : []).map((audience, idx) => (
                                        <Card key={idx} className="flex flex-col h-full hover:shadow-xl transition-all duration-300 border-t-4 border-t-transparent hover:border-t-blue-500 group">
                                            <CardHeader className="pb-4">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${getColorForCategory(audience.category)}`}>
                                                        {getIconForCategory(audience.category)}
                                                        {audience.category}
                                                    </div>
                                                    <Badge variant="outline" className="text-[10px] opacity-70">
                                                        {audience.awareness_level}
                                                    </Badge>
                                                    {audience.age_range && (
                                                        <Badge variant="secondary" className="text-[10px] bg-slate-100 text-slate-700">
                                                            Age: {audience.age_range}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <CardTitle className="text-xl font-bold leading-tight min-h-[3rem] flex items-center">
                                                    {audience.name}
                                                </CardTitle>
                                                <CardDescription className="line-clamp-2">
                                                    {audience.description}
                                                </CardDescription>
                                            </CardHeader>

                                            <CardContent className="flex-1 space-y-6">
                                                <div className="space-y-2 bg-muted/40 p-3 rounded-lg">
                                                    <div className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1">
                                                        <Zap className="w-3 h-3" /> Core Hook
                                                    </div>
                                                    <p className="text-sm font-medium italic text-foreground">
                                                        "{audience.hook_concept}"
                                                    </p>
                                                </div>

                                                {(audience.meta_interests || []).length > 0 && (
                                                    <div className="space-y-2">
                                                        <div className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1">
                                                            <Crosshair className="w-3 h-3" /> Meta Targeting Signals
                                                        </div>
                                                        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                                                            {(audience.meta_interests || []).slice(0, 15).map((interest, i) => (
                                                                <span key={i} className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-100 whitespace-nowrap">
                                                                    {interest}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="space-y-1">
                                                    <div className="text-xs font-bold uppercase text-muted-foreground">Identity Upgrade</div>
                                                    <p className="text-sm border-l-2 border-green-400 pl-3 py-1 bg-green-50/50">
                                                        {audience.identity_upgrade}
                                                    </p>
                                                </div>

                                                <div className="space-y-2">
                                                    <div className="text-xs font-bold uppercase text-muted-foreground">Pain Points (Layer 3)</div>
                                                    <ul className="space-y-1.5">
                                                        {(audience.pain_points || []).slice(0, 3).map((pain, i) => (
                                                            <li key={i} className="text-xs flex items-start gap-2">
                                                                <span className="text-red-500 mt-0.5">•</span>
                                                                <span className="opacity-90">{pain}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>

                                                {audience.suggested_products && audience.suggested_products.length > 0 && (
                                                    <div className="pt-4 border-t">
                                                        <div className="text-xs font-bold uppercase text-muted-foreground mb-2 flex items-center gap-1">
                                                            <Package className="w-3 h-3" /> Recommended Products
                                                        </div>
                                                        <ul className="space-y-1">
                                                            {(audience.suggested_products || []).slice(0, 3).map((prod, i) => (
                                                                <li key={i} className="text-xs text-foreground flex items-center gap-2">
                                                                    <span className="w-1 h-1 rounded-full bg-blue-500" />
                                                                    {prod}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    {/* --- PERSONAS TAB --- */}
                    <TabsContent value="personas" className="flex-1 mt-6 overflow-hidden">
                        <div className="h-full overflow-y-auto pr-4 pb-20">
                            {audiences.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-4 border-2 border-dashed rounded-xl bg-muted/20">
                                    <p className="text-muted-foreground">Generate Audiences first to unlock Persona creation.</p>
                                </div>
                            ) : (
                                <div className="space-y-12">
                                    {audiences.map((audience, idx) => {
                                        const personaData = personas[audience.name];
                                        const persona = personaData?.profile;
                                        const imageUrl = personaData?.imageUrl;

                                        return (
                                            <div key={idx} className="space-y-4">
                                                <div className="flex items-center justify-between border-b pb-4 sticky top-0 bg-background/95 backdrop-blur z-10 py-4">
                                                    <div>
                                                        <h3 className="text-lg font-bold flex items-center gap-2">
                                                            <Target className="w-4 h-4 text-muted-foreground" />
                                                            {audience.name}
                                                        </h3>
                                                        <p className="text-xs text-muted-foreground">
                                                            {audience.category} Audience • {audience.awareness_level}
                                                        </p>
                                                    </div>
                                                    {!persona ? (
                                                        <Button
                                                            onClick={() => handleGeneratePersona(audience)}
                                                            disabled={activePersonaGenerations.includes(audience.name)}
                                                            variant={activePersonaGenerations.includes(audience.name) ? "secondary" : "default"}
                                                            size="sm"
                                                        >
                                                            {activePersonaGenerations.includes(audience.name) ? (
                                                                <>
                                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                                    Designing Persona...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Sparkles className="mr-2 h-4 w-4" />
                                                                    Generate Persona
                                                                </>
                                                            )}
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            onClick={() => handleGeneratePersona(audience)}
                                                            disabled={activePersonaGenerations.includes(audience.name)}
                                                            variant={activePersonaGenerations.includes(audience.name) ? "secondary" : "outline"}
                                                            size="sm"
                                                        >
                                                            {activePersonaGenerations.includes(audience.name) ? (
                                                                <>
                                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                                    Regenerating...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Repeat className="mr-2 h-4 w-4" />
                                                                    Regenerate Persona
                                                                </>
                                                            )}
                                                        </Button>
                                                    )}
                                                </div>

                                                {persona ? (
                                                    <>
                                                        <div className="grid md:grid-cols-12 gap-0 bg-card rounded-2xl border shadow-lg overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                                                            <div className="md:col-span-5 bg-muted/30 relative min-h-[400px] md:min-h-full">
                                                                {imageUrl ? (
                                                                    <img
                                                                        src={imageUrl}
                                                                        alt={persona.name}
                                                                        className="w-full h-full object-cover absolute inset-0"
                                                                    />
                                                                ) : (
                                                                    <div className="flex items-center justify-center h-full text-muted-foreground">
                                                                        <div className="text-center">
                                                                            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                                                                            <p>Generating Visuals...</p>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-8 pt-32 text-white">
                                                                    <div className="flex gap-2 mb-2">
                                                                        <Badge variant="outline" className="text-white border-white/20 bg-white/10 backdrop-blur-md">
                                                                            {persona.role} Persona
                                                                        </Badge>
                                                                        <Badge variant="outline" className="text-white border-white/20 bg-white/10 backdrop-blur-md">
                                                                            {persona.age_range}
                                                                        </Badge>
                                                                    </div>
                                                                    <h2 className="text-4xl font-display font-bold text-shadow-xl">{persona.name}</h2>
                                                                    <p className="text-white/80 font-medium text-lg">{persona.occupation}</p>
                                                                </div>
                                                            </div>

                                                            <div className="md:col-span-7 p-8 space-y-8">
                                                                <div className="grid grid-cols-2 gap-8">
                                                                    <div>
                                                                        <h4 className="text-xs uppercase tracking-widest font-bold text-muted-foreground mb-3 flex items-center gap-2">
                                                                            <UserCircle className="w-3 h-3" /> Bio & Lifestyle
                                                                        </h4>
                                                                        <p className="text-sm leading-relaxed text-foreground/90">
                                                                            {persona.daily_routine || persona.lifestyle_notes || "A dedicated individual balancing personal growth and professional ambition..."}
                                                                        </p>
                                                                    </div>
                                                                    <div>
                                                                        <h4 className="text-xs uppercase tracking-widest font-bold text-muted-foreground mb-3 flex items-center gap-2">
                                                                            <AlertCircle className="w-3 h-3" /> Inner Conflict
                                                                        </h4>
                                                                        <p className="text-sm leading-relaxed italic text-foreground/80 border-l-2 pl-4 border-amber-500/50">
                                                                            "{persona.core_concerns || persona.emotional_state}"
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-4">
                                                                    <h4 className="text-xs uppercase tracking-widest font-bold text-muted-foreground flex items-center gap-2">
                                                                        <Sparkles className="w-3 h-3" /> Personality Traits
                                                                    </h4>
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {persona.personality_traits?.map((t: string, i: number) => (
                                                                            <Badge key={i} variant="secondary" className="px-3 py-1.5 text-sm bg-blue-50/50 text-blue-700 hover:bg-blue-100">
                                                                                {t}
                                                                            </Badge>
                                                                        ))}
                                                                    </div>
                                                                </div>

                                                                <div className="grid grid-cols-2 gap-8 pt-6 border-t">
                                                                    <div>
                                                                        <h4 className="text-xs uppercase tracking-widest font-bold text-muted-foreground mb-2">Visual Style</h4>
                                                                        <p className="text-sm text-foreground/80">{persona.visual_style}</p>
                                                                    </div>
                                                                    <div>
                                                                        <h4 className="text-xs uppercase tracking-widest font-bold text-muted-foreground mb-2">Communication</h4>
                                                                        <p className="text-sm text-foreground/80">{persona.communication_style}</p>
                                                                    </div>
                                                                </div>

                                                                {persona.casting_notes && (
                                                                    <div className="bg-muted/40 p-4 rounded-lg text-xs font-mono text-muted-foreground border">
                                                                        <strong className="block mb-1 text-foreground">CASTING NOTES:</strong>
                                                                        {persona.casting_notes}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Persona Images Slider */}
                                                        <div className="mt-6 space-y-3">
                                                            <div className="flex items-center justify-between">
                                                                <h4 className="text-sm font-semibold flex items-center gap-2">
                                                                    <ImageIcon className="w-4 h-4" />
                                                                    Generated Images
                                                                </h4>
                                                                {personaImages[audience.name] && personaImages[audience.name].length > 0 && (
                                                                    <Badge variant="secondary" className="text-xs">
                                                                        {`${personaImages[audience.name].length} image${personaImages[audience.name].length !== 1 ? 's' : ''}`}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            {loadingPersonaImages[audience.name] ? (
                                                                <div className="flex items-center justify-center py-12 border-2 border-dashed rounded-lg bg-muted/20">
                                                                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mr-2" />
                                                                    <span className="text-sm text-muted-foreground">Loading images...</span>
                                                                </div>
                                                            ) : personaImages[audience.name] && personaImages[audience.name].length > 0 ? (
                                                                <div className="relative">
                                                                    <Carousel
                                                                        opts={{
                                                                            align: "start",
                                                                            loop: false,
                                                                        }}
                                                                        className="w-full"
                                                                    >
                                                                        <CarouselContent className="-ml-2 md:-ml-4">
                                                                            {personaImages[audience.name].map((image) => (
                                                                                <CarouselItem key={image.id} className="pl-2 md:pl-4 basis-full md:basis-1/2 lg:basis-1/3">
                                                                                    <div className="relative group">
                                                                                        <div className="relative aspect-video overflow-hidden rounded-lg border bg-muted">
                                                                                            <SignedImage
                                                                                                storageUrl={image.storage_url}
                                                                                                storagePath={image.storage_path}
                                                                                                storageBucket={image.storage_bucket || 'generated-assets'}
                                                                                                signedUrl={undefined}
                                                                                                alt={`Generated image for ${persona.name}`}
                                                                                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                                                                                fallbackSrc="/placeholder-image.png"
                                                                                            />
                                                                                            {image.image_type && (
                                                                                                <div className="absolute top-2 right-2">
                                                                                                    <Badge variant="secondary" className="text-xs bg-black/50 text-white border-0">
                                                                                                        {image.image_type.replace('_', ' ')}
                                                                                                    </Badge>
                                                                                                </div>
                                                                                            )}
                                                                                            {/* Action buttons - show on hover */}
                                                                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                                                                <Button
                                                                                                    size="sm"
                                                                                                    variant="default"
                                                                                                    onClick={async (e) => {
                                                                                                        e.stopPropagation();
                                                                                                        try {
                                                                                                            const response = await fetch(`/api/media/${image.id}/archive`, {
                                                                                                                method: 'PATCH',
                                                                                                                headers: { 'Content-Type': 'application/json' },
                                                                                                                body: JSON.stringify({ archived: false }),
                                                                                                            });
                                                                                                            if (response.ok) {
                                                                                                                toast.success('Image kept');
                                                                                                                await fetchPersonaImages(audience.name);
                                                                                                            } else {
                                                                                                                toast.error('Failed to keep image');
                                                                                                            }
                                                                                                        } catch (err) {
                                                                                                            console.error('Failed to keep image:', err);
                                                                                                            toast.error('Failed to keep image');
                                                                                                        }
                                                                                                    }}
                                                                                                >
                                                                                                    <Check className="w-4 h-4 mr-1" />
                                                                                                    Keep
                                                                                                </Button>
                                                                                                <Button
                                                                                                    size="sm"
                                                                                                    variant="destructive"
                                                                                                    onClick={async (e) => {
                                                                                                        e.stopPropagation();
                                                                                                        try {
                                                                                                            const response = await fetch(`/api/media/${image.id}/archive`, {
                                                                                                                method: 'PATCH',
                                                                                                                headers: { 'Content-Type': 'application/json' },
                                                                                                                body: JSON.stringify({ archived: true }),
                                                                                                            });
                                                                                                            if (response.ok) {
                                                                                                                toast.success('Image archived');
                                                                                                                await fetchPersonaImages(audience.name);
                                                                                                            } else {
                                                                                                                toast.error('Failed to archive image');
                                                                                                            }
                                                                                                        } catch (err) {
                                                                                                            console.error('Failed to archive image:', err);
                                                                                                            toast.error('Failed to archive image');
                                                                                                        }
                                                                                                    }}
                                                                                                >
                                                                                                    <Archive className="w-4 h-4 mr-1" />
                                                                                                    Archive
                                                                                                </Button>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                </CarouselItem>
                                                                            ))}
                                                                        </CarouselContent>
                                                                        {personaImages[audience.name].length > 3 && (
                                                                            <>
                                                                                <CarouselPrevious className="left-0" />
                                                                                <CarouselNext className="right-0" />
                                                                            </>
                                                                        )}
                                                                    </Carousel>
                                                                </div>
                                                            ) : (
                                                                <div className="py-12 border-2 border-dashed rounded-lg bg-muted/20 text-center">
                                                                    <ImageIcon className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                                                                    <p className="text-sm text-muted-foreground">
                                                                        No images generated yet. Generate images in the <strong>Images</strong> tab.
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="p-12 border-2 border-dashed rounded-xl bg-muted/20 text-center text-muted-foreground flex flex-col items-center gap-4 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => handleGeneratePersona(audience)}>
                                                        <div className="w-12 h-12 rounded-full bg-background shadow-sm flex items-center justify-center">
                                                            <UserCircle className="w-6 h-6 text-muted-foreground/50" />
                                                        </div>
                                                        <p>No Persona designed yet. Click "Generate Persona" to create one.</p>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )
                            }
                        </div >
                    </TabsContent >

                    {/* --- IMAGES TAB --- */}
                    < TabsContent value="images" className="flex-1 mt-6 overflow-hidden" >
                        <div className="h-full overflow-y-auto pr-4 pb-20">
                            {audiences.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-4 border-2 border-dashed rounded-xl bg-muted/20">
                                    <p className="text-muted-foreground">Generate Audiences first to unlock Image generation.</p>
                                </div>
                            ) : (
                                <div className="space-y-8">
                                    {/* Audience Selection Cards */}
                                    <div>
                                        <h3 className="text-lg font-semibold mb-4">Select Audience & Persona</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                            {audiences.map((audience) => {
                                                const personaData = personas[audience.name];
                                                const persona = personaData?.profile;
                                                const personaImageUrl = personaData?.imageUrl;
                                                const isSelected = selectedAudienceForImages === audience.name;

                                                return (
                                                    <Card
                                                        key={audience.name}
                                                        className={`cursor-pointer transition-all hover:shadow-lg ${isSelected
                                                            ? 'ring-2 ring-primary border-primary'
                                                            : 'hover:border-primary/50'
                                                            }`}
                                                        onClick={() => setSelectedAudienceForImages(audience.name)}
                                                    >
                                                        <CardHeader className="pb-3">
                                                            <div className="flex items-start justify-between mb-2">
                                                                <div className={`px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1 ${getColorForCategory(audience.category)}`}>
                                                                    {getIconForCategory(audience.category)}
                                                                    {audience.category}
                                                                </div>
                                                                {isSelected && (
                                                                    <Badge className="bg-primary text-primary-foreground">
                                                                        Selected
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <CardTitle className="text-lg">{audience.name}</CardTitle>
                                                            <CardDescription className="line-clamp-2 mt-1">
                                                                {audience.description}
                                                            </CardDescription>
                                                        </CardHeader>
                                                        <CardContent className="space-y-3">
                                                            {/* Persona Display */}
                                                            {persona ? (
                                                                <div className="relative h-32 rounded-lg overflow-hidden border">
                                                                    {personaImageUrl ? (
                                                                        <img
                                                                            src={personaImageUrl}
                                                                            alt={persona.name}
                                                                            className="w-full h-full object-contain bg-muted/10"
                                                                        />
                                                                    ) : (
                                                                        <div className="w-full h-full bg-muted/30 flex items-center justify-center">
                                                                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                                                        </div>
                                                                    )}
                                                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-white">
                                                                        <p className="font-semibold text-sm">{persona.name}</p>
                                                                        <p className="text-xs opacity-90">{persona.occupation}</p>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="h-32 rounded-lg border-2 border-dashed bg-muted/20 flex items-center justify-center">
                                                                    <div className="text-center">
                                                                        <UserCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                                                                        <p className="text-xs text-muted-foreground">No persona yet</p>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Audience Details */}
                                                            <div className="space-y-2 text-xs">
                                                                <div className="flex items-center gap-1 text-muted-foreground">
                                                                    <Zap className="w-3 h-3" />
                                                                    <span className="font-medium">Hook:</span>
                                                                </div>
                                                                <p className="italic text-foreground/80 line-clamp-2">
                                                                    "{audience.hook_concept}"
                                                                </p>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {selectedAudienceForImages && (
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                            {/* Configuration Panel */}
                                            <div className="space-y-6">

                                                {/* Selected Audience Info */}
                                                <Card className="bg-primary/5 border-primary/20">
                                                    <CardHeader>
                                                        <CardTitle className="text-base">Selected Audience</CardTitle>
                                                    </CardHeader>
                                                    <CardContent className="space-y-3">
                                                        {(() => {
                                                            const selectedAudience = audiences.find(a => a.name === selectedAudienceForImages);
                                                            const selectedPersonaData = personas[selectedAudienceForImages];
                                                            const selectedPersona = selectedPersonaData?.profile;
                                                            return selectedAudience ? (
                                                                <>
                                                                    <div>
                                                                        <h4 className="font-semibold text-sm">{selectedAudience.name}</h4>
                                                                        <p className="text-xs text-muted-foreground mt-1">{selectedAudience.description}</p>
                                                                    </div>
                                                                    {selectedPersona && (
                                                                        <div className="pt-2 border-t">
                                                                            <p className="text-xs font-medium text-muted-foreground mb-1">Persona:</p>
                                                                            <p className="text-sm font-semibold">{selectedPersona.name}</p>
                                                                            <p className="text-xs text-muted-foreground">{selectedPersona.occupation}</p>
                                                                        </div>
                                                                    )}
                                                                </>
                                                            ) : null;
                                                        })()}
                                                    </CardContent>
                                                </Card>

                                                {/* Product Multi-Selector */}
                                                <Card>
                                                    <CardHeader>
                                                        <CardTitle>Products</CardTitle>
                                                        <CardDescription>Select products to feature in images</CardDescription>
                                                    </CardHeader>
                                                    <CardContent className="space-y-4">
                                                        {isWooCommerceLoading ? (
                                                            <div className="flex items-center justify-center py-8">
                                                                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                                            </div>
                                                        ) : !isWooCommerceConnected ? (
                                                            <div className="text-center py-8 space-y-2">
                                                                <p className="text-sm text-muted-foreground">WooCommerce is not connected</p>
                                                                <p className="text-xs text-muted-foreground">Connect your WooCommerce store in Settings → Integrations to sync products</p>
                                                            </div>
                                                        ) : isLoadingProducts ? (
                                                            <div className="flex items-center justify-center py-8">
                                                                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                                            </div>
                                                        ) : products.length === 0 ? (
                                                            <div className="text-center py-8 space-y-2">
                                                                <p className="text-sm text-muted-foreground">No products found</p>
                                                                <p className="text-xs text-muted-foreground">Make sure your WooCommerce store has products</p>
                                                            </div>
                                                        ) : (
                                                            <>
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
                                                            </>
                                                        )}
                                                    </CardContent>
                                                </Card>

                                                {/* Image Type Selector */}
                                                <Card>
                                                    <CardHeader>
                                                        <CardTitle>Image Types</CardTitle>
                                                        <CardDescription>Select types of images to generate</CardDescription>
                                                    </CardHeader>
                                                    <CardContent className="space-y-4">
                                                        <div className="space-y-2">
                                                            {(['product_only', 'product_persona', 'ugc_style'] as ImageType[]).map((type) => (
                                                                <div key={type} className="flex items-center space-x-2">
                                                                    <Checkbox
                                                                        id={type}
                                                                        checked={imageTypes.includes(type)}
                                                                        onCheckedChange={() => toggleImageType(type)}
                                                                    />
                                                                    <Label htmlFor={type} className="cursor-pointer">
                                                                        {type === 'product_only' ? 'Product Only' :
                                                                            type === 'product_persona' ? 'Product + Persona' :
                                                                                'UGC Style'}
                                                                    </Label>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </CardContent>
                                                </Card>

                                                {/* Generate Buttons */}
                                                <Card>
                                                    <CardHeader>
                                                        <CardTitle>Generate Images</CardTitle>
                                                        <CardDescription>Test with a single image or generate full batch (10-15 images)</CardDescription>
                                                    </CardHeader>
                                                    <CardContent className="space-y-3">
                                                        <Button
                                                            onClick={handleTestSingleImage}
                                                            disabled={isGeneratingImages || !selectedAudienceForImages || selectedProducts.length === 0 || imageTypes.length === 0}
                                                            variant="outline"
                                                            className="w-full"
                                                            size="lg"
                                                        >
                                                            {isGeneratingImages ? (
                                                                <>
                                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                                    <span className="animate-pulse">Testing...</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Zap className="mr-2 h-4 w-4" />
                                                                    Test Single Image
                                                                </>
                                                            )}
                                                        </Button>
                                                        <Button
                                                            onClick={handleGenerateImages}
                                                            disabled={isGeneratingImages || !selectedAudienceForImages || selectedProducts.length === 0 || imageTypes.length === 0}
                                                            className="w-full"
                                                            size="lg"
                                                        >
                                                            {isGeneratingImages ? (
                                                                <>
                                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                                    <span className="animate-pulse">Generating...</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Sparkles className="mr-2 h-4 w-4" />
                                                                    Generate All Images (10-15)
                                                                </>
                                                            )}
                                                        </Button>
                                                        {currentJob?.status && (
                                                            <div className="mt-4 space-y-4">
                                                                <div className="flex items-center justify-between text-sm">
                                                                    <span>Status:</span>
                                                                    <Badge variant={currentJob.status.status === 'completed' ? 'default' : currentJob.status.status === 'failed' ? 'destructive' : 'secondary'}>
                                                                        {currentJob.status.status}
                                                                    </Badge>
                                                                </div>
                                                                {currentJob.status.progress && (
                                                                    <div className="space-y-3 p-4 bg-muted/50 rounded-lg border">
                                                                        {/* Main Step Display */}
                                                                        <div className="flex items-start gap-3">
                                                                            <div className="mt-0.5">
                                                                                {currentJob.status.status === 'processing' ? (
                                                                                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                                                                ) : currentJob.status.status === 'completed' ? (
                                                                                    <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center">
                                                                                        <span className="text-white text-xs">✓</span>
                                                                                    </div>
                                                                                ) : (
                                                                                    <AlertCircle className="h-5 w-5 text-destructive" />
                                                                                )}
                                                                            </div>
                                                                            <div className="flex-1 space-y-1">
                                                                                <div className="flex items-center justify-between">
                                                                                    <p className="font-medium text-sm">
                                                                                        {currentJob.status.progress.current_step || 'Generating images...'}
                                                                                    </p>
                                                                                    <span className="text-xs text-muted-foreground font-mono">
                                                                                        {currentJob.status.progress.current} / {currentJob.status.progress.total}
                                                                                    </span>
                                                                                </div>
                                                                                {currentJob.status.progress.details && (
                                                                                    <p className="text-xs text-muted-foreground animate-pulse">
                                                                                        {currentJob.status.progress.details}
                                                                                    </p>
                                                                                )}
                                                                            </div>
                                                                        </div>

                                                                        {/* Progress Bar */}
                                                                        <div className="w-full bg-secondary rounded-full h-2.5 overflow-hidden">
                                                                            <div
                                                                                className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-700 ease-out rounded-full relative"
                                                                                style={{
                                                                                    width: `${Math.min(100, (currentJob.status.progress.current / currentJob.status.progress.total) * 100)}%`
                                                                                }}
                                                                            >
                                                                                <div className="absolute inset-0 bg-white/20 animate-pulse" />
                                                                            </div>
                                                                        </div>

                                                                        {/* Step Indicators */}
                                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                                            <div className="flex items-center gap-1">
                                                                                <BookOpen className="h-3 w-3" />
                                                                                <span>Playbook</span>
                                                                            </div>
                                                                            <span>→</span>
                                                                            <div className="flex items-center gap-1">
                                                                                <UserCircle className="h-3 w-3" />
                                                                                <span>Persona</span>
                                                                            </div>
                                                                            <span>→</span>
                                                                            <div className="flex items-center gap-1">
                                                                                <BrainCircuit className="h-3 w-3" />
                                                                                <span>AI Generation</span>
                                                                            </div>
                                                                            <span>→</span>
                                                                            <div className="flex items-center gap-1">
                                                                                <Target className="h-3 w-3" />
                                                                                <span>Validation</span>
                                                                            </div>
                                                                            <span>→</span>
                                                                            <div className="flex items-center gap-1">
                                                                                <Zap className="h-3 w-3" />
                                                                                <span>Enhancement</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
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
                                                        {isGeneratingImages ? (
                                                            <div className="flex flex-col items-center justify-center py-24 space-y-6 text-center animate-in fade-in zoom-in duration-300">
                                                                <div className="relative">
                                                                    <div className="absolute inset-0 rounded-full blur-xl bg-primary/20 animate-pulse" />
                                                                    <Loader2 className="w-16 h-16 animate-spin text-primary relative z-10" />
                                                                </div>
                                                                <div className="space-y-2 max-w-sm">
                                                                    <h3 className="text-xl font-semibold tracking-tight">Creating Asset</h3>
                                                                    <p className="text-muted-foreground animate-pulse font-medium">
                                                                        {loadingProgress || "Processing..."}
                                                                    </p>
                                                                    <p className="text-xs text-muted-foreground/60">
                                                                        AI is analyzing your product and generating a photorealistic scene.
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        ) : generatedImages.length === 0 ? (
                                                            <div className="text-center py-12 text-muted-foreground">
                                                                <ImageIcon className="mx-auto h-12 w-12 mb-4 opacity-50" />
                                                                <p>No images generated yet</p>
                                                                <p className="text-sm mt-2">Select an audience and products to get started</p>
                                                            </div>
                                                        ) : (
                                                            <div className="grid grid-cols-2 gap-4">
                                                                {generatedImages.map((image: any) => (
                                                                    <div
                                                                        key={image.id}
                                                                        className="space-y-2 group cursor-pointer relative"
                                                                        onClick={() => setExpandedImage({
                                                                            url: image.storage_url,
                                                                            path: image.storage_path,
                                                                            bucket: image.storage_bucket
                                                                        })}
                                                                    >
                                                                        <div className="relative overflow-hidden rounded-lg">
                                                                            <SignedImage
                                                                                storageUrl={image.storage_url}
                                                                                storagePath={image.storage_path}
                                                                                storageBucket={image.storage_bucket || 'generated-assets'}
                                                                                // Using built-in hook for signed URL
                                                                                signedUrl={undefined}
                                                                                alt="Generated"
                                                                                className="w-full aspect-square object-cover transition-transform duration-500 group-hover:scale-105"
                                                                                fallbackSrc="/placeholder-image.png"
                                                                            />
                                                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 z-10">
                                                                                <Button
                                                                                    size="icon"
                                                                                    variant="secondary"
                                                                                    className="rounded-full shadow-lg hover:bg-white"
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        setExpandedImage({
                                                                                            url: image.storage_url,
                                                                                            path: image.storage_path,
                                                                                            bucket: image.storage_bucket
                                                                                        });
                                                                                    }}
                                                                                >
                                                                                    <Maximize2 className="w-4 h-4" />
                                                                                </Button>
                                                                                <Button
                                                                                    size="sm"
                                                                                    variant="secondary"
                                                                                    className="rounded-full shadow-lg hover:bg-white gap-2 px-3"
                                                                                    onClick={async (e) => {
                                                                                        e.stopPropagation();
                                                                                        // Mock implementation for now to avoid breaking changes without full context
                                                                                        // In real implementation: call handleRepairImage(image)
                                                                                        alert("Text Repair feature coming soon!");
                                                                                    }}
                                                                                >
                                                                                    <Wand className="w-3 h-3" />
                                                                                    <span className="text-xs font-medium">Fix Text</span>
                                                                                </Button>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex flex-col gap-2 p-2">
                                                                            <div className="flex flex-wrap gap-1">
                                                                                <Badge variant="secondary" className="text-[10px] px-1 h-5">
                                                                                    {products.find(p => p.id === image.product_ids?.[0])?.name || 'Unknown Product'}
                                                                                </Badge>
                                                                                <Badge variant="outline" className="text-[10px] px-1 h-5">
                                                                                    {selectedAudienceForImages}
                                                                                </Badge>
                                                                            </div>
                                                                            <div className="flex items-center justify-between text-xs">
                                                                                <Badge variant="default" className="text-[10px] px-1 h-5">{image.image_type.replace('_', ' ')}</Badge>
                                                                                <span className="text-muted-foreground text-[10px]">Right-click to download</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </CardContent>
                                                </Card>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </TabsContent >

                    {/* --- IMAGE ADS TAB --- */}
                    < TabsContent value="image-ads" className="flex-1 mt-6 overflow-hidden" >
                        <div className="h-full overflow-y-auto pr-4 pb-20 space-y-8">
                            {/* Background Setup Progress (Step 1 runs automatically) */}
                            {adSetupProgress.isRunning && (
                                <Card className="border-primary/20 bg-primary/5">
                                    <CardContent className="py-8">
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-3">
                                                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                                <div className="flex-1">
                                                    <h3 className="font-semibold text-lg">Setting up Ad Intelligence...</h3>
                                                    <p className="text-sm text-muted-foreground mt-1">
                                                        {adSetupProgress.currentStep}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Progress Bar */}
                                            <div className="w-full bg-secondary rounded-full h-2.5 overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-700 ease-out rounded-full relative"
                                                    style={{
                                                        width: `${Math.min(100, (adSetupProgress.stepNumber / adSetupProgress.totalSteps) * 100)}%`
                                                    }}
                                                >
                                                    <div className="absolute inset-0 bg-white/20 animate-pulse" />
                                                </div>
                                            </div>

                                            {/* Step Indicators */}
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
                                                <div className={`flex items-center gap-1 ${adSetupProgress.stepNumber >= 1 ? 'text-primary' : ''}`}>
                                                    <div className={`w-2 h-2 rounded-full ${adSetupProgress.stepNumber >= 1 ? 'bg-primary' : 'bg-muted'}`} />
                                                    <span>Scanning Ads</span>
                                                </div>
                                                <span>→</span>
                                                <div className={`flex items-center gap-1 ${adSetupProgress.stepNumber >= 2 ? 'text-primary' : ''}`}>
                                                    <div className={`w-2 h-2 rounded-full ${adSetupProgress.stepNumber >= 2 ? 'bg-primary' : 'bg-muted'}`} />
                                                    <span>Generating Guidelines</span>
                                                </div>
                                                <span>→</span>
                                                <div className={`flex items-center gap-1 ${adSetupProgress.stepNumber >= 3 ? 'text-primary' : ''}`}>
                                                    <div className={`w-2 h-2 rounded-full ${adSetupProgress.stepNumber >= 3 ? 'bg-primary' : 'bg-muted'}`} />
                                                    <span>Ready</span>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Step 1: Visual Guidelines & Templates */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                                        1
                                    </div>
                                    <h2 className="text-xl font-semibold">Visual Guidelines & Templates</h2>
                                </div>

                                {/* Visual Guidelines Section */}
                                <div className="space-y-4">
                                    <VisualGuidelinesSection
                                        projectId={currentProject?.id || ''}
                                        onGuidelinesGenerated={(guideline) => {
                                            setGuidelines([guideline]);
                                        }}
                                        onGuidelinesLoaded={(guidelines) => {
                                            setGuidelines(guidelines);
                                        }}
                                    />
                                </div>

                                {/* Templates Section */}
                                <div className="space-y-4 mt-6">
                                    <TemplatesSection
                                        projectId={currentProject?.id || ''}
                                        guidelines={guidelines}
                                        onTemplateSelect={(template) => {
                                            // Could open template editor or preview
                                        }}
                                        onTemplatesUpdated={(templates) => {
                                            setTemplates(templates);
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Step 2: Generated Ads */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                                        2
                                    </div>
                                    <h2 className="text-xl font-semibold">Ads</h2>
                                </div>
                                <GeneratedAdsSection
                                    projectId={currentProject?.id || ''}
                                    templates={templates}
                                    audiences={audienceSegments}
                                    products={products}
                                />
                            </div>
                        </div>
                    </TabsContent >


                </Tabs >

                {/* --- IMAGE PREVIEW LIGHTBOX --- */}
                <Dialog open={!!expandedImage} onOpenChange={(open) => !open && setExpandedImage(null)}>
                    <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 overflow-hidden bg-black/90 border-none outline-none">
                        {expandedImage && (
                            <div className="relative w-full h-full flex items-center justify-center min-h-[50vh]">
                                <SignedImage
                                    storageUrl={expandedImage.url}
                                    storagePath={expandedImage.path}
                                    storageBucket={expandedImage.bucket || 'generated-assets'}
                                    signedUrl={undefined}
                                    alt="Expanded Preview"
                                    className="max-w-full max-h-[85vh] object-contain"
                                    fallbackSrc="/placeholder-image.png"
                                />
                                <Button
                                    variant="ghost"
                                    className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-full p-2"
                                    onClick={() => setExpandedImage(null)}
                                >
                                    <div className="sr-only">Close</div>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                                </Button>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div >
        </Shell >
    );
}
