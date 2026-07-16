import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import BottomNav from '../components/BottomNav';
import NotificationBell from '../components/NotificationBell';
import {
  CreditCard, Truck, Package, Star,
  Wallet, Coins, Clock,
  Heart, Eye, Store, RotateCcw,
  HelpCircle, MessageCircle, ChevronRight,
  BadgeCheck, LogOut, Edit, Camera,
  ShieldCheck, TrendingUp, Sparkles, X,
  ArrowLeft, CheckCircle, CreditCard as CardIcon,
} from 'lucide-react';

// ── Constants ──────────────────────────────────────────────────
const VERIFY_BENEFITS = [
  { Icon: BadgeCheck,   text: 'Verified Peer badge on all your listings' },
  { Icon: TrendingUp,   text: 'Priority ranking in search results'        },
  { Icon: ShieldCheck,  text: 'Trusted Seller tag in chat'                },
  { Icon: Sparkles,     text: 'Access to exclusive Verified-only deals'   },
];

const PURCHASE_ACTIONS = [
  { Icon: CreditCard, label: 'To Pay',     color: 'text-orange-500', bg: 'bg-orange-50',  path: '/transactions' },
  { Icon: Truck,      label: 'To Ship',    color: 'text-blue-500',   bg: 'bg-blue-50',    path: '/transactions' },
  { Icon: Package,    label: 'To Receive', color: 'text-green-500',  bg: 'bg-green-50',   path: '/transactions' },
  { Icon: Star,       label: 'To Rate',    color: 'text-yellow-500', bg: 'bg-yellow-50',  path: '/transactions' },
];

const ACTIVITY_ITEMS = [
  { Icon: Heart,      label: 'My Likes',         path: '/likes'          },
  { Icon: Eye,        label: 'Recently Viewed',  path: '/viewed'         },
  { Icon: Store,      label: 'Start Selling',    path: '/create-listing' },
  { Icon: RotateCcw,  label: 'Buy Again',        path: '/'               },
];

const ACCOUNT_ITEMS = [
  { Icon: Store,      label: 'My Listings',        sub: 'Manage your marketplace items',   path: '/my-listings',  color: 'text-purple-500', bg: 'bg-purple-50'  },
  { Icon: ShieldCheck,label: 'Transaction Escrow', sub: 'Secure payments and releases',    path: '/transactions', color: 'text-blue-500',   bg: 'bg-blue-50'    },
  { Icon: HelpCircle, label: 'Settings',           sub: 'Preferences and account details', path: '/settings',     color: 'text-gray-500',   bg: 'bg-gray-100'   },
];

const SUPPORT_ITEMS = [
  { Icon: HelpCircle, label: 'Help Centre', path: '/help' },
];

function formatMemberSince(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-MY', { month: 'short', year: 'numeric' });
}

// ── Sub-components ─────────────────────────────────────────────
function Card({ children, className = '' }) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

function CardHeader({ title, action }) {
  return (
    <div className="flex items-center justify-between px-4 pt-4 pb-2">
      <h3 className="font-bold text-gray-900 text-sm">{title}</h3>
      {action}
    </div>
  );
}

function MenuRow({ Icon, label, sub, color = 'text-gray-500', bg = 'bg-gray-100', onClick, last, count }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left ${!last ? 'border-b border-gray-50' : ''}`}
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
        <Icon size={18} className={color} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      {count != null && count > 0 ? (
        <span className="bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[20px] text-center shrink-0 leading-5">
          {count > 99 ? '99+' : count}
        </span>
      ) : (
        <ChevronRight size={16} className="text-gray-300 shrink-0" />
      )}
    </button>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-3 px-4" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="bg-white rounded-2xl p-5 flex items-center gap-4 shadow-sm">
        <div className="w-16 h-16 rounded-full bg-gray-200" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-1/2" />
          <div className="h-3 bg-gray-200 rounded w-2/3" />
        </div>
      </div>
      {[0,1,2].map(i => <div key={i} className="bg-white rounded-2xl h-28 shadow-sm" />)}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────
export default function UserProfileScreen() {
  const navigate             = useNavigate();
  const { session, signOut } = useAuth();
  const avatarInputRef       = useRef(null);

  // ── Data state ─────────────────────────────────────────────────
  const [profile,     setProfile]     = useState(null);
  const [activeItems, setActiveItems] = useState(0);
  const [tradesDone,  setTradesDone]  = useState(0);
  const [isLoading,   setIsLoading]   = useState(true);
  const [error,       setError]       = useState(null);
  const [orderCounts, setOrderCounts] = useState({ to_pay: 0, to_ship: 0, to_receive: 0, completed: 0 });
  const [likesCount,  setLikesCount]  = useState(0);

  // ── Edit modal state ───────────────────────────────────────────
  const [showEditModal,     setShowEditModal]     = useState(false);
  const [editName,          setEditName]          = useState('');
  const [editAvatarFile,    setEditAvatarFile]    = useState(null);
  const [editAvatarPreview, setEditAvatarPreview] = useState(null);
  const [editSaving,        setEditSaving]        = useState(false);
  const [editError,         setEditError]         = useState('');

  // ── Subscribe modal state ──────────────────────────────────────
  const [showSubModal, setShowSubModal] = useState(false);
  const [subStep,      setSubStep]      = useState('info');
  const [subLoading,   setSubLoading]   = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!session) { setIsLoading(false); return; }
    fetchAll();
  }, [session]);

  async function fetchAll() {
    setIsLoading(true);
    setError(null);
    const uid = session.user.id;
    try {
      const [profileRes, activeRes, tradesRes, toPayRes, toShipRes, toReceiveRes, toRateRes, likesRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name, avatar_url, peer_rating, balance, is_verified, created_at, plumio_coins_balance, paylater_limit')
          .eq('id', uid)
          .maybeSingle(),
        supabase
          .from('listings')
          .select('id', { count: 'exact', head: true })
          .or(`user_id.eq.${uid},seller_id.eq.${uid}`)
          .or('status.in.(active),status.is.null'),
        supabase
          .from('transactions')
          .select('id', { count: 'exact', head: true })
          .or(`buyer_id.eq.${uid},seller_id.eq.${uid}`)
          .eq('status', 'completed'),
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('buyer_id', uid).eq('status', 'to_pay'),
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('buyer_id', uid).eq('status', 'to_ship'),
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('buyer_id', uid).eq('status', 'to_receive'),
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('buyer_id', uid).eq('status', 'completed'),
        supabase.from('user_activity').select('id', { count: 'exact', head: true }).eq('user_id', uid).eq('activity_type', 'like'),
      ]);
      if (profileRes.error) throw profileRes.error;
      setProfile(profileRes.data ?? {});
      setActiveItems(activeRes.count ?? 0);
      setTradesDone(tradesRes.count ?? 0);
      setOrderCounts({
        to_pay:     toPayRes.count     ?? 0,
        to_ship:    toShipRes.count    ?? 0,
        to_receive: toReceiveRes.count ?? 0,
        completed:  toRateRes.count    ?? 0,
      });
      setLikesCount(likesRes.count ?? 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  // ── Edit handlers ──────────────────────────────────────────────
  function openEditModal() {
    setEditName(profile?.full_name ?? '');
    setEditAvatarFile(null);
    setEditAvatarPreview(profile?.avatar_url ?? null);
    setEditError('');
    setShowEditModal(true);
  }

  function handleAvatarSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditAvatarFile(file);
    setEditAvatarPreview(URL.createObjectURL(file));
  }

  async function handleSaveProfile() {
    if (!session) return;
    setEditSaving(true);
    setEditError('');
    let avatarUrl  = profile?.avatar_url ?? null;
    let avatarWarn = '';

    if (editAvatarFile) {
      try {
        const ext  = editAvatarFile.name.split('.').pop();
        const path = `${session.user.id}/avatar.${ext}`;
        await supabase.storage.createBucket('profile-avatars', { public: true }).catch(() => {});
        const { error: upErr } = await supabase.storage
          .from('profile-avatars')
          .upload(path, editAvatarFile, { upsert: true });
        if (upErr) {
          avatarWarn = `Photo not saved: ${upErr.message}`;
        } else {
          const { data: { publicUrl } } = supabase.storage.from('profile-avatars').getPublicUrl(path);
          avatarUrl = publicUrl;
        }
      } catch (e) {
        avatarWarn = `Photo not saved: ${e.message}`;
      }
    }

    try {
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ full_name: editName.trim() || null, avatar_url: avatarUrl })
        .eq('id', session.user.id);
      if (updateErr) throw updateErr;
      setProfile(prev => ({ ...prev, full_name: editName.trim() || null, avatar_url: avatarUrl }));
      if (avatarWarn) setEditError(avatarWarn);
      else setShowEditModal(false);
    } catch (err) {
      setEditError(err.message);
    } finally {
      setEditSaving(false);
    }
  }

  // ── Subscribe handler ──────────────────────────────────────────
  async function handlePayNow() {
    setSubLoading(true);
    await new Promise(r => setTimeout(r, 1800));
    const { error } = await supabase
      .from('profiles')
      .update({ is_verified: true })
      .eq('id', session.user.id);
    setSubLoading(false);
    if (!error) {
      setProfile(prev => ({ ...prev, is_verified: true }));
      setSubStep('done');
    }
  }

  async function handleSignOut() {
    await signOut();
    navigate('/login', { replace: true });
  }

  // ── Derived ────────────────────────────────────────────────────
  const displayName  = profile?.full_name ?? session?.user?.user_metadata?.full_name ?? session?.user?.email ?? 'User';
  const displayEmail = session?.user?.email ?? '';
  const initials     = (displayName[0] ?? '?').toUpperCase();
  const isVerified   = profile?.is_verified ?? false;
  const balance      = profile?.balance != null ? Number(profile.balance).toFixed(2) : '0.00';
  const rating         = profile?.peer_rating != null ? Number(profile.peer_rating).toFixed(1) : '—';
  const coins          = profile?.plumio_coins_balance != null ? Math.floor(Number(profile.plumio_coins_balance)) : 0;
  const payLater       = profile?.paylater_limit != null ? Number(profile.paylater_limit).toFixed(2) : '0.00';
  const purchaseCounts = [orderCounts.to_pay, orderCounts.to_ship, orderCounts.to_receive, orderCounts.completed];

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 pb-24" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ── Top bar ── */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-lg mx-auto flex items-center justify-between px-4 h-14">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 hover:opacity-75 transition-opacity active:scale-95"
            aria-label="Back to home"
          >
            <img src="/Plumio.png" alt="Plumio" className="h-8 w-auto object-contain" />
            <span className="font-black text-gray-900 text-sm tracking-tight hidden sm:inline">Plumio</span>
          </button>
          <span className="font-bold text-gray-900 text-base absolute left-1/2 -translate-x-1/2">My Profile</span>
          <NotificationBell />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 flex flex-col gap-3">

        {isLoading ? <Skeleton /> : error ? (
          <div className="flex flex-col items-center py-16 gap-3 text-gray-400">
            <HelpCircle size={40} />
            <p className="text-sm text-red-500">{error}</p>
            <button onClick={fetchAll} className="text-[#A855F7] text-sm font-semibold hover:underline">Try Again</button>
          </div>
        ) : (
          <>
            {/* ── 1. Profile Header Card ── */}
            <Card>
              {/* Gradient strip */}
              <div className="h-16 bg-gradient-to-r from-[#1E1B4B] to-[#7C3AED] relative">
                <button
                  onClick={openEditModal}
                  className="absolute top-2 right-3 flex items-center gap-1 bg-white/20 hover:bg-white/30 text-white text-xs font-medium px-2.5 py-1 rounded-full transition-colors"
                >
                  <Edit size={12} />
                  Edit
                </button>
              </div>

              <div className="px-4 pb-4 -mt-8">
                {/* Avatar */}
                <div className="relative w-fit mb-3">
                  <div className="w-16 h-16 rounded-full border-4 border-white shadow-md overflow-hidden bg-purple-100">
                    {profile?.avatar_url ? (
                      <img className="w-full h-full object-cover" src={profile.avatar_url} alt="Avatar" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-[#A855F7] font-black text-2xl">{initials}</span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={openEditModal}
                    className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-[#A855F7] text-white flex items-center justify-center border-2 border-white shadow"
                  >
                    <Camera size={11} />
                  </button>
                </div>

                {/* Name row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-bold text-gray-900 text-base leading-tight truncate max-w-[200px]">{displayName}</h2>
                      {isVerified && (
                        <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          <BadgeCheck size={10} /> Verified
                        </span>
                      )}
                    </div>
                    <p className="text-gray-400 text-xs mt-0.5 truncate">{displayEmail}</p>
                    {profile?.created_at && (
                      <p className="text-gray-400 text-[11px] mt-0.5">Member since {formatMemberSince(profile.created_at)}</p>
                    )}
                  </div>
                  {!isVerified && (
                    <button
                      onClick={() => { setSubStep('info'); setShowSubModal(true); }}
                      className="shrink-0 flex items-center gap-1 bg-gradient-to-r from-[#A855F7] to-[#7C3AED] text-white text-[11px] font-semibold px-3 py-1.5 rounded-full shadow-sm hover:opacity-90 transition-opacity whitespace-nowrap"
                    >
                      <Sparkles size={11} />
                      Get Verified
                    </button>
                  )}
                </div>

                {/* Stats mini row */}
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {[
                    { value: rating,      label: 'Rating'      },
                    { value: activeItems, label: 'Listings'    },
                    { value: tradesDone,  label: 'Trades Done' },
                  ].map(s => (
                    <div key={s.label} className="bg-gray-50 rounded-xl p-2 text-center">
                      <p className="font-black text-gray-900 text-base leading-tight">{s.value}</p>
                      <p className="text-gray-400 text-[10px] mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* ── 2. My Purchases Card ── */}
            <Card>
              <CardHeader
                title="My Purchases"
                action={
                  <button
                    onClick={() => navigate('/transactions')}
                    className="flex items-center gap-0.5 text-[#A855F7] text-xs font-semibold hover:underline"
                  >
                    View Purchase History <ChevronRight size={13} />
                  </button>
                }
              />
              <div className="grid grid-cols-4 gap-1 px-3 pb-4 pt-1">
                {PURCHASE_ACTIONS.map(({ Icon, label, color, bg, path }, i) => (
                  <button
                    key={label}
                    onClick={() => navigate(path)}
                    className="flex flex-col items-center gap-2 py-3 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors"
                  >
                    <div className={`relative w-11 h-11 rounded-full ${bg} flex items-center justify-center`}>
                      <Icon size={20} className={color} />
                      {purchaseCounts[i] > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                          {purchaseCounts[i] > 9 ? '9+' : purchaseCounts[i]}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-medium text-gray-600 text-center leading-tight">{label}</span>
                  </button>
                ))}
              </div>
            </Card>

            {/* ── 3. My Wallet Card ── */}
            <Card>
              <CardHeader title="My Wallet" />
              <div className="px-4 pb-4 flex flex-col gap-0">
                {[
                  {
                    Icon: Wallet,
                    label: 'PlumioPay Balance',
                    value: `RM ${balance}`,
                    valueColor: 'text-[#A855F7] font-bold',
                    sub: 'Available to spend',
                    path: '/wallet',
                  },
                  {
                    Icon: Coins,
                    label: 'My Plumio Coins',
                    value: `${coins} Coins`,
                    valueColor: 'text-amber-500 font-semibold',
                    sub: 'Earn coins with every purchase',
                    path: '/coins',
                  },
                  {
                    Icon: Clock,
                    label: 'PlumioPayLater',
                    value: `RM ${payLater}`,
                    valueColor: 'text-green-600 font-semibold',
                    sub: 'Credit limit available',
                    last: true,
                    path: '/paylater',
                  },
                ].map(({ Icon, label, value, valueColor, sub, last, path: itemPath }) => (
                  <button
                    key={label}
                    onClick={() => navigate(itemPath)}
                    className={`flex items-center gap-3 py-3.5 hover:bg-gray-50 active:bg-gray-100 transition-colors rounded-xl -mx-1 px-1 ${!last ? 'border-b border-gray-50' : ''}`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                      <Icon size={18} className="text-[#A855F7]" />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-medium text-gray-800">{label}</p>
                      {sub && <p className="text-[11px] text-gray-400">{sub}</p>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className={`text-sm ${valueColor}`}>{value}</span>
                      <ChevronRight size={14} className="text-gray-300" />
                    </div>
                  </button>
                ))}
              </div>
            </Card>

            {/* ── 4. Activity Menu ── */}
            <Card>
              <CardHeader title="Activity" />
              <div className="pb-2">
                {ACTIVITY_ITEMS.map(({ Icon, label, path }, i) => (
                  <MenuRow
                    key={label}
                    Icon={Icon}
                    label={label}
                    color="text-[#A855F7]"
                    bg="bg-purple-50"
                    onClick={() => navigate(path)}
                    last={i === ACTIVITY_ITEMS.length - 1}
                    count={label === 'My Likes' ? likesCount : undefined}
                  />
                ))}
              </div>
            </Card>

            {/* ── 5. Account Menu ── */}
            <Card>
              <CardHeader title="Account" />
              <div className="pb-2">
                {ACCOUNT_ITEMS.map(({ Icon, label, sub, color, bg, path }, i) => (
                  <MenuRow
                    key={label}
                    Icon={Icon}
                    label={label}
                    sub={sub}
                    color={color}
                    bg={bg}
                    onClick={() => navigate(path)}
                    last={i === ACCOUNT_ITEMS.length - 1}
                  />
                ))}
              </div>
            </Card>

            {/* ── 6. Support Menu ── */}
            <Card>
              <CardHeader title="Support" />
              <div className="pb-2">
                {SUPPORT_ITEMS.map(({ Icon, label, path, chatbot }, i) => (
                  <MenuRow
                    key={label}
                    Icon={Icon}
                    label={label}
                    color="text-blue-500"
                    bg="bg-blue-50"
                    onClick={
                      chatbot
                        ? () => { if (typeof window !== 'undefined' && window.chatbase) window.chatbase('open'); }
                        : () => navigate(path)
                    }
                    last={i === SUPPORT_ITEMS.length - 1}
                  />
                ))}
              </div>
            </Card>

            {/* ── Sign out ── */}
            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-white rounded-2xl border border-gray-100 shadow-sm text-red-500 text-sm font-semibold hover:bg-red-50 transition-colors"
            >
              <LogOut size={16} />
              Sign Out
            </button>

            <p className="text-center text-[11px] text-gray-300 pb-2">Plumio v1.0 · UTP Marketplace</p>
          </>
        )}
      </div>

      <BottomNav activeTab="Account" />

      {/* ════════════ EDIT PROFILE MODAL ════════════ */}
      {showEditModal && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowEditModal(false)} />
          <div className="relative bg-white rounded-t-3xl w-full max-w-lg p-6 shadow-2xl z-10 flex flex-col gap-4" style={{ fontFamily: "'Inter', sans-serif" }}>

            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900 text-lg">Edit Profile</h2>
              <button onClick={() => setShowEditModal(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                <X size={16} className="text-gray-600" />
              </button>
            </div>

            {/* Avatar picker */}
            <div className="flex flex-col items-center gap-2">
              <div className="relative">
                <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-white shadow-md bg-purple-100">
                  {editAvatarPreview ? (
                    <img className="w-full h-full object-cover" src={editAvatarPreview} alt="Preview" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-[#A855F7] font-black text-2xl">{initials}</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute -bottom-0.5 -right-0.5 w-7 h-7 rounded-full bg-[#A855F7] text-white flex items-center justify-center border-2 border-white shadow"
                >
                  <Camera size={13} />
                </button>
              </div>
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarSelect} />
              <button onClick={() => avatarInputRef.current?.click()} className="text-xs font-semibold text-[#A855F7] hover:underline">
                Change Photo
              </button>
            </div>

            {/* Name input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider" htmlFor="edit-name">Display Name</label>
              <input
                id="edit-name"
                type="text"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                placeholder="Your name"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#A855F7]/30 focus:border-[#A855F7] transition-all"
              />
            </div>

            {editError && (
              <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
                <X size={14} className="shrink-0" />
                {editError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 border border-gray-200 text-gray-600 text-sm font-semibold py-3 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={editSaving}
                className="flex-1 bg-[#A855F7] hover:bg-[#9333EA] text-white text-sm font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {editSaving
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <CheckCircle size={16} />
                }
                {editSaving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════ SUBSCRIBE TO VERIFY MODAL ════════════ */}
      {showSubModal && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { if (subStep !== 'pay') setShowSubModal(false); }} />
          <div className="relative bg-white rounded-t-3xl w-full max-w-lg p-6 shadow-2xl z-10 flex flex-col gap-4" style={{ fontFamily: "'Inter', sans-serif" }}>

            {subStep === 'done' ? (
              <div className="flex flex-col items-center gap-4 py-4 text-center">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle size={36} className="text-green-500" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900 text-lg">You're Verified!</h2>
                  <p className="text-gray-500 text-sm mt-1 leading-relaxed max-w-xs">
                    Your Verified Peer badge is now active across Plumio.
                  </p>
                </div>
                <button onClick={() => setShowSubModal(false)} className="w-full bg-[#A855F7] hover:bg-[#9333EA] text-white font-bold py-3 rounded-2xl transition-colors">
                  Awesome, let's go!
                </button>
              </div>

            ) : subStep === 'pay' ? (
              <>
                <div className="flex items-center gap-3">
                  <button onClick={() => setSubStep('info')} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                    <ArrowLeft size={16} className="text-gray-600" />
                  </button>
                  <h2 className="font-bold text-gray-900 text-lg">Complete Payment</h2>
                </div>

                <div className="bg-gray-50 rounded-2xl p-4 flex flex-col gap-2">
                  <div className="flex justify-between text-sm text-gray-700">
                    <span>Verified Peer Subscription</span>
                    <span className="font-bold">RM 9.90</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Platform fee</span>
                    <span>RM 0.00</span>
                  </div>
                  <div className="border-t border-gray-200 pt-2 flex justify-between">
                    <span className="font-bold text-gray-900 text-sm">Total</span>
                    <span className="font-black text-[#A855F7]">RM 9.90</span>
                  </div>
                </div>

                <div className="flex items-start gap-2 bg-purple-50 border border-purple-100 rounded-xl px-3 py-2.5">
                  <ShieldCheck size={16} className="text-[#A855F7] shrink-0 mt-0.5" />
                  <p className="text-xs text-purple-700 leading-relaxed">
                    Payment secured via <span className="font-bold">Stripe</span>. Plumio never stores card details.
                  </p>
                </div>

                <button
                  onClick={handlePayNow}
                  disabled={subLoading}
                  className="w-full bg-[#A855F7] hover:bg-[#9333EA] disabled:bg-purple-300 text-white font-bold py-4 rounded-2xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-purple-200/60"
                >
                  {subLoading
                    ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <CardIcon size={18} />
                  }
                  {subLoading ? 'Processing…' : 'Pay RM 9.90 via Stripe'}
                </button>
                <p className="text-center text-xs text-gray-400">One-time fee · No recurring charges</p>
              </>

            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                      <Sparkles size={20} className="text-[#A855F7]" />
                    </div>
                    <div>
                      <h2 className="font-bold text-gray-900 text-base">Become Verified</h2>
                      <p className="text-gray-400 text-xs">One-time · RM 9.90</p>
                    </div>
                  </div>
                  <button onClick={() => setShowSubModal(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                    <X size={16} className="text-gray-600" />
                  </button>
                </div>

                <div className="flex flex-col gap-3">
                  {VERIFY_BENEFITS.map(({ Icon, text }) => (
                    <div key={text} className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
                        <Icon size={17} className="text-[#A855F7]" />
                      </div>
                      <p className="text-sm text-gray-600">{text}</p>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 mt-1">
                  <button onClick={() => setShowSubModal(false)} className="flex-1 border border-gray-200 text-gray-500 font-semibold text-sm py-3 rounded-2xl hover:bg-gray-50 transition-colors">
                    Not Now
                  </button>
                  <button onClick={() => setSubStep('pay')} className="flex-1 bg-[#A855F7] hover:bg-[#9333EA] text-white font-bold text-sm py-3 rounded-2xl transition-colors shadow-sm">
                    Continue · RM 9.90
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
