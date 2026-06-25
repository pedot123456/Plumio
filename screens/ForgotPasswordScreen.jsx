import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

export default function ForgotPasswordScreen() {
  const navigate = useNavigate();

  const [email, setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [sent, setSent]     = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!isValidEmail(email)) { setError('Enter a valid email address.'); return; }
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: `${window.location.origin}/reset-password` }
    );
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-[#1c1917] flex items-center justify-center px-6">
        <div className="bg-white rounded-xl p-8 w-full max-w-sm shadow-2xl flex flex-col items-center text-center gap-4">
          <span
            className="material-symbols-outlined text-[52px] text-green-500"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            mark_email_unread
          </span>
          <div>
            <h2 className="text-gray-900 text-xl font-bold mb-2">Check your inbox</h2>
            <p className="text-gray-500 text-sm leading-relaxed">
              We sent a password reset link to{' '}
              <span className="font-semibold text-gray-800">{email}</span>.
              Click the link to create a new password.
            </p>
          </div>
          <div className="w-full bg-gray-50 rounded-lg px-4 py-3 flex items-start gap-2 text-left">
            <span className="material-symbols-outlined text-gray-400 text-[18px] mt-px shrink-0">info</span>
            <p className="text-gray-500 text-xs leading-relaxed">
              The link expires in 1 hour. Check your spam or junk folder if you don't see it.
            </p>
          </div>
          <button
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors text-sm"
            onClick={() => navigate('/login')}
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1c1917] flex items-center justify-center px-6">
      <div className="bg-white rounded-xl p-8 w-full max-w-sm shadow-2xl">

        <button
          className="flex items-center gap-1 text-gray-500 hover:text-gray-700 text-sm mb-6 transition-colors -ml-1"
          onClick={() => navigate('/login')}
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Back to Sign In
        </button>

        <h2 className="text-gray-900 text-xl font-bold mb-1">Forgot password?</h2>
        <p className="text-gray-500 text-sm mb-6">
          Enter your account email and we'll send you a reset link.
        </p>

        {error && (
          <div className="mb-4 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <span className="material-symbols-outlined text-red-600 text-[18px] mt-px shrink-0">error</span>
            <p className="text-red-700 text-sm leading-snug">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="resetEmail">
              Email
            </label>
            <input
              id="resetEmail"
              type="email"
              placeholder="you@university.edu.my"
              value={email}
              onChange={e => { setEmail(e.target.value); if (error) setError(''); }}
              autoCapitalize="none"
              autoComplete="email"
              className={`w-full border rounded-lg px-4 py-3 text-gray-800 placeholder:text-gray-400 text-sm focus:outline-none focus:ring-2 transition-all ${
                error
                  ? 'border-red-400 bg-red-50 focus:ring-red-300'
                  : 'border-gray-200 focus:border-red-500 focus:ring-red-500/30'
              }`}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Sending…
              </>
            ) : (
              'Send Reset Link'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
