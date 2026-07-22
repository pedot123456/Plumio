import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

const MY_BANKS = [
  'Maybank',
  'CIMB Bank',
  'Public Bank',
  'RHB Bank',
  'Hong Leong Bank',
  'AmBank',
  'Bank Rakyat',
  'Bank Islam Malaysia',
  'Bank Muamalat Malaysia',
  'BSN (Bank Simpanan Nasional)',
  'OCBC Bank Malaysia',
  'Standard Chartered Malaysia',
  'HSBC Bank Malaysia',
  'Affin Bank',
  'Alliance Bank Malaysia',
  'Agrobank',
];

const SELLER_STATS = [
  { value: '10k+', label: 'Active Sellers' },
  { value: 'RM 0', label: 'Listing Fees' },
  { value: '100%', label: 'Escrow Safe' },
];

export default function SignUpScreen() {
  const navigate    = useNavigate();
  const { session } = useAuth();

  // Account fields
  const [fullName,      setFullName]      = useState('');
  const [email,         setEmail]         = useState('');
  const [password,      setPassword]      = useState('');
  const [showPassword,  setShowPassword]  = useState(false);

  // Payout fields
  const [bankName,      setBankName]      = useState('');
  const [accountName,   setAccountName]   = useState('');
  const [accountNumber, setAccountNumber] = useState('');

  // UI state
  const [loading,      setLoading]      = useState(false);
  const [errors,       setErrors]       = useState({});
  const [serverError,  setServerError]  = useState('');

  // Password strength (0-4)
  const strengthLevel = (() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 8)          s++;
    if (/[A-Z]/.test(password))        s++;
    if (/[0-9]/.test(password))        s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strengthLevel];
  const strengthColor = ['', '#ef4444', '#f59e0b', '#8b5cf6', '#22c55e'][strengthLevel];

  useEffect(() => {
    if (session) navigate('/', { replace: true });
  }, [session, navigate]);

  function clearErr(field) {
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
    if (serverError)   setServerError('');
  }

  function validate() {
    const errs = {};

    if (!fullName.trim()) errs.fullName = 'Full name is required.';
    if (!email.trim())    errs.email    = 'Email is required.';
    else if (!isValidEmail(email)) errs.email = 'Enter a valid email address.';
    if (!password)        errs.password = 'Password is required.';
    else {
      if (password.length < 8)         errs.password = 'Must be at least 8 characters.';
      else if (!/[A-Z]/.test(password)) errs.password = 'Must contain at least one uppercase letter.';
      else if (!/[0-9]/.test(password)) errs.password = 'Must contain at least one number.';
    }

    // Payout fields are optional — but if any is touched, all must be filled
    const digits = accountNumber.replace(/\D/g, '');
    const partial = !!(bankName || accountName.trim() || accountNumber.trim());
    const complete = !!(bankName && accountName.trim() && accountNumber.trim());
    if (partial && !complete) {
      if (!bankName)            errs.bankName      = 'Please select your bank.';
      if (!accountName.trim())  errs.accountName   = 'Account holder name is required.';
      if (!accountNumber.trim())errs.accountNumber = 'Account number is required.';
    }
    if (complete && (digits.length < 10 || digits.length > 16)) {
      errs.accountNumber = 'Enter a valid 10–16 digit account number.';
    }

    return errs;
  }

  async function handleSignUp(e) {
    e?.preventDefault();
    setServerError('');
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email:    email.trim().toLowerCase(),
      password,
      options:  {
        data:         { full_name: fullName.trim() },
        // Without this, Supabase falls back to the dashboard's static "Site URL",
        // which sends the confirmation email link to whatever that's set to
        // (often still localhost from local dev) instead of wherever this signup
        // actually happened — same fix already applied to OAuth/password-reset below.
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (!error && data.user) {
      const profileData = {
        id:        data.user.id,
        full_name: fullName.trim(),
        email:     email.trim().toLowerCase(),
      };
      if (bankName && accountName.trim() && accountNumber.trim()) {
        profileData.bank_name      = bankName;
        profileData.account_name   = accountName.trim();
        profileData.account_number = accountNumber.replace(/\D/g, '');
      }
      await supabase.from('profiles').upsert(profileData, { onConflict: 'id' });
    }

    setLoading(false);
    if (error) {
      setServerError(error.message);
    } else if (!data.session) {
      navigate('/login', { replace: true, state: { signupSuccess: true } });
    }
  }

  const fieldClass = hasError =>
    `w-full border rounded-xl px-4 py-3 text-gray-800 placeholder:text-gray-400 text-sm
     focus:outline-none focus:ring-2 transition-all ${
       hasError
         ? 'border-red-400 bg-red-50 focus:ring-red-200'
         : 'border-gray-300 focus:border-[#A855F7] focus:ring-[#A855F7]/20'
     }`;

  return (
    <div className="min-h-screen w-full flex" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ── LEFT COLUMN: Brand ── */}
      <div className="hidden lg:flex w-1/2 bg-[#1E1B4B] flex-col items-center justify-center relative overflow-hidden px-16">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-purple-600/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full bg-indigo-500/15 blur-2xl pointer-events-none" />
        <div className="absolute top-1/3 right-8 w-40 h-40 rounded-full bg-violet-400/10 blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center max-w-xs">
          <img src="/Plumio.png" alt="Plumio" className="h-36 mb-6 drop-shadow-2xl" />
          <h1 className="text-white text-4xl font-extrabold tracking-tight mb-3">Plumio</h1>
          <p className="text-gray-300 text-base leading-relaxed mb-10">
            Start selling in minutes.{' '}
            <span className="text-purple-300 font-semibold">Plumio handles secure payments so you can focus on great deals.</span>
          </p>
          <div className="w-full grid grid-cols-3 gap-4 pt-8 border-t border-white/10">
            {SELLER_STATS.map((s, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <span className="text-white font-bold text-lg leading-tight">{s.value}</span>
                <span className="text-gray-400 text-xs leading-tight">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT COLUMN: Form ── */}
      <div className="flex w-full lg:w-1/2 bg-white justify-center px-6 py-10 overflow-y-auto">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="flex flex-col items-center mb-8 lg:hidden">
            <img src="/Plumio.png" alt="Plumio" className="h-20 mb-3 object-contain drop-shadow-md" />
            <span className="text-gray-800 font-black text-3xl tracking-tight">Plumio</span>
          </div>

          <h2 className="text-gray-900 text-2xl font-bold mb-1">Create your account</h2>
          <p className="text-gray-500 text-sm mb-7">Join thousands of sellers and buyers on Plumio</p>

          {/* Server error */}
          {serverError && (
            <div className="mb-5 flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <span className="material-symbols-outlined text-red-500 text-[18px] mt-px shrink-0">error</span>
              <p className="text-red-700 text-sm leading-snug">{serverError}</p>
            </div>
          )}

          <form onSubmit={handleSignUp} noValidate className="flex flex-col gap-5">

            {/* ── SECTION: Account Details ── */}

            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="fullName">
                Full Name
              </label>
              <input
                id="fullName"
                type="text"
                placeholder="Your full name"
                value={fullName}
                onChange={e => { setFullName(e.target.value); clearErr('fullName'); }}
                autoComplete="name"
                className={fieldClass(!!errors.fullName)}
              />
              {errors.fullName && (
                <p className="text-red-500 text-xs mt-1.5 ml-0.5">{errors.fullName}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="signupEmail">
                Email
              </label>
              <input
                id="signupEmail"
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={e => { setEmail(e.target.value); clearErr('email'); }}
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
              <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="signupPassword">
                Password
              </label>
              <div className="relative">
                <input
                  id="signupPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => { setPassword(e.target.value); clearErr('password'); }}
                  autoComplete="new-password"
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

              {/* Strength meter */}
              {password && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4].map(i => (
                      <div
                        key={i}
                        className="flex-1 h-1.5 rounded-full transition-all duration-300"
                        style={{ backgroundColor: i <= strengthLevel ? strengthColor : '#e5e7eb' }}
                      />
                    ))}
                  </div>
                  <p className="text-xs font-medium" style={{ color: strengthColor }}>
                    {strengthLabel}
                  </p>
                </div>
              )}

              {errors.password ? (
                <p className="text-red-500 text-xs mt-1.5 ml-0.5">{errors.password}</p>
              ) : (
                <p className="text-gray-400 text-xs mt-1.5">8+ chars, one uppercase letter, one number.</p>
              )}
            </div>

            {/* ── SECTION: Payout Account ── */}
            <div className="flex items-center gap-3 pt-1">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-gray-400 text-xs font-semibold tracking-widest uppercase whitespace-nowrap">
                Payout Account
              </span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Info banner */}
            <div className="bg-purple-50 border border-purple-100 rounded-xl px-4 py-3 flex items-start gap-3 -mt-1">
              <span
                className="material-symbols-outlined text-[#A855F7] text-[18px] mt-px shrink-0"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                account_balance
              </span>
              <p className="text-xs text-purple-800 leading-relaxed">
                <strong>Optional — add anytime in Settings.</strong> Plumio uses these details to release
                escrow payouts directly to your bank when a sale completes. Your data is stored securely.
              </p>
            </div>

            {/* Bank dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="bankName">
                Bank
              </label>
              <div className="relative">
                <select
                  id="bankName"
                  value={bankName}
                  onChange={e => { setBankName(e.target.value); clearErr('bankName'); }}
                  className={`${fieldClass(!!errors.bankName)} appearance-none pr-10`}
                >
                  <option value="">Select your bank</option>
                  {MY_BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px] pointer-events-none">
                  expand_more
                </span>
              </div>
              {errors.bankName && (
                <p className="text-red-500 text-xs mt-1.5 ml-0.5">{errors.bankName}</p>
              )}
            </div>

            {/* Account holder name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="accountName">
                Account Holder Name
              </label>
              <input
                id="accountName"
                type="text"
                placeholder="As stated on your bank card"
                value={accountName}
                onChange={e => { setAccountName(e.target.value); clearErr('accountName'); }}
                autoComplete="cc-name"
                className={fieldClass(!!errors.accountName)}
              />
              {errors.accountName ? (
                <p className="text-red-500 text-xs mt-1.5 ml-0.5">{errors.accountName}</p>
              ) : (
                <p className="text-gray-400 text-xs mt-1.5">Enter your name exactly as it appears on your bank account.</p>
              )}
            </div>

            {/* Account number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="accountNumber">
                Bank Account Number
              </label>
              <input
                id="accountNumber"
                type="text"
                inputMode="numeric"
                placeholder="e.g. 1234 5678 9012"
                value={accountNumber}
                onChange={e => { setAccountNumber(e.target.value); clearErr('accountNumber'); }}
                className={fieldClass(!!errors.accountNumber)}
              />
              {errors.accountNumber ? (
                <p className="text-red-500 text-xs mt-1.5 ml-0.5">{errors.accountNumber}</p>
              ) : (
                <p className="text-gray-400 text-xs mt-1.5">10–16 digits. Spaces are removed automatically.</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#A855F7] hover:bg-purple-600 disabled:bg-purple-300 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm shadow-sm mt-1"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account…
                </>
              ) : (
                'Create Account'
              )}
            </button>

            {/* Sign in link */}
            <p className="text-center text-sm text-gray-500">
              Already have an account?{' '}
              <button
                type="button"
                className="text-[#A855F7] hover:underline font-semibold"
                onClick={() => navigate('/login')}
              >
                Sign In
              </button>
            </p>

          </form>

          {/* Footer */}
          <p className="text-center text-xs text-gray-400 mt-8 leading-relaxed">
            By creating an account you agree to Plumio's{' '}
            <Link to="/terms" className="underline hover:text-gray-600 transition-colors">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link to="/privacy" className="underline hover:text-gray-600 transition-colors">
              Privacy Policy
            </Link>.
          </p>

        </div>
      </div>
    </div>
  );
}
