import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';

const PANEL_WIDTH = 360;
const VIEWPORT_MARGIN = 8; // keeps the panel off the very edge of the screen

const TYPE_CONFIG = {
  new_message:        { icon: 'chat',           bg: 'bg-blue-100',   color: 'text-blue-600'   },
  new_offer:          { icon: 'local_offer',    bg: 'bg-amber-100',  color: 'text-amber-600'  },
  payment_escrow:     { icon: 'lock',           bg: 'bg-purple-100', color: 'text-[#A855F7]'  },
  qr_generated:       { icon: 'qr_code_2',     bg: 'bg-indigo-100', color: 'text-indigo-600' },
  seller_arrived:     { icon: 'location_on',   bg: 'bg-green-100',  color: 'text-green-600'  },
  order_confirmed:    { icon: 'check_circle',   bg: 'bg-green-100',  color: 'text-green-600'  },
  escrow_released:    { icon: 'payments',       bg: 'bg-green-100',  color: 'text-green-600'  },
  handoff_complete:   { icon: 'verified',       bg: 'bg-green-100',  color: 'text-green-600'  },
  offer_accepted:     { icon: 'thumb_up',       bg: 'bg-green-100',  color: 'text-green-600'  },
  offer_declined:     { icon: 'thumb_down',     bg: 'bg-red-100',    color: 'text-red-500'    },
  new_order_handoff:  { icon: 'handshake',      bg: 'bg-orange-100', color: 'text-orange-600' },
  new_order_ship:     { icon: 'local_shipping', bg: 'bg-amber-100',  color: 'text-amber-600'  },
};

function relativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' });
}

function getNavPath(n) {
  const d = n.data ?? {};
  switch (n.type) {
    case 'new_message':
    case 'new_offer':
    case 'offer_accepted':
    case 'offer_declined':
      return d.chat_id ? `/messages/${d.chat_id}` : null;
    case 'new_order_handoff':
      // Seller taps → goes directly to chat with buyer to arrange meetup
      return d.chat_id ? `/messages/${d.chat_id}` : '/transactions';
    case 'new_order_ship':
      // Seller taps → goes to their active transactions to enter tracking
      return d.tx_id ? `/escrow/${d.tx_id}` : '/transactions';
    case 'seller_arrived':
      // Go straight to QR confirm screen — buyer taps notification and scans
      return d.tx_id ? `/handoff/confirm/${d.tx_id}` : null;
    case 'payment_escrow':
    case 'qr_generated':
    case 'order_confirmed':
    case 'escrow_released':
    case 'handoff_complete':
      return d.tx_id ? `/escrow/${d.tx_id}` : null;
    default:
      return null;
  }
}

export default function NotificationBell({ isDark = false }) {
  const navigate    = useNavigate();
  const { session } = useAuth();
  const panelRef    = useRef(null);
  const bellRef     = useRef(null);

  const [open,          setOpen]          = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [panelPos,      setPanelPos]      = useState(null); // { top, left } in viewport coordinates

  const unreadCount = notifications.filter(n => !n.is_read).length;

  // ── Position the panel from the bell's live viewport position ──────
  // Rendered via a portal (see below) so it always lands in true viewport
  // coordinates — anchoring it to the bell's own small wrapper instead
  // (plain `absolute right-0`) broke on mobile, where the bell isn't the
  // rightmost header icon, pushing the 360px panel off the left edge.
  useEffect(() => {
    if (!open || !bellRef.current) return;

    function reposition() {
      const rect = bellRef.current.getBoundingClientRect();
      const width = Math.min(PANEL_WIDTH, window.innerWidth - VIEWPORT_MARGIN * 2);
      const left  = Math.min(
        Math.max(VIEWPORT_MARGIN, rect.right - width),
        window.innerWidth - width - VIEWPORT_MARGIN,
      );
      const top       = rect.bottom + 8;
      const maxHeight = window.innerHeight - top - VIEWPORT_MARGIN;
      setPanelPos({ top, left, width, maxHeight });
    }

    reposition();
    window.addEventListener('resize', reposition);
    return () => window.removeEventListener('resize', reposition);
  }, [open]);

  // ── Fetch ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!session) return;
    fetchNotifications();

    const channel = supabase
      .channel(`notif-${session.user.id}`)
      .on('postgres_changes', {
        event:  'INSERT',
        schema: 'public',
        table:  'notifications',
        filter: `user_id=eq.${session.user.id}`,
      }, payload => {
        setNotifications(prev => [payload.new, ...prev]);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [session]);

  async function fetchNotifications() {
    if (!session) return;
    setLoading(true);
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(30);
    setNotifications(data ?? []);
    setLoading(false);
  }

  // ── Outside click to close ─────────────────────────────────────
  useEffect(() => {
    function handler(e) {
      if (
        panelRef.current && !panelRef.current.contains(e.target) &&
        bellRef.current  && !bellRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  async function markRead(id) {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  }

  async function markAllRead() {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', session.user.id)
      .eq('is_read', false);
  }

  async function handleClick(n) {
    if (!n.is_read) await markRead(n.id);
    const path = getNavPath(n);
    if (path) navigate(path);
    setOpen(false);
  }

  if (!session) return null;

  const iconColor = isDark ? 'text-on-primary' : 'text-on-surface-variant';
  const hoverBg   = isDark ? 'hover:bg-white/10' : 'hover:bg-surface-container';

  return (
    <div className="relative">
      {/* ── Bell button ── */}
      <button
        ref={bellRef}
        onClick={() => setOpen(o => !o)}
        className={`relative flex items-center justify-center w-10 h-10 rounded-full transition-all active:scale-95 ${hoverBg}`}
        aria-label="Notifications"
      >
        <span className={`material-symbols-outlined text-[22px] ${iconColor}`}
          style={{ fontVariationSettings: open ? "'FILL' 1" : "'FILL' 0" }}>
          notifications
        </span>
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-[3px] leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* ── Dropdown panel ── */}
      {/* Portaled to <body> and positioned with viewport coordinates (not
          `absolute` inside this component) so it can never be clipped or
          pushed off-screen by where the bell sits in the header, and so it
          escapes any ancestor with an active CSS transform (e.g. the page's
          Framer Motion transition wrapper), which would otherwise turn a
          `position: fixed` child into one relative to that ancestor instead
          of the viewport. */}
      {open && panelPos && createPortal(
        <div
          ref={panelRef}
          className="fixed bg-white rounded-2xl shadow-2xl border border-gray-100 z-[100] overflow-hidden flex flex-col"
          style={{
            fontFamily: "'Inter', sans-serif",
            top:       panelPos.top,
            left:      panelPos.left,
            width:     panelPos.width,
            maxHeight: panelPos.maxHeight,
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-[#A855F7]" style={{ fontVariationSettings: "'FILL' 1" }}>notifications</span>
              <h3 className="font-bold text-gray-900 text-sm">Notifications</h3>
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unreadCount}</span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-[11px] font-semibold text-[#A855F7] hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1 min-h-0">
            {loading ? (
              <div className="flex flex-col gap-3 p-4">
                {[0,1,2].map(i => (
                  <div key={i} className="animate-pulse flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 shrink-0" />
                    <div className="flex-1 space-y-2 pt-1">
                      <div className="h-3 bg-gray-100 rounded w-3/4" />
                      <div className="h-3 bg-gray-100 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-400">
                <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[28px]">notifications_off</span>
                </div>
                <p className="text-sm font-medium">No notifications yet</p>
                <p className="text-xs text-center max-w-[180px] leading-relaxed">
                  You'll see offers, messages, and escrow updates here
                </p>
              </div>
            ) : (
              notifications.map((n, i) => {
                const cfg = TYPE_CONFIG[n.type] ?? { icon: 'info', bg: 'bg-gray-100', color: 'text-gray-500' };
                return (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                      !n.is_read ? 'bg-purple-50/40' : ''
                    } ${i > 0 ? 'border-t border-gray-50' : ''}`}
                  >
                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-full ${cfg.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                      <span className={`material-symbols-outlined text-[18px] ${cfg.color}`}
                        style={{ fontVariationSettings: "'FILL' 1" }}>
                        {cfg.icon}
                      </span>
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-snug ${!n.is_read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                        {n.title}
                      </p>
                      {n.body && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">{n.body}</p>
                      )}
                      <p className="text-[10px] text-gray-400 mt-1">{relativeTime(n.created_at)}</p>
                    </div>

                    {/* Unread dot */}
                    {!n.is_read && (
                      <div className="w-2 h-2 rounded-full bg-[#A855F7] shrink-0 mt-2" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-gray-100 px-4 py-2.5 text-center shrink-0">
              <button
                onClick={() => { setNotifications([]); markAllRead(); }}
                className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
              >
                Clear all notifications
              </button>
            </div>
          )}
        </div>,
        document.body,
      )}
    </div>
  );
}
