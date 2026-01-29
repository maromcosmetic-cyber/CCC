import { GeneratedAd, AdTemplate } from '@/types/models';

export type QAResult = {
    passed: boolean;
    checks: Record<string, boolean>;
    issues: string[];
};

export class AdQA {
    /**
     * Run automated QA on the generated ad
     */
    async validate(ad: GeneratedAd, template: AdTemplate): Promise<QAResult> {
        const issues: string[] = [];
        const checks: Record<string, boolean> = {
            text_length: true,
            banned_words: true,
            assets_integrity: true,
            brand_compliance: true // Placeholder
        };

        // 1. Text Length Checks (Redundant safety net)
        const { headline, body_copy, cta, hook } = ad.assets_json;
        const headlineZone = template.layout_json.text_zones.find(z => z.type === 'headline');
        const bodyZone = template.layout_json.text_zones.find(z => z.type === 'body');
        const hookZone = template.layout_json.text_zones.find(z => z.type === 'hook');

        if (headline && headlineZone && headline.length > headlineZone.max_chars) {
            checks.text_length = false;
            issues.push(`Headline exceeds limit (${headline.length}/${headlineZone.max_chars})`);
        }

        if (body_copy && bodyZone && body_copy.length > bodyZone.max_chars) {
            checks.text_length = false;
            issues.push(`Body exceeds limit (${body_copy.length}/${bodyZone.max_chars})`);
        }

        if (hook && hookZone && hook.length > hookZone.max_chars) {
            checks.text_length = false;
            issues.push(`Hook exceeds limit (${hook.length}/${hookZone.max_chars})`);
        }

        // 2. Banned Words (Basic)
        const bannedWords = ['placeholder', 'lorem ipsum', '[insert]', 'undefined', 'null'];
        const allText = `${headline} ${body_copy} ${cta} ${hook || ''}`.toLowerCase();

        if (bannedWords.some(word => allText.includes(word))) {
            checks.banned_words = false;
            issues.push('Ad contains placeholder or forbidden text.');
        }

        // 3. Asset Integrity
        if (!ad.assets_json.image_url) {
            checks.assets_integrity = false;
            issues.push('Missing campaign image URL.');
        }

        const passed = Object.values(checks).every(v => v);

        return {
            passed,
            checks,
            issues
        };
    }
}
