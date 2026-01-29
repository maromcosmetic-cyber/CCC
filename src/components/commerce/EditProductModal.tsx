'use client';

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ImagePlus } from "lucide-react";
import { MediaSelector } from "./MediaSelector";

interface Product {
    id: number;
    name: string;
    description?: string;
    regular_price: string;
    images?: { src: string }[];
    meta_data?: { id: number; key: string; value: string }[];
}

interface EditProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: Product | null;
    projectId: string;
    onSuccess: () => void;
}

export function EditProductModal({ isOpen, onClose, product, projectId, onSuccess }: EditProductModalProps) {
    const [name, setName] = useState('');
    const [nameHe, setNameHe] = useState('');
    const [description, setDescription] = useState('');
    const [descriptionHe, setDescriptionHe] = useState('');
    const [shortDescription, setShortDescription] = useState('');
    const [shortDescriptionHe, setShortDescriptionHe] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [priceThb, setPriceThb] = useState('');
    const [priceIls, setPriceIls] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isMediaSelectorOpen, setIsMediaSelectorOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (product) {
            setName(product.name || '');
            setDescription(product.description || '');
            setPriceThb(product.regular_price || '');

            // Try to get short_description from product object first (if API returns it)
            // or fall back to meta_data for backward compatibility if logic was different
            setShortDescription((product as any).short_description || '');

            if (product.images && product.images.length > 0) {
                setImageUrl(product.images[0].src || '');
            } else {
                setImageUrl('');
            }

            const ilsMeta = product.meta_data?.find(m => m.key === 'price_ils');
            setPriceIls(ilsMeta?.value || '');

            const heNameMeta = product.meta_data?.find(m => m.key === 'name_he');
            setNameHe(heNameMeta?.value || '');

            const heDescMeta = product.meta_data?.find(m => m.key === 'description_he');
            setDescriptionHe(heDescMeta?.value || '');

            // Try to find Hebrew short description in meta_data or product property
            const heShortDescMeta = product.meta_data?.find(m => m.key === 'short_description_he');
            setShortDescriptionHe(heShortDescMeta?.value || (product as any).short_description_he || '');
        }
    }, [product]);

    const handleSave = async () => {
        if (!product) return;

        setIsSaving(true);
        setError(null);

        try {
            const response = await fetch(`/api/projects/${projectId}/commerce/products/${product.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    description,
                    short_description: shortDescription,
                    regular_price: priceThb,
                    images: imageUrl ? [{ src: imageUrl }] : [],
                    meta_data: [
                        { key: 'price_ils', value: priceIls },
                        { key: 'name_he', value: nameHe },
                        { key: 'description_he', value: descriptionHe },
                        { key: 'short_description_he', value: shortDescriptionHe }
                    ]
                })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to update product');
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error(err);
            setError(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Product</DialogTitle>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                    {/* Basic Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Product Name (English)</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Product name in English"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="name_he">Product Name (Hebrew)</Label>
                            <Input
                                id="name_he"
                                value={nameHe}
                                onChange={(e) => setNameHe(e.target.value)}
                                placeholder="שם מוצר בעברית"
                                dir="rtl"
                            />
                        </div>
                    </div>

                    {/* Quick View / Short Description */}
                    <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-md border border-gray-100">
                        <div className="col-span-2 mb-1">
                            <h4 className="text-sm font-semibold text-gray-700">Quick View / Short Description</h4>
                            <p className="text-xs text-gray-500">This text appears in the "Quick View" sidebar and on product cards.</p>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="short_description">Quick View Text (English)</Label>
                            <Textarea
                                id="short_description"
                                value={shortDescription}
                                onChange={(e) => setShortDescription(e.target.value)}
                                placeholder="Short summary for quick view..."
                                className="h-24"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="short_description_he">Quick View Text (Hebrew)</Label>
                            <Textarea
                                id="short_description_he"
                                value={shortDescriptionHe}
                                onChange={(e) => setShortDescriptionHe(e.target.value)}
                                placeholder="תקציר לתצוגה מהירה..."
                                className="h-24"
                                dir="rtl"
                            />
                        </div>
                    </div>

                    {/* Full Description */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="description">Full Description (English)</Label>
                            <Textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Full product description..."
                                className="h-32"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="description_he">Full Description (Hebrew)</Label>
                            <Textarea
                                id="description_he"
                                value={descriptionHe}
                                onChange={(e) => setDescriptionHe(e.target.value)}
                                placeholder="תיאור מלא..."
                                className="h-32"
                                dir="rtl"
                            />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="image">Image URL</Label>
                        <div className="flex gap-2">
                            <Input
                                id="image"
                                value={imageUrl}
                                onChange={(e) => setImageUrl(e.target.value)}
                                placeholder="https://example.com/image.jpg"
                            />
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => setIsMediaSelectorOpen(true)}
                            >
                                <ImagePlus className="w-4 h-4 mr-2" />
                                Select/Upload
                            </Button>
                        </div>
                        {imageUrl && (
                            <div className="mt-2 relative w-full h-40 bg-gray-100 rounded-md overflow-hidden flex items-center justify-center border">
                                <img
                                    src={imageUrl}
                                    alt="Preview"
                                    className="max-w-full max-h-full object-contain"
                                    onError={(e) => (e.currentTarget.style.display = 'none')}
                                />
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="price_thb">Price (THB)</Label>
                            <Input
                                id="price_thb"
                                value={priceThb}
                                onChange={(e) => setPriceThb(e.target.value)}
                                placeholder="0.00"
                                type="number"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="price_ils">Price (ILS)</Label>
                            <Input
                                id="price_ils"
                                value={priceIls}
                                onChange={(e) => setPriceIls(e.target.value)}
                                placeholder="0.00"
                                type="number"
                            />
                        </div>
                    </div>
                    {error && (
                        <p className="text-sm text-red-500 font-medium">{error}</p>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isSaving}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
            <MediaSelector
                isOpen={isMediaSelectorOpen}
                onClose={() => setIsMediaSelectorOpen(false)}
                projectId={projectId}
                onSelect={(url) => setImageUrl(url)}
            />
        </Dialog>
    );
}
