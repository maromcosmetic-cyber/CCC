'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/auth/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email || !password) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    try {
      // Use API route to handle login server-side (sets cookies properly)
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      let response;
      try {
        response = await fetch('/api/auth/signin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ email, password }),
          signal: controller.signal,
        });
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          setError('Request timed out. Please check your connection and try again.');
        } else {
          setError('Network error. Please check your connection and try again.');
        }
        setLoading(false);
        return;
      }

      clearTimeout(timeoutId);

      let result;
      try {
        result = await response.json();
      } catch (jsonError) {
        setError('Invalid response from server. Please try again.');
        setLoading(false);
        return;
      }

      if (!response.ok || result.error) {
        setError(result.error || 'Sign in failed');
        setLoading(false);
        return;
      }

      if (result.user) {
        // Wait for cookies to be set
        await new Promise(resolve => setTimeout(resolve, 500));
        setLoading(false);

        // Redirect to studio overview
        window.location.replace('/studio/overview');
      } else {
        setError('Sign in failed. Please try again.');
        setLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full glass-card">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center text-white font-black text-xl">
              C
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center">Welcome back</CardTitle>
          <CardDescription className="text-center">
            Sign in to your CCC account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-md text-destructive text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="your@email.com"
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="h-11"
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full h-11">
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          <div className="mt-6 space-y-3">
            <div className="text-center">
              <button
                type="button"
                onClick={async () => {
                  if (!email) {
                    setError('Please enter your email first');
                    return;
                  }
                  try {
                    const supabase = createClient();
                    const { error } = await supabase.auth.resetPasswordForEmail(email, {
                      redirectTo: `${window.location.origin}/auth/reset-password`,
                    });
                    if (error) {
                      setError(error.message);
                    } else {
                      setError('');
                      alert('Password reset email sent! Check your inbox.');
                    }
                  } catch (err) {
                    setError('Failed to send reset email');
                  }
                }}
                className="text-sm text-primary hover:underline font-medium"
              >
                Forgot password?
              </button>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Don't have an account?{' '}
                <a href="/auth/signup" className="text-primary hover:underline font-medium">
                  Sign up
                </a>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
