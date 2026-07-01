import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import TopAppBar from '../components/TopAppBar';
import BottomNav from '../components/BottomNav';

const MENU_ITEMS = [
  { icon: 'storefront', title: 'My Listings',         subtitle: 'Manage your marketplace items',  path: '/my-listings',  iconBg: 'bg-primary/10 text-primary' },
  { icon: 'lock',       title: 'Transaction Escrow',  subtitle: 'Secure payments and release',    path: '/transactions', iconBg: 'bg-secondary/10 text-secondary' },
  { icon: 'settings',   title: 'Settings',            subtitle: 'Preferences and account details', path: '/settings',    iconBg: 'bg-surface-container text-on-surface-variant' },
];

const VERIFY_BENEFITS = [
  { icon: 'verified_user',   text: 'Verified Peer badge on all your listings' },
  { icon: 'trending_up',     text: 'Priority ranking in search results' },
  { icon: 'shield',          text: 'Trusted Seller tag in chat' },
  { icon: 'workspace_premium', text: 'Access to exclusive Verified-only deals' },
];

function ProfileSkeleton() {
  return (
    <div className="animate-pulse md:col-span-12 px-margin-mobile">
      <div className="flex flex-col items-center gap-sm py-lg">
        <div className="w-28 h-28 rounded-full bg-surface-container-high" />
        <div className="h-5 bg-surface-container-high rounded w-36" />
        <div className="h-3 bg-surface-container-high rounded w-48 mt-xs" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-md mt-md">
        {[0,1,2,3].map(i => <div key={i} className="bg-surface-container-low rounded-[16px] p-md h-24" />)}
      </div>
    </div>
  );
}

function formatMemberSince(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-MY', { month: 'short', year: 'numeric' });
}

export default function UserProfileScreen() {
  const navigate             = useNavigate();
  const { session, signOut } = useAuth();
  const avatarInputRef       = useRef(null);

  // ── Data ──────────────────────────────────────────────────────
  const [profile,     setProfile]     = useState(null);
  const [activeItems, setActiveItems] = useState(0);
  const [tradesDone,  setTradesDone]  = useState(0);
  const [isLoading,   setIsLoading]   = useState(true);
  const [error,       setError]       = useState(null);

  // ── Edit Profile modal ─────────────────────────────────────────
  const [showEditModal,   setShowEditModal]   = useState(false);
  const [editName,        setEditName]        = useState('');
  const [editAvatarFile,  setEditAvatarFile]  = useState(null);
  const [editAvatarPreview, setEditAvatarPreview] = useState(null);
  const [editSaving,      setEditSaving]      = useState(false);
  const [editError,       setEditError]       = useState('');

  // ── Subscribe modal ────────────────────────────────────────────
  const [showSubModal,  setShowSubModal]  = useState(false);
  const [subStep,       setSubStep]       = useState('info'); // 'info' | 'pay' | 'done'
  const [subLoading,    setSubLoading]    = useState(false);

  // ── Fetch ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!session) { setIsLoading(false); return; }
    fetchAll();
  }, [session]);

  async function fetchAll() {
    setIsLoading(true);
    setError(null);
    const uid = session.user.id;
    try {
      const [profileRes, activeRes, tradesRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name, avatar_url, peer_rating, balance, is_verified, created_at')
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
      ]);
      if (profileRes.error) throw profileRes.error;
      setProfile(profileRes.data ?? {});
      setActiveItems(activeRes.count ?? 0);
      setTradesDone(tradesRes.count ?? 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  // ── Edit Profile ───────────────────────────────────────────────
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
    let avatarUrl = profile?.avatar_url ?? null;
    let avatarWarn = '';

    // Upload new avatar if one was selected
    if (editAvatarFile) {
      try {
        const ext  = editAvatarFile.name.split('.').pop();
        const path = `${session.user.id}/avatar.${ext}`;

        // Create the bucket if it doesn't exist yet (first-time setup)
        await supabase.storage.createBucket('profile-avatars', { public: true }).catch(() => {});

        const { error: upErr } = await supabase.storage
          .from('profile-avatars')
          .upload(path, editAvatarFile, { upsert: true });

        if (upErr) {
          avatarWarn = `Photo not saved: ${upErr.message}`;
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('profile-avatars')
            .getPublicUrl(path);
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
      if (avatarWarn) {
        setEditError(avatarWarn);
      } else {
        setShowEditModal(false);
      }
    } catch (err) {
      setEditError(err.message);
    } finally {
      setEditSaving(false);
    }
  }

  // ── Subscribe to Verify ────────────────────────────────────────
  async function handlePayNow() {
    // In production: call a Supabase Edge Function that creates a Stripe
    // Checkout Session and returns the URL, then redirect to it.
    // stripe.redirectToCheckout({ sessionId }) or window.location.href = checkoutUrl
    // The Stripe webhook then calls another Edge Function to set is_verified = true.
    //
    // For now: simulate payment success after a short delay.
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

  // ── Derived values ─────────────────────────────────────────────
  const displayName  = profile?.full_name ?? session?.user?.user_metadata?.full_name ?? session?.user?.email ?? 'User';
  const displayEmail = session?.user?.email ?? '';
  const initials     = (displayName[0] ?? '?').toUpperCase();
  const isVerified   = profile?.is_verified ?? false;

  const STATS = [
    { icon: 'star',                   value: profile?.peer_rating != null ? Number(profile.peer_rating).toFixed(1) : '—', label: 'Peer Rating', bg: 'bg-primary/10',   color: 'text-primary' },
    { icon: 'inventory_2',            value: activeItems,  label: 'Active Items', bg: 'bg-secondary/10', color: 'text-secondary' },
    { icon: 'handshake',              value: tradesDone,   label: 'Trades Done',  bg: 'bg-tertiary/10',  color: 'text-tertiary' },
    { icon: 'account_balance_wallet', value: profile?.balance != null ? `RM ${Number(profile.balance).toFixed(2)}` : 'RM 0.00', label: 'Balance', bg: 'bg-surface-container', color: 'text-on-surface-variant' },
  ];

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="bg-background text-on-background min-h-screen pb-[80px] md:pb-0">
      <TopAppBar variant="brand" />

      <main className="max-w-container-max mx-auto md:px-xxl md:grid md:grid-cols-12 md:gap-gutter pt-lg">
        {isLoading ? (
          <ProfileSkeleton />
        ) : error ? (
          <div className="md:col-span-12 flex flex-col items-center justify-center py-xxl gap-md text-on-surface-variant px-margin-mobile">
            <span className="material-symbols-outlined text-[48px] text-error">error_outline</span>
            <p className="font-body-md text-error">{error}</p>
            <button onClick={fetchAll} className="bg-primary-container text-on-primary font-label-md px-lg py-sm rounded-lg hover:bg-primary transition-colors">Try Again</button>
          </div>
        ) : (
          <>
            {/* ── Profile Header ── */}
            <div className="md:col-span-4 lg:col-span-3 px-margin-mobile md:px-0">
              <section className="py-lg flex flex-col items-center text-center bg-surface-container-lowest rounded-2xl shadow-sm mb-lg relative overflow-hidden border border-outline-variant/20">
                <div className="absolute top-0 left-0 w-full h-20 bg-gradient-to-b from-primary/10 to-transparent" />

                {/* Avatar with edit button */}
                <div className="relative z-10 mt-md">
                  <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-surface shadow-md bg-surface-container">
                    {profile?.avatar_url ? (
                      <img className="w-full h-full object-cover" src={profile.avatar_url} alt="Profile" />
                    ) : (
                      <div className="w-full h-full bg-secondary-container flex items-center justify-center">
                        <span className="font-headline-lg text-headline-lg text-on-secondary-container font-bold">{initials}</span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={openEditModal}
                    className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary-container text-on-primary shadow-md flex items-center justify-center hover:bg-primary transition-colors border-2 border-surface"
                    title="Edit Profile"
                  >
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                  </button>
                </div>

                <h1 className="mt-md font-headline-md text-headline-md text-primary z-10 px-md">{displayName}</h1>
                <p className="font-body-sm text-body-sm text-on-surface-variant z-10">{displayEmail}</p>

                <button
                  onClick={openEditModal}
                  className="mt-xs font-label-sm text-label-sm text-secondary hover:underline z-10 flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[14px]">edit</span>
                  Edit Profile
                </button>

                {/* Verified badge / Subscribe button */}
                <div className="mt-md z-10 px-md w-full flex justify-center">
                  {isVerified ? (
                    <div className="inline-flex items-center gap-xs bg-secondary-container text-on-secondary-container px-sm py-xs rounded-full shadow-sm border border-secondary/20">
                      <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
                      <span className="font-label-md text-label-md">Verified Peer</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setSubStep('info'); setShowSubModal(true); }}
                      className="inline-flex items-center gap-xs bg-primary-container text-on-primary px-md py-xs rounded-full font-label-md text-label-md hover:bg-primary transition-colors shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[16px]">workspace_premium</span>
                      Subscribe to Verify
                    </button>
                  )}
                </div>

                {profile?.created_at && (
                  <p className="mt-lg font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider z-10">
                    Member since {formatMemberSince(profile.created_at)}
                  </p>
                )}
              </section>
            </div>

            {/* ── Dashboard ── */}
            <div className="md:col-span-8 lg:col-span-9 space-y-lg px-margin-mobile md:px-0">
              {/* Stats */}
              <section className="grid grid-cols-2 md:grid-cols-4 gap-md">
                {STATS.map(stat => (
                  <div key={stat.label} className="bg-surface-container-lowest shadow-sm rounded-[16px] p-md flex flex-col items-start border border-outline-variant/30 hover:shadow-md transition-shadow">
                    <div className={`w-10 h-10 rounded-full ${stat.bg} flex items-center justify-center ${stat.color} mb-sm`}>
                      <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>{stat.icon}</span>
                    </div>
                    <span className="font-headline-md text-headline-md text-primary">{stat.value}</span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">{stat.label}</span>
                  </div>
                ))}
              </section>

              {/* Menu */}
              <section className="bg-surface-container-lowest rounded-[24px] overflow-hidden border border-outline-variant/20 shadow-sm">
                {MENU_ITEMS.map((item, i) => (
                  <button
                    key={item.title}
                    className={`w-full flex items-center justify-between p-lg hover:bg-surface-container transition-colors text-left group ${i > 0 ? 'border-t border-outline-variant/20' : ''}`}
                    onClick={() => navigate(item.path)}
                  >
                    <div className="flex items-center gap-md">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-sm ${item.iconBg}`}>
                        <span className="material-symbols-outlined">{item.icon}</span>
                      </div>
                      <div>
                        <span className="font-headline-sm text-headline-sm text-on-surface block">{item.title}</span>
                        <span className="font-body-sm text-body-sm text-on-surface-variant">{item.subtitle}</span>
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors">chevron_right</span>
                  </button>
                ))}
              </section>

              <div className="pb-xxl flex justify-center">
                <button onClick={handleSignOut} className="font-label-md text-label-md text-on-surface-variant hover:text-error transition-colors px-lg py-sm rounded-lg hover:bg-error/5 flex items-center gap-sm">
                  <span className="material-symbols-outlined text-[20px]">logout</span>
                  Sign Out
                </button>
              </div>
            </div>
          </>
        )}
      </main>

      <BottomNav activeTab="Account" />

      {/* ════════════════════════════════════════════════════════════
          EDIT PROFILE MODAL
      ════════════════════════════════════════════════════════════ */}
      {showEditModal && (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center px-margin-mobile">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowEditModal(false)} />
          <div className="relative bg-surface rounded-t-2xl md:rounded-2xl w-full max-w-md p-lg shadow-level-2 z-10 flex flex-col gap-md">

            <div className="flex items-center justify-between">
              <h2 className="font-headline-md text-headline-md text-primary">Edit Profile</h2>
              <button onClick={() => setShowEditModal(false)} className="text-on-surface-variant hover:text-primary p-1 rounded-full hover:bg-surface-container transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Avatar picker */}
            <div className="flex flex-col items-center gap-sm">
              <div className="relative">
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-surface shadow-md bg-secondary-container">
                  {editAvatarPreview ? (
                    <img className="w-full h-full object-cover" src={editAvatarPreview} alt="Preview" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="font-headline-lg text-headline-lg text-on-secondary-container font-bold">{initials}</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-secondary text-on-secondary shadow-md flex items-center justify-center hover:bg-secondary/90 transition-colors border-2 border-surface"
                >
                  <span className="material-symbols-outlined text-[16px]">photo_camera</span>
                </button>
              </div>
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarSelect} />
              <button onClick={() => avatarInputRef.current?.click()} className="font-label-sm text-label-sm text-secondary hover:underline">
                Change Photo
              </button>
            </div>

            {/* Display name */}
            <div className="flex flex-col gap-xs">
              <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="edit-name">Display Name</label>
              <input
                id="edit-name"
                type="text"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                placeholder="Your name"
                className="w-full border border-outline-variant/50 rounded-xl px-md py-sm font-body-md text-body-md text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent transition-all"
              />
            </div>

            {editError && (
              <div className="flex items-center gap-sm text-error font-body-sm bg-error/10 rounded-lg px-md py-sm">
                <span className="material-symbols-outlined text-[16px] shrink-0">error_outline</span>
                <span>{editError}</span>
              </div>
            )}

            <div className="flex gap-sm mt-sm">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 border border-outline-variant text-on-surface-variant font-label-md text-label-md py-sm rounded-xl hover:bg-surface-container transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={editSaving}
                className="flex-1 bg-primary-container text-on-primary font-label-md text-label-md py-sm rounded-xl hover:bg-primary transition-colors flex items-center justify-center gap-xs disabled:opacity-60"
              >
                {editSaving ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span className="material-symbols-outlined text-[18px]">check</span>
                )}
                {editSaving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          SUBSCRIBE TO VERIFY MODAL
      ════════════════════════════════════════════════════════════ */}
      {showSubModal && (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center px-margin-mobile">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { if (subStep !== 'pay') setShowSubModal(false); }} />
          <div className="relative bg-surface rounded-t-2xl md:rounded-2xl w-full max-w-md p-lg shadow-level-2 z-10 flex flex-col gap-md">

            {subStep === 'done' ? (
              /* ── Success ── */
              <div className="flex flex-col items-center gap-md py-md text-center">
                <div className="w-20 h-20 rounded-full bg-secondary-container flex items-center justify-center">
                  <span className="material-symbols-outlined text-secondary" style={{ fontSize: 44, fontVariationSettings: "'FILL' 1" }}>verified_user</span>
                </div>
                <h2 className="font-headline-md text-headline-md text-primary">You're Verified!</h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed max-w-xs">
                  Your Verified Peer badge is now active. Buyers will see you as a trusted seller across Plumio.
                </p>
                <button
                  onClick={() => setShowSubModal(false)}
                  className="w-full bg-secondary text-on-secondary font-label-md text-label-md py-sm rounded-xl hover:bg-secondary/90 transition-colors"
                >
                  Awesome, let's go!
                </button>
              </div>

            ) : subStep === 'pay' ? (
              /* ── Payment ── */
              <>
                <div className="flex items-center gap-sm">
                  <button onClick={() => setSubStep('info')} className="text-on-surface-variant hover:text-primary p-1 rounded-full hover:bg-surface-container transition-colors">
                    <span className="material-symbols-outlined">arrow_back</span>
                  </button>
                  <h2 className="font-headline-md text-headline-md text-primary">Complete Payment</h2>
                </div>

                {/* Order summary */}
                <div className="bg-surface-container rounded-xl p-md flex flex-col gap-sm">
                  <div className="flex justify-between items-center font-body-md text-body-md text-on-surface">
                    <span>Verified Peer Subscription</span>
                    <span className="font-semibold">RM 9.90</span>
                  </div>
                  <div className="flex justify-between items-center font-body-sm text-body-sm text-on-surface-variant">
                    <span>Platform fee</span>
                    <span>RM 0.00</span>
                  </div>
                  <div className="h-px bg-outline-variant/40 my-xs" />
                  <div className="flex justify-between items-center font-headline-sm text-headline-sm text-primary font-bold">
                    <span>Total</span>
                    <span>RM 9.90</span>
                  </div>
                </div>

                {/* Stripe info */}
                <div className="flex items-start gap-sm bg-secondary/5 border border-secondary/20 rounded-xl px-md py-sm">
                  <span className="material-symbols-outlined text-secondary text-[20px] shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
                  <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                    Payment is processed securely via <span className="font-semibold text-primary">Stripe</span>. Plumio does not store your card details.
                  </p>
                </div>

                <button
                  onClick={handlePayNow}
                  disabled={subLoading}
                  className="w-full bg-primary-container text-white font-headline-sm text-headline-sm py-sm rounded-xl hover:bg-primary transition-colors flex items-center justify-center gap-sm disabled:opacity-60 shadow-md"
                >
                  {subLoading ? (
                    <>
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing…
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>credit_card</span>
                      Pay RM 9.90 via Stripe
                    </>
                  )}
                </button>
                <p className="text-center font-label-sm text-label-sm text-on-surface-variant">
                  One-time fee · No recurring charges
                </p>
              </>

            ) : (
              /* ── Info / Benefits ── */
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-sm">
                    <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center">
                      <span className="material-symbols-outlined text-secondary text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
                    </div>
                    <div>
                      <h2 className="font-headline-sm text-headline-sm text-primary">Become Verified</h2>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">One-time · RM 9.90</p>
                    </div>
                  </div>
                  <button onClick={() => setShowSubModal(false)} className="text-on-surface-variant hover:text-primary p-1 rounded-full hover:bg-surface-container transition-colors">
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                <div className="flex flex-col gap-sm">
                  {VERIFY_BENEFITS.map(({ icon, text }) => (
                    <div key={icon} className="flex items-center gap-md">
                      <div className="w-9 h-9 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-secondary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
                      </div>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">{text}</p>
                    </div>
                  ))}
                </div>

                <div className="flex gap-sm mt-sm">
                  <button
                    onClick={() => setShowSubModal(false)}
                    className="flex-1 border border-outline-variant text-on-surface-variant font-label-md text-label-md py-sm rounded-xl hover:bg-surface-container transition-colors"
                  >
                    Not Now
                  </button>
                  <button
                    onClick={() => setSubStep('pay')}
                    className="flex-1 bg-secondary text-on-secondary font-label-md text-label-md py-sm rounded-xl hover:bg-secondary/90 transition-colors flex items-center justify-center gap-xs shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
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
