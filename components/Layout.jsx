import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';

// Screens that own their entire UI, including any top navigation.
// Layout renders <Outlet /> only — no global header injected.
const SELF_HEADED = new Set([
  '/',
  '/categories',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
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
  '/messages',
]);

function isSelfHeaded(pathname) {
  if (SELF_HEADED.has(pathname)) return true;
  return (
    pathname.startsWith('/product/')       ||
    pathname.startsWith('/chat/')          ||
    pathname.startsWith('/escrow/')        ||
    pathname.startsWith('/handoff/')       ||
    pathname.startsWith('/help/')          ||
    pathname.startsWith('/messages/')      ||
    pathname.startsWith('/edit-listing/')
  );
}

const ROUTE_TITLES = {
  '/wallet':       'PlumioPay Wallet',
  '/claim-earnings': 'Claim Earnings',
  '/coins':        'Plumio Coins',
  '/paylater':     'PlumioPayLater',
  '/likes':        'My Likes',
  '/viewed':       'Recently Viewed',
  '/buy-again':    'Buy Again',
  '/settings':     'Settings',
  '/support-chat': 'Chat with Plumio',
  '/terms':        'Terms of Service',
  '/privacy':      'Privacy Policy',
  '/scam-awareness': 'Scam Awareness Center',
};

function getTitle(pathname) {
  if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname];
  if (pathname.startsWith('/product/'))        return 'Item Details';
  if (pathname.startsWith('/escrow/'))         return 'Escrow Status';
  if (pathname.startsWith('/handoff/confirm')) return 'Confirm Handoff';
  if (pathname.startsWith('/handoff/'))        return 'Secure Handoff';
  if (pathname.startsWith('/chat/'))           return 'Negotiation';
  return 'Plumio';
}

export default function Layout() {
  const { pathname } = useLocation();
  const selfHeaded   = isSelfHeaded(pathname);

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* Standard Plumio header — suppressed for screens that own their own UI */}
      {!selfHeaded && (
        <Header back={true} title={getTitle(pathname)} />
      )}

      <Outlet />

    </div>
  );
}
