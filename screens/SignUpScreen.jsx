import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

function validatePassword(pw) {
  if (pw.length < 8) return 'Must be at least 8 characters.';
  if (!/[A-Z]/.test(pw)) return 'Must contain at least one uppercase letter.';
  if (!/[0-9]/.test(pw)) return 'Must contain at least one number.';
  return null;
}

export default function SignUpScreen() {
  const navigate = useNavigate();
  const { session } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [verificationSent, setVerificationSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Password strength
  const strengthLevel = (() => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  })();
  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = ['', 'bg-error', 'bg-warning', 'bg-secondary', 'bg-success'];

  useEffect(() => {
    if (session) navigate('/', { replace: true });
  }, [session, navigate]);

  function clearFieldError(field) {
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
    if (serverError) setServerError('');
  }

  function validate() {
    const errs = {};
    if (!fullName.trim()) errs.fullName = 'Full name is required.';
    if (!email.trim()) {
      errs.email = 'Email is required.';
    } else if (!isValidEmail(email)) {
      errs.email = 'Enter a valid email address.';
    }
    const pwErr = validatePassword(password);
    if (pwErr) errs.password = pwErr;
    return errs;
  }

  async function handleSignUp(e) {
    e.preventDefault();
    setServerError('');
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { data: { full_name: fullName.trim() } },
    });

    if (!error && data.user) {
      // Insert profile row. upsert handles the case where a DB trigger already created it.
      await supabase.from('profiles').upsert(
        {
          id: data.user.id,
          full_name: fullName.trim(),
          email: email.trim().toLowerCase(),
        },
        { onConflict: 'id' }
      );
    }

    setLoading(false);
    if (error) {
      setServerError(error.message);
    } else if (!data.session) {
      // Email confirmation required — send to login with a success banner
      navigate('/login', { replace: true, state: { signupSuccess: true } });
    }
  }

  async function resendVerification() {
    if (resendCooldown > 0 || loading) return;
    setLoading(true);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim().toLowerCase(),
    });
    setLoading(false);
    if (error) {
      setServerError(error.message);
    } else {
      setResendCooldown(60);
      const timer = setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1) { clearInterval(timer); return 0; }
          return prev - 1;
        });
      }, 1000);
    }
  }

  function fieldClass(hasError) {
    return `w-full h-12 pl-12 pr-4 bg-surface-container-lowest border rounded-lg font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 transition-all duration-200 ${
      hasError
        ? 'border-error focus:ring-error/40 bg-error/5'
        : 'border-outline-variant/40 focus:ring-secondary focus:border-transparent'
    }`;
  }

  // ── Email verification screen ─────────────────────────────
  if (verificationSent) {
    return (
      <div className="bg-background min-h-screen flex items-center justify-center px-margin-mobile font-body-md">
        <div className="w-full max-w-sm mx-auto flex flex-col items-center text-center gap-lg animate-fade-in-up">
          <div className="w-[88px] h-[88px] bg-secondary-container/30 rounded-full flex items-center justify-center">
            <span
              className="material-symbols-outlined text-[44px] text-secondary"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              mark_email_unread
            </span>
          </div>
          <div>
            <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-primary mb-xs">Check your email</h1>
            <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
              We sent a verification link to{' '}
              <span className="font-semibold text-primary">{email}</span>.
              Click the link to activate your account.
            </p>
          </div>
          <div className="w-full bg-surface-container-low rounded-xl p-md flex items-start gap-sm text-left">
            <span className="material-symbols-outlined text-secondary text-[20px] mt-0.5 shrink-0">info</span>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              The link expires in 24 hours. Don't see it? Check your spam or junk folder.
            </p>
          </div>

          {serverError && (
            <div className="w-full flex items-start gap-sm bg-error/10 border border-error/30 rounded-lg px-md py-sm">
              <span className="material-symbols-outlined text-error text-[20px] shrink-0">error</span>
              <p className="font-body-sm text-body-sm text-error">{serverError}</p>
            </div>
          )}

          <button
            onClick={resendVerification}
            disabled={loading || resendCooldown > 0}
            className="w-full h-12 bg-primary-container text-on-primary font-label-md text-label-md rounded-xl hover:bg-primary active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-sm"
          >
            {loading ? (
              <>
                <span className="w-5 h-5 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
                Sending…
              </>
            ) : resendCooldown > 0 ? (
              `Resend in ${resendCooldown}s`
            ) : (
              'Resend Verification Email'
            )}
          </button>

          <button
            className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors flex items-center gap-xs"
            onClick={() => { setVerificationSent(false); setServerError(''); }}
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Back to Sign Up
          </button>
        </div>
      </div>
    );
  }

  // ── Main sign-up form ─────────────────────────────────────
  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col font-body-md">
      {/* Header */}
      <header className="flex justify-between items-center px-4 h-16 w-full bg-surface shadow-sm fixed top-0 z-50">
        <button
          className="p-2 text-on-surface-variant hover:bg-surface-container transition-colors rounded-full active:scale-95"
          onClick={() => navigate(-1)}
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="font-headline-sm text-headline-sm text-primary absolute left-1/2 -translate-x-1/2">
          Create Account
        </h1>
        <div className="w-10" />
      </header>

      <main className="flex-1 flex flex-col pt-20 px-margin-mobile md:px-lg overflow-y-auto pb-[120px]">
        {/* Progress */}
        <div className="mb-lg mt-sm">
          <div className="flex items-center justify-between mb-sm">
            <span className="font-label-sm text-label-sm text-secondary font-semibold">Step 1: Your Details</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">Step 2: Verify Email</span>
          </div>
          <div className="h-2 bg-surface-container rounded-full overflow-hidden">
            <div className="w-1/2 bg-secondary h-full transition-all duration-300 rounded-full" />
          </div>
        </div>

        {/* Server error */}
        {serverError && (
          <div className="flex items-start gap-sm bg-error/10 border border-error/30 rounded-lg px-md py-sm mb-md">
            <span className="material-symbols-outlined text-error text-[20px] mt-px shrink-0">error</span>
            <p className="font-body-sm text-body-sm text-error">{serverError}</p>
          </div>
        )}

        <form className="space-y-md flex-1" onSubmit={handleSignUp} noValidate>
          {/* Full Name */}
          <div className="flex flex-col gap-xs">
            <label className="font-label-md text-label-md text-on-surface ml-xs" htmlFor="fullName">
              Full Name
            </label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-sm text-on-surface-variant/70 z-10 text-[20px]">person</span>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={e => { setFullName(e.target.value); clearFieldError('fullName'); }}
                placeholder="Your full name"
                autoComplete="name"
                className={fieldClass(!!errors.fullName)}
              />
            </div>
            {errors.fullName && (
              <p className="font-label-sm text-label-sm text-error ml-xs flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">error</span>
                {errors.fullName}
              </p>
            )}
          </div>

          {/* Email */}
          <div className="flex flex-col gap-xs">
            <label className="font-label-md text-label-md text-on-surface ml-xs" htmlFor="signupEmail">
              Email
            </label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-sm text-on-surface-variant/70 z-10 text-[20px]">mail</span>
              <input
                id="signupEmail"
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); clearFieldError('email'); }}
                placeholder="you@university.edu.my"
                autoCapitalize="none"
                autoComplete="email"
                className={fieldClass(!!errors.email)}
              />
            </div>
            {errors.email && (
              <p className="font-label-sm text-label-sm text-error ml-xs flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">error</span>
                {errors.email}
              </p>
            )}
          </div>

          {/* Password */}
          <div className="flex flex-col gap-xs">
            <label className="font-label-md text-label-md text-on-surface ml-xs" htmlFor="signupPassword">
              Password
            </label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-sm text-on-surface-variant/70 z-10 text-[20px]">lock</span>
              <input
                id="signupPassword"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); clearFieldError('password'); }}
                placeholder="••••••••"
                autoComplete="new-password"
                className={`${fieldClass(!!errors.password)} pr-10`}
              />
              <button
                type="button"
                className="absolute right-sm text-on-surface-variant/70 hover:text-on-surface transition-colors"
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>

            {/* Password strength meter */}
            {password && (
              <div className="mt-xs">
                <div className="flex gap-1 mb-xs">
                  {[1, 2, 3, 4].map(i => (
                    <div
                      key={i}
                      className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${
                        i <= strengthLevel ? strengthColors[strengthLevel] : 'bg-surface-container-high'
                      }`}
                    />
                  ))}
                </div>
                <p className={`font-label-sm text-label-sm ml-xs ${
                  strengthLevel <= 1 ? 'text-error' : strengthLevel === 2 ? 'text-on-surface-variant' : 'text-secondary'
                }`}>
                  {strengthLabels[strengthLevel]}
                </p>
              </div>
            )}

            {errors.password && (
              <p className="font-label-sm text-label-sm text-error ml-xs flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">error</span>
                {errors.password}
              </p>
            )}

            {!errors.password && (
              <p className="font-label-sm text-label-sm text-on-surface-variant ml-xs">
                8+ chars, one uppercase letter, one number.
              </p>
            )}
          </div>

          {/* DuitNow Section */}
          <div className="bg-surface-container-low rounded-xl p-md border border-outline-variant/30 mt-lg">
            <h2 className="font-headline-sm text-headline-sm text-primary mb-xs">
              Payment Setup{' '}
              <span className="font-body-sm text-body-sm text-on-surface-variant">(Optional)</span>
            </h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-md">
              Link your DuitNow QR for seamless marketplace transactions.
            </p>
            <button
              type="button"
              className="w-full h-12 bg-surface-container-lowest border border-outline-variant/30 rounded-lg flex items-center justify-between px-md hover:bg-surface-container transition-colors group"
            >
              <div className="flex items-center gap-sm">
                <span className="material-symbols-outlined text-secondary">qr_code_scanner</span>
                <span className="font-label-md text-label-md text-on-surface group-hover:text-primary transition-colors">
                  Link DuitNow QR
                </span>
              </div>
              <span className="bg-secondary-container text-on-secondary-container font-label-sm text-label-sm px-2 py-1 rounded-full whitespace-nowrap">
                Zero-Friction Selling
              </span>
            </button>
          </div>
        </form>
      </main>

      {/* Pinned CTA */}
      <div className="fixed bottom-0 left-0 w-full px-margin-mobile md:px-lg pb-md md:pb-lg pt-sm bg-surface-bright border-t border-outline-variant/20 z-50">
        <button
          onClick={handleSignUp}
          disabled={loading}
          className="w-full h-14 bg-primary-container text-on-primary font-label-md text-label-md rounded-xl hover:bg-primary active:scale-[0.98] transition-all shadow-level-2 flex items-center justify-center gap-sm disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <span className="w-5 h-5 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
              Creating Account…
            </>
          ) : (
            <>
              Verify &amp; Create Account
              <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
            </>
          )}
        </button>
        <p className="text-center mt-sm font-body-sm text-body-sm text-on-surface-variant">
          Already have an account?{' '}
          <button
            type="button"
            className="text-secondary font-label-sm hover:text-secondary/70 transition-colors"
            onClick={() => navigate('/login')}
          >
            Log In
          </button>
        </p>
      </div>
    </div>
  );
}
