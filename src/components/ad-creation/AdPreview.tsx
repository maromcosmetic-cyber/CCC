'use client';

import { Card, CardContent } from '@/components/ui/card';
import { AdTemplate } from '@/types/models';
import { SignedImage } from '@/components/ui/signed-image';

interface AdPreviewProps {
  template: AdTemplate;
  imageUrl?: string;
  imagePath?: string;
  imageBucket?: string;
  headline?: string;
  bodyCopy?: string;
  hook?: string;
  cta?: string;
  brandColors?: string[];
}

export function AdPreview({
  template,
  imageUrl,
  imagePath,
  imageBucket,
  headline = 'Your Headline Here',
  bodyCopy = 'Your body copy will appear here. This is where you describe your product or service.',
  hook = 'Stop Scrolling! This is a hook.',
  cta = 'Learn More',
  brandColors = ['#000000', '#FFFFFF']
}: AdPreviewProps) {
  const layout = template.layout_json;
  const styleRules = template.style_rules_json || {};

  // Get platform dimensions
  const dimensions = layout.image_zones?.[0]?.dimensions || '1200x628';
  const [width, height] = dimensions.split('x').map(Number);
  const aspectRatio = width / height;

  // Get colors from style rules or use defaults
  const styleRulesAny = styleRules as any;
  const primaryColor = styleRulesAny.color_palette?.primary || brandColors[0] || '#000000';
  const backgroundColor = styleRulesAny.color_palette?.background || brandColors[1] || '#FFFFFF';
  const textColor = styleRulesAny.color_palette?.text || '#000000';

  // Get font hierarchy
  const headlineFont = styleRulesAny.font_hierarchy?.headline || { size: 32, weight: 'bold' };
  const bodyFont = styleRulesAny.font_hierarchy?.body || { size: 16, weight: 'normal' };
  const ctaFont = styleRulesAny.font_hierarchy?.cta || { size: 18, weight: 'semibold' };

  // Get spacing
  const spacing = styleRulesAny.spacing || { padding: 20, gap: 16 };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div
          className="relative bg-white"
          style={{
            aspectRatio: aspectRatio,
            backgroundColor: backgroundColor,
            padding: `${spacing.padding}px`
          }}
        >
          {/* Image Zone */}
          {layout.image_zones?.[0] && (
            <div
              className="relative overflow-hidden rounded-lg"
              style={{
                position: (layout.image_zones[0] as any).position || 'relative',
                width: (layout.image_zones[0] as any).width || '100%',
                height: (layout.image_zones[0] as any).height || '60%',
                marginBottom: `${spacing.gap}px`
              }}
            >
              {imageUrl || (imagePath && imageBucket) ? (
                <SignedImage
                  storageUrl={imageUrl}
                  storagePath={imagePath}
                  storageBucket={imageBucket}
                  alt="Ad preview"
                  className="w-full h-full object-cover"
                  fallbackSrc="/placeholder-image.png"
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <span className="text-muted-foreground text-sm">Select an image</span>
                </div>
              )}
            </div>
          )}

          {/* Text Zones */}
          <div
            className="space-y-2"
            style={{ gap: `${spacing.gap}px` }}
          >
            {/* Hook */}
            {layout.text_zones?.find((z: any) => z.type === 'hook') && (
              <div
                style={{
                  color: textColor,
                  fontSize: `${(bodyFont?.size || 16) + 2}px`,
                  fontWeight: 'bold',
                  lineHeight: 1.2,
                  marginBottom: '4px'
                }}
              >
                {hook}
              </div>
            )}

            {/* Headline */}
            {layout.text_zones?.find((z: any) => z.type === 'headline') && (
              <div
                style={{
                  color: textColor,
                  fontSize: `${headlineFont.size}px`,
                  fontWeight: headlineFont.weight,
                  lineHeight: 1.2
                }}
              >
                {headline}
              </div>
            )}

            {/* Body Copy */}
            {layout.text_zones?.find((z: any) => z.type === 'body') && (
              <div
                style={{
                  color: textColor,
                  fontSize: `${bodyFont.size}px`,
                  fontWeight: bodyFont.weight,
                  lineHeight: 1.5,
                  opacity: 0.8
                }}
              >
                {bodyCopy}
              </div>
            )}

            {/* CTA Button */}
            {layout.text_zones?.find((z: any) => z.type === 'cta') && (
              <div
                className="inline-block rounded-md px-6 py-2 text-white"
                style={{
                  backgroundColor: primaryColor,
                  fontSize: `${ctaFont.size}px`,
                  fontWeight: ctaFont.weight,
                  marginTop: `${spacing.gap}px`
                }}
              >
                {cta}
              </div>
            )}
          </div>

          {/* Platform Badge */}
          <div className="absolute top-2 right-2">
            <span className="text-xs bg-black/50 text-white px-2 py-1 rounded">
              {template.platform}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
