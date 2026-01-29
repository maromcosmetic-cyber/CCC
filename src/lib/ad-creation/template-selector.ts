import { AdTemplate, ImageLayoutMap, AdCreativeStrategy } from '@/types/models';
import { SYSTEM_TEMPLATES } from './system-templates';

export class TemplateSelector {
    /**
     * Deterministically selects a system template based on Image Analysis and Strategy.
     */
    static selectTemplate(
        analysis: ImageLayoutMap,
        strategy: AdCreativeStrategy
    ): AdTemplate {

        console.log('🤖 Selecting template based on analysis:', {
            noise: analysis.visual_noise,
            contrast: analysis.contrast_level,
            strategy: strategy.angle
        });

        // Rule 1: High Visual Noise -> Bottom Banner
        // If the image is busy, we cannot risk overlaying text.
        if (analysis.visual_noise === 'high') {
            console.log('👉 Selected: Meta Bottom Banner (High Noise)');
            return SYSTEM_TEMPLATES.meta_bottom_banner;
        }

        // Rule 2: Low Noise + High Contrast -> Clean Overlay
        // Ideal for lifestyle images with negative space.
        if (analysis.visual_noise === 'low' && analysis.contrast_level !== 'low') {
            console.log('👉 Selected: Meta Clean Overlay (Clean Image)');
            return SYSTEM_TEMPLATES.meta_clean_overlay;
        }

        // Rule 3: Retargeting/Urgency -> Minimal Headline
        // If strategy is urgent, use punchy large text.
        if (strategy.angle === 'urgency' || strategy.angle === 'offer') {
            console.log('👉 Selected: Meta Minimal Headline (Urgency Strategy)');
            return SYSTEM_TEMPLATES.meta_minimal_headline;
        }

        // Default / Fallback
        // If we're unsure, Minimal is usually safer than Overlaying text on a potentially bad image,
        // BUT Bottom Banner is the safest safe-bet for legibility.
        // Let's go with Bottom Banner as the ultimate fallback if contrast is poor.

        if (analysis.contrast_level === 'low') {
            console.log('👉 Selected: Meta Bottom Banner (Fallback - Low Contrast)');
            return SYSTEM_TEMPLATES.meta_bottom_banner;
        }

        console.log('👉 Selected: Meta Clean Overlay (Default)');
        return SYSTEM_TEMPLATES.meta_clean_overlay;
    }
}
