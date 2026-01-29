
import { ImageCompositor } from '../src/lib/product-image/compositing/ImageCompositor';

async function testCompositor() {
    console.log('🧪 Testing ImageCompositor...');

    // 1x1 Red Pixel PNG (Base64)
    const redPixel = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKwM+AAAAABJRU5ErkJggg==";

    // 1x1 Blue Pixel PNG (Base64) 
    const bluePixel = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

    const compositor = new ImageCompositor();

    try {
        console.log('👉 Attempting composition with CLEAN Base64 strings...');
        const result = await compositor.compositeProduct(redPixel, bluePixel, {
            productSizePercent: 0.5,
            targetWidth: 500, // Force a size for visibility if needed, though 1x1 might be small
        });
        console.log('✅ Composition Successful!');
        console.log('Result length:', result.length);
    } catch (error) {
        console.error('❌ Composition Failed:', error);
    }

    // Test with Data URI prefix
    try {
        console.log('👉 Attempting composition with Data URI Prefixes...');
        const bg = `data:image/png;base64,${redPixel}`;
        const prod = `data:image/png;base64,${bluePixel}`;

        const result = await compositor.compositeProduct(bg, prod);
        console.log('✅ Data URI Composition Successful!');
    } catch (error) {
        console.error('❌ Data URI Composition Failed:', error);
    }
}

testCompositor();
