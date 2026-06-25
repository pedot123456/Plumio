import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

const STATS = [
  { value: '500k+', label: 'Listings' },
  { value: 'Trusted', label: 'Sellers' },
  { value: 'Safe', label: 'Escrow' },
];

export default function LoginScreen() {
  const navigate     = useNavigate();
  const location     = useLocation();
  const { session }  = useAuth();

  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [staySignedIn, setStaySignedIn] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [errors, setErrors]             = useState({});
  const [serverError, setServerError]   = useState('');

  const signupSuccess = location.state?.signupSuccess;

  useEffect(() => {
    if (session) navigate('/', { replace: true });
  }, [session, navigate]);

  function validate() {
    const errs = {};
    if (!email.trim()) errs.email = 'Email is required.';
    else if (!isValidEmail(email)) errs.email = 'Enter a valid email address.';
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

  const fieldClass = hasError =>
    `w-full border rounded-xl px-4 py-3 text-gray-800 placeholder:text-gray-400 text-sm
     focus:outline-none focus:ring-2 transition-all ${
       hasError
         ? 'border-red-400 bg-red-50 focus:ring-red-200'
         : 'border-gray-300 focus:border-[#A855F7] focus:ring-[#A855F7]/20'
     }`;

  return (
    <div className="h-screen w-full flex" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ── LEFT COLUMN: Brand ──────────────────────────────────── */}
      <div className="hidden lg:flex w-1/2 bg-[#1E1B4B] flex-col items-center justify-center relative overflow-hidden px-16">

        {/* Decorative background circles */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-purple-600/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full bg-indigo-500/15 blur-2xl pointer-events-none" />
        <div className="absolute top-1/3 right-8 w-40 h-40 rounded-full bg-violet-400/10 blur-xl pointer-events-none" />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center text-center max-w-xs">
          <img src="/Plumio.png" alt="Plumio Logo" className="h-20 mb-6 drop-shadow-2xl" />

          <h1 className="text-white text-4xl font-extrabold tracking-tight mb-3">
            Plumio
          </h1>

          <p className="text-gray-300 text-base leading-relaxed mb-10">
            Nak beli selamat, nak jual cepat?{' '}
            <span className="text-purple-300 font-semibold">Plumio kan ada!</span>
          </p>

          {/* Stats grid */}
          <div className="w-full grid grid-cols-3 gap-4 pt-8 border-t border-white/10">
            {STATS.map((stat, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <span className="text-white font-bold text-lg leading-tight">{stat.value}</span>
                <span className="text-gray-400 text-xs leading-tight">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT COLUMN: Form ──────────────────────────────────── */}
      <div className="flex w-full lg:w-1/2 bg-white items-center justify-center px-6 py-10 overflow-y-auto">
        <div className="w-full max-w-md">

          {/* Mobile-only logo */}
          <div className="flex flex-col items-center mb-8 lg:hidden">
            <img src="/Plumio.png" alt="Plumio" className="h-14 mb-2 object-contain" />
            <span className="text-gray-800 font-bold text-lg">Plumio</span>
            <p className="text-gray-400 text-sm mt-1 text-center">
              Nak beli selamat, nak jual cepat? Plumio kan ada!
            </p>
          </div>

          {/* Heading */}
          <h2 className="text-gray-900 text-2xl font-bold mb-1">Welcome back</h2>
          <p className="text-gray-500 text-sm mb-7">Sign in to your Plumio account</p>

          {/* Signup success banner */}
          {signupSuccess && (
            <div className="mb-5 flex items-start gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
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
            <div className="mb-5 flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <span className="material-symbols-outlined text-red-500 text-[18px] mt-px shrink-0">error</span>
              <p className="text-red-700 text-sm leading-snug">{serverError}</p>
            </div>
          )}

          <form onSubmit={handleLogin} noValidate className="flex flex-col gap-5">

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="loginEmail">
                Email
              </label>
              <input
                id="loginEmail"
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={e => { setEmail(e.target.value); clearFieldError('email'); }}
                autoCapitalize="none"
                autoComplete="email"
                className={fieldClass(!!errors.email)}
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1.5 ml-0.5">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="loginPassword">
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
                  className={`${fieldClass(!!errors.password)} pr-12`}
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
                <p className="text-red-500 text-xs mt-1.5 ml-0.5">{errors.password}</p>
              )}
            </div>

            {/* Stay Signed In + Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none group">
                <input
                  type="checkbox"
                  checked={staySignedIn}
                  onChange={e => setStaySignedIn(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-[#A855F7] accent-[#A855F7] cursor-pointer"
                />
                <span className="text-sm text-gray-600 group-hover:text-gray-800 transition-colors">
                  Stay Signed In
                </span>
              </label>
              <button
                type="button"
                className="text-sm text-[#A855F7] hover:underline font-medium transition-colors"
                onClick={() => navigate('/forgot-password')}
              >
                Forgot Password?
              </button>
            </div>

            {/* Sign In button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#A855F7] hover:bg-purple-600 disabled:bg-purple-300 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm shadow-sm"
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

            {/* OR divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-gray-400 text-xs font-medium tracking-widest uppercase">OR</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Social buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                className="flex items-center justify-center gap-2 border border-gray-300 rounded-xl py-2.5 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                {/* Facebook icon */}
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="#1877F2">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                Facebook
              </button>
              <button
                type="button"
                className="flex items-center justify-center gap-2 border border-gray-300 rounded-xl py-2.5 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                {/* Google icon */}
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Google
              </button>
            </div>

            {/* Create account link */}
            <p className="text-center text-sm text-gray-500">
              Don't have an account?{' '}
              <button
                type="button"
                className="text-[#A855F7] hover:underline font-semibold"
                onClick={() => navigate('/signup')}
              >
                Create Account
              </button>
            </p>

          </form>

          {/* Footer */}
          <p className="text-center text-xs text-gray-400 mt-8 leading-relaxed">
            By signing in you agree to Plumio's{' '}
            <span className="underline cursor-pointer hover:text-gray-600 transition-colors">
              Terms of Service
            </span>{' '}
            and{' '}
            <span className="underline cursor-pointer hover:text-gray-600 transition-colors">
              Privacy Policy
            </span>.
          </p>

        </div>
      </div>
    </div>
  );
}
