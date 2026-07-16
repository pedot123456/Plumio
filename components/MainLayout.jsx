import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// Screens that manage their own full-featured header.
// The layout simply renders <Outlet /> for these so there's no double header.
// Remove a path from this set once you've stripped its individual header.
const SELF_HEADED = new Set([
  '/',
  '/categories',
  '/login',
  '/signup',
  '/forgot-password',
  '/auth/callback',
  '/profile',
  '/cart',
  '/cart/secure',
  '/create-listing',
  '/my-listings',
  '/transactions',
  '/report',
  '/search',
  '/help',
]);

function isSelfHeaded(pathname) {
  if (SELF_HEADED.has(pathname)) return true;
  return (
    pathname.startsWith('/product/') ||
    pathname.startsWith('/chat/')    ||
    pathname.startsWith('/escrow/')  ||
    pathname.startsWith('/handoff/') ||
    pathname.startsWith('/help/')
  );
}

const ROUTE_TITLES = {
  '/wallet':       'PlumioPay Wallet',
  '/coins':        'Plumio Coins',
  '/paylater':     'PlumioPayLater',
  '/likes':        'My Likes',
  '/viewed':       'Recently Viewed',
  '/buy-again':    'Buy Again',
  '/settings':     'Settings',
  '/help':         'Help Centre',
  '/support-chat': 'Chat with Plumio',
  '/terms':        'Terms of Service',
  '/privacy':      'Privacy Policy',
};

function getTitle(pathname) {
  if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname];
  if (pathname.startsWith('/product/'))         return 'Item Details';
  if (pathname.startsWith('/escrow/'))          return 'Escrow Status';
  if (pathname.startsWith('/handoff/confirm'))  return 'Confirm Handoff';
  if (pathname.startsWith('/handoff/'))         return 'Secure Handoff';
  if (pathname.startsWith('/chat/'))            return 'Negotiation';
  return 'Plumio';
}

const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -8 },
};

export default function MainLayout() {
  const { pathname } = useLocation();
  const navigate     = useNavigate();
  const selfHeaded   = isSelfHeaded(pathname);

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ── Global top nav — hidden on self-headed screens ── */}
      {!selfHeaded && (
        <header className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
          <div className="max-w-lg mx-auto flex items-center h-14 px-4">

            {/* Left — back arrow */}
            <div className="w-10 flex items-center">
              <button
                onClick={() => navigate(-1)}
                aria-label="Go back"
                className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors active:scale-90"
              >
                <span className="material-symbols-outlined text-[20px] text-gray-600">
                  arrow_back
                </span>
              </button>
            </div>

            {/* Centre — section title */}
            <h1 className="flex-1 text-center font-bold text-gray-900 text-sm tracking-tight truncate px-2">
              {getTitle(pathname)}
            </h1>

            {/* Right — logo as home link */}
            <div className="w-10 flex items-center justify-end">
              <Link
                to="/"
                aria-label="Go to homepage"
                className="flex items-center justify-center active:opacity-70 transition-opacity"
              >
                <img src="/Plumio.png" alt="Plumio" className="h-8 w-auto object-contain" />
              </Link>
            </div>

          </div>
        </header>
      )}

      {/* ── Page content with fade+slide transition ── */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={pathname}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.4, ease: 'easeInOut' }}
        >
          <Outlet />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
