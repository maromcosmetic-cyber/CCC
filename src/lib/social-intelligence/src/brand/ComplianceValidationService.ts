/**
 * Compliance Validation Service
 * Implements forbidden claims detection using NLP
 * Creates regulatory compliance checking (FDA, FTC, etc.)
 * Validates brand tone and voice consistency
 */

import { SocialEvent, BrandPlaybook } from '../types/core';

export interface ComplianceConfig {
  // NLP settings for claim detection
  nlp: {
    confidenceThreshold: number;
    contextWindowSize: number;
    enableSemanticAnalysis: boolean;
  };
  // Regulatory frameworks to check
  regulations: {
    fda: boolean;
    ftc: boolean;
    eu: boolean;
    custom: string[];
  };
  // Tone analysis settings
  toneAnalysis: {
    strictness: 'low' | 'medium' | 'high';
    checkEmotionalTone: boolean;
    checkFormality: boolean;
    checkAuthority: boolean;
  };
}

export interface ComplianceViolation {
  type: 'forbidden_claim' | 'regulatory' | 'tone_mismatch' | 'missing_disclosure';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  detectedText: string;
  suggestedFix?: string;
  regulatoryFramework?: string;
  confidence: number;
  location: {
    start: number;
    end: number;
  };
}

export interface ComplianceResult {
  isCompliant: boolean;
  overallScore: number; // 0-1, where 1 is fully compliant
  violations: ComplianceViolation[];
  warnings: ComplianceViolation[];
  requiredDisclosures: string[];
  toneAnalysis: {
    matches: boolean;
    score: number;
    issues: string[];
  };
}

export interface ComplianceMetrics {
  totalValidations: number;
  compliantContent: number;
  violationsDetected: number;
  averageComplianceScore: number;
  violationsByType: Record<string, number>;
  violationsBySeverity: Record<string, number>;
  averageProcessingTime: number;
}

export class ComplianceValidationService {
  private config: ComplianceConfig;
  private metrics: ComplianceMetrics;
  
  // Regulatory claim patterns
  private fdaClaims: RegExp[];
  private ftcClaims: RegExp[];
  private euClaims: RegExp[];
  
  // Tone analysis patterns
  private tonePatterns: Map<string, RegExp[]>;

  constructor(config: ComplianceConfig) {
    this.config = config;
    this.metrics = {
      totalValidations: 0,
      compliantContent: 0,
      violationsDetected: 0,
      averageComplianceScore: 0,
      violationsByType: {},
      violationsBySeverity: {},
      averageProcessingTime: 0
    };

    this.initializeRegulatoryPatterns();
    this.initializeTonePatterns();
  }

  /**
   * Validate content compliance against brand playbook
   */
  async validateCompliance(event: SocialEvent, playbook: BrandPlaybook): Promise<ComplianceResult> {
    const startTime = Date.now();
    this.metrics.totalValidations++;

    try {
      const violations: ComplianceViolation[] = [];
      const warnings: ComplianceViolation[] = [];
      const requiredDisclosures: string[] = [];

      // 1. Check forbidden claims
      const forbiddenClaimViolations = this.checkForbiddenClaims(
        event.content.text, 
        playbook.complianceRules.forbiddenClaims
      );
      violations.push(...forbiddenClaimViolations);

      // 2. Check regulatory compliance
      const regulatoryViolations = this.checkRegulatoryCompliance(
        event.content.text,
        playbook.complianceRules.regulatoryCompliance
      );
      violations.push(...regulatoryViolations);

      // 3. Check required disclosures
      const disclosureResults = this.checkRequiredDisclosures(
        event.content.text,
        playbook.complianceRules.requiredDisclosures
      );
      violations.push(...disclosureResults.violations);
      requiredDisclosures.push(...disclosureResults.required);

      // 4. Check content restrictions
      const restrictionViolations = this.checkContentRestrictions(
        event,
        playbook.complianceRules.contentRestrictions
      );
      violations.push(...restrictionViolations);

      // 5. Validate tone and voice consistency
      const toneAnalysis = this.validateToneConsistency(
        event.content.text,
        playbook.voiceAndTone
      );
      
      if (!toneAnalysis.matches) {
        warnings.push({
          type: 'tone_mismatch',
          severity: 'medium',
          description: 'Content tone does not match brand voice guidelines',
          detectedText: event.content.text.substring(0, 100) + '...',
          suggestedFix: `Adjust tone to be more ${playbook.voiceAndTone.primaryTone}`,
          confidence: 1 - toneAnalysis.score,
          location: { start: 0, end: event.content.text.length }
        });
      }

      // Calculate overall compliance score
      const overallScore = this.calculateComplianceScore(violations, warnings, toneAnalysis);
      const isCompliant = violations.length === 0 && overallScore >= 0.8;

      // Update metrics
      this.updateMetrics(violations, warnings, overallScore, Date.now() - startTime);

      return {
        isCompliant,
        overallScore,
        violations,
        warnings,
        requiredDisclosures,
        toneAnalysis
      };

    } catch (error) {
      console.error('Error in compliance validation:', error);
      throw error;
    }
  }

  /**
   * Check for forbidden claims in content
   */
  private checkForbiddenClaims(text: string, forbiddenClaims: string[]): ComplianceViolation[] {
    const violations: ComplianceViolation[] = [];
    const textLower = text.toLowerCase();

    for (const claim of forbiddenClaims) {
      const claimLower = claim.toLowerCase();
      const index = textLower.indexOf(claimLower);
      
      if (index !== -1) {
        violations.push({
          type: 'forbidden_claim',
          severity: 'high',
          description: `Contains forbidden claim: "${claim}"`,
          detectedText: text.substring(Math.max(0, index - 20), index + claim.length + 20),
          suggestedFix: `Remove or rephrase the claim about "${claim}"`,
          confidence: 0.9,
          location: {
            start: index,
            end: index + claim.length
          }
        });
      }

      // Check for semantic variations
      const semanticMatches = this.findSemanticMatches(textLower, claimLower);
      for (const match of semanticMatches) {
        violations.push({
          type: 'forbidden_claim',
          severity: 'medium',
          description: `Potentially contains forbidden claim similar to: "${claim}"`,
          detectedText: match.text,
          suggestedFix: `Review and potentially rephrase content related to "${claim}"`,
          confidence: match.confidence,
          location: match.location
        });
      }
    }

    return violations;
  }

  /**
   * Check regulatory compliance (FDA, FTC, EU)
   */
  private checkRegulatoryCompliance(text: string, frameworks: string[]): ComplianceViolation[] {
    const violations: ComplianceViolation[] = [];

    for (const framework of frameworks) {
      switch (framework.toLowerCase()) {
        case 'fda':
          if (this.config.regulations.fda) {
            violations.push(...this.checkFDACompliance(text));
          }
          break;
        case 'ftc':
          if (this.config.regulations.ftc) {
            violations.push(...this.checkFTCCompliance(text));
          }
          break;
        case 'eu':
          if (this.config.regulations.eu) {
            violations.push(...this.checkEUCompliance(text));
          }
          break;
        default:
          // Custom regulatory framework
          violations.push(...this.checkCustomCompliance(text, framework));
      }
    }

    return violations;
  }

  /**
   * Check FDA compliance
   */
  private checkFDACompliance(text: string): ComplianceViolation[] {
    const violations: ComplianceViolation[] = [];

    for (const pattern of this.fdaClaims) {
      const matches = text.matchAll(new RegExp(pattern, 'gi'));
      
      for (const match of matches) {
        if (match.index !== undefined) {
          violations.push({
            type: 'regulatory',
            severity: 'critical',
            description: 'Content may violate FDA regulations regarding health claims',
            detectedText: match[0],
            regulatoryFramework: 'FDA',
            suggestedFix: 'Remove health claims or add appropriate disclaimers',
            confidence: 0.8,
            location: {
              start: match.index,
              end: match.index + match[0].length
            }
          });
        }
      }
    }

    return violations;
  }

  /**
   * Check FTC compliance
   */
  private checkFTCCompliance(text: string): ComplianceViolation[] {
    const violations: ComplianceViolation[] = [];

    for (const pattern of this.ftcClaims) {
      const matches = text.matchAll(new RegExp(pattern, 'gi'));
      
      for (const match of matches) {
        if (match.index !== undefined) {
          violations.push({
            type: 'regulatory',
            severity: 'high',
            description: 'Content may violate FTC guidelines regarding advertising claims',
            detectedText: match[0],
            regulatoryFramework: 'FTC',
            suggestedFix: 'Substantiate claims with evidence or add disclaimers',
            confidence: 0.75,
            location: {
              start: match.index,
              end: match.index + match[0].length
            }
          });
        }
      }
    }

    return violations;
  }

  /**
   * Check EU compliance
   */
  private checkEUCompliance(text: string): ComplianceViolation[] {
    const violations: ComplianceViolation[] = [];

    for (const pattern of this.euClaims) {
      const matches = text.matchAll(new RegExp(pattern, 'gi'));
      
      for (const match of matches) {
        if (match.index !== undefined) {
          violations.push({
            type: 'regulatory',
            severity: 'high',
            description: 'Content may violate EU regulations regarding product claims',
            detectedText: match[0],
            regulatoryFramework: 'EU',
            suggestedFix: 'Ensure claims comply with EU advertising standards',
            confidence: 0.7,
            location: {
              start: match.index,
              end: match.index + match[0].length
            }
          });
        }
      }
    }

    return violations;
  }

  /**
   * Check custom regulatory compliance
   */
  private checkCustomCompliance(text: string, framework: string): ComplianceViolation[] {
    // Placeholder for custom regulatory frameworks
    // This would be implemented based on specific requirements
    return [];
  }

  /**
   * Check required disclosures
   */
  private checkRequiredDisclosures(
    text: string, 
    disclosures: Array<{ trigger: string; disclosure: string }>
  ): { violations: ComplianceViolation[]; required: string[] } {
    const violations: ComplianceViolation[] = [];
    const required: string[] = [];
    const textLower = text.toLowerCase();

    for (const rule of disclosures) {
      const triggerLower = rule.trigger.toLowerCase();
      
      if (textLower.includes(triggerLower)) {
        const disclosureLower = rule.disclosure.toLowerCase();
        
        if (!textLower.includes(disclosureLower)) {
          violations.push({
            type: 'missing_disclosure',
            severity: 'high',
            description: `Missing required disclosure for "${rule.trigger}"`,
            detectedText: rule.trigger,
            suggestedFix: `Add disclosure: "${rule.disclosure}"`,
            confidence: 0.95,
            location: {
              start: textLower.indexOf(triggerLower),
              end: textLower.indexOf(triggerLower) + triggerLower.length
            }
          });
          
          required.push(rule.disclosure);
        }
      }
    }

    return { violations, required };
  }

  /**
   * Check content restrictions
   */
  private checkContentRestrictions(
    event: SocialEvent, 
    restrictions: Record<string, boolean>
  ): ComplianceViolation[] {
    const violations: ComplianceViolation[] = [];

    // Check various content restrictions
    if (restrictions.noExternalLinks && this.hasExternalLinks(event.content.text)) {
      violations.push({
        type: 'forbidden_claim',
        severity: 'medium',
        description: 'Content contains external links which are restricted',
        detectedText: this.extractLinks(event.content.text).join(', '),
        suggestedFix: 'Remove external links or use approved link shorteners',
        confidence: 1.0,
        location: { start: 0, end: event.content.text.length }
      });
    }

    if (restrictions.noCompetitorMentions && this.hasCompetitorMentions(event.content.text)) {
      violations.push({
        type: 'forbidden_claim',
        severity: 'medium',
        description: 'Content mentions competitors which is restricted',
        detectedText: event.content.text,
        suggestedFix: 'Remove competitor mentions and focus on brand benefits',
        confidence: 0.8,
        location: { start: 0, end: event.content.text.length }
      });
    }

    if (restrictions.requireHashtags && event.content.hashtags.length === 0) {
      violations.push({
        type: 'forbidden_claim',
        severity: 'low',
        description: 'Content requires hashtags but none are present',
        detectedText: event.content.text,
        suggestedFix: 'Add relevant brand hashtags',
        confidence: 1.0,
        location: { start: 0, end: event.content.text.length }
      });
    }

    return violations;
  }

  /**
   * Validate tone and voice consistency
   */
  private validateToneConsistency(
    text: string, 
    voiceAndTone: BrandPlaybook['voiceAndTone']
  ): { matches: boolean; score: number; issues: string[] } {
    const issues: string[] = [];
    let score = 1.0;

    // Check primary tone
    const toneScore = this.analyzeTone(text, voiceAndTone.primaryTone);
    if (toneScore < 0.7) {
      issues.push(`Tone should be more ${voiceAndTone.primaryTone}`);
      score -= 0.3;
    }

    // Check formality level
    if (this.config.toneAnalysis.checkFormality) {
      const formalityScore = this.analyzeFormalityLevel(text, voiceAndTone.attributes.formality);
      if (formalityScore < 0.7) {
        issues.push(`Formality level should match ${voiceAndTone.attributes.formality}`);
        score -= 0.2;
      }
    }

    // Check for "don't use" phrases
    const dontUseViolations = this.checkDontUseViolations(text, voiceAndTone.dontUse);
    if (dontUseViolations.length > 0) {
      issues.push(`Avoid using: ${dontUseViolations.join(', ')}`);
      score -= 0.2 * dontUseViolations.length;
    }

    // Check for "do use" phrases (bonus points)
    const doUseMatches = this.checkDoUseMatches(text, voiceAndTone.doUse);
    if (doUseMatches.length > 0) {
      score += 0.1 * Math.min(doUseMatches.length, 3); // Cap bonus
    }

    score = Math.max(0, Math.min(score, 1));
    
    return {
      matches: score >= 0.7 && issues.length === 0,
      score,
      issues
    };
  }

  /**
   * Analyze tone of text
   */
  private analyzeTone(text: string, expectedTone: string): number {
    const patterns = this.tonePatterns.get(expectedTone.toLowerCase()) || [];
    let matches = 0;

    for (const pattern of patterns) {
      if (pattern.test(text)) {
        matches++;
      }
    }

    return Math.min(matches / Math.max(patterns.length, 1), 1);
  }

  /**
   * Analyze formality level
   */
  private analyzeFormalityLevel(text: string, expectedFormality: string): number {
    const formalIndicators = /\b(therefore|furthermore|consequently|moreover|nevertheless)\b/gi;
    const informalIndicators = /\b(gonna|wanna|yeah|awesome|cool|super)\b/gi;
    const contractions = /\b\w+'\w+\b/g;

    const formalMatches = (text.match(formalIndicators) || []).length;
    const informalMatches = (text.match(informalIndicators) || []).length;
    const contractionMatches = (text.match(contractions) || []).length;

    const formalityScore = (formalMatches - informalMatches - contractionMatches * 0.5) / text.split(' ').length;

    switch (expectedFormality.toLowerCase()) {
      case 'formal':
        return formalityScore > 0 ? 1 : 0.5;
      case 'informal':
        return formalityScore < 0 ? 1 : 0.5;
      case 'moderate':
      default:
        return Math.abs(formalityScore) < 0.1 ? 1 : 0.7;
    }
  }

  /**
   * Check for "don't use" violations
   */
  private checkDontUseViolations(text: string, dontUse: string[]): string[] {
    const violations: string[] = [];
    const textLower = text.toLowerCase();

    for (const phrase of dontUse) {
      if (textLower.includes(phrase.toLowerCase())) {
        violations.push(phrase);
      }
    }

    return violations;
  }

  /**
   * Check for "do use" matches
   */
  private checkDoUseMatches(text: string, doUse: string[]): string[] {
    const matches: string[] = [];
    const textLower = text.toLowerCase();

    for (const phrase of doUse) {
      if (textLower.includes(phrase.toLowerCase())) {
        matches.push(phrase);
      }
    }

    return matches;
  }

  /**
   * Find semantic matches for forbidden claims
   */
  private findSemanticMatches(text: string, claim: string): Array<{
    text: string;
    confidence: number;
    location: { start: number; end: number };
  }> {
    // Simplified semantic matching - in production, this would use NLP models
    const matches: Array<{
      text: string;
      confidence: number;
      location: { start: number; end: number };
    }> = [];

    if (!this.config.nlp.enableSemanticAnalysis) {
      return matches;
    }

    // Simple synonym matching (would be replaced with proper NLP)
    const synonyms = this.getSimpleSynonyms(claim);
    
    for (const synonym of synonyms) {
      const index = text.indexOf(synonym);
      if (index !== -1) {
        matches.push({
          text: synonym,
          confidence: 0.6,
          location: {
            start: index,
            end: index + synonym.length
          }
        });
      }
    }

    return matches;
  }

  /**
   * Get simple synonyms (placeholder for NLP)
   */
  private getSimpleSynonyms(word: string): string[] {
    const synonymMap: Record<string, string[]> = {
      'cure': ['heal', 'fix', 'treat', 'remedy'],
      'guarantee': ['promise', 'ensure', 'assure'],
      'best': ['top', 'greatest', 'finest', 'superior'],
      'miracle': ['magic', 'amazing', 'incredible']
    };

    return synonymMap[word.toLowerCase()] || [];
  }

  /**
   * Check for external links
   */
  private hasExternalLinks(text: string): boolean {
    const linkPattern = /https?:\/\/[^\s]+/gi;
    return linkPattern.test(text);
  }

  /**
   * Extract links from text
   */
  private extractLinks(text: string): string[] {
    const linkPattern = /https?:\/\/[^\s]+/gi;
    return text.match(linkPattern) || [];
  }

  /**
   * Check for competitor mentions
   */
  private hasCompetitorMentions(text: string): boolean {
    // This would be configured with actual competitor names
    const competitors = ['competitor1', 'competitor2', 'other brand'];
    const textLower = text.toLowerCase();
    
    return competitors.some(competitor => textLower.includes(competitor.toLowerCase()));
  }

  /**
   * Calculate overall compliance score
   */
  private calculateComplianceScore(
    violations: ComplianceViolation[], 
    warnings: ComplianceViolation[],
    toneAnalysis: { score: number }
  ): number {
    let score = 1.0;

    // Deduct for violations based on severity
    for (const violation of violations) {
      switch (violation.severity) {
        case 'critical':
          score -= 0.4;
          break;
        case 'high':
          score -= 0.3;
          break;
        case 'medium':
          score -= 0.2;
          break;
        case 'low':
          score -= 0.1;
          break;
      }
    }

    // Deduct for warnings (less severe)
    for (const warning of warnings) {
      switch (warning.severity) {
        case 'high':
          score -= 0.15;
          break;
        case 'medium':
          score -= 0.1;
          break;
        case 'low':
          score -= 0.05;
          break;
      }
    }

    // Factor in tone analysis
    score = score * 0.8 + toneAnalysis.score * 0.2;

    return Math.max(0, Math.min(score, 1));
  }

  /**
   * Update metrics
   */
  private updateMetrics(
    violations: ComplianceViolation[], 
    warnings: ComplianceViolation[], 
    score: number, 
    processingTime: number
  ): void {
    if (violations.length === 0) {
      this.metrics.compliantContent++;
    } else {
      this.metrics.violationsDetected += violations.length;
    }

    // Update violation type breakdown
    for (const violation of [...violations, ...warnings]) {
      this.metrics.violationsByType[violation.type] = 
        (this.metrics.violationsByType[violation.type] || 0) + 1;
      this.metrics.violationsBySeverity[violation.severity] = 
        (this.metrics.violationsBySeverity[violation.severity] || 0) + 1;
    }

    // Update average compliance score
    this.metrics.averageComplianceScore = 
      (this.metrics.averageComplianceScore * (this.metrics.totalValidations - 1) + score) / 
      this.metrics.totalValidations;

    // Update average processing time
    this.metrics.averageProcessingTime = 
      (this.metrics.averageProcessingTime * (this.metrics.totalValidations - 1) + processingTime) / 
      this.metrics.totalValidations;
  }

  /**
   * Initialize regulatory patterns
   */
  private initializeRegulatoryPatterns(): void {
    // FDA patterns for health claims
    this.fdaClaims = [
      /\b(cure|cures|curing)\b/gi,
      /\b(treat|treats|treatment)\s+\w+\s+(disease|condition|disorder)/gi,
      /\b(prevent|prevents|prevention)\s+\w+\s+(cancer|diabetes|heart\s+disease)/gi,
      /\bFDA\s+(approved|cleared|authorized)/gi
    ];

    // FTC patterns for advertising claims
    this.ftcClaims = [
      /\b(guaranteed|guarantee)\s+(results|success|weight\s+loss)/gi,
      /\b(proven|scientifically\s+proven)\b/gi,
      /\b(fastest|quickest|best)\s+\w+\s+(ever|available)/gi,
      /\b(lose|burn)\s+\d+\s+(pounds|lbs|kg)\s+(in|within)/gi
    ];

    // EU patterns for product claims
    this.euClaims = [
      /\b(clinically\s+proven|dermatologically\s+tested)\b/gi,
      /\b(natural|organic|chemical-free)\b/gi,
      /\b(anti-aging|anti-wrinkle)\b/gi
    ];
  }

  /**
   * Initialize tone patterns
   */
  private initializeTonePatterns(): void {
    this.tonePatterns = new Map();

    // Professional tone patterns
    this.tonePatterns.set('professional', [
      /\b(expertise|experience|professional|quality)\b/gi,
      /\b(recommend|suggest|advise)\b/gi,
      /\b(research|studies|clinical)\b/gi
    ]);

    // Friendly tone patterns
    this.tonePatterns.set('friendly', [
      /\b(love|enjoy|happy|excited)\b/gi,
      /[!]{1,2}$/gm,
      /\b(amazing|wonderful|fantastic)\b/gi
    ]);

    // Casual tone patterns
    this.tonePatterns.set('casual', [
      /\b(hey|hi|cool|awesome)\b/gi,
      /\b(gonna|wanna|kinda)\b/gi,
      /[😊😍🔥💕]/g
    ]);

    // Authoritative tone patterns
    this.tonePatterns.set('authoritative', [
      /\b(expert|authority|leader|pioneer)\b/gi,
      /\b(proven|established|trusted)\b/gi,
      /\b(years\s+of\s+experience|decades)\b/gi
    ]);
  }

  /**
   * Get compliance metrics
   */
  getMetrics(): ComplianceMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalValidations: 0,
      compliantContent: 0,
      violationsDetected: 0,
      averageComplianceScore: 0,
      violationsByType: {},
      violationsBySeverity: {},
      averageProcessingTime: 0
    };
  }
}