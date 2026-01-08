
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
        let transporterConfig: any = {
            host: settings.smtp_host || 'smtp.gmail.com',
            port: settings.smtp_port || 587,
            secure: settings.smtp_secure !== false,
            auth: {
                user: settings.smtp_user,
                pass: settings.smtp_pass,
            },
        };

        // If OAuth tokens exist, override auth
        if (settings.gmail_access_token) {
            transporterConfig = {
                service: 'gmail',
                auth: {
                    type: 'OAuth2',
                    user: settings.sender_email,
                    accessToken: settings.gmail_access_token,
                    refreshToken: settings.gmail_refresh_token,
                    // Note: Refreshing might fail if ClientID/Secret are not provided here 
                    // and not inferred by nodemailer from environment.
                    // For now, we rely on the access token being valid (fresh login).
                }
            };
        }

        const transporter = nodemailer.createTransport(transporterConfig);

        // 3. Send
        const info = await transporter.sendMail({
            from: `"${settings.sender_name}" <${settings.sender_email}>`,
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
