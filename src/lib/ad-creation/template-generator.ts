/**
 * Template Generator
 * 
 * Converts visual guidelines into executable ad templates with defined zones,
 * text areas, image areas, and style rules.
 */

import { VisualGuideline, AdTemplate } from '@/types/models';

export interface TemplateConfig {
  name: string;
  type: 'static_image' | 'carousel' | 'video_thumbnail';
  platform: 'meta' | 'google' | 'tiktok' | 'instagram' | 'facebook';
}

/**
 * Generate an ad template from visual guidelines
 */
export async function generateTemplateFromGuideline(
  guideline: VisualGuideline,
  templateConfig: TemplateConfig
): Promise<Omit<AdTemplate, 'id' | 'created_at' | 'updated_at'>> {
  const marketPatterns = guideline.guideline_json.market_patterns;
  const brandAlignment = guideline.brand_alignment_json;

  // Platform-specific dimensions
  const platformDimensions = getPlatformDimensions(templateConfig.platform, templateConfig.type);

  // Generate layout based on guidelines
  const layout = generateLayout(marketPatterns, brandAlignment, templateConfig, platformDimensions);

  // Generate style rules from guidelines and brand
  const styleRules = generateStyleRules(marketPatterns, brandAlignment, guideline);

  return {
    project_id: guideline.project_id,
    guideline_id: guideline.id,
    name: templateConfig.name,
    template_type: templateConfig.type,
    platform: templateConfig.platform,
    layout_json: layout,
    style_rules_json: styleRules
  };
}

/**
 * Generate layout structure from guidelines
 */
function generateLayout(
  marketPatterns: any,
  brandAlignment: any,
  config: TemplateConfig,
  dimensions: { width: number; height: number }
): AdTemplate['layout_json'] {
  const { width, height } = dimensions;

  // Determine image placement from guidelines (with brand overrides)
  const imagePlacement = brandAlignment.overrides?.image_placement || marketPatterns.image_placement || 'center';

  // Determine CTA position
  const ctaPosition = brandAlignment.overrides?.cta_position || marketPatterns.cta_position || 'bottom';

  // Calculate zones based on placement
  const imageZones = calculateImageZones(imagePlacement, width, height, config.type);
  const textZones = calculateTextZones(marketPatterns, brandAlignment, width, height, ctaPosition);
  const safeAreas = calculateSafeAreas(config.platform, width, height);

  return {
    image_zones: imageZones,
    text_zones: textZones,
    cta_position: ctaPosition,
    safe_areas: safeAreas
  };
}

/**
 * Calculate image zones based on placement
 */
function calculateImageZones(
  placement: string,
  width: number,
  height: number,
  type: string
): Array<{ id: string; position: string; dimensions: string; aspect_ratio?: string }> {
  const zones: Array<{ id: string; position: string; dimensions: string; aspect_ratio?: string }> = [];

  if (type === 'carousel') {
    // Carousel: multiple image zones
    for (let i = 0; i < 3; i++) {
      zones.push({
        id: `image-zone-${i + 1}`,
        position: 'center',
        dimensions: `${width}x${height}`,
        aspect_ratio: `${width}:${height}`
      });
    }
  } else {
    // Single image zone
    let position = 'center';
    let dimensions = `${width}x${height}`;

    switch (placement) {
      case 'left':
        position = 'left';
        dimensions = `${Math.floor(width * 0.6)}x${height}`;
        break;
      case 'right':
        position = 'right';
        dimensions = `${Math.floor(width * 0.6)}x${height}`;
        break;
      case 'center':
      default:
        position = 'center';
        dimensions = `${width}x${height}`;
        break;
    }

    zones.push({
      id: 'image-zone-1',
      position,
      dimensions,
      aspect_ratio: `${width}:${height}`
    });
  }

  return zones;
}

/**
 * Calculate text zones based on hierarchy and guidelines
 */
function calculateTextZones(
  marketPatterns: any,
  brandAlignment: any,
  width: number,
  height: number,
  ctaPosition: string
): Array<{ id: string; type: 'headline' | 'body' | 'cta'; max_chars: number; position: string; font_size?: string }> {
  const zones: Array<{ id: string; type: 'headline' | 'body' | 'cta'; max_chars: number; position: string; font_size?: string }> = [];

  const textHierarchy = marketPatterns.text_hierarchy || 'headline_first';

  // Headline zone
  if (textHierarchy === 'headline_first') {
    zones.push({
      id: 'headline-zone',
      type: 'headline',
      max_chars: 40, // Platform-optimized
      position: 'top',
      font_size: 'large'
    });
  }

  // Body text zone
  zones.push({
    id: 'body-zone',
    type: 'body',
    max_chars: 125, // Platform-optimized
    position: textHierarchy === 'headline_first' ? 'middle' : 'top',
    font_size: 'medium'
  });

  // CTA zone
  let ctaPositionValue = 'bottom';
  if (ctaPosition === 'center') {
    ctaPositionValue = 'center';
  } else if (ctaPosition === 'overlay') {
    ctaPositionValue = 'overlay-bottom';
  }

  zones.push({
    id: 'cta-zone',
    type: 'cta',
    max_chars: 20,
    position: ctaPositionValue,
    font_size: 'medium'
  });

  return zones;
}

/**
 * Calculate safe areas for platform requirements
 */
function calculateSafeAreas(
  platform: string,
  width: number,
  height: number
): { top: number; bottom: number; left: number; right: number } {
  // Platform-specific safe area requirements
  const safeAreaPercent = {
    meta: 0.05, // 5% safe area
    instagram: 0.05,
    facebook: 0.05,
    google: 0.08, // 8% for Google
    tiktok: 0.10 // 10% for TikTok (more restrictive)
  };

  const percent = safeAreaPercent[platform] || 0.05;

  return {
    top: Math.floor(height * percent),
    bottom: Math.floor(height * percent),
    left: Math.floor(width * percent),
    right: Math.floor(width * percent)
  };
}

/**
 * Generate style rules from guidelines
 */
function generateStyleRules(
  marketPatterns: any,
  brandAlignment: any,
  guideline: VisualGuideline
): AdTemplate['style_rules_json'] {
  // Use brand colors if available, otherwise market colors
  const colors = brandAlignment.overrides?.colors 
    ? extractBrandColors(guideline)
    : marketPatterns.dominant_colors || [];

  // Font hierarchy (simplified - can be enhanced with brand typography)
  const fontHierarchy = {
    headline: {
      family: 'sans-serif',
      weight: 'bold',
      size: 'large'
    },
    body: {
      family: 'sans-serif',
      weight: 'normal',
      size: 'medium'
    },
    cta: {
      family: 'sans-serif',
      weight: 'bold',
      size: 'medium'
    }
  };

  // Spacing rules based on visual density
  const density = marketPatterns.visual_density || 'moderate';
  const spacingRules = {
    minimal: {
      padding: 'large',
      gap: 'large',
      margin: 'large'
    },
    moderate: {
      padding: 'medium',
      gap: 'medium',
      margin: 'medium'
    },
    busy: {
      padding: 'small',
      gap: 'small',
      margin: 'small'
    }
  };

  return {
    color_palette: colors,
    font_hierarchy: fontHierarchy,
    spacing_rules: spacingRules[density] || spacingRules.moderate
  };
}

/**
 * Extract brand colors from guideline
 */
function extractBrandColors(guideline: VisualGuideline): string[] {
  // This would ideally come from brand identity, but for now use guideline data
  // In practice, this should read from project.brand_identity.visual.colors
  const brandColors = guideline.brand_alignment_json.overrides?.colors;
  if (brandColors && Array.isArray(brandColors)) {
    return brandColors;
  }
  // Fallback to market colors
  return guideline.guideline_json.market_patterns.dominant_colors || [];
}

/**
 * Get platform-specific dimensions
 */
function getPlatformDimensions(
  platform: string,
  type: string
): { width: number; height: number } {
  // Standard ad dimensions by platform and type
  const dimensions: Record<string, Record<string, { width: number; height: number }>> = {
    meta: {
      static_image: { width: 1200, height: 628 }, // Facebook/Instagram feed
      carousel: { width: 1080, height: 1080 }, // Square carousel
      video_thumbnail: { width: 1200, height: 675 } // 16:9 video
    },
    instagram: {
      static_image: { width: 1080, height: 1080 }, // Square
      carousel: { width: 1080, height: 1080 },
      video_thumbnail: { width: 1080, height: 1920 } // Stories format
    },
    facebook: {
      static_image: { width: 1200, height: 628 },
      carousel: { width: 1080, height: 1080 },
      video_thumbnail: { width: 1200, height: 675 }
    },
    google: {
      static_image: { width: 1200, height: 628 },
      carousel: { width: 1080, height: 1080 },
      video_thumbnail: { width: 1200, height: 675 }
    },
    tiktok: {
      static_image: { width: 1080, height: 1920 }, // Vertical
      carousel: { width: 1080, height: 1920 },
      video_thumbnail: { width: 1080, height: 1920 }
    }
  };

  return dimensions[platform]?.[type] || { width: 1200, height: 628 }; // Default fallback
}
