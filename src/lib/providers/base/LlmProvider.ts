// LLM Provider Interface

export interface LlmResponse {
  content: string;
  structured?: Record<string, any>;
  tokens_used?: {
    prompt: number;
    completion: number;
    total: number;
  };
  model?: string;
}

export interface LlmOptions {
  temperature?: number;
  max_tokens?: number;
  json_schema?: Record<string, any>;
}

export interface LlmProvider {
  generate(
    prompt: string,
    options?: LlmOptions
  ): Promise<LlmResponse>;
  
  estimateCost(tokens: number, model?: string): number;
}


