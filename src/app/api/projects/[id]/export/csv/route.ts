// Export project data as CSV

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db/client';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;

    // Fetch campaigns for CSV export
    const { data: campaigns } = await supabase
      .from('campaigns')
      .select('*')
      .eq('project_id', projectId);

    // Convert to CSV
    if (!campaigns || campaigns.length === 0) {
      return NextResponse.json({ error: 'No data to export' }, { status: 404 });
    }

    const headers = ['id', 'platform', 'name', 'status', 'budget_amount', 'budget_currency', 'created_at'];
    const csvRows = [
      headers.join(','),
      ...campaigns.map((campaign) =>
        headers.map((header) => {
          const value = (campaign as any)[header];
          return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
        }).join(',')
      ),
    ];

    const csv = csvRows.join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="project-${projectId}-campaigns.csv"`,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


