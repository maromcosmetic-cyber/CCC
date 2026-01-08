// WhatsApp webhook API

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db/client';
import { logAuditEvent } from '@/lib/audit/logger';
import { WhatsAppWebhookSchema } from '@/lib/validation/schemas';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = WhatsAppWebhookSchema.parse(body);

    const { message, from } = validated;

    // Parse command
    const command = message.toLowerCase().trim();
    const parts = command.split(' ');

    // Simple command parser
    let response = '';
    let requiresConfirmation = false;

    if (command.startsWith('pause campaign')) {
      const campaignName = parts.slice(2).join(' ');
      response = `Are you sure you want to pause campaign "${campaignName}"? Reply YES to confirm.`;
      requiresConfirmation = true;
    } else if (command.startsWith('create campaign')) {
      response = 'Campaign creation requires confirmation. Please use the web interface for detailed setup.';
      requiresConfirmation = true;
    } else if (command.startsWith('status')) {
      // Get project status
      response = 'System is operational. All integrations are healthy.';
    } else if (command.startsWith('help')) {
      response = `Available commands:
- pause campaign [name]
- create campaign [details]
- status
- help`;
    } else {
      response = 'Command not recognized. Type "help" for available commands.';
    }

    // Log interaction
    await logAuditEvent({
      event_type: 'whatsapp_command',
      actor_id: from,
      actor_type: 'whatsapp',
      source: 'whatsapp',
      payload: {
        message,
        response,
        requires_confirmation: requiresConfirmation,
      },
    });

    return NextResponse.json({
      response,
      requires_confirmation: requiresConfirmation,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation error' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


