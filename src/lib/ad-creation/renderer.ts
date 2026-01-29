import { GeneratedAd } from '@/types/models';
import puppeteer from 'puppeteer';

export class AdRenderer {
    /**
     * Renders an ad to an image string (base64 or URL)
     */
    async render(ad: GeneratedAd): Promise<string> {
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        try {
            const page = await browser.newPage();

            // select dimensions
            const [width, height] = ad.metadata_json.dimensions?.split('x').map(Number) || [1200, 628];
            await page.setViewport({ width, height });

            // Generate HTML from assets (Mock implementation for template assembly)
            // In a real scenario, this would load the actual React component or HTML template string
            // injecting the assets.
            const htmlContent = this.generateHtml(ad);

            await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

            // Screenshot
            const screenshot = await page.screenshot({
                type: 'jpeg',
                quality: 90,
                encoding: 'base64'
            });

            return `data:image/jpeg;base64,${screenshot}`;

        } catch (error) {
            console.error('Rendering failed:', error);
            throw error;
        } finally {
            await browser.close();
        }
    }

    private generateHtml(ad: GeneratedAd): string {
        // This is a basic HTML generator. 
        // Ideally, we'd use a server-side React render or a robust template engine.
        const { assets_json } = ad;

        return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { margin: 0; padding: 0; font-family: 'Inter', sans-serif; }
          .container { 
            position: relative; 
            width: 100vw; 
            height: 100vh; 
            overflow: hidden;
            background: #f0f0f0;
          }
          .bg-image {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
          .overlay {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            background: linear-gradient(transparent, rgba(0,0,0,0.8));
            padding: 40px;
            color: white;
            display: flex;
            flex-direction: column;
            gap: 16px;
          }
          h1 { margin: 0; font-size: 48px; line-height: 1.1; }
          p { margin: 0; font-size: 24px; opacity: 0.9; }
          .cta {
            background: white;
            color: black;
            padding: 12px 24px;
            width: fit-content;
            font-weight: bold;
            border-radius: 4px;
            margin-top: 16px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <img src="${assets_json.image_url}" class="bg-image" />
          <div class="overlay">
            <h1>${assets_json.headline}</h1>
            <p>${assets_json.body_copy}</p>
            <div class="cta">${assets_json.cta}</div>
          </div>
        </div>
      </body>
      </html>
    `;
    }
}
