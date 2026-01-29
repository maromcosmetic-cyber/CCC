
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

export interface CompositingOptions {
    productSizePercent?: number; // Target height as % of background height (default: 0.25)
    verticalPosition?: 'center' | 'bottom' | 'tabletop'; // Default: tabletop (lower third)
    horizontalPosition?: 'center' | 'left' | 'right'; // fallback if no exact coords
    x?: number; // Exact X position (overrides alignment)
    y?: number; // Exact Y position (overrides alignment)
    targetRegion?: { top: number; left: number; width: number; height: number }; // Normalized 0-1 region to place product
    shadow?: boolean; // Generate drop shadow?
}

export class ImageCompositor {
    /**
     * compositeProduct
     * Layers a transparent product image onto a background image.
     * 
     * @param backgroundBase64 Base64 string of background
     * @param productBase64 Base64 string of isolated product (MUST have transparency)
     * @param options Configuration for placement
     */
    async compositeProduct(
        backgroundBase64: string,
        productBase64: string,
        options: CompositingOptions = {}
    ): Promise<{ image: string; overlay: string }> {
        try {
            // Decode inputs (robustly handle data URIs)
            if (!backgroundBase64 || !productBase64) {
                throw new Error('Missing background or product image data');
            }

            // Log start of strings for debugging
            console.log('Compositor Input BG (start):', backgroundBase64.substring(0, 50));
            console.log('Compositor Input Product (start):', productBase64.substring(0, 50));

            const cleanBg = backgroundBase64.replace(/^data:image\/\w+;base64,/, '');
            const cleanProd = productBase64.replace(/^data:image\/\w+;base64,/, '');

            const bgBuffer = Buffer.from(cleanBg, 'base64');
            const productBuffer = Buffer.from(cleanProd, 'base64');

            // Log magic bytes to identify format
            const bgHex = bgBuffer.subarray(0, 8).toString('hex');
            const prodHex = productBuffer.subarray(0, 8).toString('hex');

            console.log('BG Buffer Head (Hex):', bgHex);
            console.log('Product Buffer Head (Hex):', prodHex);

            // Check for HTML garbage (starts with '<' -> 3c)
            if (bgHex.startsWith('3c') || prodHex.startsWith('3c')) {
                throw new Error('Input image buffer contains HTML/XML (probably an error page), not an image.');
            }

            console.log(`Buffers created. BG: ${bgBuffer.length} bytes, Prod: ${productBuffer.length} bytes`);

            // Step A: Read Metadata
            let bgMeta, productMeta;
            try {
                bgMeta = await sharp(bgBuffer).metadata();
            } catch (e: any) { throw new Error(`Failed to read BG metadata: ${e.message}`); }

            try {
                productMeta = await sharp(productBuffer).metadata();
            } catch (e: any) { throw new Error(`Failed to read Product metadata: ${e.message}`); }

            if (!bgMeta.width || !bgMeta.height || !productMeta.width || !productMeta.height) {
                throw new Error('Failed to read image metadata (dimensions missing)');
            }

            // 1. Resize Product
            const sizePercent = options.productSizePercent || 0.25;
            const targetHeight = Math.max(1, Math.round(bgMeta.height * sizePercent));

            let resizedProduct;
            try {
                resizedProduct = await sharp(productBuffer)
                    .resize({
                        height: targetHeight,
                        fit: 'contain',
                        background: { r: 0, g: 0, b: 0, alpha: 0 }
                    })
                    .png() // Force PNG output
                    .toBuffer();
            } catch (e: any) { throw new Error(`Failed to resize product: ${e.message}`); }

            // Get new dimensions
            const resizedMeta = await sharp(resizedProduct).metadata();
            const pWidth = resizedMeta.width || 0;
            const pHeight = resizedMeta.height || 0;

            // 2. Calculate Position
            // Default x: Center
            let x = Math.round((bgMeta.width - pWidth) / 2);
            let y = 0;

            if (options.targetRegion) {
                // Smart Composition Mode
                const region = options.targetRegion;
                // Center of the target region in pixels
                const regionCenterX = (region.left + region.width / 2) * bgMeta.width;
                const regionCenterY = (region.top + region.height / 2) * bgMeta.height;

                // Place product center at region center
                x = Math.round(regionCenterX - pWidth / 2);
                y = Math.round(regionCenterY - pHeight / 2);

            } else {
                // X Override
                if (options.x !== undefined) {
                    x = options.x;
                } else if (options.horizontalPosition === 'left') {
                    x = Math.round(bgMeta.width * 0.1);
                } else if (options.horizontalPosition === 'right') {
                    x = Math.round(bgMeta.width * 0.9 - pWidth);
                }

                // Y Override
                if (options.y !== undefined) {
                    y = options.y;
                } else if (options.verticalPosition === 'center') {
                    y = Math.round((bgMeta.height - pHeight) / 2);
                } else if (options.verticalPosition === 'bottom') {
                    y = bgMeta.height - pHeight - 50;
                } else {
                    // Tabletop (default)
                    y = Math.round(bgMeta.height * 0.75 - (pHeight * 0.9));
                }
            }

            // 3. (Optional) Generate Shadow
            let compositeLayers = [];

            if (options.shadow) {
                try {
                    // Generate REALISTIC Contact Shadow based on product shape
                    // 1. Extract alpha channel from product
                    // 2. Tint it black
                    // 3. Flatten it vertically (scale Y) to project it onto surface
                    // 4. Blur it

                    // Create shadow from the resized product itself
                    // Fix: Use correct alpha extraction to create shaped shadow (no black box)
                    const alphaChannel = await sharp(resizedProduct)
                        .extractChannel(3)
                        .toBuffer();

                    const shadowBase = await sharp({
                        create: {
                            width: pWidth,
                            height: pHeight,
                            channels: 3,
                            background: { r: 0, g: 0, b: 0 } // Solid black RGB
                        }
                    })
                        .joinChannel(alphaChannel) // Apply product alpha
                        .png()
                        .toBuffer();

                    const finalShadow = await sharp(shadowBase)
                        .resize({
                            width: pWidth,
                            height: Math.round(pHeight * 0.3), // Flatten to 30% height
                            fit: 'fill'
                        })
                        .blur(8) // Soft blur for contact shadow
                        .toBuffer();

                    compositeLayers.push({
                        input: finalShadow,
                        top: y + pHeight - Math.round(pHeight * 0.15), // Position at feet
                        left: x, // Center alignment
                    });

                } catch (e: any) {
                    console.warn('Shadow generation failed (skipping):', e.message);
                }
            }

            // Add Product Layer
            compositeLayers.push({
                input: resizedProduct,
                top: y,
                left: x,
            });

            // 4. Composite Final Image
            let resultBuffer;
            try {
                resultBuffer = await sharp(bgBuffer)
                    .composite(compositeLayers)
                    .png()
                    .toBuffer();
            } catch (e: any) { throw new Error(`Final composition failed: ${e.message}`); }

            // 5. Generate Overlay Layer (Product Only on Transparent Canvas)
            // We need a canvas of the SAME dimensions as the background, with the product at the SAME position.
            let overlayBuffer;
            try {
                // Create transparent canvas matching background dimensions
                overlayBuffer = await sharp({
                    create: {
                        width: bgMeta.width,
                        height: bgMeta.height,
                        channels: 4,
                        background: { r: 0, g: 0, b: 0, alpha: 0 }
                    }
                })
                    .composite([{
                        input: resizedProduct,
                        top: y,
                        left: x,
                    }])
                    .png()
                    .toBuffer();
            } catch (e: any) { throw new Error(`Overlay generation failed: ${e.message}`); }

            // 6. Apply Cinematic Grade (Simulated LUT)
            console.log('🎨 Applying cinematic grade...');
            let finalOutputBuffer = await this.applyCinematicGrade(resultBuffer);

            // 7. Apply Window Shadow / Light Leak Overlay (Final Polish)
            // MOVED: Now applied manually in generator to ensure it acts as final layer after relighting
            // finalOutputBuffer = await this.applyWindowShadow(finalOutputBuffer);

            return {
                image: finalOutputBuffer.toString('base64'),
                overlay: overlayBuffer.toString('base64')
            };

        } catch (error: any) {
            console.error('ImageCompositor error:', error);
            // Re-throw with headers for debugging if available
            const bgHeader = backgroundBase64 ? Buffer.from(backgroundBase64.substring(0, 20), 'base64').subarray(0, 4).toString('hex') : 'null';
            const prodHeader = productBase64 ? Buffer.from(productBase64.substring(0, 20), 'base64').subarray(0, 4).toString('hex') : 'null';

            throw new Error(`Compositing failed: ${error.message} (BG:${bgHeader}, PROD:${prodHeader})`);
        }
    }

    /**
     * Applies a cinematic color grade to unify layers
     * Simulates a LUT using Sharp primitives
     */
    private async applyCinematicGrade(inputBuffer: Buffer): Promise<Buffer> {
        try {
            const metadata = await sharp(inputBuffer).metadata();
            const width = metadata.width || 1024;
            const height = metadata.height || 1024;

            // 1. Create a "Look" overlay (Warm/Rich)
            // 5-10% opacity warm orange overlay to unify color temperature
            const overlayColor = { r: 255, g: 240, b: 220, alpha: 0.1 };

            const tintLayer = await sharp({
                create: {
                    width,
                    height,
                    channels: 4,
                    background: overlayColor
                }
            })
                .png()
                .toBuffer();

            // 2. Apply adjustments
            return await sharp(inputBuffer)
                // A. Blend the tint
                .composite([{
                    input: tintLayer,
                    blend: 'overlay'
                }])
                // B. Global Color Grading (Simulated LUT)
                .modulate({
                    brightness: 1.0,
                    saturation: 1.15, // Boost saturation for richness
                    // hue: 0,
                    // lightness: 0
                })
                // C. S-Curve Contrast (via linear adjustments? Sharp modulate is limited)
                // A simple brightness/saturation boost is often enough for "pop"
                // .sharpen() // Optional: crispness
                .png()
                .toBuffer();

        } catch (error) {
            console.warn('Cinematic grading failed, returning original:', error);
            return inputBuffer;
        }
    }

    /**
     * Applies a window shadow / light leak overlay if available
     * Public to allow application as final post-process step
     */
    public async applyWindowShadow(inputBuffer: Buffer): Promise<Buffer> {
        try {
            const overlayPath = path.join(process.cwd(), 'public', 'overlays', 'window-shadow.jpg');

            if (!fs.existsSync(overlayPath)) {
                // Silently skip if file doesn't exist (user needs to provide it)
                return inputBuffer;
            }

            console.log('🪟 Applying window shadow overlay...');
            const metadata = await sharp(inputBuffer).metadata();
            const width = metadata.width || 1024;
            const height = metadata.height || 1024;

            // Load and resize the shadow overlay
            const shadowBuffer = await sharp(overlayPath)
                .resize(width, height, { fit: 'cover' })
                .png()
                .toBuffer();

            return await sharp(inputBuffer)
                .composite([{
                    input: shadowBuffer,
                    blend: 'multiply', // Using MULTIPLY for better shadow integration
                }])
                .png()
                .toBuffer();

        } catch (error) {
            console.warn('Window shadow overlay failed:', error);
            return inputBuffer;
        }
    }
    /**
     * Generates a contact shadow for the product
     */
    public async generateContactShadow(productBuffer: Buffer, width: number, height: number): Promise<Buffer> {
        const alphaChannel = await sharp(productBuffer)
            .extractChannel(3)
            .toBuffer();

        const shadowBase = await sharp({
            create: {
                width: width,
                height: height,
                channels: 3,
                background: { r: 0, g: 0, b: 0 }
            }
        })
            .joinChannel(alphaChannel)
            .png()
            .toBuffer();

        return await sharp(shadowBase)
            .resize({
                width: width,
                height: Math.round(height * 0.3),
                fit: 'fill'
            })
            .blur(15) // Increased blur
            .toBuffer();
    }
}
