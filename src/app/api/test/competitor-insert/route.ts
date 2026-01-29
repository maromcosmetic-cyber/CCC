import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/auth/server';

export async function POST(req: NextRequest) {
    try {
        const { projectId } = await req.json();

        if (!projectId) {
            return NextResponse.json({ error: 'projectId required' }, { status: 400 });
        }

        const supabase = await createServerSupabaseClient();

        // Check if user is authenticated
        const { data: { user } } = await supabase.auth.getUser();
        console.log('🔐 User:', user?.email, 'UID:', user?.id);

        // Try to insert a test competitor
        const testData = {
            project_id: projectId,
            name: 'Test Competitor',
            url: 'https://test.com',
            analysis_json: { test: true },
            last_analyzed_at: new Date().toISOString(),
            status: 'completed' as const
        };

        console.log('📝 Attempting insert:', testData);

        const { data, error } = await supabase
            .from('competitors')
            // @ts-ignore
            .insert(testData as any)
            .select()
            .single();

        if (error) {
            console.error('❌ Insert failed:', {
                code: error.code,
                message: error.message,
                details: error.details,
                hint: error.hint
            });

            return NextResponse.json({
                success: false,
                error: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint,
                user: { email: user?.email, id: user?.id }
            }, { status: 500 });
        }

        console.log('✅ Insert successful!', data);

        // Clean up - delete the test record
        await supabase.from('competitors').delete().eq('id', (data as any).id);

        return NextResponse.json({
            success: true,
            message: 'RLS policies are working correctly!',
            inserted: data,
            user: { email: user?.email, id: user?.id }
        });

    } catch (error: any) {
        console.error('💥 Test error:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}

