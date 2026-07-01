import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

export default function ForgotPasswordScreen() {
  const navigate = useNavigate();

  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [sent,    setSent]    = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!isValidEmail(email)) { setError('Enter a valid email address.'); return; }
    setError('');
    setLoading(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: `${window.location.origin}/reset-password` }
    );
    setLoading(false);
    if (err) setError(err.message);
    else setSent(true);
  }

  return (
    <div className="h-screen w-full flex" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ── LEFT PANEL: Brand (desktop) ──────────────────────────── */}
      <div className="hidden lg:flex w-1/2 bg-[#1E1B4B] flex-col items-center justify-center relative overflow-hidden px-16">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-purple-600/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full bg-indigo-500/15 blur-2xl pointer-events-none" />
        <div className="absolute top-1/3 right-8 w-40 h-40 rounded-full bg-violet-400/10 blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center max-w-xs">
          <img src="/Plumio.png" alt="Plumio" className="h-36 mb-6 drop-shadow-2xl" />
          <h1 className="text-white text-4xl font-extrabold tracking-tight mb-3">Plumio</h1>
          <p className="text-gray-300 text-base leading-relaxed mb-10">
            Nak beli selamat, nak jual cepat?{' '}
            <span className="text-purple-300 font-semibold">Plumio kan ada!</span>
          </p>
          <div className="w-full pt-8 border-t border-white/10 flex flex-col gap-3">
            <div className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3">
              <span className="material-symbols-outlined text-purple-300 text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>lock_reset</span>
              <p className="text-gray-300 text-sm text-left leading-snug">Reset link sent instantly to your inbox</p>
            </div>
            <div className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3">
              <span className="material-symbols-outlined text-purple-300 text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
              <p className="text-gray-300 text-sm text-left leading-snug">Your account stays protected</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL: Form ────────────────────────────────────── */}
      <div className="flex w-full lg:w-1/2 bg-white items-center justify-center px-6 py-10 overflow-y-auto">
        <div className="w-full max-w-md">

          {/* Mobile-only logo */}
          <div className="flex flex-col items-center mb-8 lg:hidden">
            <img src="/Plumio.png" alt="Plumio" className="h-24 mb-3 object-contain drop-shadow-md" />
            <span className="text-gray-800 font-black text-3xl tracking-tight">Plumio</span>
          </div>

          {/* Back link */}
          <button
            className="flex items-center gap-1 text-gray-400 hover:text-[#A855F7] text-sm mb-7 transition-colors -ml-1 group"
            onClick={() => navigate('/login')}
          >
            <span className="material-symbols-outlined text-[18px] group-hover:-translate-x-0.5 transition-transform">arrow_back</span>
            Back to Sign In
          </button>

          {!sent ? (
            <>
              {/* Heading */}
              <div className="mb-7">
                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-[#A855F7] text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>lock_reset</span>
                </div>
                <h2 className="text-gray-900 text-2xl font-bold mb-1">Forgot your password?</h2>
                <p className="text-gray-500 text-sm leading-relaxed">
                  No worries. Enter your account email and we'll send you a reset link right away.
                </p>
              </div>

              {/* Error banner */}
              {error && (
                <div className="mb-5 flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <span className="material-symbols-outlined text-red-500 text-[18px] mt-px shrink-0">error</span>
                  <p className="text-red-700 text-sm leading-snug">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700" htmlFor="resetEmail">
                    Email address
                  </label>
                  <div className={`flex items-center border rounded-xl px-4 gap-2 transition-all focus-within:ring-2 ${
                    error
                      ? 'border-red-400 bg-red-50 focus-within:ring-red-200'
                      : 'border-gray-200 focus-within:border-[#A855F7] focus-within:ring-[#A855F7]/20'
                  }`}>
                    <span className={`material-symbols-outlined text-[20px] shrink-0 ${error ? 'text-red-400' : 'text-gray-400'}`}>alternate_email</span>
                    <input
                      id="resetEmail"
                      type="email"
                      placeholder="you@university.edu.my"
                      value={email}
                      onChange={e => { setEmail(e.target.value); if (error) setError(''); }}
                      autoCapitalize="none"
                      autoComplete="email"
                      className="flex-1 py-3 text-gray-800 placeholder:text-gray-400 text-sm bg-transparent focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#A855F7] hover:bg-[#9333EA] disabled:bg-purple-300 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm shadow-sm shadow-purple-200"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending…
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">send</span>
                      Send Reset Link
                    </>
                  )}
                </button>
              </form>

              <p className="text-center text-gray-400 text-xs mt-6">
                Remember your password?{' '}
                <button
                  onClick={() => navigate('/login')}
                  className="text-[#A855F7] font-semibold hover:underline"
                >
                  Sign in
                </button>
              </p>
            </>
          ) : (
            /* ── Success state ── */
            <div className="flex flex-col items-center text-center gap-5 py-4">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                <span
                  className="material-symbols-outlined text-green-500"
                  style={{ fontSize: 44, fontVariationSettings: "'FILL' 1" }}
                >
                  mark_email_unread
                </span>
              </div>

              <div>
                <h2 className="text-gray-900 text-2xl font-bold mb-2">Check your inbox</h2>
                <p className="text-gray-500 text-sm leading-relaxed max-w-xs">
                  We sent a reset link to{' '}
                  <span className="font-semibold text-gray-800">{email}</span>.
                  Click the link to create a new password.
                </p>
              </div>

              <div className="w-full bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2 text-left">
                <span className="material-symbols-outlined text-amber-500 text-[18px] mt-px shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>info</span>
                <p className="text-amber-700 text-xs leading-relaxed">
                  The link expires in <span className="font-semibold">1 hour</span>. Check your spam or junk folder if you don't see it.
                </p>
              </div>

              <button
                className="w-full bg-[#A855F7] hover:bg-[#9333EA] text-white font-bold py-3 rounded-xl transition-colors text-sm flex items-center justify-center gap-2 shadow-sm shadow-purple-200"
                onClick={() => navigate('/login')}
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                Back to Sign In
              </button>

              <button
                className="text-gray-400 text-sm hover:text-[#A855F7] transition-colors"
                onClick={() => { setSent(false); setEmail(''); }}
              >
                Use a different email
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
