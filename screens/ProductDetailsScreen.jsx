import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import BottomNav from '../components/BottomNav';
import GuestModal from '../components/GuestModal';

// ── UI helper: star row ────────────────────────────────────────
function Stars({ rating, size = 16 }) {
  return (
    <div className="flex items-center gap-[2px]">
      {[1, 2, 3, 4, 5].map(i => (
        <span
          key={i}
          className={`material-symbols-outlined ${i <= rating ? 'text-tertiary-fixed-dim' : 'text-outline-variant'}`}
          style={{ fontSize: size, fontVariationSettings: i <= rating ? "'FILL' 1" : "'FILL' 0" }}
        >
          star
        </span>
      ))}
    </div>
  );
}

// ── Loading skeleton ───────────────────────────────────────────
function DetailSkeleton() {
  return (
    <div className="animate-pulse max-w-container-max mx-auto w-full md:mt-[88px] md:px-lg md:py-lg md:grid md:grid-cols-12 md:gap-gutter">
      <div className="md:col-span-7 lg:col-span-8">
        <div className="aspect-square md:aspect-[4/3] bg-surface-container-high md:rounded-xl" />
        <div className="flex gap-base px-margin-mobile md:px-0 mt-sm">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-20 h-20 rounded-lg bg-surface-container-high shrink-0" />
          ))}
        </div>
      </div>
      <div className="md:col-span-5 lg:col-span-4 px-margin-mobile md:px-0 py-md space-y-md">
        <div className="h-7 bg-surface-container-high rounded w-3/4" />
        <div className="h-8 bg-surface-container-high rounded w-1/3" />
        <div className="h-24 bg-surface-container-high rounded-xl" />
        <div className="h-4 bg-surface-container-high rounded w-full" />
        <div className="h-4 bg-surface-container-high rounded w-5/6" />
      </div>
    </div>
  );
}

export default function ProductDetailsScreen() {
  const navigate = useNavigate();
  const { id }   = useParams();
  const { session } = useAuth();

  const [listing, setListing]           = useState(null);
  const [images, setImages]             = useState([]);
  const [seller, setSeller]             = useState(null);
  const [reviews, setReviews]           = useState([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [error, setError]               = useState(null);
  const [activeThumb, setActiveThumb]   = useState(0);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [guestMessage, setGuestMessage] = useState('');
  const [inCart, setInCart]             = useState(false);
  const [cartLoading, setCartLoading]   = useState(false);
  const [chatLoading, setChatLoading]   = useState(false);
  const [sellerMenuOpen, setSellerMenuOpen] = useState(false);
  const sellerMenuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (sellerMenuRef.current && !sellerMenuRef.current.contains(e.target))
        setSellerMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!id) return;
    fetchAll();
  }, [id]);

  async function fetchAll() {
    setIsLoading(true);
    setError(null);
    try {
      const { data: listingData, error: listingErr } = await supabase
        .from('listings')
        .select('id, title, description, price, condition, accepts_trade, created_at, image_url, user_id, seller_id')
        .eq('id', id)
        .single();

      if (listingErr) throw listingErr;
      setListing(listingData);
      setImages(listingData?.image_url ? [listingData.image_url] : []);

      // Fetch seller profile separately
      const sellerId = listingData?.user_id ?? listingData?.seller_id;
      if (sellerId) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', sellerId)
          .maybeSingle();
        setSeller(profileData ?? null);
      }

      // Reviews — silently skip if table doesn't exist yet
      const { data: reviewsData } = await supabase
        .from('reviews')
        .select('id, rating, comment, created_at')
        .eq('listing_id', id)
        .order('created_at', { ascending: false })
        .limit(10);
      setReviews(reviewsData ?? []);

      if (session) {
        const { data: cartCheck } = await supabase
          .from('cart_items')
          .select('id')
          .eq('user_id', session.user.id)
          .eq('listing_id', listingData.id)
          .maybeSingle();
        setInCart(!!cartCheck);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleChatSeller(prefillMsg = null) {
    if (!requireAuth('chat')) return;
    setChatLoading(true);
    try {
      const sellerId = listing.user_id ?? listing.seller_id;

      // Find existing conversation for this buyer + listing
      let { data: conv, error: findErr } = await supabase
        .from('conversations')
        .select('id')
        .eq('listing_id', listing.id)
        .eq('buyer_id', session.user.id)
        .maybeSingle();

      if (findErr) throw findErr;

      // Create conversation if none exists
      if (!conv) {
        const { data: newConv, error: createErr } = await supabase
          .from('conversations')
          .insert({
            listing_id: listing.id,
            buyer_id:   session.user.id,
            seller_id:  sellerId,
          })
          .select().single();
        if (createErr) throw createErr;
        conv = newConv;
      }

      navigate(`/chat/${conv.id}`, {
        state: {
          listingTitle: listing.title,
          listingImage: listing.image_url,
          sellerName:   seller?.username ?? seller?.full_name ?? seller?.name ?? 'Seller',
          listingId:    listing.id,
          sellerId,
          prefill:      prefillMsg,
        },
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setChatLoading(false);
    }
  }

  async function handleAddToCart() {
    if (!session) {
      setGuestMessage('Log in to add items to your cart.');
      setShowGuestModal(true);
      return;
    }
    if (inCart) { navigate('/cart'); return; }
    setCartLoading(true);
    const { error } = await supabase.from('cart_items').insert({
      user_id:    session.user.id,
      listing_id: listing.id,
      quantity:   1,
    });
    if (!error) setInCart(true);
    setCartLoading(false);
  }

  function requireAuth(action) {
    if (!session) {
      const messages = {
        chat:  'Log in to message the seller and negotiate a deal.',
        offer: 'Log in to make an offer on this item.',
        trade: 'Log in to propose a trade with the seller.',
      };
      setGuestMessage(messages[action] ?? 'Log in to continue.');
      setShowGuestModal(true);
      return false;
    }
    return true;
  }

  // Derived review stats
  const avgRating = reviews.length > 0
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : null;
  const ratingBars = [5, 4, 3, 2, 1].map(stars => ({
    stars,
    pct: reviews.length > 0
      ? Math.round(reviews.filter(r => r.rating === stars).length / reviews.length * 100)
      : 0,
  }));

  const acceptsTrades = listing?.accepts_trade ?? false;

  const formatDate = iso => new Date(iso).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });
  const timeAgo = iso => {
    const days = Math.floor((Date.now() - new Date(iso)) / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  };

  return (
    <div className={`bg-[#FDFAFF] text-on-surface font-body-md antialiased min-h-screen flex flex-col pt-16 md:pb-0 md:pt-0 ${acceptsTrades ? 'pb-[220px]' : 'pb-[140px]'}`}>

      {/* Mobile top nav */}
      <nav className="md:hidden fixed top-0 left-0 w-full z-50 bg-surface shadow-sm h-16 flex items-center justify-between px-margin-mobile">
        <button className="p-2 -ml-2 text-primary hover:bg-surface-container-high rounded-full transition-colors" onClick={() => navigate(-1)}>
          <span className="material-symbols-outlined text-[24px]">arrow_back</span>
        </button>
        <h1 className="font-headline-md text-headline-md text-primary truncate max-w-[200px]">Item Details</h1>
        <button className="p-2 -mr-2 text-primary hover:bg-surface-container-high rounded-full transition-colors">
          <span className="material-symbols-outlined text-[24px]">share</span>
        </button>
      </nav>

      {/* Desktop header */}
      <header className="hidden md:flex flex-col bg-surface shadow-sm w-full top-0 z-50 fixed">
        <div className="flex justify-between items-center w-full px-lg py-md max-w-container-max mx-auto">
          <div className="flex items-center gap-md cursor-pointer hover:opacity-80 transition-opacity" onClick={() => navigate('/')}>
            <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>storefront</span>
            <span className="font-headline-lg text-headline-lg font-black text-primary tracking-tight">Plumio</span>
          </div>
          <nav className="flex items-center gap-sm font-label-md text-label-md text-on-surface-variant">
            <button className="hover:text-primary hover:bg-surface-container px-sm py-xs rounded-lg transition-all flex items-center gap-1 active:scale-[0.98]" onClick={() => navigate('/categories')}>
              <span className="material-symbols-outlined text-[20px]">category</span>Browse
            </button>
            <button className="hover:text-primary hover:bg-surface-container px-sm py-xs rounded-lg transition-all flex items-center gap-1 active:scale-[0.98]" onClick={() => navigate('/cart')}>
              <span className="material-symbols-outlined text-[20px]">shopping_cart</span>Cart
            </button>
            {session ? (
              <button className="bg-secondary text-on-secondary px-md py-[7px] rounded-full font-label-md hover:bg-secondary/90 active:scale-[0.97] transition-all shadow-sm ml-xs" onClick={() => navigate('/create-listing')}>
                + Sell
              </button>
            ) : (
              <>
                <button className="hover:text-primary hover:bg-surface-container px-sm py-xs rounded-lg transition-all active:scale-[0.98]" onClick={() => navigate('/login')}>Login</button>
                <button className="hover:text-primary hover:bg-surface-container px-sm py-xs rounded-lg transition-all active:scale-[0.98]" onClick={() => navigate('/signup')}>Sign Up</button>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* ── Loading ─── */}
      {isLoading && <DetailSkeleton />}

      {/* ── Error ─── */}
      {!isLoading && error && (
        <div className="flex flex-col items-center justify-center py-xxl gap-md text-on-surface-variant max-w-container-max mx-auto px-margin-mobile">
          <span className="material-symbols-outlined text-[56px] text-error">error_outline</span>
          <p className="font-headline-sm text-headline-sm text-error">{error}</p>
          <button onClick={fetchAll} className="bg-primary-container text-on-primary font-label-md text-label-md px-lg py-sm rounded-lg hover:bg-primary transition-colors">
            Try Again
          </button>
        </div>
      )}

      {/* ── Content ─── */}
      {!isLoading && !error && listing && (
        <main className="flex-1 max-w-container-max mx-auto w-full md:mt-[88px] md:px-lg md:py-lg md:grid md:grid-cols-12 md:gap-gutter relative">

          {/* Back (desktop) */}
          <div className="hidden md:block col-span-12 mb-md">
            <button className="flex items-center gap-xs text-on-surface-variant hover:text-secondary transition-colors font-label-md text-label-md" onClick={() => navigate(-1)}>
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
              Back to search
            </button>
          </div>

          {/* ── Image gallery ── */}
          <section className="md:col-span-7 lg:col-span-8 flex flex-col gap-base md:gap-md w-full">
            <div className="w-full aspect-square md:aspect-[4/3] bg-surface-container-low md:rounded-xl overflow-hidden shadow-sm relative group">
              {images[activeThumb] ? (
                <img
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                  src={images[activeThumb]}
                  alt={listing.title}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-surface-container-high">
                  <span className="material-symbols-outlined text-[64px] text-outline-variant">image</span>
                </div>
              )}
              {listing.condition && (
                <div className="absolute top-md left-md flex gap-xs">
                  <span className="bg-secondary text-on-secondary font-label-sm text-label-sm px-3 py-1 rounded-full shadow-md capitalize">
                    {listing.condition.replace('_', ' ')}
                  </span>
                </div>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-base px-margin-mobile md:px-0 overflow-x-auto no-scrollbar pb-xs">
                {images.map((src, i) => (
                  <div
                    key={i}
                    className={`w-20 h-20 shrink-0 rounded-lg overflow-hidden cursor-pointer bg-surface-container-low shadow-sm transition-all ${
                      i === activeThumb
                        ? 'border-2 border-secondary'
                        : 'border border-surface-container-high hover:border-outline-variant opacity-70 hover:opacity-100'
                    }`}
                    onClick={() => setActiveThumb(i)}
                  >
                    <img className="w-full h-full object-cover" src={src} alt="" />
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── Details column ── */}
          <section className="px-margin-mobile md:px-0 py-md md:py-0 md:col-span-5 lg:col-span-4 flex flex-col gap-lg">
            {/* Title / price */}
            <div className="flex flex-col gap-sm">
              <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary">
                {listing.title}
              </h1>
              <p className="font-display-lg text-display-lg text-primary-container font-black tracking-tight">
                RM {Number(listing.price).toFixed(2)}
              </p>
              <div className="flex items-center flex-wrap gap-sm mt-xs">
                <div className="flex items-center gap-xs text-on-surface-variant font-body-sm text-body-sm">
                  <span className="material-symbols-outlined text-[18px]">schedule</span>
                  Listed {timeAgo(listing.created_at)}
                </div>
                {acceptsTrades && (
                  <span className="inline-flex items-center gap-1 bg-secondary/10 text-secondary border border-secondary/30 px-sm py-[2px] rounded-full font-label-sm text-label-sm">
                    <span className="material-symbols-outlined text-[14px]">swap_horiz</span>
                    Accepts Trades
                  </span>
                )}
              </div>
            </div>

            <hr className="border-t border-outline-variant opacity-30" />

            {/* Seller card */}
            <div className="flex flex-col gap-sm bg-surface-container-lowest p-md rounded-xl shadow-sm border border-surface-container-high">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-sm">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-surface-container-low shadow-sm border border-outline-variant">
                    {seller?.avatar_url ? (
                      <img className="w-full h-full object-cover" src={seller.avatar_url} alt={seller.full_name} />
                    ) : (
                      <div className="w-full h-full bg-secondary-container flex items-center justify-center">
                        <span className="font-label-lg text-on-secondary-container font-bold">
                          {(seller?.username ?? seller?.full_name ?? seller?.name ?? '?')[0].toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  <div>
                    <span className="font-headline-sm text-headline-sm text-primary">
                      {seller?.username ?? seller?.full_name ?? seller?.name ?? 'Seller'}
                    </span>
                    {seller?.verified && (
                      <div className="flex items-center gap-1 text-secondary">
                        <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                        <span className="font-label-sm text-label-sm font-bold">Verified Peer</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="relative" ref={sellerMenuRef}>
                  <button
                    className="text-secondary hover:bg-secondary-container hover:text-on-secondary-container transition-colors p-2 rounded-full"
                    onClick={() => setSellerMenuOpen(v => !v)}
                  >
                    <span className="material-symbols-outlined">more_vert</span>
                  </button>
                  {sellerMenuOpen && (
                    <div className="absolute right-0 top-full mt-1 w-48 bg-surface rounded-xl shadow-level-2 border border-outline-variant/20 overflow-hidden z-50">
                      <button
                        className="w-full flex items-center gap-3 px-md py-sm font-body-md text-body-md text-error hover:bg-error/5 transition-colors text-left"
                        onClick={() => { setSellerMenuOpen(false); navigate('/report'); }}
                      >
                        <span className="material-symbols-outlined text-[20px]">flag</span>
                        Report Seller
                      </button>
                      <button
                        className="w-full flex items-center gap-3 px-md py-sm font-body-md text-body-md text-on-surface hover:bg-surface-container transition-colors text-left"
                        onClick={() => { setSellerMenuOpen(false); alert('Block feature coming soon.'); }}
                      >
                        <span className="material-symbols-outlined text-[20px] text-on-surface-variant">block</span>
                        Block Seller
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {listing.meetup_location && (
                <div className="flex items-center gap-2 mt-xs text-on-surface-variant font-body-sm text-body-sm bg-surface-container-low p-2 rounded-lg w-fit">
                  <span className="material-symbols-outlined text-secondary text-[18px]">location_on</span>
                  {listing.meetup_location}
                </div>
              )}
            </div>

            <hr className="border-t border-outline-variant opacity-30 hidden md:block" />

            {/* Description + desktop CTAs */}
            <div className="flex flex-col gap-sm pb-xl md:pb-0">
              <h3 className="font-headline-sm text-headline-sm text-primary">Description</h3>
              <div className="font-body-md text-body-md text-on-surface-variant">
                {listing.description
                  ? listing.description.split('\n').map((line, i) => <p key={i}>{line}</p>)
                  : <p className="italic text-on-surface-variant/50">No description provided.</p>
                }
              </div>

              {/* Desktop CTA buttons */}
              <div className="hidden md:flex flex-col gap-sm mt-lg">
                <button
                  onClick={handleAddToCart}
                  disabled={cartLoading}
                  className={`w-full font-label-md text-label-md py-3 rounded-lg shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 ${
                    inCart
                      ? 'bg-secondary/10 text-secondary border-2 border-secondary'
                      : 'bg-primary-container text-on-primary hover:bg-primary'
                  }`}
                >
                  {cartLoading ? (
                    <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                  ) : (
                    <span className="material-symbols-outlined text-[20px]">
                      {inCart ? 'shopping_cart_checkout' : 'add_shopping_cart'}
                    </span>
                  )}
                  {inCart ? 'Go to Cart' : 'Add to Cart'}
                </button>
                <div className="flex gap-md">
                  <button
                    className="flex-1 bg-secondary text-on-secondary font-label-md text-label-md py-3 rounded-lg shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                    disabled={chatLoading}
                    onClick={() => handleChatSeller()}
                  >
                    {chatLoading
                      ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : <span className="material-symbols-outlined text-[18px]">chat</span>
                    }
                    Chat Seller
                  </button>
                  <button
                    className="flex-1 border border-outline-variant text-on-surface-variant font-label-md text-label-md py-3 rounded-lg shadow-sm hover:shadow-md transition-all text-center"
                    onClick={() => {
                      if (requireAuth('offer')) handleChatSeller('Hi, I would like to make an offer for this item.');
                    }}
                  >
                    Make Offer
                  </button>
                </div>
                {acceptsTrades && (
                  <div className="flex flex-col gap-xs">
                    <button
                      className="w-full border-2 border-secondary text-secondary font-label-md text-label-md py-3 rounded-lg hover:bg-secondary/8 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                      onClick={() => {
                        if (requireAuth('trade')) handleChatSeller('Hi, I would like to propose a trade for this item.');
                      }}
                    >
                      <span className="material-symbols-outlined text-[20px]">swap_horiz</span>
                      Propose Trade
                    </button>
                    <div className="flex items-center gap-xs pl-xs">
                      <span className="font-label-sm text-label-sm text-on-surface-variant">RM 2.00 platform fee on successful trades.</span>
                      <div className="relative group">
                        <span className="material-symbols-outlined text-[14px] text-on-surface-variant/70 cursor-help select-none">help</span>
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 px-sm py-xs bg-on-surface text-surface font-body-sm text-[11px] rounded-lg shadow-level-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 leading-snug text-center">
                          Fee is charged only after both parties confirm the trade handoff via the Secure QR flow.
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ── Ratings & Reviews — full-width below the product grid ── */}
          <section className="md:col-span-12 px-margin-mobile md:px-0 mt-xl pb-lg border-t border-outline-variant/20 pt-xl">
            <h3 className="font-headline-md text-headline-md text-primary mb-lg">Ratings &amp; Reviews</h3>

            {reviews.length === 0 ? (
              <div className="flex flex-col items-center py-xl gap-sm text-on-surface-variant">
                <span className="material-symbols-outlined text-[40px]">rate_review</span>
                <p className="font-body-md">No reviews yet. Be the first buyer!</p>
              </div>
            ) : (
              <>
                {/* Overall summary card */}
                <div className="flex items-center gap-lg mb-lg bg-surface-container-lowest rounded-2xl p-lg shadow-level-1 border border-outline-variant/20">
                  <div className="flex flex-col items-center shrink-0 pr-lg border-r border-outline-variant/20">
                    <span className="font-black leading-none text-primary" style={{ fontSize: '3rem' }}>
                      {avgRating?.toFixed(1)}
                    </span>
                    <Stars rating={Math.round(avgRating ?? 0)} size={18} />
                    <span className="font-label-sm text-label-sm text-on-surface-variant mt-xs">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex-1 flex flex-col gap-xs">
                    {ratingBars.map(({ stars, pct }) => (
                      <div key={stars} className="flex items-center gap-sm">
                        <span className="font-label-sm text-label-sm text-on-surface-variant w-3 shrink-0">{stars}</span>
                        <span className="material-symbols-outlined text-tertiary-fixed-dim shrink-0" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>star</span>
                        <div className="flex-1 h-[6px] bg-surface-container-high rounded-full overflow-hidden">
                          <div className="h-full bg-tertiary-fixed-dim rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="font-label-sm text-label-sm text-on-surface-variant w-8 text-right shrink-0">{pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Individual reviews */}
                <div className="flex flex-col gap-md">
                  {reviews.map(r => (
                    <div key={r.id} className="bg-surface-container-lowest rounded-xl p-md shadow-level-1 border border-outline-variant/20">
                      <div className="flex items-start justify-between mb-sm">
                        <div className="flex items-center gap-sm">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-secondary-container flex items-center justify-center shrink-0">
                            {r.reviewer?.avatar_url ? (
                              <img className="w-full h-full object-cover" src={r.reviewer.avatar_url} alt="" />
                            ) : (
                              <span className="font-label-md text-label-md text-on-secondary-container font-bold">
                                {r.reviewer?.full_name?.[0]?.toUpperCase() ?? '?'}
                              </span>
                            )}
                          </div>
                          <div>
                            <span className="font-label-md text-label-md text-on-surface font-semibold">{r.reviewer?.username ?? 'Anonymous'}</span>
                            <div className="mt-[2px]"><Stars rating={r.rating} size={13} /></div>
                          </div>
                        </div>
                        <span className="font-label-sm text-label-sm text-on-surface-variant/70 shrink-0 ml-sm">{formatDate(r.created_at)}</span>
                      </div>
                      <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">{r.comment}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
        </main>
      )}

      {/* ── Mobile CTA bar ── */}
      {!isLoading && !error && listing && (
        <div className="md:hidden fixed bottom-[72px] left-0 w-full px-margin-mobile py-sm bg-surface/95 backdrop-blur-md shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] border-t border-outline-variant z-40 flex flex-col gap-sm">
          <button
            onClick={handleAddToCart}
            disabled={cartLoading}
            className={`w-full font-label-md text-label-md py-3 rounded-lg shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2 ${
              inCart
                ? 'bg-secondary/10 text-secondary border-2 border-secondary'
                : 'bg-primary-container text-on-primary'
            }`}
          >
            {cartLoading ? (
              <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
            ) : (
              <span className="material-symbols-outlined text-[20px]">
                {inCart ? 'shopping_cart_checkout' : 'add_shopping_cart'}
              </span>
            )}
            {inCart ? 'Go to Cart' : 'Add to Cart'}
          </button>
          <div className="flex gap-sm">
            <button
              className="flex-1 bg-secondary text-on-secondary font-label-md text-label-md py-3 rounded-lg shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              disabled={chatLoading}
              onClick={() => handleChatSeller()}
            >
              {chatLoading
                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <span className="material-symbols-outlined text-[20px]">chat</span>
              }
              Chat Seller
            </button>
            <button
              className="flex-1 border border-outline-variant text-on-surface-variant font-label-md text-label-md py-3 rounded-lg shadow-sm active:scale-95 transition-transform flex items-center justify-center gap-2"
              onClick={() => {
                if (requireAuth('offer')) handleChatSeller('Hi, I would like to make an offer for this item.');
              }}
            >
              <span className="material-symbols-outlined text-[20px]">local_offer</span>
              Make Offer
            </button>
          </div>
          {acceptsTrades && (
            <div className="flex flex-col gap-xs">
              <button
                className="w-full border-2 border-secondary text-secondary font-label-md text-label-md py-[10px] rounded-lg hover:bg-secondary/8 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                onClick={() => {
                  if (requireAuth('trade')) handleChatSeller('Hi, I would like to propose a trade for this item.');
                }}
              >
                <span className="material-symbols-outlined text-[20px]">swap_horiz</span>
                Propose Trade
              </button>
              <p className="font-label-sm text-label-sm text-on-surface-variant text-center flex items-center justify-center gap-1">
                <span className="material-symbols-outlined text-[13px]">info</span>
                RM 2.00 platform fee on successful trades.
              </p>
            </div>
          )}
        </div>
      )}

      {showGuestModal && (
        <GuestModal message={guestMessage} onClose={() => setShowGuestModal(false)} />
      )}

      <BottomNav activeTab="Home" />
    </div>
  );
}
