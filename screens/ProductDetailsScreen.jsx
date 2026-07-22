import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import TopAppBar   from '../components/TopAppBar';
import BottomNav from '../components/BottomNav';
import GuestModal   from '../components/GuestModal';
import LikeButton   from '../components/LikeButton';
import ScamAlertBanner from '../components/ScamAlertBanner';

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
    <div className="animate-pulse max-w-container-max mx-auto w-full md:px-lg md:py-lg md:grid md:grid-cols-12 md:gap-gutter">
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
  const { addToCart } = useCart();

  const [listing, setListing]           = useState(null);
  const [images, setImages]             = useState([]);
  const [seller, setSeller]             = useState(null);
  const [reviews, setReviews]           = useState([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [error, setError]               = useState(null);
  const [activeThumb, setActiveThumb]   = useState(0);
  const [swipeDir, setSwipeDir]         = useState(0);

  function paginate(dir) {
    setSwipeDir(dir);
    setActiveThumb(prev => Math.max(0, Math.min(images.length - 1, prev + dir)));
  }
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [guestMessage, setGuestMessage] = useState('');
  const [inCart, setInCart]             = useState(false);
  const [cartLoading, setCartLoading]   = useState(false);
  const [isAdded, setIsAdded]           = useState(false);
  const [chatLoading, setChatLoading]   = useState(false);
  const [sellerMenuOpen, setSellerMenuOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const sellerMenuRef   = useRef(null);
  const videoSwipeX     = useRef(null); // tracks touchstart X for video edge zones

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

  // Silently record this view — upsert so refreshing doesn't create duplicate rows.
  // created_at is updated on conflict so the item rises to the top of "Recently Viewed".
  useEffect(() => {
    const uid = session?.user?.id;
    if (!id || !uid) return;
    supabase.from('user_activity').upsert(
      { user_id: uid, listing_id: id, activity_type: 'view', created_at: new Date().toISOString() },
      { onConflict: 'user_id,listing_id,activity_type' }
    );
  }, [id, session?.user?.id]);

  async function fetchAll() {
    setIsLoading(true);
    setError(null);
    try {
      const { data: listingData, error: listingErr } = await supabase
        .from('listings')
        .select('id, title, description, price, condition, accepts_trade, created_at, image_url, media_urls, user_id, seller_id')
        .eq('id', id)
        .single();

      if (listingErr) throw listingErr;
      setListing(listingData);

      // Use media_urls (all uploaded files) when available; fall back to single image_url
      const allMedia = Array.isArray(listingData?.media_urls) && listingData.media_urls.length > 0
        ? listingData.media_urls
        : listingData?.image_url ? [listingData.image_url] : [];
      setImages(allMedia);
      // Default to first image (not a video) so the hero never opens on a video slide
      const firstImgIdx = allMedia.findIndex(u => !isVideo(u));
      setActiveThumb(firstImgIdx !== -1 ? firstImgIdx : 0);

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
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select('id, rating, comment, created_at')
        .eq('listing_id', id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (!reviewsError) setReviews(reviewsData ?? []);

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
    if (cartLoading) return;
    if (inCart) { navigate('/cart'); return; }

    setCartLoading(true);

    // Check DB first — guards against stale inCart state (multi-tab, fast nav)
    const { data: existing } = await supabase
      .from('cart_items')
      .select('id, quantity')
      .eq('user_id', session.user.id)
      .eq('listing_id', listing.id)
      .maybeSingle();

    let upsertError;
    if (existing) {
      // Item already in cart from another session — increment quantity
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity: existing.quantity + 1 })
        .eq('id', existing.id);
      upsertError = error;
      // Badge already counts this item; don't call addToCart()
    } else {
      const { error } = await supabase
        .from('cart_items')
        .insert({ user_id: session.user.id, listing_id: listing.id, quantity: 1 });
      upsertError = error;
      if (!error) addToCart();
    }

    if (!upsertError) {
      setInCart(true);
      setIsAdded(true);
      setTimeout(() => setIsAdded(false), 2000);
    }
    setCartLoading(false);
  }

  async function handleBuyNow() {
    if (!session) {
      setGuestMessage('Log in to buy items.');
      setShowGuestModal(true);
      return;
    }
    if (cartLoading) return;
    if (!inCart) {
      setCartLoading(true);

      const { data: existing } = await supabase
        .from('cart_items')
        .select('id, quantity')
        .eq('user_id', session.user.id)
        .eq('listing_id', listing.id)
        .maybeSingle();

      let err;
      if (existing) {
        ({ error: err } = await supabase
          .from('cart_items')
          .update({ quantity: existing.quantity + 1 })
          .eq('id', existing.id));
      } else {
        ({ error: err } = await supabase
          .from('cart_items')
          .insert({ user_id: session.user.id, listing_id: listing.id, quantity: 1 }));
        if (!err) addToCart();
      }

      setCartLoading(false);
      if (!err) setInCart(true);
    }
    navigate('/cart');
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

  function isVideo(url = '') {
    return Boolean((url || '').match(/\.(mp4|webm|ogg|mov)(\?|$)/i));
  }

  const formatDate = iso => new Date(iso).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });
  const timeAgo = iso => {
    const days = Math.floor((Date.now() - new Date(iso)) / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  };

  return (
    <div className={`bg-[#FDFAFF] text-on-surface font-body-md antialiased min-h-screen flex flex-col md:pb-0 ${acceptsTrades ? 'pb-[220px]' : 'pb-[140px]'}`}>

      <TopAppBar variant="brand" />

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
        <main className="flex-1 max-w-container-max mx-auto w-full md:px-lg md:py-lg md:grid md:grid-cols-12 md:gap-gutter relative">

          {/* Back (desktop) */}
          <div className="hidden md:block col-span-12 mb-md">
            <button className="flex items-center gap-xs text-on-surface-variant hover:text-secondary transition-colors font-label-md text-label-md" onClick={() => navigate(-1)}>
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
              Back to search
            </button>
          </div>

          {/* ── Image gallery ── */}
          <section className="md:col-span-7 lg:col-span-8 flex flex-col gap-base md:gap-md w-full">

            {/* Hero carousel */}
            <div className="w-full aspect-square md:aspect-[4/3] bg-surface-container-low md:rounded-xl overflow-hidden shadow-sm relative group select-none">

              {/* Slides */}
              <AnimatePresence custom={swipeDir} initial={false}>
                <motion.div
                  key={activeThumb}
                  custom={swipeDir}
                  variants={{
                    enter:  (d) => ({ x: d >= 0 ? '100%' : '-100%', opacity: 0 }),
                    center: { x: 0, opacity: 1 },
                    exit:   (d) => ({ x: d >= 0 ? '-100%' : '100%', opacity: 0 }),
                  }}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ type: 'tween', ease: 'easeInOut', duration: 0.28 }}
                  drag={images[activeThumb] && !isVideo(images[activeThumb]) ? 'x' : false}
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.15}
                  onDragEnd={(_, { offset, velocity }) => {
                    if (offset.x < -50 || velocity.x < -400) paginate(1);
                    else if (offset.x > 50 || velocity.x > 400) paginate(-1);
                  }}
                  className="absolute inset-0 cursor-grab active:cursor-grabbing"
                >
                  {images[activeThumb] ? (
                    isVideo(images[activeThumb]) ? (
                      <video
                        key={images[activeThumb]}
                        src={images[activeThumb]}
                        controls
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <img
                        key={images[activeThumb]}
                        className="w-full h-full object-cover pointer-events-none"
                        src={images[activeThumb]}
                        alt={listing.title}
                        draggable={false}
                      />
                    )
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-surface-container-high">
                      <span className="material-symbols-outlined text-[64px] text-outline-variant">image</span>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* ── Video edge nav zones ──────────────────────────────────────
                   When a video is active, native <video controls> captures all
                   touch events so swipe/drag can't fire. These transparent zones
                   sit above the video (z-20) on the left/right 22% of the frame,
                   stopping 60px from the bottom to leave the controls bar clear.
                   They handle both tap (onClick) and swipe (onTouchStart/End).    */}
              {images[activeThumb] && isVideo(images[activeThumb]) && images.length > 1 && (
                <>
                  <div
                    className={`absolute left-0 top-0 w-[22%] z-20 ${activeThumb === 0 ? 'pointer-events-none' : 'cursor-pointer'}`}
                    style={{ height: 'calc(100% - 60px)' }}
                    onClick={() => paginate(-1)}
                    onTouchStart={e => { videoSwipeX.current = e.touches[0].clientX; }}
                    onTouchEnd={e => {
                      const dx = e.changedTouches[0].clientX - (videoSwipeX.current ?? 0);
                      if (Math.abs(dx) > 40) paginate(dx > 0 ? -1 : 1);
                    }}
                  />
                  <div
                    className={`absolute right-0 top-0 w-[22%] z-20 ${activeThumb === images.length - 1 ? 'pointer-events-none' : 'cursor-pointer'}`}
                    style={{ height: 'calc(100% - 60px)' }}
                    onClick={() => paginate(1)}
                    onTouchStart={e => { videoSwipeX.current = e.touches[0].clientX; }}
                    onTouchEnd={e => {
                      const dx = e.changedTouches[0].clientX - (videoSwipeX.current ?? 0);
                      if (Math.abs(dx) > 40) paginate(dx > 0 ? -1 : 1);
                    }}
                  />
                </>
              )}

              {/* Condition badge */}
              {listing.condition && (
                <div className="absolute top-md left-md flex gap-xs z-10 pointer-events-none">
                  <span className="bg-secondary text-on-secondary font-label-sm text-label-sm px-3 py-1 rounded-full shadow-md capitalize">
                    {listing.condition.replace('_', ' ')}
                  </span>
                </div>
              )}

              {/* Like button */}
              <LikeButton
                listingId={listing.id}
                userId={session?.user?.id}
                size={22}
                className="absolute top-3 right-3 w-10 h-10 rounded-full bg-white/90 shadow-md z-10"
              />

              {/* Prev / Next arrows */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => paginate(-1)}
                    disabled={activeThumb === 0}
                    className="absolute left-3 top-1/2 -translate-y-1/2 z-30 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/95 hover:bg-white active:scale-95 text-gray-800 flex items-center justify-center transition-all shadow-[0_2px_12px_rgba(0,0,0,0.25)] border border-gray-200/80 disabled:!opacity-0"
                    aria-label="Previous"
                  >
                    <span className="material-symbols-outlined text-[22px] md:text-[26px]">chevron_left</span>
                  </button>
                  <button
                    onClick={() => paginate(1)}
                    disabled={activeThumb === images.length - 1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 z-30 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/95 hover:bg-white active:scale-95 text-gray-800 flex items-center justify-center transition-all shadow-[0_2px_12px_rgba(0,0,0,0.25)] border border-gray-200/80 disabled:!opacity-0"
                    aria-label="Next"
                  >
                    <span className="material-symbols-outlined text-[22px] md:text-[26px]">chevron_right</span>
                  </button>
                </>
              )}

              {/* Dot indicators */}
              {images.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => { setSwipeDir(i > activeThumb ? 1 : -1); setActiveThumb(i); }}
                      className={`rounded-full transition-all duration-300 ${
                        i === activeThumb ? 'w-5 h-2 bg-white' : 'w-2 h-2 bg-white/50 hover:bg-white/80'
                      }`}
                      aria-label={`Go to ${isVideo(images[i]) ? 'video' : 'image'} ${i + 1}`}
                    />
                  ))}
                </div>
              )}

              {/* Video indicator badge */}
              {images[activeThumb] && isVideo(images[activeThumb]) && (
                <div className="absolute top-3 left-3 z-10 bg-black/60 text-white text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1 pointer-events-none">
                  <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>play_circle</span>
                  Video
                </div>
              )}
            </div>

            {/* Thumbnail strip */}
            {images.length > 1 && (
              <div className="flex gap-2 px-margin-mobile md:px-0 overflow-x-auto no-scrollbar pb-2">
                {images.map((src, i) => (
                  <div
                    key={i}
                    className={`w-16 h-16 flex-shrink-0 relative rounded-md overflow-hidden cursor-pointer bg-gray-100 shadow-sm transition-all ${
                      i === activeThumb
                        ? 'border-2 border-purple-600'
                        : 'border border-transparent opacity-70 hover:opacity-100'
                    }`}
                    onClick={() => { setSwipeDir(i > activeThumb ? 1 : -1); setActiveThumb(i); }}
                  >
                    {isVideo(src) ? (
                      <>
                        <div className="w-full h-full bg-gray-800" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <span className="material-symbols-outlined text-white text-[26px]" style={{ fontVariationSettings: "'FILL' 1" }}>play_circle</span>
                        </div>
                      </>
                    ) : (
                      <img className="w-full h-full object-cover" src={src} alt="" />
                    )}
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
                        onClick={() => {
                          setSellerMenuOpen(false);
                          navigate('/report', {
                            state: {
                              listingId:    listing?.id,
                              sellerId:     seller?.id ?? listing?.seller_id,
                              listingTitle: listing?.title,
                              sellerName:   seller?.full_name ?? 'Unknown Seller',
                              listingImage: listing?.image_url ?? null,
                            },
                          });
                        }}
                      >
                        <span className="material-symbols-outlined text-[20px]">flag</span>
                        Report Seller
                      </button>
                      <button
                        className="w-full flex items-center gap-3 px-md py-sm font-body-md text-body-md text-on-surface hover:bg-surface-container transition-colors text-left"
                        onClick={() => { setSellerMenuOpen(false); setIsShareModalOpen(true); }}
                      >
                        <span className="material-symbols-outlined text-[20px] text-on-surface-variant">share</span>
                        Share
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

            <ScamAlertBanner />

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
                <div className="flex flex-row items-center gap-4 w-full">
                  {/* Add to Cart — outlined */}
                  <button
                    type="button"
                    onClick={inCart ? () => navigate('/cart') : handleAddToCart}
                    disabled={cartLoading}
                    className={`flex-1 border-2 font-label-md text-label-md py-3 rounded-lg shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60 ${
                      isAdded
                        ? 'border-green-500 text-green-600 bg-green-50'
                        : inCart
                          ? 'border-secondary text-secondary bg-secondary/10'
                          : 'border-primary-container text-primary-container bg-transparent hover:bg-primary-container/10'
                    }`}
                  >
                    {cartLoading ? (
                      <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                    ) : (
                      <span className="material-symbols-outlined text-[20px]">
                        {isAdded ? 'check_circle' : inCart ? 'shopping_cart_checkout' : 'add_shopping_cart'}
                      </span>
                    )}
                    {isAdded ? 'Added!' : inCart ? 'Go to Cart' : 'Add to Cart'}
                  </button>

                  {/* Buy Now — solid */}
                  <button
                    type="button"
                    onClick={handleBuyNow}
                    disabled={cartLoading}
                    className="flex-1 bg-primary-container text-on-primary font-label-md text-label-md py-3 rounded-lg shadow-sm hover:bg-primary hover:shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {cartLoading
                      ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : <span className="material-symbols-outlined text-[20px]">bolt</span>
                    }
                    {cartLoading ? 'Adding…' : 'Buy Now'}
                  </button>
                </div>
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
          <div className="flex flex-row items-center gap-4 w-full">
            {/* Add to Cart — outlined */}
            <button
              type="button"
              onClick={inCart ? () => navigate('/cart') : handleAddToCart}
              disabled={cartLoading}
              className={`flex-1 border-2 font-label-md text-label-md py-3 rounded-lg active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-60 ${
                isAdded
                  ? 'border-green-500 text-green-600 bg-green-50'
                  : inCart
                    ? 'border-secondary text-secondary bg-secondary/10'
                    : 'border-primary-container text-primary-container bg-transparent hover:bg-primary-container/10'
              }`}
            >
              {cartLoading ? (
                <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
              ) : (
                <span className="material-symbols-outlined text-[20px]">
                  {isAdded ? 'check_circle' : inCart ? 'shopping_cart_checkout' : 'add_shopping_cart'}
                </span>
              )}
              {isAdded ? 'Added!' : inCart ? 'Go to Cart' : 'Add to Cart'}
            </button>

            {/* Buy Now — solid */}
            <button
              type="button"
              onClick={handleBuyNow}
              disabled={cartLoading}
              className="flex-1 bg-primary-container text-on-primary font-label-md text-label-md py-3 rounded-lg active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {cartLoading
                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <span className="material-symbols-outlined text-[20px]">bolt</span>
              }
              {cartLoading ? 'Adding…' : 'Buy Now'}
            </button>
          </div>
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

      {/* ── Share Modal ── */}
      {isShareModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
          onClick={() => setIsShareModalOpen(false)}
        >
          <div
            className="bg-neutral-900 text-white rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-semibold text-base">Share this with your community</h2>
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="text-neutral-400 hover:text-white transition-colors p-1 rounded-full hover:bg-neutral-700"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Social Icons */}
            <div className="flex justify-center gap-5 my-6">
              {/* Facebook */}
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`}
                target="_blank" rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 group"
              >
                <div className="w-12 h-12 rounded-full bg-[#1877F2] flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                  <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </div>
                <span className="text-[11px] text-neutral-400">Facebook</span>
              </a>

              {/* Messenger */}
              <a
                href={`https://www.facebook.com/dialog/send?link=${encodeURIComponent(window.location.href)}&app_id=291494977(corrected: 291494971`}
                target="_blank" rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 group"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#A533FF] to-[#0078FF] flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                  <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6">
                    <path d="M12 0C5.373 0 0 4.975 0 11.111c0 3.497 1.745 6.616 4.472 8.652V24l4.086-2.242c1.09.301 2.246.464 3.442.464 6.627 0 12-4.975 12-11.111C24 4.975 18.627 0 12 0zm1.193 14.963l-3.056-3.259-5.963 3.259L10.733 8l3.13 3.259L19.826 8l-6.633 6.963z"/>
                  </svg>
                </div>
                <span className="text-[11px] text-neutral-400">Messenger</span>
              </a>

              {/* WhatsApp */}
              <a
                href={`https://wa.me/?text=${encodeURIComponent(window.location.href)}`}
                target="_blank" rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 group"
              >
                <div className="w-12 h-12 rounded-full bg-[#25D366] flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                  <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                </div>
                <span className="text-[11px] text-neutral-400">WhatsApp</span>
              </a>

              {/* X (Twitter) */}
              <a
                href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}`}
                target="_blank" rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 group"
              >
                <div className="w-12 h-12 rounded-full bg-black border border-neutral-700 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                  <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.732-8.855L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </div>
                <span className="text-[11px] text-neutral-400">Twitter</span>
              </a>

              {/* Email */}
              <a
                href={`mailto:?subject=Check this out on Plumio&body=${encodeURIComponent(window.location.href)}`}
                className="flex flex-col items-center gap-2 group"
              >
                <div className="w-12 h-12 rounded-full bg-neutral-600 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                  <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6">
                    <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                  </svg>
                </div>
                <span className="text-[11px] text-neutral-400">Email</span>
              </a>
            </div>

            {/* Copy Link */}
            <p className="text-center text-neutral-400 text-sm mb-3">Or copy link</p>
            <div className="bg-neutral-800 rounded-xl flex items-center gap-2 px-3 py-2">
              <span className="material-symbols-outlined text-neutral-400 text-[18px] shrink-0">link</span>
              <input
                readOnly
                value={window.location.href}
                className="flex-1 bg-transparent text-neutral-300 text-sm outline-none truncate"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href).then(() => {
                    setIsCopied(true);
                    setTimeout(() => setIsCopied(false), 2000);
                  });
                }}
                className="shrink-0 p-1.5 rounded-lg hover:bg-neutral-700 transition-colors"
                aria-label="Copy link"
              >
                {isCopied ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5 text-neutral-300">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav activeTab="Home" />
    </div>
  );
}
