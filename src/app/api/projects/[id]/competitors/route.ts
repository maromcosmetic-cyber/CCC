/**
 * Get competitors for a project
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/auth/server';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    console.log('📊 Fetching competitors for project:', projectId);

    const supabase = createServiceRoleClient();

    // Fetch competitors for this project
    const { data: competitors, error } = await supabase
      .from('competitors')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching competitors:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch competitors',
        details: error.message 
      }, { status: 500 });
    }

    console.log(`✅ Found ${competitors?.length || 0} competitors`);

    return NextResponse.json({
      competitors: competitors || [],
      count: competitors?.length || 0
    });

  } catch (error: any) {
    console.error('❌ Competitors API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

