/**
 * Competitor 20-Module Intelligence Analyzer
 * Turns scraped data into strategic intelligence
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { ScrapedCompetitorData } from './scraper';

export interface CompetitorAnalysis {
  // Module 1: Competitor Identification
  competitor_identification: {
    name: string;
    type: 'direct' | 'indirect' | 'substitute' | 'aspirational';
    country: string;
    category: string;
    subcategory: string;
    price_positioning: string;
    target_audience_overlap: number;
    threat_level: number;
    priority_to_monitor: 'high' | 'medium' | 'low';
  };

  // Module 2: Brand Positioning Extraction
  brand_positioning_extraction: {
    homepage_headline: string;
    tagline: string;
    hero_message: string;
    core_promise: string;
    emotional_angle: string;
    positioning_statement: string;
    value_propositions: string[];
  };

  // Module 3: Target Audience Signals
  target_audience_signals: {
    language_style: string;
    visual_targeting: any;
    scenarios_depicted: string[];
    emotional_state_targeted: string;
    identity_aspiration: string;
    problem_aware_level: string;
    demographics: {
      age_range: string;
      gender: string;
      income_level: string;
    };
    identity_drivers: string[];
    aspirations: string[];
  };

  // Module 4: Offer Structure & Pricing
  offer_structure_pricing: {
    entry_offer: any;
    core_offers: any[];
    price_positioning: string;
    pricing_psychology: string;
    price_ranges: string;
    bundles: string[];
    guarantees: string[];
    discounts: string[];
    bonuses: string[];
  };

  // Module 5: Product & Feature Mapping
  product_feature_mapping: {
    ingredients: string[];
    materials: string[];
    technology: string[];
    claims: string[];
    benefits: {
      functional: string[];
      emotional: string[];
      symbolic: string[];
    };
    certifications: string[];
    unique_features: string[];
  };

  // Module 6: Claims & Promises Analysis
  claims_promises_analysis: {
    bold_claims: string[];
    scientific_claims: string[];
    emotional_promises: string[];
    speed_claims: string[];
    transformation_claims: string[];
    risk_assessment: {
      likely_compliant: boolean;
      risky_claims: string[];
      regulatory_exposure: string;
      risk_level: string;
    };
  };

  // Module 7: Visual Identity & Aesthetic
  visual_identity_aesthetic: {
    color_palette: string[];
    colors: string;
    color_psychology: string;
    typography_style: string;
    image_style: string;
    video_style: string;
    polish_level: string;
    look: string;
    human_presence: string;
    model_type: string;
    mood: string;
  };

  // Module 8: Content Strategy & Messaging
  content_strategy_messaging: {
    content_pillars: string[];
    posting_frequency: any;
    themes: string[];
    education_vs_entertainment_ratio: string;
    content_quality: number;
  };

  // Module 9: Customer Psychology
  customer_psychology: {
    what_customers_praise: string[];
    common_frustrations: string[];
    emotional_language_used: string[];
    desire_signals: string[];
    fear_signals: string[];
    community_sentiment: string;
  };

  // Module 10: Brand Story & Narrative
  brand_story_narrative: {
    founder_story: any;
    origin_story: string;
    authenticity_score: number;
    emotional_depth_score: number;
    sustainability_story: any;
    brand_mythology: string;
    storytelling_skill: number;
  };

  // Module 11: Trust & Authority Signals
  trust_authority_signals: {
    certifications: string[];
    awards: string[];
    media_mentions: string[];
    reviews_volume: string;
    reviews_quality: string;
    reviews: any;
    trust_score: number;
  };

  // Module 12: UX & Funnel Design
  ux_funnel_design: {
    site_speed_score: number;
    navigation_clarity: number;
    checkout_friction: string;
    mobile_experience: number;
    conversion_optimization_level: number;
    friction_points: string[];
    smart_tactics_used: string[];
  };

  // Module 13: Brand Personality
  brand_personality: {
    brand_archetype: string;
    warmth_score: number;
    boldness_score: number;
    tone: string;
    clinical_vs_emotional: string;
    humor_usage: string;
    voice_consistency: number;
  };

  // Module 14: Market Saturation
  market_saturation: {
    clustered_with: string[];
    overcrowded_messages: string[];
    unique_position: boolean;
    differentiation_score: number;
    positioning_clarity: number;
    market_gap_they_fill: string;
  };

  // Module 15: Weakness Detection
  weakness_detection: {
    bad_review_themes: string[];
    complaint_patterns: string[];
    confusing_messaging: string[];
    slow_delivery_complaints: boolean;
    poor_support_mentions: boolean;
    trust_issues: string[];
    operational_weaknesses: string[];
    positioning_confusion: boolean;
    exploitable_gaps: Array<{
      gap: string;
      opportunity: string;
      attack_angle: string;
    }>;
  };

  // Module 16: Value Perception
  value_perception: {
    price_vs_features: string;
    price_vs_story: string;
    price_vs_design: string;
    price_vs_trust: string;
    perceived_value: string;
    price_objection_likelihood: string;
  };

  // Module 17: Compliance & Risk
  compliance_risk: {
    risky_claims: string[];
    regulatory_exposure: {
      fda_risk: string;
      ftc_risk: string;
      platform_policy_risk: string;
    };
    legal_vulnerabilities: string[];
    reputation_risks: string[];
  };

  // Module 18: Strategic Insight Synthesis
  strategic_insight_synthesis: {
    market_gaps: string[];
    positioning_opportunities: string[];
    messaging_opportunities: string[];
    offer_opportunities: string[];
    detailed_insights: Array<{
      gap?: string;
      why_unfilled?: string;
      opportunity_size?: string;
      difficulty?: string;
      position?: string;
      why_open?: string;
      competitive_advantage?: string;
      message?: string;
      why_works?: string;
      differentiation_value?: string;
    }>;
  };

  // Module 19: Integration into Your Brand
  integration_into_brand: {
    differentiation_strategy: string[];
    positioning_angle: string;
    voice_contrast: string;
    offer_strategy: string[];
    visual_direction: string;
    messaging_strategy: string[];
  };

  // Module 20: Continuous Monitoring
  continuous_monitoring?: {
    where_they_win: string[];
    where_we_win: string[];
    where_to_attack: string[];
    where_to_avoid: string[];
    their_moat: string;
    our_wedge: string;
    flanking_opportunities: string[];
    direct_assault_risk: string;
  };

  // Module 21: Meta Ads Intelligence
  ads_data?: import('./meta-ads-scraper').MetaAdIntelligence;

  // Module 22: Monitoring Data
  monitoring: {
    last_scan_date: string;
    change_detection: any;
    alert_triggers: any[];
  };
}

/**
 * Analyze competitor with 20-module framework
 */
export async function analyzeCompetitor(
  scrapedData: ScrapedCompetitorData,
  yourBrandData?: any
): Promise<CompetitorAnalysis> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  // Using the latest powerful model as requested
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

  // Add fallbacks for missing data
  const homepage = scrapedData.homepage || '';
  const about = scrapedData.about || '';
  const products = scrapedData.products || '';
  const pricing = scrapedData.pricing || '';

  const combinedContent = `
HOMEPAGE:
${homepage.slice(0, 8000)}

ABOUT PAGE:
${about.slice(0, 5000)}

PRODUCTS PAGE:
${products.slice(0, 5000)}

PRICING PAGE:
${pricing.slice(0, 3000)}
    `.trim();

  const prompt = `
You are an elite strategic intelligence analyst specializing in competitive warfare.

Analyze this competitor website and extract ALL 20 intelligence modules.

COMPETITOR URL: ${scrapedData.url}
TITLE: ${scrapedData.metadata.title}
DESCRIPTION: ${scrapedData.metadata.description}

CONTENT:
${combinedContent}

YOUR MISSION: Turn this raw data into actionable strategic intelligence.

Output a valid JSON object matching this EXACT structure (all fields required):

{
  "competitor_identification": {
    "name": "Company Name",
    "type": "direct|indirect|substitute|aspirational",
    "country": "string",
    "category": "string",
    "subcategory": "string",
    "price_positioning": "budget|mid-market|premium|luxury",
    "target_audience_overlap": 70,
    "threat_level": 7,
    "priority_to_monitor": "high|medium|low"
  },
  "brand_positioning_extraction": {
    "homepage_headline": "string",
    "tagline": "string",
    "hero_message": "string",
    "core_promise": "string",
    "emotional_angle": "string",
    "positioning_statement": "string",
    "value_propositions": ["prop1", "prop2"]
  },
  "target_audience_signals": {
    "language_style": "formal|casual|technical",
    "visual_targeting": {"age": "25-34", "lifestyle": "urban"},
    "scenarios_depicted": ["scenario1"],
    "emotional_state_targeted": "string",
    "identity_aspiration": "string",
    "problem_aware_level": "unaware|problem-aware|solution-aware",
    "demographics": {
      "age_range": "25-45",
      "gender": "mixed|female|male",
      "income_level": "$50k-$100k"
    },
    "identity_drivers": ["driver1", "driver2"],
    "aspirations": ["aspiration1", "aspiration2"]
  },
  "offer_structure_pricing": {
    "entry_offer": {"price": "$X", "product": "string"},
    "core_offers": [{"name": "string", "price": "$X"}],
    "price_positioning": "budget|mid-market|premium|luxury",
    "pricing_psychology": "anchor-high|race-to-bottom|value-play",
    "price_ranges": "$X-$Y",
    "bundles": ["bundle1"],
    "guarantees": ["guarantee1"],
    "discounts": ["discount1"],
    "bonuses": ["bonus1"]
  },
  "product_feature_mapping": {
    "ingredients": ["ingredient1"],
    "materials": ["material1"],
    "technology": ["tech1"],
    "claims": ["claim1"],
    "benefits": {
      "functional": ["benefit1"],
      "emotional": ["benefit2"],
      "symbolic": ["what owning this MEANS"]
    },
    "certifications": ["cert1"],
    "unique_features": ["feature1"]
  },
  "claims_promises_analysis": {
    "bold_claims": ["claim1"],
    "scientific_claims": ["claim2"],
    "emotional_promises": ["promise1"],
    "speed_claims": ["in 7 days"],
    "transformation_claims": ["before/after claim"],
    "risk_assessment": {
      "likely_compliant": true,
      "risky_claims": ["claim1"],
      "regulatory_exposure": "low|medium|high",
      "risk_level": "low|medium|high"
    }
  },
  "visual_identity_aesthetic": {
    "color_palette": ["#hex1", "#hex2"],
    "colors": "#hex1, #hex2",
    "color_psychology": "string",
    "typography_style": "string",
    "image_style": "lifestyle|product-only|mixed",
    "video_style": "ugc|professional|cinematic|animated",
    "polish_level": "raw-authentic|semi-polished|highly-produced",
    "look": "raw|polished|luxury",
    "human_presence": "heavy|moderate|minimal",
    "model_type": "professional|real-customers|influencers",
    "mood": "energetic|calm|luxurious|playful|serious"
  },
  "content_strategy_messaging": {
    "content_pillars": ["pillar1"],
    "posting_frequency": {"platform": "frequency"},
    "themes": ["theme1"],
    "education_vs_entertainment_ratio": "70/30",
    "content_quality": 7
  },
  "customer_psychology": {
    "what_customers_praise": ["what they LOVE"],
    "common_frustrations": ["frustration1"],
    "emotional_language_used": ["word1"],
    "desire_signals": ["what they wish for"],
    "fear_signals": ["what they fear"],
    "community_sentiment": "positive|mixed|negative"
  },
  "brand_story_narrative": {
    "founder_story": {"exists": true, "authenticity_score": 8},
    "origin_story": "string",
    "authenticity_score": 8,
    "emotional_depth_score": 8,
    "sustainability_story": {"exists": true, "credibility": "high|low"},
    "brand_mythology": "the legend they're building",
    "storytelling_skill": 7
  },
  "trust_authority_signals": {
    "certifications": ["cert1"],
    "awards": ["award1"],
    "media_mentions": ["mention1"],
    "reviews_volume": "1000+",
    "reviews_quality": "4.5/5",
    "reviews": {"volume": 100, "average_rating": 4.5},
    "trust_score": 8
  },
  "ux_funnel_design": {
    "site_speed_score": 7,
    "navigation_clarity": 8,
    "checkout_friction": "low|medium|high",
    "mobile_experience": 8,
    "conversion_optimization_level": 7,
    "friction_points": ["point1"],
    "smart_tactics_used": ["tactic1"]
  },
  "brand_personality": {
    "brand_archetype": "Hero|Sage|Rebel|Caregiver|Creator",
    "warmth_score": 7,
    "boldness_score": 8,
    "tone": "warm|bold|clinical|emotional|playful",
    "clinical_vs_emotional": "clinical|emotional|balanced",
    "humor_usage": "none|subtle|heavy",
    "voice_consistency": 8
  },
  "market_saturation": {
    "clustered_with": ["brand1", "brand2"],
    "overcrowded_messages": ["message everyone makes"],
    "unique_position": true,
    "differentiation_score": 7,
    "positioning_clarity": 8,
    "market_gap_they_fill": "string or none"
  },
  "weakness_detection": {
    "bad_review_themes": ["complaint1"],
    "complaint_patterns": ["pattern1"],
    "confusing_messaging": ["message1"],
    "slow_delivery_complaints": false,
    "poor_support_mentions": false,
    "trust_issues": ["issue1"],
    "operational_weaknesses": ["weakness1"],
    "positioning_confusion": false,
    "exploitable_gaps": [
      {
        "gap": "what's missing",
        "opportunity": "how to exploit",
        "attack_angle": "specific angle"
      }
    ]
  },
  "value_perception": {
    "price_vs_features": "overpriced|fair|underpriced",
    "price_vs_story": "justified|unjustified",
    "price_vs_design": "premium-worthy|not-matching",
    "price_vs_trust": "trusted-enough|too-risky",
    "perceived_value": "high|medium|low",
    "price_objection_likelihood": "high|medium|low"
  },
  "compliance_risk": {
    "risky_claims": ["claim1"],
    "regulatory_exposure": {
      "fda_risk": "low|medium|high",
      "ftc_risk": "low|medium|high",
      "platform_policy_risk": "low|medium|high"
    },
    "legal_vulnerabilities": ["vuln1"],
    "reputation_risks": ["risk1"]
  },
  "strategic_insight_synthesis": {
    "market_gaps": ["gap1", "gap2"],
    "positioning_opportunities": ["opportunity1", "opportunity2"],
    "messaging_opportunities": ["message1", "message2"],
    "offer_opportunities": ["offer1", "offer2"],
    "detailed_insights": [
      {
        "gap": "unfilled need",
        "why_unfilled": "reason",
        "opportunity_size": "small|medium|large",
        "difficulty": "easy|moderate|hard",
        "position": "position to take",
        "why_open": "reason it's available",
        "competitive_advantage": "your edge",
        "message": "angle to use",
        "why_works": "psychological reason",
        "differentiation_value": "how it stands out"
      }
    ]
  },
  "integration_into_brand": {
    "differentiation_strategy": ["strategy1", "strategy2"],
    "positioning_angle": "angle to take",
    "voice_contrast": "how to sound different",
    "offer_strategy": ["offer1", "offer2"],
    "visual_direction": "visual approach",
    "messaging_strategy": ["message1", "message2"]
  },
  "continuous_monitoring": {
    "where_they_win": ["area1"],
    "where_we_win": ["area2"],
    "where_to_attack": ["weak point"],
    "where_to_avoid": ["their strength"],
    "their_moat": "what protects them",
    "our_wedge": "how we crack it",
    "flanking_opportunities": ["indirect attack"],
    "direct_assault_risk": "low|high"
  },
  "monitoring": {
    "last_scan_date": "${new Date().toISOString()}",
    "change_detection": {},
    "alert_triggers": []
  }
}

CRITICAL: Output ONLY valid JSON. No explanations. No markdown. Pure JSON.
`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    if (!text) throw new Error('No content generated by Gemini');

    // Parse JSON safely (handle potential markdown wrapping)
    let jsonString = text.replace(/```json\n?|\n?```/g, '').trim();
    // Remove text before first { or [ (sometimes models add introductory text)
    const firstBracket = jsonString.indexOf('[');
    const firstBrace = jsonString.indexOf('{');
    const start = (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) ? firstBracket : firstBrace;

    if (start !== -1) {
      jsonString = jsonString.substring(start);
    }

    // Remove text after last } or ]
    const lastBracket = jsonString.lastIndexOf(']');
    const lastBrace = jsonString.lastIndexOf('}');
    const end = (lastBracket !== -1 && lastBracket > lastBrace) ? lastBracket : lastBrace;

    if (end !== -1) {
      jsonString = jsonString.substring(0, end + 1);
    }

    const analysis = JSON.parse(jsonString) as CompetitorAnalysis;
    return analysis;

  } catch (err: any) {
    console.error("Gemini Analysis Error:", err);
    throw new Error(`Failed to analyze competitor with Gemini: ${err.message}`);
  }
}
