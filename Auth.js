import React, { useState } from 'react';
import { supabase } from './supabase';
import './Auth.css';

// Validates email format — accepts any domain (Gmail, Yahoo, custom, etc.)
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

// Commercial-grade password rules
function validatePassword(pw) {
  if (pw.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Z]/.test(pw)) return 'Must contain at least one uppercase letter.';
  if (!/[0-9]/.test(pw)) return 'Must contain at least one number.';
  return null;
}

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [verificationSent, setVerificationSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  function clearError() {
    if (errorMsg) setErrorMsg('');
  }

  async function signInWithEmail() {
    setErrorMsg('');
    if (!isValidEmail(email)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setErrorMsg('Please enter your password.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) setErrorMsg(error.message);
    setLoading(false);
  }

  async function signUpWithEmail() {
    setErrorMsg('');
    if (!isValidEmail(email)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    const pwError = validatePassword(password);
    if (pwError) {
      setErrorMsg(pwError);
      return;
    }

    setLoading(true);
    const { data: { session }, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      setErrorMsg(error.message);
    } else if (!session) {
      // Supabase requires email confirmation — show verification screen
      setVerificationSent(true);
    }
    setLoading(false);
  }

  async function resendVerification() {
    if (resendCooldown > 0) return;
    setLoading(true);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim().toLowerCase(),
    });
    setLoading(false);
    if (error) {
      setErrorMsg(error.message);
    } else {
      // Start 60-second cooldown to prevent spam
      setResendCooldown(60);
      const timer = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) { clearInterval(timer); return 0; }
          return prev - 1;
        });
      }, 1000);
    }
  }

  // ── Verification sent screen ─────────────────────────────
  if (verificationSent) {
    return (
      <div className="auth-container">
        <div className="auth-box verify-box">
          <div className="verify-icon">✉️</div>
          <h2 className="verify-title">Check your email</h2>
          <p className="verify-body">
            We sent a verification link to <strong>{email}</strong>.
            Click the link to activate your account — it expires in 24 hours.
          </p>
          <p className="verify-hint">Don't see it? Check your spam folder.</p>

          {errorMsg && <p className="auth-error">{errorMsg}</p>}

          <button
            className="auth-button signin-button"
            onClick={resendVerification}
            disabled={loading || resendCooldown > 0}
          >
            {resendCooldown > 0
              ? `Resend in ${resendCooldown}s`
              : loading ? 'Sending…' : 'Resend Verification Email'}
          </button>

          <button
            className="auth-link-btn"
            onClick={() => { setVerificationSent(false); setErrorMsg(''); }}
          >
            ← Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  // ── Main auth screen ─────────────────────────────────────
  return (
    <div className="auth-container">
      <h1 className="app-title">Plumio</h1>
      <p className="app-subtitle">Buy and sell, closer to home</p>

      <div className="auth-box">
        <input
          className={`auth-input ${errorMsg ? 'auth-input-error' : ''}`}
          onChange={(e) => { setEmail(e.target.value); clearError(); }}
          value={email}
          placeholder="you@example.com"
          autoCapitalize="none"
          autoComplete="email"
          type="email"
        />
        <input
          className={`auth-input ${errorMsg ? 'auth-input-error' : ''}`}
          onChange={(e) => { setPassword(e.target.value); clearError(); }}
          value={password}
          type="password"
          placeholder="Password"
          autoComplete="current-password"
        />

        {/* Inline error — replaces alert() */}
        {errorMsg && <p className="auth-error">{errorMsg}</p>}

        <button
          className="auth-button signin-button"
          disabled={loading}
          onClick={signInWithEmail}
        >
          {loading ? 'Please wait…' : 'Sign In'}
        </button>

        <div className="auth-divider">
          <div className="auth-divider-line" />
          <span className="auth-divider-text">or</span>
          <div className="auth-divider-line" />
        </div>

        <button
          className="auth-button signup-button"
          disabled={loading}
          onClick={signUpWithEmail}
        >
          {loading ? 'Please wait…' : 'Create Account'}
        </button>
      </div>

      <p className="auth-footer">
        Password must be 8+ characters, include an uppercase letter and a number.
      </p>
    </div>
  );
}
