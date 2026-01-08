// Admin API route to run migrations via Supabase REST API
// This uses the service role key to execute migrations

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Missing Supabase configuration. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Check if tables already exist
    const { data: existingTables, error: checkError } = await supabase
      .from('projects')
      .select('id')
      .limit(1);

    if (!checkError) {
      return NextResponse.json({
        success: true,
        message: 'Database already migrated - tables exist',
        tablesExist: true,
      });
    }

    // If we get here, tables don't exist - user needs to run migrations manually
    return NextResponse.json({
      success: false,
      message: 'Tables do not exist. Please run migrations via Supabase SQL Editor.',
      instructions: [
        '1. Go to https://supabase.com/dashboard/project/vryuzsnranpemohjipmw/sql/new',
        '2. Copy the contents of migrations-combined.sql (from line 14 onwards)',
        '3. Paste into the SQL Editor and click Run',
      ],
    }, { status: 400 });

  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Migration check failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
