// Prompt Template Rendering

import { PromptTemplate } from './templates';

export interface TemplateVariables {
  [key: string]: any;
}

/**
 * Renders a prompt template by replacing variables with actual values
 */
export function renderTemplate(
  template: PromptTemplate,
  variables: TemplateVariables
): string {
  let rendered = template.template_text;

  // Replace all variables in the template
  for (const variable of template.variables) {
    const value = variables[variable];
    const placeholder = `{{${variable}}}`;
    
    if (value !== undefined && value !== null) {
      // Convert objects/arrays to JSON strings for better readability
      const stringValue = typeof value === 'object' 
        ? JSON.stringify(value, null, 2)
        : String(value);
      
      rendered = rendered.replace(new RegExp(placeholder, 'g'), stringValue);
    } else {
      // Warn about missing variables but don't fail
      console.warn(`Template variable ${variable} is missing`);
      rendered = rendered.replace(new RegExp(placeholder, 'g'), `[MISSING: ${variable}]`);
    }
  }

  return rendered;
}

/**
 * Validates that all required variables are provided
 */
export function validateVariables(
  template: PromptTemplate,
  variables: TemplateVariables
): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  for (const variable of template.variables) {
    if (variables[variable] === undefined || variables[variable] === null) {
      missing.push(variable);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}


