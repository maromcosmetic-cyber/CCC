/**
 * Competitor Continuous Monitoring System
 * Tracks changes over time and alerts on significant shifts
 */

import { CompetitorAnalysis } from './analyzer';

export interface ChangeDetection {
    pricing_changes: Array<{
        field: string;
        old_value: any;
        new_value: any;
        detected_at: string;
        significance: 'minor' | 'moderate' | 'major';
    }>;
    messaging_shifts: Array<{
        field: string;
        old_value: string;
        new_value: string;
        detected_at: string;
    }>;
    new_products: Array<{
        name: string;
        detected_at: string;
    }>;
    new_claims: Array<{
        claim: string;
        detected_at: string;
        risk_level: string;
    }>;
    design_changes: Array<{
        change_type: string;
        description: string;
        detected_at: string;
    }>;
}

export interface AlertTrigger {
    type: 'price_drop' | 'new_product' | 'messaging_shift' | 'risk_claim' | 'positioning_change';
    threshold: number | string;
    current_value: any;
    triggered: boolean;
    triggered_at?: string;
}

/**
 * Compare two analyses and detect changes
 */
export function detectChanges(
    previousAnalysis: CompetitorAnalysis | null,
    currentAnalysis: CompetitorAnalysis
): ChangeDetection {
    if (!previousAnalysis) {
        return {
            pricing_changes: [],
            messaging_shifts: [],
            new_products: [],
            new_claims: [],
            design_changes: []
        };
    }

    const changes: ChangeDetection = {
        pricing_changes: [],
        messaging_shifts: [],
        new_products: [],
        new_claims: [],
        design_changes: []
    };

    // Detect pricing changes
    if (previousAnalysis.offer_structure_pricing.price_positioning !== currentAnalysis.offer_structure_pricing.price_positioning) {
        changes.pricing_changes.push({
            field: 'price_positioning',
            old_value: previousAnalysis.offer_structure_pricing.price_positioning,
            new_value: currentAnalysis.offer_structure_pricing.price_positioning,
            detected_at: new Date().toISOString(),
            significance: 'major'
        });
    }

    // Detect messaging shifts
    if (previousAnalysis.brand_positioning_extraction.homepage_headline !== currentAnalysis.brand_positioning_extraction.homepage_headline) {
        changes.messaging_shifts.push({
            field: 'homepage_headline',
            old_value: previousAnalysis.brand_positioning_extraction.homepage_headline,
            new_value: currentAnalysis.brand_positioning_extraction.homepage_headline,
            detected_at: new Date().toISOString()
        });
    }

    if (previousAnalysis.brand_positioning_extraction.core_promise !== currentAnalysis.brand_positioning_extraction.core_promise) {
        changes.messaging_shifts.push({
            field: 'core_promise',
            old_value: previousAnalysis.brand_positioning_extraction.core_promise,
            new_value: currentAnalysis.brand_positioning_extraction.core_promise,
            detected_at: new Date().toISOString()
        });
    }

    // Detect new products (simplified - would need more sophisticated comparison)
    const oldProducts = previousAnalysis.product_feature_mapping.unique_features || [];
    const newProducts = currentAnalysis.product_feature_mapping.unique_features || [];
    const addedProducts = newProducts.filter(p => !oldProducts.includes(p));
    addedProducts.forEach(product => {
        changes.new_products.push({
            name: product,
            detected_at: new Date().toISOString()
        });
    });

    // Detect new claims
    const oldClaims = previousAnalysis.claims_promises_analysis.bold_claims || [];
    const newClaims = currentAnalysis.claims_promises_analysis.bold_claims || [];
    const addedClaims = newClaims.filter(c => !oldClaims.includes(c));
    addedClaims.forEach(claim => {
        changes.new_claims.push({
            claim,
            detected_at: new Date().toISOString(),
            risk_level: currentAnalysis.claims_promises_analysis.risk_assessment.regulatory_exposure
        });
    });

    // Detect design changes
    if (previousAnalysis.visual_identity_aesthetic.color_palette?.join(',') !== currentAnalysis.visual_identity_aesthetic.color_palette?.join(',')) {
        changes.design_changes.push({
            change_type: 'color_palette',
            description: 'Brand colors updated',
            detected_at: new Date().toISOString()
        });
    }

    if (previousAnalysis.visual_identity_aesthetic.mood !== currentAnalysis.visual_identity_aesthetic.mood) {
        changes.design_changes.push({
            change_type: 'mood',
            description: `Mood shifted from ${previousAnalysis.visual_identity_aesthetic.mood} to ${currentAnalysis.visual_identity_aesthetic.mood}`,
            detected_at: new Date().toISOString()
        });
    }

    return changes;
}

/**
 * Evaluate alert triggers
 */
export function evaluateAlertTriggers(
    analysis: CompetitorAnalysis,
    previousAnalysis: CompetitorAnalysis | null
): AlertTrigger[] {
    const alerts: AlertTrigger[] = [];

    // Price drop alert
    if (previousAnalysis) {
        const priceWentDown = 
            previousAnalysis.offer_structure_pricing.price_positioning === 'premium' &&
            analysis.offer_structure_pricing.price_positioning === 'mid-market';
        
        alerts.push({
            type: 'price_drop',
            threshold: 'premium to mid-market',
            current_value: analysis.offer_structure_pricing.price_positioning,
            triggered: priceWentDown,
            triggered_at: priceWentDown ? new Date().toISOString() : undefined
        });
    }

    // High-risk claim alert
    const hasHighRiskClaims = analysis.claims_promises_analysis.risk_assessment.regulatory_exposure === 'high';
    alerts.push({
        type: 'risk_claim',
        threshold: 'high',
        current_value: analysis.claims_promises_analysis.risk_assessment.risky_claims,
        triggered: hasHighRiskClaims,
        triggered_at: hasHighRiskClaims ? new Date().toISOString() : undefined
    });

    // Threat level alert
    const highThreat = analysis.competitor_identification.threat_level >= 8;
    alerts.push({
        type: 'positioning_change',
        threshold: 8,
        current_value: analysis.competitor_identification.threat_level,
        triggered: highThreat,
        triggered_at: highThreat ? new Date().toISOString() : undefined
    });

    return alerts;
}

/**
 * Calculate monitoring schedule (days until next scan)
 */
export function calculateNextScanDate(
    threatLevel: number,
    priorityToMonitor: 'high' | 'medium' | 'low'
): Date {
    let daysUntilNextScan = 30; // Default

    if (priorityToMonitor === 'high' || threatLevel >= 8) {
        daysUntilNextScan = 7; // Weekly
    } else if (priorityToMonitor === 'medium' || threatLevel >= 5) {
        daysUntilNextScan = 14; // Biweekly
    } else {
        daysUntilNextScan = 30; // Monthly
    }

    const nextScan = new Date();
    nextScan.setDate(nextScan.getDate() + daysUntilNextScan);
    return nextScan;
}

/**
 * Generate monitoring summary
 */
export function generateMonitoringSummary(
    changes: ChangeDetection,
    alerts: AlertTrigger[]
): string {
    const triggeredAlerts = alerts.filter(a => a.triggered);
    const totalChanges = 
        changes.pricing_changes.length +
        changes.messaging_shifts.length +
        changes.new_products.length +
        changes.new_claims.length +
        changes.design_changes.length;

    if (totalChanges === 0 && triggeredAlerts.length === 0) {
        return 'No significant changes detected.';
    }

    let summary = `${totalChanges} changes detected:\n`;
    
    if (changes.pricing_changes.length > 0) {
        summary += `\n- ${changes.pricing_changes.length} pricing changes`;
    }
    if (changes.messaging_shifts.length > 0) {
        summary += `\n- ${changes.messaging_shifts.length} messaging updates`;
    }
    if (changes.new_products.length > 0) {
        summary += `\n- ${changes.new_products.length} new products`;
    }
    if (changes.new_claims.length > 0) {
        summary += `\n- ${changes.new_claims.length} new claims`;
    }
    if (changes.design_changes.length > 0) {
        summary += `\n- ${changes.design_changes.length} design updates`;
    }

    if (triggeredAlerts.length > 0) {
        summary += `\n\n⚠️ ${triggeredAlerts.length} alerts triggered`;
    }

    return summary;
}

