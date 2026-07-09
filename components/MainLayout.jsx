import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';

// Screens that manage their own full-featured header.
// The layout simply renders <Outlet /> for these so there's no double header.
// Remove a path from this set once you've stripped its individual header.
const SELF_HEADED = new Set([
  '/',
  '/categories',
  '/login',
  '/signup',
  '/forgot-password',
  '/profile',
  '/cart',
  '/cart/secure',
  '/create-listing',
  '/my-listings',
  '/transactions',
  '/report',
  '/search',
]);

function isSelfHeaded(pathname) {
  if (SELF_HEADED.has(pathname)) return true;
  return (
    pathname.startsWith('/product/') ||
    pathname.startsWith('/chat/')    ||
    pathname.startsWith('/escrow/')  ||
    pathname.startsWith('/handoff/')
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

export default function MainLayout() {
  const { pathname } = useLocation();
  const navigate     = useNavigate();

  // Pass-through for screens that own their header
  if (isSelfHeaded(pathname)) return <Outlet />;

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ── Global top nav ── */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-lg mx-auto flex items-center h-14 px-4">

          {/* Left — back arrow (hidden on home) */}
          <div className="w-10 flex items-center">
            {pathname !== '/' && (
              <button
                onClick={() => navigate(-1)}
                aria-label="Go back"
                className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors active:scale-90"
              >
                <span className="material-symbols-outlined text-[20px] text-gray-600">
                  arrow_back
                </span>
              </button>
            )}
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

      {/* ── Page content ── */}
      <Outlet />
    </div>
  );
}
