// Cost tracking helper

import { supabaseAdmin } from '../db/client';

export interface CostEntry {
  project_id?: string;
  provider_type: string;
  provider_call_id?: string;
  cost_amount: number;
  cost_currency: string;
  metadata?: Record<string, any>;
}

export async function logCost(entry: CostEntry): Promise<void> {
  if (!supabaseAdmin) {
    console.warn('Supabase admin client not available, skipping cost log');
    return;
  }

  try {
    const { error } = await supabaseAdmin.from('cost_ledger').insert({
      project_id: entry.project_id,
      provider_type: entry.provider_type,
      provider_call_id: entry.provider_call_id,
      cost_amount: entry.cost_amount,
      cost_currency: entry.cost_currency,
      metadata: entry.metadata || {},
    });

    if (error) {
      console.error('Failed to log cost:', error);
    }
  } catch (error) {
    console.error('Error logging cost:', error);
  }
}


