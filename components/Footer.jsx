import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';

// Columns of the multi-column corporate/e-commerce footer.
// `protected: true` routes require a session — clicking while logged out
// sends the user to /login instead, matching TopAppBar/BottomNav's pattern.
const COLUMNS = [
  {
    heading: 'Shop',
    links: [
      { label: 'Browse Categories', path: '/categories' },
      { label: 'Search Nearby',     path: '/search' },
      { label: 'Sell an Item',      path: '/create-listing', protected: true },
      { label: 'My Cart',           path: '/cart',           protected: true },
    ],
  },
  {
    heading: 'Account',
    links: [
      { label: 'My Profile',  path: '/profile',     protected: true },
      { label: 'My Listings', path: '/my-listings', protected: true },
      { label: 'Wallet',      path: '/wallet',      protected: true },
      { label: 'Settings',    path: '/settings',    protected: true },
    ],
  },
  {
    heading: 'Support',
    links: [
      { label: 'Help Centre',    path: '/help' },
      { label: 'Chat Support',   path: '/support-chat',  protected: true },
      { label: 'Report an Issue', path: '/report',       protected: true },
      { label: 'My Orders',      path: '/transactions',  protected: true },
    ],
  },
];

// Mirrors SecureCartScreen's PAYMENT_METHODS — the only methods actually
// wired up at checkout, so the footer doesn't promise anything unsupported.
const PAYMENT_BADGES = [
  { id: 'duitnow', label: 'DuitNow QR',            icon: 'qr_code_2' },
  { id: 'grabpay', label: 'GrabPay',                icon: 'account_balance_wallet' },
  { id: 'fpx',     label: 'FPX Online Banking',     icon: 'account_balance' },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Footer() {
  const navigate    = useNavigate();
  const { session } = useAuth();

  const [email,     setEmail]     = useState('');
  const [subStatus, setSubStatus] = useState('idle'); // idle | loading | success | error
  const [subError,  setSubError]  = useState('');
  // Accordion state — mobile only (md+ always shows every column open, see JSX below)
  const [openCols, setOpenCols] = useState({});
  const toggleCol = (heading) => setOpenCols(prev => ({ ...prev, [heading]: !prev[heading] }));

  const goIfAuth = (path, isProtected) => {
    if (isProtected && !session) navigate('/login');
    else navigate(path);
  };

  async function handleSubscribe(e) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      setSubStatus('error');
      setSubError('Please enter a valid email address.');
      return;
    }
    setSubStatus('loading');
    setSubError('');
    const { error } = await supabase.from('newsletter_subscribers').insert({ email: trimmed });
    if (error) {
      // Unique constraint violation — already subscribed is a success state, not an error
      if (error.code === '23505') {
        setSubStatus('success');
      } else {
        setSubStatus('error');
        setSubError('Something went wrong — please try again.');
      }
    } else {
      setSubStatus('success');
    }
  }

  return (
    <footer className="bg-[#2d1943] text-white mt-xxl">
      <div className="max-w-7xl mx-auto w-full px-6 sm:px-8 py-8 md:py-12 grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-8">

        {/* Brand column — bio text hidden on mobile so nav accordions aren't pushed below the fold */}
        <div className="flex flex-col gap-1.5 md:gap-4 pb-4 md:pb-0">
          <Link to="/" className="flex items-center gap-2 w-fit">
            <img src="/Plumio.png" alt="Plumio" className="h-9 w-auto object-contain rounded-md" />
            <span className="font-black text-lg tracking-tight">Plumio</span>
          </Link>
          <p className="hidden md:block text-purple-300 text-sm leading-relaxed max-w-[220px]">
            Purple Picks, Better Deals — a secure local marketplace for local entrepreneurs and everyday sellers.
          </p>
        </div>

        {/* Link columns — collapsible accordion on mobile, always-open columns on md+ */}
        {COLUMNS.map(col => {
          const isOpen = !!openCols[col.heading];
          return (
            <div key={col.heading} className="flex flex-col border-t border-white/10 md:border-none">
              <button
                type="button"
                onClick={() => toggleCol(col.heading)}
                aria-expanded={isOpen}
                className="md:pointer-events-none flex items-center justify-between w-full min-h-[48px] md:min-h-0 py-2 md:py-0 md:mb-4"
              >
                <h3 className="font-extrabold text-[15px] uppercase tracking-wider text-white">
                  {col.heading}
                </h3>
                <span
                  className={`material-symbols-outlined text-[20px] text-purple-300 transition-transform duration-200 md:hidden ${isOpen ? 'rotate-180' : ''}`}
                >
                  expand_more
                </span>
              </button>
              <ul className={`${isOpen ? 'flex' : 'hidden'} md:flex flex-col gap-1 pb-3 md:pb-0`}>
                {col.links.map(link => (
                  <li key={link.path}>
                    <button
                      onClick={() => goIfAuth(link.path, link.protected)}
                      className="text-sm text-purple-200/80 hover:text-white transition-colors duration-200 text-left min-h-[44px] md:min-h-0 md:py-1 flex items-center w-full"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Newsletter signup */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto w-full px-6 sm:px-8 py-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="font-bold text-white text-sm">Get the best deals in your inbox</h3>
            <p className="text-purple-300/70 text-xs mt-1">Occasional emails about new arrivals and promotions — no spam.</p>
          </div>

          {subStatus === 'success' ? (
            <p className="flex items-center gap-2 text-sm text-white font-medium">
              <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              You're on the list!
            </p>
          ) : (
            <form onSubmit={handleSubscribe} className="flex flex-col gap-1.5 w-full md:w-auto">
              <div className="flex w-full md:w-auto gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); if (subStatus === 'error') setSubStatus('idle'); }}
                  placeholder="you@example.com"
                  className="flex-1 md:w-64 min-h-[44px] bg-white/10 border border-white/15 rounded-lg px-3 py-2 text-sm text-white placeholder:text-purple-300/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent transition-all"
                />
                <button
                  type="submit"
                  disabled={subStatus === 'loading'}
                  className="bg-white text-[#2d1943] font-semibold text-sm px-4 min-h-[44px] rounded-lg hover:bg-purple-100 active:scale-[0.98] transition-all disabled:opacity-60 shrink-0"
                >
                  {subStatus === 'loading' ? '…' : 'Subscribe'}
                </button>
              </div>
              {subStatus === 'error' && (
                <p className="text-xs text-red-300">{subError}</p>
              )}
            </form>
          )}
        </div>
      </div>

      {/* We Accept — payment methods actually offered at checkout */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto w-full px-6 sm:px-8 py-5 flex flex-col sm:flex-row sm:items-center gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-purple-300/60 shrink-0">We Accept</span>
          <div className="flex flex-wrap items-center gap-2">
            {PAYMENT_BADGES.map(p => (
              <span
                key={p.id}
                className="flex items-center gap-1.5 bg-white/10 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-purple-100"
              >
                <span className="material-symbols-outlined text-[15px]">{p.icon}</span>
                {p.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom bar — stacked & centered on mobile (legal links on top, copyright below)
          so they can't collide/clip on a narrow screen; side-by-side from sm+ */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto w-full px-6 sm:px-8 py-5 flex flex-col items-center sm:flex-row sm:items-center sm:justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-4 order-1 sm:order-2">
            <Link to="/terms" className="text-xs text-purple-300/70 hover:text-white transition-colors duration-200 min-h-[44px] flex items-center">
              Terms of Service
            </Link>
            <Link to="/privacy" className="text-xs text-purple-300/70 hover:text-white transition-colors duration-200 min-h-[44px] flex items-center">
              Privacy Policy
            </Link>
          </div>
          <p className="text-xs text-purple-300/70 order-2 sm:order-1">
            © {new Date().getFullYear()} Plumio. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
