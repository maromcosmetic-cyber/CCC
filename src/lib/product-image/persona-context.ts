/**
 * Persona Context Service
 * 
 * Extracts persona and audience data from brand_identity.personas and audience_segments
 * Combines persona profile + image with audience targeting/guidelines
 */

import { PersonaContext, AudienceContext, PersonaProfile, AudienceSegment } from '@/types/models';
import { createServiceRoleClient } from '@/lib/auth/server';
import { readPlaybook } from './playbook-reader';

/**
 * Extract persona context for an audience
 */
export async function getPersonaContext(
  projectId: string,
  audienceName: string
): Promise<PersonaContext | null> {
  const supabase = createServiceRoleClient();

  // 1. Read playbook to get persona
  const playbook = await readPlaybook(projectId);
  if (!playbook || !playbook.personas) {
    return null;
  }

  const persona = playbook.personas[audienceName];
  if (!persona) {
    return null;
  }

  // 2. Get audience from database
  const { data: audience, error } = await supabase
    .from('audience_segments')
    .select('*')
    .eq('project_id', projectId)
    .eq('name', audienceName)
    .single();

  if (error || !audience) {
    console.error('Failed to fetch audience:', error);
    return null;
  }

  return {
    persona: persona as PersonaProfile,
    audience: audience as AudienceSegment,
  };
}

/**
 * Get audience context (with optional persona)
 */
export async function getAudienceContext(
  projectId: string,
  audienceId: string
): Promise<AudienceContext | null> {
  const supabase = createServiceRoleClient();

  // 1. Get audience from database
  const { data: audience, error } = await supabase
    .from('audience_segments')
    .select('*')
    .eq('id', audienceId)
    .eq('project_id', projectId)
    .single();

  if (error || !audience) {
    console.error('Failed to fetch audience:', error);
    return null;
  }

  // 2. Try to get persona if available
  const playbook = await readPlaybook(projectId);
  let persona: PersonaProfile | undefined;
  
  if (playbook?.personas && audience.name) {
    persona = playbook.personas[audience.name] as PersonaProfile;
  }

  return {
    audience: audience as AudienceSegment,
    persona,
  };
}

/**
 * Format persona context for AI prompts
 */
export function formatPersonaForPrompt(persona: PersonaProfile): string {
  let text = `PERSONA PROFILE:\n`;
  text += `Name: ${persona.name}\n`;
  if (persona.role) text += `Role: ${persona.role}\n`;
  if (persona.age_range) text += `Age Range: ${persona.age_range}\n`;
  if (persona.occupation) text += `Occupation: ${persona.occupation}\n`;
  if (persona.emotional_state) text += `Emotional State: ${persona.emotional_state}\n`;
  if (persona.core_concerns) text += `Core Concerns: ${persona.core_concerns}\n`;
  if (persona.personality_traits && persona.personality_traits.length > 0) {
    text += `Personality Traits: ${persona.personality_traits.join(', ')}\n`;
  }
  if (persona.visual_style) text += `Visual Style: ${persona.visual_style}\n`;
  if (persona.communication_style) text += `Communication Style: ${persona.communication_style}\n`;
  if (persona.casting_notes) text += `Casting Notes: ${persona.casting_notes}\n`;
  
  return text;
}

/**
 * Format audience context for AI prompts
 */
export function formatAudienceForPrompt(audience: AudienceSegment): string {
  let text = `AUDIENCE SEGMENT:\n`;
  text += `Name: ${audience.name}\n`;
  if (audience.description) text += `Description: ${audience.description}\n`;
  if (audience.user_prompt) text += `User Prompt: ${audience.user_prompt}\n`;
  if (audience.ai_enhanced_prompt) text += `AI Enhanced Prompt: ${audience.ai_enhanced_prompt}\n`;
  if (audience.targeting) {
    text += `Targeting: ${JSON.stringify(audience.targeting, null, 2)}\n`;
  }
  
  return text;
}

/**
 * Get persona image URL
 */
export function getPersonaImageUrl(persona: PersonaProfile): string | null {
  return persona.imageUrl || null;
}
