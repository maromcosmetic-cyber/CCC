'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/auth/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const setupSession = async () => {
      try {
        const supabase = createClient();

        // Check if there's already a session (from email link click)
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          console.log('[Reset Password] Session already exists');
          setSessionReady(true);
          setCheckingSession(false);
          return;
        }

        // Try to get code from URL (different parameter names Supabase might use)
        const code = searchParams.get('code') ||
          searchParams.get('token') ||
          searchParams.get('access_token');

        const type = searchParams.get('type');

        console.log('[Reset Password] URL params:', { code: !!code, type });

        if (!code) {
          setError('Invalid reset link. Please request a new password reset.');
          setCheckingSession(false);
          return;
        }

        // If type is recovery, exchange the code
        if (type === 'recovery') {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            console.error('[Reset Password] Exchange error:', exchangeError);
            setError('Invalid or expired reset link. Please request a new password reset.');
            setCheckingSession(false);
            return;
          }

          if (data.session) {
            console.log('[Reset Password] Session created from code exchange');
            setSessionReady(true);
          }
        } else {
          // Try verifying OTP as fallback
          const { data, error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: code,
            type: 'recovery',
          });

          if (verifyError) {
            console.error('[Reset Password] Verify error:', verifyError);
            setError('Invalid or expired reset link. Please request a new password reset.');
            setCheckingSession(false);
            return;
          }

          if (data.session) {
            console.log('[Reset Password] Session created from OTP verify');
            setSessionReady(true);
          }
        }
      } catch (err) {
        console.error('[Reset Password] Setup error:', err);
        setError('Failed to verify reset link. Please try again.');
      } finally {
        setCheckingSession(false);
      }
    };

    setupSession();
  }, [searchParams]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();

      console.log('[Reset Password] Updating password');

      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        console.error('[Reset Password] Update error:', updateError);
        setError(updateError.message);
        setLoading(false);
        return;
      }

      console.log('[Reset Password] Password updated successfully');
      setSuccess(true);
      setTimeout(() => {
        router.push('/auth/login');
      }, 2000);
    } catch (err) {
      console.error('[Reset Password] Exception:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full glass-card">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Password reset successful!</h1>
            <p className="text-muted-foreground text-sm">Redirecting to login...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full glass-card">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center text-white font-black text-xl">
              C
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center">Reset password</CardTitle>
          <CardDescription className="text-center">
            Enter your new password below
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-md flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {checkingSession && !error && (
            <div className="text-center py-8">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
              <p className="mt-4 text-sm text-muted-foreground">Verifying reset link...</p>
            </div>
          )}

          {sessionReady && !checkingSession && (
            <form onSubmit={handleReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="••••••••"
                  className="h-11"
                />
                <p className="text-xs text-muted-foreground">Must be at least 8 characters</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="••••••••"
                  className="h-11"
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full h-11">
                {loading ? 'Resetting password...' : 'Reset password'}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <a href="/auth/login" className="text-sm text-primary hover:underline font-medium">
              Back to login
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
