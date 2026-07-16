import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

export default function ResetPasswordScreen() {
  const navigate = useNavigate();

  const [mode,    setMode]    = useState('loading'); // loading | form | error | success
  const [errorMsg, setErrorMsg] = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [formErr,  setFormErr]  = useState('');

  useEffect(() => {
    const hash   = window.location.hash.slice(1);
    const params = new URLSearchParams(hash);

    if (params.get('error')) {
      const raw = params.get('error_description') ?? 'The reset link is invalid or has expired.';
      setErrorMsg(raw.replace(/\+/g, ' '));
      setMode('error');
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('form');
      }
    });

    const timer = setTimeout(() => {
      setMode(prev => prev === 'loading' ? 'error' : prev);
      setErrorMsg('Could not verify your reset link. Please request a new one.');
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setFormErr('');
    if (password.length < 8) { setFormErr('Password must be at least 8 characters.'); return; }
    if (password !== confirm)  { setFormErr('Passwords do not match.'); return; }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) setFormErr(error.message);
    else setMode('success');
  }

  return (
    <div className="h-screen w-full flex" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ── LEFT PANEL ── */}
      <div className="hidden lg:flex w-1/2 bg-[#1E1B4B] flex-col items-center justify-center relative overflow-hidden px-16">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-purple-600/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full bg-indigo-500/15 blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center text-center max-w-xs">
          <img src="/Plumio.png" alt="Plumio" className="h-36 mb-6 drop-shadow-2xl" />
          <h1 className="text-white text-4xl font-extrabold tracking-tight mb-3">Plumio</h1>
          <p className="text-gray-300 text-base leading-relaxed mb-10">
            Set a strong new password to{' '}
            <span className="text-purple-300 font-semibold">keep your account secure.</span>
          </p>
          <div className="w-full pt-8 border-t border-white/10 flex flex-col gap-3">
            <div className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3">
              <span className="material-symbols-outlined text-purple-300 text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>password</span>
              <p className="text-gray-300 text-sm text-left leading-snug">Use at least 8 characters</p>
            </div>
            <div className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3">
              <span className="material-symbols-outlined text-purple-300 text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
              <p className="text-gray-300 text-sm text-left leading-snug">Mix letters, numbers, and symbols</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="flex w-full lg:w-1/2 bg-white items-center justify-center px-6 py-10 overflow-y-auto">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="flex flex-col items-center mb-8 lg:hidden">
            <img src="/Plumio.png" alt="Plumio" className="h-24 mb-3 object-contain drop-shadow-md" />
            <span className="text-gray-800 font-black text-3xl tracking-tight">Plumio</span>
          </div>

          {/* LOADING */}
          {mode === 'loading' && (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <div className="w-10 h-10 border-4 border-purple-200 border-t-[#A855F7] rounded-full animate-spin" />
              <p className="text-gray-500 text-sm">Verifying your reset link…</p>
            </div>
          )}

          {/* ERROR */}
          {mode === 'error' && (
            <div className="flex flex-col items-center text-center gap-5 py-4">
              <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-red-500" style={{ fontSize: 44, fontVariationSettings: "'FILL' 1" }}>
                  link_off
                </span>
              </div>
              <div>
                <h2 className="text-gray-900 text-2xl font-bold mb-2">Link expired</h2>
                <p className="text-gray-500 text-sm leading-relaxed max-w-xs">
                  {errorMsg || 'This reset link is no longer valid.'}
                </p>
              </div>
              <div className="w-full bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2 text-left">
                <span className="material-symbols-outlined text-amber-500 text-[18px] mt-px shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>info</span>
                <p className="text-amber-700 text-xs leading-relaxed">
                  Reset links expire after <span className="font-semibold">1 hour</span>. Request a new one to continue.
                </p>
              </div>
              <button
                className="w-full bg-[#A855F7] hover:bg-[#9333EA] text-white font-bold py-3 rounded-xl transition-colors text-sm flex items-center justify-center gap-2 shadow-sm shadow-purple-200"
                onClick={() => navigate('/forgot-password')}
              >
                <span className="material-symbols-outlined text-[18px]">refresh</span>
                Request new link
              </button>
              <button
                className="text-gray-400 text-sm hover:text-[#A855F7] transition-colors"
                onClick={() => navigate('/login')}
              >
                Back to Sign In
              </button>
            </div>
          )}

          {/* FORM */}
          {mode === 'form' && (
            <>
              <button
                className="flex items-center gap-1 text-gray-400 hover:text-[#A855F7] text-sm mb-7 transition-colors -ml-1 group"
                onClick={() => navigate('/login')}
              >
                <span className="material-symbols-outlined text-[18px] group-hover:-translate-x-0.5 transition-transform">arrow_back</span>
                Back to Sign In
              </button>

              <div className="mb-7">
                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-[#A855F7] text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>lock_reset</span>
                </div>
                <h2 className="text-gray-900 text-2xl font-bold mb-1">Set new password</h2>
                <p className="text-gray-500 text-sm leading-relaxed">
                  Choose a strong password for your Plumio account.
                </p>
              </div>

              {formErr && (
                <div className="mb-5 flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <span className="material-symbols-outlined text-red-500 text-[18px] mt-px shrink-0">error</span>
                  <p className="text-red-700 text-sm leading-snug">{formErr}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700" htmlFor="newPassword">New password</label>
                  <div className="flex items-center border border-gray-200 rounded-xl px-4 gap-2 transition-all focus-within:border-[#A855F7] focus-within:ring-2 focus-within:ring-[#A855F7]/20">
                    <span className="material-symbols-outlined text-gray-400 text-[20px] shrink-0">lock</span>
                    <input
                      id="newPassword"
                      type={showPw ? 'text' : 'password'}
                      placeholder="Min. 8 characters"
                      value={password}
                      onChange={e => { setPassword(e.target.value); setFormErr(''); }}
                      autoComplete="new-password"
                      className="flex-1 py-3 text-gray-800 placeholder:text-gray-400 text-sm bg-transparent focus:outline-none"
                    />
                    <button type="button" onClick={() => setShowPw(v => !v)} className="text-gray-400 hover:text-gray-600 transition-colors shrink-0">
                      <span className="material-symbols-outlined text-[20px]">{showPw ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700" htmlFor="confirmPassword">Confirm password</label>
                  <div className="flex items-center border border-gray-200 rounded-xl px-4 gap-2 transition-all focus-within:border-[#A855F7] focus-within:ring-2 focus-within:ring-[#A855F7]/20">
                    <span className="material-symbols-outlined text-gray-400 text-[20px] shrink-0">lock_check</span>
                    <input
                      id="confirmPassword"
                      type={showPw ? 'text' : 'password'}
                      placeholder="Repeat your password"
                      value={confirm}
                      onChange={e => { setConfirm(e.target.value); setFormErr(''); }}
                      autoComplete="new-password"
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
                      Updating…
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">check_circle</span>
                      Update password
                    </>
                  )}
                </button>
              </form>
            </>
          )}

          {/* SUCCESS */}
          {mode === 'success' && (
            <div className="flex flex-col items-center text-center gap-5 py-4">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-green-500" style={{ fontSize: 44, fontVariationSettings: "'FILL' 1" }}>
                  check_circle
                </span>
              </div>
              <div>
                <h2 className="text-gray-900 text-2xl font-bold mb-2">Password updated!</h2>
                <p className="text-gray-500 text-sm leading-relaxed max-w-xs">
                  Your password has been changed. Sign in with your new password.
                </p>
              </div>
              <button
                className="w-full bg-[#A855F7] hover:bg-[#9333EA] text-white font-bold py-3 rounded-xl transition-colors text-sm flex items-center justify-center gap-2 shadow-sm shadow-purple-200"
                onClick={() => navigate('/login')}
              >
                <span className="material-symbols-outlined text-[18px]">login</span>
                Sign in now
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
