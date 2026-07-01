import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import BottomNav from '../components/BottomNav';

const TABS = ['Active', 'Sold', 'Drafts'];

function ListingSkeleton() {
  return (
    <div className="animate-pulse bg-surface-container-lowest rounded-xl p-md border border-outline-variant/30 flex gap-md">
      <div className="w-24 h-24 rounded-lg bg-surface-container-high shrink-0" />
      <div className="flex-1 space-y-sm py-xs">
        <div className="h-4 bg-surface-container-high rounded w-3/4" />
        <div className="h-3 bg-surface-container-high rounded w-1/3 mt-xs" />
        <div className="h-8 bg-surface-container-high rounded-lg w-full mt-sm" />
      </div>
    </div>
  );
}

const STATUS_BADGE = {
  active:       { label: 'Active',          cls: 'bg-secondary/10 text-secondary border-secondary/20',        icon: 'circle' },
  escrow_locked:{ label: 'In Escrow',        cls: 'bg-amber-100 text-amber-700 border-amber-200',              icon: 'lock' },
  escrow:       { label: 'In Escrow',        cls: 'bg-amber-100 text-amber-700 border-amber-200',              icon: 'lock' },
  sold:         { label: 'Sold',             cls: 'bg-green-100 text-green-700 border-green-200',              icon: 'check_circle' },
  draft:        { label: 'Draft',            cls: 'bg-surface-container text-on-surface-variant border-outline-variant/40', icon: 'edit_note' },
};

function daysAgo(iso) {
  const d = Math.floor((Date.now() - new Date(iso)) / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  return `${d}d ago`;
}

export default function MyListingsScreen() {
  const navigate    = useNavigate();
  const { session } = useAuth();
  const menuRef     = useRef(null);

  const [activeTab,     setActiveTab]     = useState('Active');
  const [listings,      setListings]      = useState([]);
  const [isLoading,     setIsLoading]     = useState(true);
  const [error,         setError]         = useState(null);
  const [openMenu,      setOpenMenu]      = useState(null);   // listing id with open kebab
  const [boostModal,    setBoostModal]    = useState(null);   // listing to boost
  const [boostDone,     setBoostDone]     = useState(false);
  const [actionLoading, setActionLoading] = useState(null);   // listing id being mutated

  // Close kebab on outside click
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenu(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!session) { setIsLoading(false); return; }
    fetchListings();
  }, [session, activeTab]);

  async function fetchListings() {
    setIsLoading(true);
    setError(null);
    try {
      const uid = session.user.id;
      let query = supabase
        .from('listings')
        .select('id, title, price, image_url, status, created_at, accepts_trade')
        .or(`user_id.eq.${uid},seller_id.eq.${uid}`)
        .order('created_at', { ascending: false });

      if (activeTab === 'Active') {
        // Include listings with null status (created before status field existed)
        query = query.or('status.in.(active,escrow,escrow_locked),status.is.null');
      } else if (activeTab === 'Sold') {
        query = query.in('status', ['sold']);
      } else {
        query = query.in('status', ['draft']);
      }

      const { data, error } = await query;
      if (error) throw error;
      setListings(data ?? []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleMarkSold(item) {
    setOpenMenu(null);
    setActionLoading(item.id);
    const { error } = await supabase
      .from('listings')
      .update({ status: 'sold' })
      .eq('id', item.id);
    setActionLoading(null);
    if (!error) setListings(prev => prev.filter(l => l.id !== item.id));
  }

  async function handleMarkActive(item) {
    setOpenMenu(null);
    setActionLoading(item.id);
    const { error } = await supabase
      .from('listings')
      .update({ status: 'active' })
      .eq('id', item.id);
    setActionLoading(null);
    if (!error) setListings(prev => prev.filter(l => l.id !== item.id));
  }

  async function handleDelete(item) {
    setOpenMenu(null);
    if (!window.confirm(`Delete "${item.title}"? This cannot be undone.`)) return;
    setActionLoading(item.id);
    const { error } = await supabase.from('listings').delete().eq('id', item.id);
    setActionLoading(null);
    if (!error) setListings(prev => prev.filter(l => l.id !== item.id));
  }

  async function handleBoostConfirm() {
    if (!boostModal) return;
    setActionLoading(boostModal.id);
    // Silently ignore if is_boosted column doesn't exist yet
    await supabase.from('listings').update({ is_boosted: true }).eq('id', boostModal.id);
    setActionLoading(null);
    setBoostDone(true);
  }

  const totalValue = listings.reduce((sum, l) => sum + Number(l.price ?? 0), 0);

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col font-body-md pb-20">

      {/* Header */}
      <header className="w-full top-0 sticky bg-surface shadow-sm z-50">
        <div className="flex justify-between items-center px-4 h-16 max-w-container-max mx-auto">
          <button
            className="text-primary hover:bg-surface-container-high transition-colors p-2 rounded-full"
            onClick={() => navigate(-1)}
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="font-headline-md text-headline-md text-primary font-bold text-center flex-1">
            My Listings
          </h1>
          <button
            className="text-primary hover:bg-surface-container-high transition-colors p-2 rounded-full"
            onClick={() => navigate('/create-listing')}
            title="New Listing"
          >
            <span className="material-symbols-outlined">add</span>
          </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-container-max mx-auto px-margin-mobile pt-md">

        {/* Tabs */}
        <div className="flex gap-sm mb-lg overflow-x-auto pb-1 no-scrollbar">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`whitespace-nowrap px-md py-2 rounded-full font-label-md text-label-md shrink-0 transition-all active:scale-95 ${
                activeTab === t
                  ? 'bg-primary-container text-on-primary shadow-sm'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {error && (
          <div className="flex items-center gap-sm text-error font-body-sm bg-error/10 rounded-lg px-md py-sm mb-md">
            <span className="material-symbols-outlined text-[18px] shrink-0">error_outline</span>
            <span className="flex-1">{error}</span>
            <button onClick={fetchListings} className="font-label-sm underline shrink-0">Retry</button>
          </div>
        )}

        {/* Listing cards */}
        <div className="flex flex-col gap-md">
          {isLoading ? (
            <><ListingSkeleton /><ListingSkeleton /><ListingSkeleton /></>
          ) : listings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-xxl gap-md text-on-surface-variant">
              <span className="material-symbols-outlined text-[64px]">storefront</span>
              <p className="font-headline-sm text-headline-sm">
                {activeTab === 'Active' ? 'No active listings' : activeTab === 'Sold' ? 'Nothing sold yet' : 'No drafts'}
              </p>
              <p className="font-body-sm text-body-sm text-center max-w-xs">
                {activeTab === 'Active'
                  ? 'Start selling — list your first item in minutes.'
                  : activeTab === 'Sold'
                  ? 'Your completed sales will appear here.'
                  : 'Saved drafts will appear here.'}
              </p>
              {activeTab === 'Active' && (
                <button
                  onClick={() => navigate('/create-listing')}
                  className="mt-sm bg-primary-container text-on-primary font-label-md text-label-md px-lg py-sm rounded-lg hover:bg-primary transition-colors active:scale-95 flex items-center gap-sm"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  Create Listing
                </button>
              )}
            </div>
          ) : (
            listings.map(item => {
              const badge   = STATUS_BADGE[item.status] ?? STATUS_BADGE.active;
              const loading = actionLoading === item.id;
              const isActive = !item.status || item.status === 'active';
              const isEscrow = item.status === 'escrow' || item.status === 'escrow_locked';
              const isSold   = item.status === 'sold';

              return (
                <article
                  key={item.id}
                  className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-sm overflow-hidden"
                >
                  <div className="flex gap-md p-md">
                    {/* Image */}
                    <div
                      className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-surface-container cursor-pointer"
                      onClick={() => navigate(`/product/${item.id}`)}
                    >
                      {item.image_url
                        ? <img className="w-full h-full object-cover" src={item.image_url} alt={item.title} />
                        : <div className="w-full h-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-[32px] text-outline-variant">image</span>
                          </div>
                      }
                    </div>

                    {/* Info */}
                    <div className="flex flex-col flex-1 min-w-0 justify-between">
                      <div className="flex items-start justify-between gap-sm">
                        <div className="min-w-0">
                          <h2
                            className="font-body-md text-body-md text-primary font-semibold line-clamp-2 cursor-pointer hover:underline"
                            onClick={() => navigate(`/product/${item.id}`)}
                          >
                            {item.title}
                          </h2>
                          <div className="flex items-center gap-xs mt-xs flex-wrap">
                            <span className="font-headline-sm text-headline-sm text-primary-container">
                              RM {Number(item.price).toFixed(2)}
                            </span>
                            {item.is_boosted && (
                              <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 border border-amber-200 px-xs py-[1px] rounded-full font-label-sm text-[10px]">
                                <span className="material-symbols-outlined text-[11px]" style={{ fontVariationSettings: "'FILL' 1" }}>rocket_launch</span>
                                Boosted
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-xs mt-xs">
                            <span className={`inline-flex items-center gap-1 border px-xs py-[1px] rounded-full font-label-sm text-[11px] ${badge.cls}`}>
                              <span className="material-symbols-outlined text-[11px]" style={{ fontVariationSettings: "'FILL' 1" }}>{badge.icon}</span>
                              {badge.label}
                            </span>
                            <span className="font-label-sm text-[11px] text-on-surface-variant">
                              {daysAgo(item.created_at)}
                            </span>
                          </div>
                        </div>

                        {/* Kebab menu */}
                        <div className="relative shrink-0" ref={openMenu === item.id ? menuRef : null}>
                          <button
                            className="text-on-surface-variant hover:bg-surface-container transition-colors p-1 rounded-full"
                            onClick={() => setOpenMenu(openMenu === item.id ? null : item.id)}
                            disabled={loading}
                          >
                            {loading
                              ? <span className="w-5 h-5 border-2 border-outline/30 border-t-secondary rounded-full animate-spin block" />
                              : <span className="material-symbols-outlined text-[20px]">more_vert</span>
                            }
                          </button>
                          {openMenu === item.id && (
                            <div className="absolute right-0 top-full mt-1 w-44 bg-surface rounded-xl shadow-level-2 border border-outline-variant/20 overflow-hidden z-50">
                              <button
                                className="w-full flex items-center gap-3 px-md py-sm font-body-sm text-body-sm text-on-surface hover:bg-surface-container transition-colors text-left"
                                onClick={() => { setOpenMenu(null); navigate(`/product/${item.id}`); }}
                              >
                                <span className="material-symbols-outlined text-[18px] text-on-surface-variant">visibility</span>
                                View Listing
                              </button>
                              {(isActive || isEscrow) && (
                                <button
                                  className="w-full flex items-center gap-3 px-md py-sm font-body-sm text-body-sm text-on-surface hover:bg-surface-container transition-colors text-left"
                                  onClick={() => handleMarkSold(item)}
                                >
                                  <span className="material-symbols-outlined text-[18px] text-green-600">check_circle</span>
                                  Mark as Sold
                                </button>
                              )}
                              {isSold && (
                                <button
                                  className="w-full flex items-center gap-3 px-md py-sm font-body-sm text-body-sm text-on-surface hover:bg-surface-container transition-colors text-left"
                                  onClick={() => handleMarkActive(item)}
                                >
                                  <span className="material-symbols-outlined text-[18px] text-secondary">refresh</span>
                                  Relist Item
                                </button>
                              )}
                              {isActive && !item.is_boosted && (
                                <button
                                  className="w-full flex items-center gap-3 px-md py-sm font-body-sm text-body-sm text-on-surface hover:bg-surface-container transition-colors text-left"
                                  onClick={() => { setOpenMenu(null); setBoostDone(false); setBoostModal(item); }}
                                >
                                  <span className="material-symbols-outlined text-[18px] text-amber-600">rocket_launch</span>
                                  Boost Listing
                                </button>
                              )}
                              <div className="border-t border-outline-variant/20" />
                              <button
                                className="w-full flex items-center gap-3 px-md py-sm font-body-sm text-body-sm text-error hover:bg-error/5 transition-colors text-left"
                                onClick={() => handleDelete(item)}
                              >
                                <span className="material-symbols-outlined text-[18px]">delete</span>
                                Delete Listing
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Boost button — only for active, non-boosted */}
                      {isActive && !item.is_boosted && (
                        <button
                          className="mt-sm w-full py-[6px] px-sm rounded-lg border border-dashed border-amber-400 text-amber-700 font-label-sm text-label-sm flex items-center justify-center gap-xs hover:bg-amber-50 transition-colors active:scale-[0.98]"
                          onClick={() => { setBoostDone(false); setBoostModal(item); }}
                        >
                          <span className="material-symbols-outlined text-[16px]">rocket_launch</span>
                          Boost for RM 0.50 — Get More Buyers
                        </button>
                      )}

                      {isEscrow && (
                        <div className="mt-sm inline-flex items-center gap-xs px-sm py-[4px] bg-amber-50 text-amber-700 border border-amber-200 rounded-lg font-label-sm text-[11px] w-fit">
                          <span className="material-symbols-outlined text-[13px]">lock</span>
                          Escrow locked — awaiting handoff
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action strip for sold items */}
                  {isSold && (
                    <div className="border-t border-outline-variant/20 px-md py-sm flex items-center justify-between bg-surface-container/30">
                      <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px] text-green-600" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                        Sold {daysAgo(item.created_at)}
                      </span>
                      <button
                        className="font-label-sm text-label-sm text-secondary hover:underline flex items-center gap-1"
                        onClick={() => handleMarkActive(item)}
                      >
                        <span className="material-symbols-outlined text-[14px]">refresh</span>
                        Relist
                      </button>
                    </div>
                  )}
                </article>
              );
            })
          )}
        </div>
      </main>

      {/* Total value bar — Active tab only */}
      {activeTab === 'Active' && !isLoading && listings.length > 0 && (
        <div className="fixed bottom-20 w-full bg-primary-container text-on-primary py-sm px-margin-mobile shadow-[0_-4px_12px_-2px_rgba(0,0,0,0.1)] z-40 border-t border-primary/20">
          <div className="flex justify-between items-center max-w-container-max mx-auto">
            <span className="font-body-sm text-body-sm text-on-primary/80">
              {listings.length} listing{listings.length !== 1 ? 's' : ''} · Total Value
            </span>
            <span className="font-headline-sm text-headline-sm font-bold">RM {totalValue.toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* ── Boost Modal ── */}
      {boostModal && (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center px-margin-mobile">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setBoostModal(null)} />
          <div className="relative bg-surface rounded-t-2xl md:rounded-2xl w-full max-w-md p-lg shadow-level-2 z-10 flex flex-col gap-md">

            {boostDone ? (
              // ── Success state
              <div className="flex flex-col items-center gap-md py-md text-center">
                <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
                  <span className="material-symbols-outlined text-amber-600" style={{ fontSize: 36, fontVariationSettings: "'FILL' 1" }}>
                    rocket_launch
                  </span>
                </div>
                <h2 className="font-headline-md text-headline-md text-primary">Listing Boosted!</h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  <span className="font-semibold text-primary">{boostModal.title}</span> is now featured at the top of search results for 7 days.
                </p>
                <button
                  className="w-full bg-primary-container text-on-primary font-label-md text-label-md py-sm rounded-xl hover:bg-primary transition-colors"
                  onClick={() => setBoostModal(null)}
                >
                  Done
                </button>
              </div>
            ) : (
              // ── Confirm state
              <>
                <div className="flex items-center gap-sm">
                  <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-amber-600 text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>rocket_launch</span>
                  </div>
                  <div>
                    <h2 className="font-headline-sm text-headline-sm text-primary">Boost Listing</h2>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">Feature this item at the top</p>
                  </div>
                </div>

                <div className="bg-surface-container rounded-xl p-md flex items-center gap-md">
                  {boostModal.image_url && (
                    <img className="w-14 h-14 rounded-lg object-cover shrink-0" src={boostModal.image_url} alt={boostModal.title} />
                  )}
                  <div className="min-w-0">
                    <p className="font-body-md text-body-md text-primary font-semibold line-clamp-1">{boostModal.title}</p>
                    <p className="font-headline-sm text-headline-sm text-primary-container">RM {Number(boostModal.price).toFixed(2)}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-xs">
                  {[
                    { icon: 'trending_up',  text: 'Pinned at the top of search & browse results' },
                    { icon: 'visibility',   text: 'Highlighted badge shown to all buyers' },
                    { icon: 'schedule',     text: 'Boost active for 7 days' },
                    { icon: 'payments',     text: 'One-time fee of RM 0.50' },
                  ].map(({ icon, text }) => (
                    <div key={icon} className="flex items-start gap-sm">
                      <span className="material-symbols-outlined text-secondary text-[18px] shrink-0 mt-0.5">{icon}</span>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">{text}</p>
                    </div>
                  ))}
                </div>

                <div className="flex gap-sm mt-sm">
                  <button
                    className="flex-1 border border-outline-variant text-on-surface-variant font-label-md text-label-md py-sm rounded-xl hover:bg-surface-container transition-colors"
                    onClick={() => setBoostModal(null)}
                  >
                    Cancel
                  </button>
                  <button
                    className="flex-1 bg-amber-500 text-white font-label-md text-label-md py-sm rounded-xl hover:bg-amber-600 transition-colors flex items-center justify-center gap-xs"
                    onClick={handleBoostConfirm}
                  >
                    <span className="material-symbols-outlined text-[18px]">rocket_launch</span>
                    Boost · RM 0.50
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <BottomNav activeTab="Account" />
    </div>
  );
}
