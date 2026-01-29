
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js"; // Use server client logic or direct if simpler
import nodemailer from "nodemailer";
import { Database } from "@/types/database";

// In API routes we might need a service role or just verify the user's session
// For simplicity assuming passed project_id and validation
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { project_id, to, subject, html } = body;

        // 1. Get SMTP Settings
        const supabase = createClient<Database>(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY! // Need service key to read encrypted pass ideally, or just standard access
        );

        // Wait, for client side calls we usually use cookies.
        // But for sending, we need the SMTP settings.
        const { data: settings, error } = await supabase
            .from('email_settings')
            .select('*')
            .eq('project_id', project_id)
            .single();

        if (error || !settings) {
            return NextResponse.json({ error: "SMTP Settings not found" }, { status: 404 });
        }

        // 2. Create Transporter
        const s = settings as any; // Cast for type safety workaround
        let transporterConfig: any = {
            host: s.smtp_host || 'smtp.gmail.com',
            port: s.smtp_port || 587,
            secure: s.smtp_secure !== false,
            auth: {
                user: s.smtp_user,
                pass: s.smtp_pass,
            },
        };

        // If OAuth tokens exist, override auth
        if (s.gmail_access_token) {
            transporterConfig = {
                service: 'gmail',
                auth: {
                    type: 'OAuth2',
                    user: s.sender_email,
                    accessToken: s.gmail_access_token,
                    refreshToken: s.gmail_refresh_token,
                    // Note: Refreshing might fail if ClientID/Secret are not provided here 
                    // and not inferred by nodemailer from environment.
                    // For now, we rely on the access token being valid (fresh login).
                }
            };
        }

        // Use settings for from address
        const fromAddress = `"${s.sender_name}" <${s.sender_email}>`;

        const transporter = nodemailer.createTransport(transporterConfig);

        // 3. Send
        const info = await transporter.sendMail({
            from: fromAddress,
            to: to, // or array
            subject: subject,
            html: html,
        });

        return NextResponse.json({ success: true, messageId: info.messageId });

    } catch (error: any) {
        console.error("Email Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
