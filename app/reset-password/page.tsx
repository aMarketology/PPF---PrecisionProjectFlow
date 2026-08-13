'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Eye, EyeOff, Lock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Guard against React StrictMode double-mount burning single-use codes
  const hasExecutedRef = useRef(false);

  const hasMinLength = password.length >= 8;
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordsMatch = password === confirmPassword && confirmPassword !== '';

  const isFormValid = hasMinLength && hasLowercase && hasNumber && passwordsMatch && !loading;

  const getPasswordStrength = (pwd: string) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    if (score <= 2) return { strength: 33, label: 'Weak', color: 'bg-red-500' };
    if (score <= 4) return { strength: 66, label: 'Medium', color: 'bg-yellow-500' };
    return { strength: 100, label: 'Strong', color: 'bg-green-500' };
  };

  const passwordStrength = getPasswordStrength(password);

  useEffect(() => {
    let mounted = true;
    let timerId: ReturnType<typeof setTimeout>;
    const supabase = createClient();

    const checkTokenAndSession = async () => {
      // Prevent React StrictMode double-execution from burning single-use code
      if (hasExecutedRef.current) {
        console.log('[reset-password] Skipping duplicate execution (StrictMode guard)');
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          if (session) setIsValidToken(true);
          setValidating(false);
        }
        return;
      }
      hasExecutedRef.current = true;

      try {
        const tokenHash = searchParams.get('token_hash');
        const code = searchParams.get('code');
        const type = (searchParams.get('type') || 'recovery') as 'recovery' | 'email';
        console.log('[reset-password] token_hash:', tokenHash ? tokenHash.substring(0, 8) + '...' : 'none', 'code:', code ? code.substring(0, 8) + '...' : 'none');

        if (tokenHash) {
          const { error: verifyError } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
          console.log('[reset-password] verifyOtp:', verifyError ? verifyError.message : 'success');
          if (verifyError) throw verifyError;
        } else if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          console.log('[reset-password] exchangeCodeForSession:', exchangeError ? exchangeError.message : 'success');
          if (exchangeError) throw exchangeError;
        }

        // Session may not be ready immediately — retry after delay
        const { data: { session } } = await supabase.auth.getSession();
        console.log('[reset-password] getSession:', session ? 'session found' : 'no session');

        if (mounted) {
          if (session) {
            setIsValidToken(true);
            setValidating(false);
          } else {
            // Retry after 1.5s — session propagation can be delayed
            timerId = setTimeout(async () => {
              const { data: { session: retrySession } } = await supabase.auth.getSession();
              if (mounted) {
                if (retrySession) {
                  setIsValidToken(true);
                } else {
                  setIsValidToken(false);
                  setError('Invalid or expired reset link. Please request a new one.');
                }
                setValidating(false);
              }
            }, 1500);
          }
        }
      } catch (err: any) {
        console.error('[reset-password] error:', err);
        if (mounted) {
          setIsValidToken(false);
          setError(err.message || 'Invalid or expired reset link. Please request a new one.');
          setValidating(false);
        }
      }
    };

    checkTokenAndSession();

    return () => {
      mounted = false;
      if (timerId) clearTimeout(timerId);
    };
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setSuccess(true);
      setTimeout(() => router.push('/login?message=Password updated successfully'), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#003D82]" />
        <p className="text-sm text-gray-500">Verifying security token...</p>
      </div>
    );
  }

  if (!isValidToken && !success) {
    return (
      <div className="rounded-xl bg-red-50 p-6 text-center border border-red-200">
        <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
        <h3 className="mt-2 text-lg font-semibold text-red-800">Invalid Reset Link</h3>
        <p className="mt-1 text-sm text-red-600">{error || 'This password reset link is invalid or has expired.'}</p>
        <div className="mt-6">
          <Link href="/forgot-password" className="inline-flex items-center rounded-lg bg-[#003D82] px-4 py-2 text-sm font-medium text-white hover:bg-[#002960] transition">
            Request New Reset Link
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="rounded-xl bg-green-50 p-6 text-center border border-green-200">
        <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
        <h3 className="mt-2 text-lg font-semibold text-green-800">Password Reset Complete!</h3>
        <p className="mt-1 text-sm text-green-600">Your password has been successfully updated. Redirecting you to sign in...</p>
        <div className="mt-6">
          <Link href="/login" className="inline-flex items-center rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition">
            Sign In Now
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 p-4 border border-red-200 flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Lock className="h-5 w-5 text-gray-400" />
          </div>
          <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
            className="block w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003D82] focus:border-[#003D82] text-sm"
            placeholder="••••••••" required />
          <button type="button" onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600">
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
        {password && (
          <div className="mt-2 space-y-1">
            <div className="flex justify-between items-center text-xs text-gray-500">
              <span>Strength:</span>
              <span className="font-medium">{passwordStrength.label}</span>
            </div>
            <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div className={`h-full transition-all duration-300 ${passwordStrength.color}`} style={{ width: `${passwordStrength.strength}%` }} />
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Lock className="h-5 w-5 text-gray-400" />
          </div>
          <input type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
            className="block w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003D82] focus:border-[#003D82] text-sm"
            placeholder="••••••••" required />
          <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600">
            {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <div className="rounded-lg bg-gray-50 p-4 border border-gray-200 text-xs space-y-2">
        <p className="font-medium text-gray-700">Password requirements:</p>
        <div className="grid grid-cols-2 gap-2 text-gray-600">
          <div className="flex items-center space-x-1.5">
            <CheckCircle2 className={`h-4 w-4 ${hasMinLength ? 'text-green-500' : 'text-gray-300'}`} />
            <span>At least 8 characters</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <CheckCircle2 className={`h-4 w-4 ${hasLowercase ? 'text-green-500' : 'text-gray-300'}`} />
            <span>Lowercase letter</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <CheckCircle2 className={`h-4 w-4 ${hasNumber ? 'text-green-500' : 'text-gray-300'}`} />
            <span>At least 1 number</span>
          </div>
          <div className="col-span-2 flex items-center space-x-1.5">
            <CheckCircle2 className={`h-4 w-4 ${passwordsMatch ? 'text-green-500' : 'text-gray-300'}`} />
            <span>Passwords match</span>
          </div>
        </div>
      </div>

      <button type="submit" disabled={!isFormValid}
        className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[#003D82] hover:bg-[#002960] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#003D82] disabled:opacity-50 disabled:cursor-not-allowed transition">
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Update Password'}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="mt-2 text-center text-2xl font-bold tracking-tight text-gray-900">Reset Your Password</h2>
          <p className="mt-2 text-center text-sm text-gray-600">Please enter your new password below.</p>
        </div>
        <Suspense fallback={<div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-[#003D82]" /></div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}