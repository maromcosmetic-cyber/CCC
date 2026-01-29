// Audit log helper

import { supabaseAdmin } from '../db/client';
import { AuditLogEntry } from '@/types/models';

export interface AuditLogPayload {
  event_type: string;
  actor_id?: string;
  actor_type: 'user' | 'whatsapp' | 'worker';
  source: 'ui' | 'whatsapp' | 'worker';
  payload: Record<string, any>;
  project_id?: string;
}

export async function logAuditEvent(data: AuditLogPayload): Promise<void> {
  if (!supabaseAdmin) {
    console.warn('Supabase admin client not available, skipping audit log');
    return;
  }

  try {
    // @ts-ignore
    const { error } = await supabaseAdmin.from('audit_log').insert({
      project_id: data.project_id,
      event_type: data.event_type,
      actor_id: data.actor_id,
      actor_type: data.actor_type,
      source: data.source,
      payload: data.payload,
    });

    if (error) {
      console.error('Failed to log audit event:', error);
    }
  } catch (error) {
    console.error('Error logging audit event:', error);
  }
}


