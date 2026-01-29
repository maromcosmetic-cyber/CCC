/**
 * Brand Intelligence Completeness Calculator
 * Calculates completeness scores for all 19 brand modules
 */

export interface ModuleWeight {
  id: string;
  name: string;
  weight: number; // 1-10, importance multiplier
  category: 'foundation' | 'strategic' | 'execution' | 'advanced';
  requiredFields: string[];
}

// Define all 19 modules with their weights and required fields
export const BRAND_MODULES: ModuleWeight[] = [
  // FOUNDATION MODULES (Critical - highest weight)
  {
    id: 'philosophy',
    name: 'Brand Philosophy, Mission & Values',
    weight: 10,
    category: 'foundation',
    requiredFields: [
      'dna.name',
      'dna.mission',
      'dna.origin_motivation',
      'dna.world_problem',
      'dna.emotional_outcome_goal',
      'dna.values',
      'dna.ethical_boundaries',
      'dna.non_negotiable_standards',
      'dna.ten_year_vision'
    ]
  },
  {
    id: 'positioning',
    name: 'Strategic Brand Positioning',
    weight: 10,
    category: 'foundation',
    requiredFields: [
      'positioning.market_category',
      'positioning.subcategory_to_own',
      'positioning.not_for',
      'positioning.remembered_for',
      'positioning.dominant_brand_idea',
      'positioning.positioning_statement'
    ]
  },
  {
    id: 'audience',
    name: 'Target Audience Intelligence',
    weight: 9,
    category: 'foundation',
    requiredFields: [
      'audience.ideal_customer',
      'audience.pain_points',
      'audience.desires',
      'audience.fears',
      'audience.demographics',
      'audience_intelligence.emotional_triggers',
      'audience_intelligence.identity_drivers'
    ]
  },

  // STRATEGIC MODULES (High importance)
  {
    id: 'pain_matrix',
    name: 'Problem Matrix & Pain Hierarchy',
    weight: 8,
    category: 'strategic',
    requiredFields: ['pain_matrix']
  },
  {
    id: 'product',
    name: 'Product Intelligence Layer',
    weight: 8,
    category: 'strategic',
    requiredFields: [
      'product_intelligence'
    ]
  },
  {
    id: 'differentiation',
    name: 'Differentiation & Competitive Warfare',
    weight: 9,
    category: 'strategic',
    requiredFields: [
      'market.competitors',
      'market.positioning',
      'market.market_gap'
    ]
  },

  // EXECUTION MODULES (Important for consistency)
  {
    id: 'voice',
    name: 'Brand Voice & Linguistic Identity',
    weight: 9,
    category: 'execution',
    requiredFields: [
      'voice.tone_adjectives',
      'voice.archetype',
      'voice.sentence_structure',
      'voice.emotional_driver'
    ]
  },
  {
    id: 'visuals',
    name: 'Visual Intelligence & Aesthetic Control',
    weight: 8,
    category: 'execution',
    requiredFields: [
      'visuals.colors',
      'visuals.fonts',
      'visuals.aesthetic'
    ]
  },
  {
    id: 'narrative',
    name: 'Narrative Architecture & Story Engine',
    weight: 7,
    category: 'execution',
    requiredFields: [
      'narrative.hero',
      'narrative.villain',
      'narrative.guide',
      'narrative.transformation'
    ]
  },
  {
    id: 'funnel',
    name: 'Funnel Psychology & Customer Journey',
    weight: 7,
    category: 'execution',
    requiredFields: [
      'journey.discovery',
      'journey.hesitation',
      'funnel_psychology.stages'
    ]
  },
  {
    id: 'offers',
    name: 'Offer Architecture & Conversion Engineering',
    weight: 7,
    category: 'execution',
    requiredFields: [
      'offer_architecture.entry_offers',
      'offer_architecture.core_offers',
      'offer_architecture.high_ticket_offers',
      'offer_architecture.risk_reversal_methods'
    ]
  },

  // ADVANCED MODULES (Nice to have, lower weight)
  {
    id: 'trust',
    name: 'Trust Infrastructure & Authority Signals',
    weight: 6,
    category: 'advanced',
    requiredFields: [
      'trust_infrastructure.social_proof_types',
      'trust_infrastructure.certifications',
      'trust_infrastructure.guarantees'
    ]
  },
  {
    id: 'content_pillars',
    name: 'Content Pillar System',
    weight: 6,
    category: 'advanced',
    requiredFields: ['content_pillars']
  },
  {
    id: 'community',
    name: 'Community & Relationship Model',
    weight: 5,
    category: 'advanced',
    requiredFields: [
      'community_model.customer_treatment_philosophy',
      'community_model.problem_resolution_protocol',
      'community_model.loyalty_building_tactics'
    ]
  },
  {
    id: 'platforms',
    name: 'Platform & Channel Strategy',
    weight: 6,
    category: 'advanced',
    requiredFields: ['platform_strategy']
  },
  {
    id: 'guardrails',
    name: 'Legal, Ethical & Compliance Guardrails',
    weight: 8,
    category: 'execution',
    requiredFields: [
      'guardrails.forbidden_topics',
      'guardrails.forbidden_claims',
      'guardrails.allowed_claims'
    ]
  },
  {
    id: 'vision',
    name: 'Long-Term Vision & Expansion Logic',
    weight: 5,
    category: 'advanced',
    requiredFields: [
      'long_term_vision.future_products',
      'long_term_vision.future_positioning',
      'long_term_vision.brand_evolution_path'
    ]
  },
  {
    id: 'kpis',
    name: 'KPIs & Optimization Logic',
    weight: 6,
    category: 'advanced',
    requiredFields: [
      'kpis_optimization.success_metrics',
      'kpis_optimization.benchmarks',
      'kpis_optimization.growth_targets'
    ]
  },
  {
    id: 'ai_autonomy',
    name: 'AI Autonomy Rules & Human Control',
    weight: 7,
    category: 'advanced',
    requiredFields: [
      'ai_autonomy_rules.can_decide_alone',
      'ai_autonomy_rules.requires_approval'
    ]
  }
];

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Check if a field has meaningful content
 */
function hasContent(value: any): boolean {
  if (value === null || value === undefined || value === '') return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return true;
}

/**
 * Calculate completeness for a single module
 */
export function calculateModuleCompleteness(
  brandIdentity: any,
  module: ModuleWeight
): {
  percentage: number;
  filledFields: number;
  totalFields: number;
  missingFields: string[];
} {
  if (!brandIdentity) {
    return {
      percentage: 0,
      filledFields: 0,
      totalFields: module.requiredFields.length,
      missingFields: module.requiredFields
    };
  }

  let filledCount = 0;
  const missingFields: string[] = [];

  for (const field of module.requiredFields) {
    const value = getNestedValue(brandIdentity, field);
    if (hasContent(value)) {
      filledCount++;
    } else {
      missingFields.push(field);
    }
  }

  const percentage = Math.round((filledCount / module.requiredFields.length) * 100);

  return {
    percentage,
    filledFields: filledCount,
    totalFields: module.requiredFields.length,
    missingFields
  };
}

/**
 * Calculate overall brand intelligence score (weighted)
 */
export function calculateOverallScore(brandIdentity: any): {
  score: number; // 0-100
  totalModules: number;
  completedModules: number;
  inProgressModules: number;
  emptyModules: number;
  categoryScores: Record<string, number>;
} {
  if (!brandIdentity) {
    return {
      score: 0,
      totalModules: BRAND_MODULES.length,
      completedModules: 0,
      inProgressModules: 0,
      emptyModules: BRAND_MODULES.length,
      categoryScores: {
        foundation: 0,
        strategic: 0,
        execution: 0,
        advanced: 0
      }
    };
  }

  let totalWeightedScore = 0;
  let totalWeight = 0;
  let completedCount = 0;
  let inProgressCount = 0;
  let emptyCount = 0;

  const categoryScores: Record<string, { score: number; weight: number }> = {
    foundation: { score: 0, weight: 0 },
    strategic: { score: 0, weight: 0 },
    execution: { score: 0, weight: 0 },
    advanced: { score: 0, weight: 0 }
  };

  for (const module of BRAND_MODULES) {
    const { percentage } = calculateModuleCompleteness(brandIdentity, module);
    const weightedScore = (percentage / 100) * module.weight;

    totalWeightedScore += weightedScore;
    totalWeight += module.weight;

    // Track by category
    categoryScores[module.category].score += weightedScore;
    categoryScores[module.category].weight += module.weight;

    // Count module states
    if (percentage === 100) completedCount++;
    else if (percentage > 0) inProgressCount++;
    else emptyCount++;
  }

  const overallScore = Math.round((totalWeightedScore / totalWeight) * 100);

  const finalCategoryScores: Record<string, number> = {};
  for (const [category, data] of Object.entries(categoryScores)) {
    finalCategoryScores[category] = Math.round((data.score / data.weight) * 100);
  }

  return {
    score: overallScore,
    totalModules: BRAND_MODULES.length,
    completedModules: completedCount,
    inProgressModules: inProgressCount,
    emptyModules: emptyCount,
    categoryScores: finalCategoryScores
  };
}

/**
 * Get module status based on completeness
 */
export function getModuleStatus(percentage: number): 'empty' | 'in-progress' | 'complete' {
  if (percentage === 0) return 'empty';
  if (percentage === 100) return 'complete';
  return 'in-progress';
}

/**
 * Get color for module status
 */
export function getModuleStatusColor(percentage: number): string {
  if (percentage === 0) return 'text-gray-400';
  if (percentage < 30) return 'text-red-500';
  if (percentage < 70) return 'text-yellow-500';
  if (percentage < 100) return 'text-blue-500';
  return 'text-green-500';
}

/**
 * Get category color
 */
export function getCategoryColor(category: string): {
  bg: string;
  text: string;
  border: string;
} {
  const colors = {
    foundation: {
      bg: 'bg-red-50',
      text: 'text-red-700',
      border: 'border-red-200'
    },
    strategic: {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200'
    },
    execution: {
      bg: 'bg-green-50',
      text: 'text-green-700',
      border: 'border-green-200'
    },
    advanced: {
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      border: 'border-purple-200'
    }
  };
  return colors[category as keyof typeof colors] || colors.advanced;
}

/**
 * Get next suggested module to complete
 */
export function getNextSuggestedModule(brandIdentity: any): ModuleWeight | null {
  // Prioritize by category order, then by weight
  const priorityOrder = ['foundation', 'strategic', 'execution', 'advanced'];
  
  for (const category of priorityOrder) {
    const categoryModules = BRAND_MODULES
      .filter(m => m.category === category)
      .sort((a, b) => b.weight - a.weight);

    for (const module of categoryModules) {
      const { percentage } = calculateModuleCompleteness(brandIdentity, module);
      if (percentage < 100) {
        return module;
      }
    }
  }

  return null;
}

/**
 * Get all module completeness data
 */
export function getAllModulesCompleteness(brandIdentity: any) {
  return BRAND_MODULES.map(module => ({
    module,
    ...calculateModuleCompleteness(brandIdentity, module)
  }));
}

