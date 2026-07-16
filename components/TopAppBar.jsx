import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';
import NotificationBell from './NotificationBell';

export default function TopAppBar({ variant = 'default', title, trailing }) {
  const navigate = useNavigate();
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    if (!userId) { setUnreadMessages(0); return; }

    async function fetchUnread() {
      const { count } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('receiver_id', userId)
        .eq('is_read', false);
      setUnreadMessages(count ?? 0);
    }
    fetchUnread();

    const channel = supabase
      .channel(`unread-dot-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${userId}` }, fetchUnread)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `receiver_id=eq.${userId}` }, fetchUnread)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const handleSell = () => navigate(session ? '/create-listing' : '/login');

  // ── Shared two-row main header (home = dark, brand = light) ──
  if (variant === 'home' || variant === 'brand') {
    const isDark = variant === 'home';

    const bg        = isDark ? 'bg-primary-container' : 'bg-surface shadow-sm';
    const brand     = isDark ? 'text-on-primary' : 'text-primary';
    const linkBase  = isDark
      ? 'text-on-primary/80 hover:text-on-primary hover:bg-white/10'
      : 'text-on-surface-variant hover:text-primary hover:bg-surface-container';
    const sellBtn   = isDark
      ? 'bg-surface-container-lowest text-primary hover:bg-surface-container'
      : 'bg-secondary text-on-secondary hover:bg-secondary/90';
    const searchBg  = isDark
      ? 'bg-surface-container-lowest border-none placeholder:text-on-surface-variant/60'
      : 'bg-surface-container-low border border-outline-variant/30 placeholder:text-on-surface-variant/50';

    return (
      <header className={`${bg} w-full sticky top-0 z-50 level-2-shadow`}>

        {/* ── Row 1: Nav links ─────────────────────────────── */}
        <div className="flex items-center w-full px-margin-mobile md:px-gutter py-sm max-w-container-max mx-auto gap-sm">

          {/* Brand */}
          <button
            className="flex items-center gap-xs shrink-0 active:opacity-80 transition-opacity"
            onClick={() => navigate('/')}
          >
            <span
              className={`material-symbols-outlined ${brand} text-[22px]`}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              storefront
            </span>
            <span className={`font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg font-black ${brand} leading-none`}>
              Plumio
            </span>
          </button>

          {/* Desktop nav links */}
          <nav className="hidden md:flex items-center ml-lg gap-xs">
            <button
              onClick={() => navigate('/categories')}
              className={`px-sm py-xs rounded-lg font-label-md text-label-md transition-all active:scale-[0.98] ${linkBase}`}
            >
              Browse
            </button>
            <button
              onClick={() => navigate('/cart')}
              className={`px-sm py-xs rounded-lg font-label-md text-label-md transition-all active:scale-[0.98] ${linkBase}`}
            >
              Cart
            </button>
          </nav>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Right-side auth section */}
          {session ? (
            <div className="flex items-center gap-xs">
              <NotificationBell isDark={isDark} />

              {/* Messages button */}
              <div className="relative">
                <button
                  onClick={() => navigate('/messages')}
                  className={`flex items-center justify-center p-2 rounded-full transition-all active:scale-95 ${linkBase}`}
                  aria-label="Messages"
                >
                  <span className="material-symbols-outlined text-[22px]">chat_bubble</span>
                </button>
                {/* Unread dot — only visible when there are unread messages */}
                {unreadMessages > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white pointer-events-none" />
                )}
              </div>

              <button
                onClick={() => navigate('/profile')}
                className={`hidden md:flex items-center justify-center p-2 rounded-full transition-all active:scale-95 ${linkBase}`}
                aria-label="My Account"
              >
                <span className="material-symbols-outlined text-[22px]">person</span>
              </button>
              <button
                onClick={handleSell}
                className={`${sellBtn} font-label-md text-label-md px-md py-[9px] rounded-full active:scale-[0.97] transition-all shadow-sm whitespace-nowrap`}
              >
                + Sell
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-xs">
              <button
                onClick={() => navigate('/login')}
                className={`px-sm py-xs rounded-lg font-label-md text-label-md transition-all active:scale-[0.98] ${linkBase}`}
              >
                Log In
              </button>
              <button
                onClick={() => navigate('/signup')}
                className={`px-sm py-xs rounded-lg font-label-md text-label-md transition-all active:scale-[0.98] ${linkBase}`}
              >
                Sign Up
              </button>
            </div>
          )}
        </div>

        {/* ── Row 2: Permanent full-width search bar ──────── */}
        <div className="px-margin-mobile md:px-gutter pb-sm max-w-container-max mx-auto w-full">
          <div className="relative w-full">
            <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-outline z-10 text-[20px]">
              search
            </span>
            <input
              className={`w-full rounded-full py-sm pl-[40px] pr-sm font-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent transition-all shadow-level-1 ${searchBg}`}
              placeholder="Search Plumio..."
              type="text"
              onKeyDown={e => {
                if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                  navigate(`/search?q=${encodeURIComponent(e.currentTarget.value.trim())}`);
                }
              }}
            />
          </div>
        </div>
      </header>
    );
  }

  // ── Default variant: back-button + title + logo ───────────
  return (
    <header className="bg-surface shadow-sm w-full sticky top-0 z-50">
      <div className="flex items-center justify-between w-full px-margin-mobile py-md max-w-container-max mx-auto h-16">

        {/* Left — back arrow */}
        <button
          className="p-2 -ml-2 text-on-surface-variant hover:bg-surface-container-high transition-colors rounded-full flex items-center justify-center active:scale-95"
          onClick={() => navigate(-1)}
          aria-label="Go back"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>

        {/* Centre — page title */}
        {title && (
          <h1 className="font-headline-md text-headline-md text-primary font-bold text-center flex-1 px-2 truncate">
            {title}
          </h1>
        )}

        {/* Right — logo home link (or caller-supplied trailing element) */}
        {trailing ?? (
          <Link
            to="/"
            aria-label="Go to home"
            className="flex items-center justify-center w-10 active:opacity-70 transition-opacity"
          >
            <img
              src="/Plumio.png"
              alt="Plumio"
              className="h-8 w-auto object-contain"
            />
          </Link>
        )}
      </div>
    </header>
  );
}
