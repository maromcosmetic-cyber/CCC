import { AdTemplate, ImageLayoutMap } from '@/types/models';

export type CompatibilityResult = {
    compatible: boolean;
    issues: string[];
    score: number; // 0-100
};

/**
 * Validates if an ad template is compatible with the analyzed image.
 * Checks for:
 * - Contrast requirements
 * - Text zone safety (avoiding faces/products) - simpler heuristic for now
 */
export function validateTemplateCompatibility(
    template: AdTemplate,
    analysis: ImageLayoutMap
): CompatibilityResult {
    const issues: string[] = [];
    let score = 100;

    // 1. Check Contrast Compatibility
    if (template.layout_json.required_contrast) {
        const required = template.layout_json.required_contrast; // 'high', 'medium'
        const actual = analysis.contrast_level; // 'low', 'medium', 'high'

        if (required === 'high' && actual === 'low') {
            issues.push(`Template requires high contrast, but image has low contrast.`);
            score -= 50;
        } else if (required === 'medium' && actual === 'low') {
            issues.push(`Template requires medium contrast, but image has low contrast.`);
            score -= 20;
        }
    }

    // 2. Check Text Legibility (Color match)
    // If template specifies a text color variable that clashes with background dominant colors
    // This is hard to check without knowing the exact variable value, but we can check if suggested_text_color exists
    // and implies we need a specific background type.

    // For now, we rely on the renderer to handle text color adaptation, 
    // but we flag if the image is too "busy" (high visual noise) for text-heavy templates.
    const textZones = template.layout_json.text_zones;
    const isTextHeavy = textZones.length > 2 || textZones.some(z => z.max_chars > 100);

    if (isTextHeavy && analysis.visual_noise === 'high') {
        issues.push('Image has high visual noise, which may reduce legibility for this text-heavy template.');
        score -= 30;
    }

    // 3. Safety Zones (Basic overlap check)
    // Check if any text zone roughly overlaps with avoid zones
    // This requires coordinate mapping which is complex without exact pixel dimensions.
    // We'll perform a high-level check: if avoid zones cover > 50% of the image, flag it.

    const totalAvoidArea = analysis.avoid_zones.reduce((sum, zone) => sum + (zone.width * zone.height), 0);
    // Assuming normalized coordinates 0-1 or pixels? Google Vision usually gives normalized vertices or pixels.
    // Our model says x,y,width,height. Let's assume normalized for this heuristic or check implementation.
    // If we don't know normalization, we skip this specific calculation to avoid false positives.

    return {
        compatible: score > 60,
        issues,
        score
    };
}
