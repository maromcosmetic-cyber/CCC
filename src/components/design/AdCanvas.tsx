
"use client";

import { useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric'; // v6 import style or 'fabric' depending on version installed. Assuming v6 or v5.
// If v5, import { fabric } from 'fabric'. If v6, import * as fabric. 
// Use 'fabric' default export if possible for compatibility.
// Actually 'npm install fabric' installs v6 by default now.
import { Button } from '@/components/ui/button';
import { Download, Type, Image as ImageIcon } from 'lucide-react';

interface AdLayer {
    type: 'text' | 'image';
    content: string; // text content or image url
    options?: any;
}

interface AdCanvasProps {
    width?: number;
    height?: number;
    backgroundImage?: string;
    initialLayers?: AdLayer[];
    onExport?: (dataUrl: string) => void;
}

export default function AdCanvas({
    width = 1080,
    height = 1080,
    backgroundImage,
    initialLayers = [],
    onExport
}: AdCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fabricRef = useRef<any>(null); // Use any to avoid complex typing for now
    const [isReady, setIsReady] = useState(false);

    // Initialize Canvas
    useEffect(() => {
        if (!canvasRef.current) return;

        // Initialize Fabric
        // In v6, it's new fabric.Canvas(...). In v5, fabric.Canvas.
        // We'll perform a dynamic import or assuming standard global if needed, but import should work.
        // To be safe with SSR, we do this in useEffect.

        const initCanvas = async () => {
            // Dynamic import to avoid SSR issues
            const fabricModule = await import('fabric');
            const fabric = (fabricModule as any).fabric || fabricModule;

            const canvas = new fabric.Canvas(canvasRef.current, {
                width,
                height,
                backgroundColor: '#f3f4f6',
            });

            fabricRef.current = canvas;
            setIsReady(true);
        };

        if (!fabricRef.current) {
            initCanvas();
        }

        return () => {
            if (fabricRef.current) {
                fabricRef.current.dispose();
                fabricRef.current = null;
            }
        };
    }, []);

    // Handle Background Image Change
    useEffect(() => {
        if (!fabricRef.current || !backgroundImage) return;

        // Load Image
        const canvas = fabricRef.current;
        import('fabric').then((mod) => {
            const fabric = (mod as any).fabric || mod;
            fabric.Image.fromURL(backgroundImage, (img: any) => {
                if (!img) return;
                // Scale to cover
                const scaleX = width / img.width!;
                const scaleY = height / img.height!;
                const scale = Math.max(scaleX, scaleY);

                img.set({
                    scaleX: scale,
                    scaleY: scale,
                    originX: 'center',
                    originY: 'center',
                    left: width / 2,
                    top: height / 2
                });

                canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));
            }, { crossOrigin: 'anonymous' });
        });
    }, [backgroundImage, isReady, width, height]);

    // Handle Initial Layers
    useEffect(() => {
        if (!fabricRef.current || !isReady || initialLayers.length === 0) return;

        import('fabric').then((mod) => {
            const fabric = (mod as any).fabric || mod;
            const canvas = fabricRef.current;

            initialLayers.forEach(layer => {
                if (layer.type === 'text') {
                    const text = new fabric.Textbox(layer.content, {
                        left: layer.options?.left || width / 2 - 100,
                        top: layer.options?.top || height / 2,
                        width: layer.options?.width || 300,
                        fontSize: layer.options?.fontSize || 40,
                        fill: layer.options?.fill || '#ffffff',
                        textAlign: 'center',
                        fontFamily: 'Inter, sans-serif',
                        shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.5)', blur: 5, offsetX: 2, offsetY: 2 })
                    });
                    canvas.add(text);
                }
            });
            canvas.renderAll();
        });

    }, [initialLayers, isReady]);

    const addText = async () => {
        if (!fabricRef.current) return;
        const mod = await import('fabric');
        const fabric = (mod as any).fabric || mod;

        const text = new fabric.Textbox('New Text', {
            left: width / 2 - 75,
            top: height / 2,
            width: 150,
            fontSize: 32,
            fill: '#000000',
            backgroundColor: '#ffffff'
        });
        fabricRef.current.add(text);
        fabricRef.current.setActiveObject(text);
        fabricRef.current.requestRenderAll();
    };

    const handleDownload = () => {
        if (!fabricRef.current) return;
        const dataUrl = fabricRef.current.toDataURL({
            format: 'png',
            quality: 1,
            multiplier: 1 // Export at 1x resolution (1080p)
        });
        if (onExport) {
            onExport(dataUrl);
        } else {
            const link = document.createElement('a');
            link.download = `ad-export-${Date.now()}.png`;
            link.href = dataUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    return (
        <div className="flex flex-col gap-4 items-center">
            <div className="border rounded-lg shadow-lg overflow-hidden bg-gray-100" style={{ width: 500, height: 500 }}>
                {/* We scale the display down with CSS but internal logic uses w/h */}
                <div style={{ transform: `scale(${500 / width})`, transformOrigin: 'top left', width: width, height: height }}>
                    <canvas ref={canvasRef} width={width} height={height} />
                </div>
            </div>

            <div className="flex gap-2">
                <Button variant="outline" onClick={addText}>
                    <Type className="h-4 w-4 mr-2" />
                    Add Text
                </Button>
                <Button onClick={handleDownload}>
                    <Download className="h-4 w-4 mr-2" />
                    Export Ad
                </Button>
            </div>
        </div>
    );
}
