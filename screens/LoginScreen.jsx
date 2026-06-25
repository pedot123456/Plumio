import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

export default function LoginScreen() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { session } = useAuth();

  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [errors, setErrors]             = useState({});
  const [serverError, setServerError]   = useState('');

  const signupSuccess = location.state?.signupSuccess;

  useEffect(() => {
    if (session) navigate('/', { replace: true });
  }, [session, navigate]);

  function validate() {
    const errs = {};
    if (!email.trim()) {
      errs.email = 'Email is required.';
    } else if (!isValidEmail(email)) {
      errs.email = 'Enter a valid email address.';
    }
    if (!password) errs.password = 'Password is required.';
    return errs;
  }

  async function handleLogin(e) {
    e.preventDefault();
    setServerError('');
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setLoading(false);
    if (error) setServerError(error.message);
  }

  function clearFieldError(field) {
    setErrors(prev => ({ ...prev, [field]: '' }));
    if (serverError) setServerError('');
  }

  const inputClass = hasError =>
    `w-full border rounded-lg px-4 py-3 text-gray-800 placeholder:text-gray-400 text-sm focus:outline-none focus:ring-2 transition-all ${
      hasError
        ? 'border-red-400 bg-red-50 focus:ring-red-300'
        : 'border-gray-200 focus:border-red-500 focus:ring-red-500/30'
    }`;

  return (
    <div className="min-h-screen flex bg-[#1c1917]">

      {/* ── Left: Branding panel (desktop only) ─────────────── */}
      <div className="hidden md:flex flex-1 flex-col items-center justify-center relative overflow-hidden px-12 py-16">
        {/* Ambient glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] bg-red-600/10 rounded-full blur-3xl" />
          <div className="absolute top-1/4 left-1/4 w-[280px] h-[280px] bg-orange-500/6 rounded-full blur-2xl" />
        </div>

        {/* Glassmorphism card */}
        <div className="relative z-10 flex flex-col items-center text-center backdrop-blur-sm bg-white/5 border border-white/10 rounded-2xl px-10 py-12 max-w-sm w-full">
          <img src="/Plumio.png" alt="Plumio Logo" className="h-32 mb-6 drop-shadow-lg" />
          <h1 className="text-white text-3xl font-bold tracking-tight mb-3">Plumio</h1>
          <p className="text-gray-400 text-base leading-relaxed">
            Nak beli selamat, nak jual cepat?{' '}
            <span className="text-red-400 font-semibold">Plumio kan ada!</span>
          </p>

          <div className="mt-8 w-full flex items-center justify-around pt-6 border-t border-white/10">
            <div className="flex flex-col items-center gap-1">
              <span className="text-white font-bold text-xl">500+</span>
              <span className="text-gray-500 text-xs">Listings</span>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="flex flex-col items-center gap-1">
              <span className="text-white font-bold text-xl">UTP</span>
              <span className="text-gray-500 text-xs">Verified</span>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="flex flex-col items-center gap-1">
              <span className="text-white font-bold text-xl">Safe</span>
              <span className="text-gray-500 text-xs">Escrow</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right: Auth form panel ───────────────────────────── */}
      <div className="flex flex-col items-center justify-center w-full md:w-[460px] shrink-0 px-6 py-12 md:px-12">

        {/* Mobile-only brand header */}
        <div className="flex flex-col items-center mb-8 md:hidden">
          <img src="/Plumio.png" alt="Plumio Logo" className="h-14 mb-2 object-contain" />
          <h1 className="text-white text-xl font-bold">Plumio</h1>
          <p className="text-gray-400 text-sm mt-1 text-center leading-snug">
            Nak beli selamat, nak jual cepat? Plumio kan ada!
          </p>
        </div>

        {/* White card */}
        <div className="bg-white rounded-xl p-8 w-full max-w-sm shadow-2xl">
          <h2 className="text-gray-900 text-xl font-bold mb-1">Welcome back</h2>
          <p className="text-gray-500 text-sm mb-6">Sign in to your Plumio account</p>

          {/* Signup success banner */}
          {signupSuccess && (
            <div className="mb-4 flex items-start gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
              <span
                className="material-symbols-outlined text-green-600 text-[18px] mt-px shrink-0"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                check_circle
              </span>
              <p className="text-green-700 text-sm leading-snug">
                Account created! Check your email to verify, then sign in below.
              </p>
            </div>
          )}

          {/* Server error */}
          {serverError && (
            <div className="mb-4 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <span className="material-symbols-outlined text-red-600 text-[18px] mt-px shrink-0">error</span>
              <p className="text-red-700 text-sm leading-snug">{serverError}</p>
            </div>
          )}

          <form onSubmit={handleLogin} noValidate className="flex flex-col gap-4">

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="loginEmail">
                Email
              </label>
              <input
                id="loginEmail"
                type="email"
                placeholder="you@university.edu.my"
                value={email}
                onChange={e => { setEmail(e.target.value); clearFieldError('email'); }}
                autoCapitalize="none"
                autoComplete="email"
                className={inputClass(!!errors.email)}
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1 ml-1">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="loginPassword">
                Password
              </label>
              <div className="relative">
                <input
                  id="loginPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => { setPassword(e.target.value); clearFieldError('password'); }}
                  autoComplete="current-password"
                  className={`${inputClass(!!errors.password)} pr-12`}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-xs mt-1 ml-1">{errors.password}</p>
              )}
            </div>

            {/* Forgot Password */}
            <div className="flex justify-end -mt-1">
              <button
                type="button"
                className="text-sm text-red-600 hover:text-red-700 font-medium transition-colors"
                onClick={() => navigate('/forgot-password')}
              >
                Forgot Password?
              </button>
            </div>

            {/* Sign In */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </>
              ) : (
                'Sign In'
              )}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-gray-400 text-sm">or</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Create Account */}
            <button
              type="button"
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-3 rounded-lg transition-colors text-sm"
              onClick={() => navigate('/signup')}
            >
              Create Account
            </button>

          </form>
        </div>

        <p className="text-gray-600 text-xs mt-6 text-center">
          By signing in you agree to Plumio's{' '}
          <span className="text-gray-400 underline cursor-pointer">Terms of Service</span>
          {' '}and{' '}
          <span className="text-gray-400 underline cursor-pointer">Privacy Policy</span>.
        </p>
      </div>
    </div>
  );
}
