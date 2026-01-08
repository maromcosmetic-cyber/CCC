# Supabase Auth Configuration

## Email Confirmation Setup

After creating the auth callback route, you need to configure Supabase to redirect to it:

### Steps:

1. **Go to Supabase Dashboard:**
   - https://supabase.com/dashboard/project/vryuzsnranpemohjipmw/auth/url-configuration

2. **Set Redirect URLs:**
   - **Site URL:** `http://localhost:3000`
   - **Redirect URLs:** Add these:
     - `http://localhost:3000/auth/callback`
     - `http://localhost:3000/**` (for development)

3. **Email Templates:**
   - Go to: Authentication > Email Templates
   - Update the "Confirm signup" template
   - Make sure the confirmation link points to: `{{ .SiteURL }}/auth/callback?token={{ .TokenHash }}&type=signup`

### Alternative: Disable Email Confirmation (Development Only)

If you want to skip email confirmation for development:

1. Go to: Authentication > Settings
2. Find "Enable email confirmations"
3. **Disable it** (for development only - re-enable for production!)

### Testing Login

After confirming your email:
1. Go to: http://localhost:3000/auth/login
2. Enter your email and password
3. You should be redirected to the projects page

If login still fails:
- Check browser console for errors
- Verify your email is confirmed in Supabase dashboard
- Try resetting your password if needed


