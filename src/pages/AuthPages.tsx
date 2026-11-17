import React, { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, ImagePlus, Lock, Mail, ShieldCheck, User, X } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { validateAndCompressImageFile } from '../lib/imageUtils.ts';
import { BrandLogo } from '../components/BrandLogo.tsx';

export const AuthPage: React.FC = () => {
  const { navParams, navigate, signInWithGoogle, registerWithCredentials, loginWithCredentials, showToast } = useApp();
  const [mode, setMode] = useState<'login' | 'register'>(navParams.authMode || 'login');
  const [displayName, setDisplayName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [pendingPhotoDataUrl, setPendingPhotoDataUrl] = useState('');
  const [isUnder18, setIsUnder18] = useState(true);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [guardianConsent, setGuardianConsent] = useState(false);
  const [guardianContact, setGuardianContact] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err?.message || 'Google Sign-In could not complete. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'register') {
      if (displayName.trim().length < 2) {
        return setError('Please enter your full name or display name.');
      }
      if (password.length < 8) {
        return setError('Password must be at least 8 characters long.');
      }
      if (password !== confirmPassword) {
        return setError('Passwords do not match.');
      }
      if (!ageConfirmed) {
        return setError('Please confirm your age declaration to continue.');
      }
      if (isUnder18 && (!guardianConsent || !guardianContact.trim())) {
        return setError('Students under 18 require guardian consent confirmation and guardian email/phone.');
      }
    }

    setLoading(true);
    try {
      if (mode === 'register') {
        await registerWithCredentials({
          displayName: displayName.trim(),
          identifier: identifier.trim(),
          password,
          photoUrl: photoUrl.trim() || undefined,
          pendingPhotoDataUrl: pendingPhotoDataUrl || undefined,
          ageConfirmed,
          guardianConsent: isUnder18 ? guardianConsent : true,
          guardianContact: isUnder18 ? guardianContact.trim() : undefined,
        });
      } else {
        await loginWithCredentials(identifier.trim(), password);
      }
    } catch (err: any) {
      const msg = err?.message || 'Authentication failed.';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <button
        onClick={() => navigate('welcome')}
        className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-6 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Welcome</span>
      </button>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8">
        <div className="mb-5 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <BrandLogo size="md" subtitle="Official Student Portal" />
        </div>

        <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg mb-6">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError('');
            }}
            className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors cursor-pointer ${
              mode === 'login'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError('');
            }}
            className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors cursor-pointer ${
              mode === 'register'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Student Register
          </button>
        </div>

        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
          {mode === 'login' ? 'Sign in to AI STUDENTS' : 'Create your student account'}
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {mode === 'login'
            ? 'Access your chapters, AI Teacher, tests, and personal timetable.'
            : 'Set up your Class 10, 11, or 12 preparation workspace safely.'}
        </p>

        {/* Primary Google Sign-In */}
        <button
          type="button"
          onClick={handleGoogle}
          disabled={loading}
          className="mt-6 w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-semibold text-slate-800 dark:text-slate-100 transition-colors cursor-pointer disabled:opacity-60"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
            />
          </svg>
          <span>Continue with Google (Recommended for Cloud Sync)</span>
        </button>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
          <span className="text-xs text-slate-400">or use email / mobile</span>
          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
        </div>

        {error && (
          <div role="alert" className="mb-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-sm text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Student Name / Display Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g., Aarav Kumar"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Email Address or Mobile Number
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="student@example.com or 9876543210"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full pl-9 pr-10 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Toggle password visibility"
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {mode === 'register' && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Profile Photo (Optional — Upload or Paste URL)
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  {pendingPhotoDataUrl && (
                    <div className="relative w-12 h-12 rounded-full overflow-hidden border border-indigo-300 dark:border-indigo-700 shrink-0">
                      <img src={pendingPhotoDataUrl} alt="Selected profile preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setPendingPhotoDataUrl('')}
                        aria-label="Remove selected photo"
                        className="absolute inset-0 bg-slate-950/50 text-white flex items-center justify-center opacity-0 hover:opacity-100 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <label className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer">
                    <ImagePlus className="w-4 h-4" />
                    <span>{pendingPhotoDataUrl ? 'Change Photo' : 'Choose Photo'}</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        e.target.value = '';
                        if (!file) return;
                        try {
                          const compressed = await validateAndCompressImageFile(file, {
                            maxDimension: 600,
                            maxBytes: 600_000,
                          });
                          setPendingPhotoDataUrl(compressed.dataUrl);
                          setError('');
                        } catch (err: any) {
                          setError(err?.message || 'Invalid profile image.');
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                  <input
                    type="url"
                    value={photoUrl}
                    onChange={(e) => setPhotoUrl(e.target.value)}
                    placeholder="or https://..."
                    className="flex-1 min-w-[160px] px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                  <ShieldCheck className="w-4 h-4 text-indigo-700 dark:text-indigo-400" />
                  <span>Student Safety &amp; Guardian Consent</span>
                </div>

                <label className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ageConfirmed}
                    onChange={(e) => setAgeConfirmed(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300"
                  />
                  <span>I confirm that I am a school student (or parent/guardian registering on a student’s behalf) and agree to responsible educational use.</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isUnder18}
                    onChange={(e) => setIsUnder18(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <span>Student is under 18 years old (parent/guardian consent applies)</span>
                </label>

                {isUnder18 && (
                  <div className="space-y-2.5 pt-1">
                    <label className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={guardianConsent}
                        onChange={(e) => setGuardianConsent(e.target.checked)}
                        className="mt-0.5 rounded border-slate-300"
                      />
                      <span>Parent / Legal Guardian has reviewed and consented to this student account.</span>
                    </label>
                    <input
                      type="text"
                      value={guardianContact}
                      onChange={(e) => setGuardianContact(e.target.value)}
                      placeholder="Parent / Guardian Email or Mobile"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                    />
                  </div>
                )}
              </div>
            </>
          )}

          {mode === 'login' && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => navigate('forgot-password')}
                className="text-xs font-medium text-indigo-700 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                Forgot password?
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg transition-colors cursor-pointer disabled:opacity-60"
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <button
            type="button"
            onClick={() => navigate('help-support')}
            className="font-medium text-indigo-700 dark:text-indigo-400 hover:underline cursor-pointer"
          >
            Account &amp; Login Help / Contact Support
          </button>
          <button
            type="button"
            onClick={() => navigate('privacy-policy')}
            className="hover:underline cursor-pointer"
          >
            Privacy Policy
          </button>
        </div>
      </div>
    </div>
  );
};

export const ForgotPasswordPage: React.FC = () => {
  const { navigate, showToast } = useApp();
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [identifier, setIdentifier] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      setMessage(data.message);
      if (data.deliveryConfigured) {
        setStep('reset');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, code, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reset failed');
      showToast('Password updated. Please sign in.', 'success');
      navigate('auth', { authMode: 'login' });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <button
        onClick={() => navigate('auth', { authMode: 'login' })}
        className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-6 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Sign In</span>
      </button>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 space-y-4">
        <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <BrandLogo size="sm" subtitle="Account Recovery" />
        </div>
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
          Recover your password
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Enter your registered email or mobile number. Note that accounts created with Google Sign-In use Google Account Recovery.
        </p>

        {error && (
          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-sm text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}
        {message && (
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-sm text-emerald-700 dark:text-emerald-300">
            {message}
          </div>
        )}

        {step === 'request' ? (
          <form onSubmit={handleRequest} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Email or Mobile Number
              </label>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="student@example.com"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 text-sm font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer"
            >
              {loading ? 'Sending...' : 'Request Recovery'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="6-digit recovery code"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
            />
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password (8+ characters)"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 text-sm font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer"
            >
              Reset Password
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
