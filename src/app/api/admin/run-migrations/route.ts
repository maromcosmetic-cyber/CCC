// Admin API route to run migrations using service role
// This bypasses RLS and can execute raw SQL

import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { Client } from 'pg';
import { supabaseAdmin } from '@/lib/db/client';

export async function POST(request: NextRequest) {
  try {
    // Security: In production, add proper admin authentication
    // For now, this is a development helper
    
    const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
    
    if (!databaseUrl) {
      return NextResponse.json(
        { error: 'DATABASE_URL not configured' },
        { status: 500 }
      );
    }

    // Parse connection string
    const urlMatch = databaseUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
    if (!urlMatch) {
      return NextResponse.json(
        { error: 'Invalid DATABASE_URL format' },
        { status: 500 }
      );
    }

    const [, user, password, host, port, database] = urlMatch;

    const client = new Client({
      host,
      port: parseInt(port),
      database,
      user,
      password,
      ssl: {
        rejectUnauthorized: false,
      },
    });

    try {
      await client.connect();
      
      const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
      const files = readdirSync(migrationsDir)
        .filter((file) => file.endsWith('.sql'))
        .sort();

      const results = [];

      for (const file of files) {
        const filePath = join(migrationsDir, file);
        const sql = readFileSync(filePath, 'utf-8');

        try {
          await client.query(sql);
          results.push({ file, status: 'success' });
        } catch (error) {
          if (error instanceof Error && error.message.includes('already exists')) {
            results.push({ file, status: 'skipped', message: 'Already exists' });
          } else {
            results.push({ file, status: 'error', error: error instanceof Error ? error.message : 'Unknown error' });
            throw error;
          }
        }
      }

      await client.end();

      return NextResponse.json({
        success: true,
        message: 'Migrations completed',
        results,
      });
    } catch (error) {
      await client.end();
      throw error;
    }
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Migration failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}


