import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/auth/server';

export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const competitorId = searchParams.get('id');
        const deleteAll = searchParams.get('deleteAll') === 'true';
        const projectId = searchParams.get('projectId');

        const supabase = createServiceRoleClient();

        if (deleteAll && projectId) {
            // Delete all competitors for the project
            const { error } = await supabase
                .from('competitors')
                .delete()
                .eq('project_id', projectId);

            if (error) {
                console.error('Error deleting all competitors:', error);
                return NextResponse.json({ error: error.message }, { status: 500 });
            }

            return NextResponse.json({ success: true, message: 'All competitors deleted' });
        } else if (competitorId) {
            // Delete single competitor
            const { error } = await supabase
                .from('competitors')
                .delete()
                .eq('id', competitorId);

            if (error) {
                console.error('Error deleting competitor:', error);
                return NextResponse.json({ error: error.message }, { status: 500 });
            }

            return NextResponse.json({ success: true, message: 'Competitor deleted' });
        } else {
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }
    } catch (error: any) {
        console.error('Delete competitor error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
