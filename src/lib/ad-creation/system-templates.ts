import { AdTemplate } from '@/types/models';

export const SYSTEM_TEMPLATES: Record<string, AdTemplate> = {
    meta_clean_overlay: {
        id: 'meta_clean_overlay',
        project_id: 'system',
        name: 'Meta Clean Overlay',
        platform: 'Meta',
        layout_json: {
            image_zones: [
                {
                    id: 'main_image',
                    position: 'absolute',
                    dimensions: '1200x628',
                    width: '100%',
                    height: '100%'
                }
            ],
            text_zones: [
                {
                    id: 'headline',
                    type: 'headline',
                    max_chars: 40,
                    position: { x: 50, y: 50 }, // Conceptual
                },
                {
                    id: 'body',
                    type: 'body',
                    max_chars: 90,
                    position: { x: 50, y: 70 },
                },
                {
                    id: 'hook',
                    type: 'hook',
                    max_chars: 30,
                    position: { x: 50, y: 30 }
                }
            ],
            required_contrast: 'high'
        },
        style_rules_json: {
            font_hierarchy: {
                headline: { size: 48, weight: 'bold' },
                body: { size: 24, weight: 'normal' },
                cta: { size: 18, weight: 'bold' }
            }
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    meta_bottom_banner: {
        id: 'meta_bottom_banner',
        project_id: 'system',
        name: 'Meta Bottom Banner',
        platform: 'Meta',
        layout_json: {
            image_zones: [
                {
                    id: 'main_image',
                    position: 'absolute',
                    dimensions: '1200x500', // Top part
                    width: '100%',
                    height: '80%'
                }
            ],
            text_zones: [
                {
                    id: 'headline',
                    type: 'headline',
                    max_chars: 50,
                },
                {
                    id: 'cta',
                    type: 'cta',
                    max_chars: 20,
                }
            ],
            required_contrast: 'low' // Text is on banner, so image contrast doesn't matter as much
        },
        style_rules_json: {
            font_hierarchy: {
                headline: { size: 42, weight: 'bold' },
                body: { size: 20, weight: 'normal' },
                cta: { size: 18, weight: 'semibold' }
            }
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    meta_minimal_headline: {
        id: 'meta_minimal_headline',
        project_id: 'system',
        name: 'Meta Minimal Headline',
        platform: 'Meta',
        layout_json: {
            image_zones: [
                {
                    id: 'main_image',
                    position: 'absolute',
                    dimensions: '1200x628',
                    width: '100%',
                    height: '100%'
                }
            ],
            text_zones: [
                {
                    id: 'headline',
                    type: 'headline',
                    max_chars: 25, // Very short
                },
                {
                    id: 'cta',
                    type: 'cta',
                    max_chars: 15,
                }
            ],
            required_contrast: 'medium'
        },
        style_rules_json: {
            font_hierarchy: {
                headline: { size: 60, weight: 'black' },
                body: { size: 0, weight: 'normal' }, // No body
                cta: { size: 20, weight: 'bold' }
            }
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    }
};
