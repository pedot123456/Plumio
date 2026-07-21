import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import OrderReceivedModal from '../components/OrderReceivedModal';

const HANDOFF_STEPS = [
  { icon: 'handshake',      text: 'Meet the seller at the agreed location'         },
  { icon: 'inventory',      text: 'Inspect the item carefully before confirming'   },
  { icon: 'qr_code_scanner', text: 'Ask seller to open Plumio → Show QR, then scan' },
  { icon: 'payments',       text: 'Funds released to seller instantly after scan'  },
];

const DELIVERY_STEPS = [
  { icon: 'inventory_2',    text: 'Seller packs and ships your item'               },
  { icon: 'local_shipping', text: 'Courier delivers to your address'               },
  { icon: 'search',         text: 'Inspect the item when it arrives'               },
  { icon: 'check_circle',   text: 'Tap "Confirm Receipt" to release funds'         },
];

const MY_COURIERS = [
  { value: 'jnt',      label: 'J&T Express'       },
  { value: 'poslaju',  label: 'Pos Laju'           },
  { value: 'ninjavan', label: 'NinjaVan'           },
  { value: 'dhl',      label: 'DHL eCommerce'      },
  { value: 'shopee',   label: 'Shopee Express'     },
  { value: 'grab',     label: 'GrabExpress'        },
  { value: 'citylink', label: 'City-Link Express'  },
  { value: 'fedex',    label: 'FedEx'              },
];

function Skeleton() {
  return (
    <div className="animate-pulse flex items-center gap-3 bg-white rounded-2xl p-4">
      <div className="w-20 h-20 rounded-xl bg-gray-100 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-100 rounded w-3/4" />
        <div className="h-5 bg-gray-100 rounded w-1/4" />
      </div>
    </div>
  );
}

export default function EscrowStatusScreen() {
  const navigate    = useNavigate();
  const { txId }    = useParams();
  const location    = useLocation();
  const { session } = useAuth();

  const passedLocation  = location.state?.meetupLocation    ?? '';
  const passedAddress   = location.state?.deliveryAddress   ?? '';
  const passedTotal     = location.state?.total             ?? null;
  const passedMethod    = location.state?.fulfillmentMethod ?? 'handoff';

  const [tx,              setTx]              = useState(null);
  const [isLoading,       setIsLoading]       = useState(true);
  const [error,           setError]           = useState('');
  const [confirming,      setConfirming]      = useState(false);
  const [confirmed,       setConfirmed]       = useState(false);
  const [currentStep,     setCurrentStep]     = useState(1);
  const [showToast,       setShowToast]       = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [sellerArrived,   setSellerArrived]   = useState(false);
  const [chatLoading,     setChatLoading]     = useState(false);

  // Shipping tracking fields (seller entry)
  const [courier,         setCourier]         = useState('');
  const [trackingNo,      setTrackingNo]      = useState('');
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError,   setTrackingError]   = useState('');

  useEffect(() => {
    if (!txId) return;
    fetchTransaction();
  }, [txId]);

  // Auto-progress simulation for prototype demo (delivery mode only)
  useEffect(() => {
    if (passedMethod !== 'delivery') return;
    if (currentStep >= 5) return;
    const timer = setTimeout(() => {
      setCurrentStep(prev => {
        const next = prev + 1;
        if (next >= 4) setShowToast(true);
        return next;
      });
    }, 3000);
    return () => clearTimeout(timer);
  }, [currentStep, passedMethod]);

  // Real-time: listen for seller_arrived notifications (handoff mode, buyer side)
  useEffect(() => {
    if (!session?.user?.id || !txId) return;
    const ch = supabase
      .channel(`seller_arrived_${txId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${session.user.id}`,
      }, (payload) => {
        const n = payload.new;
        if (n?.type === 'seller_arrived' && String(n?.data?.tx_id) === String(txId)) {
          setSellerArrived(true);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [session?.user?.id, txId]);

  async function fetchTransaction() {
    setIsLoading(true);

    // Route guard: unauthenticated users go to login
    if (!session?.user?.id) {
      navigate('/login', { replace: true });
      return;
    }

    const { data, error: err } = await supabase
      .from('transactions')
      .select(`
        id, status, amount,
        meetup_location, delivery_address, fulfillment_method,
        buyer_id, seller_id,
        courier, tracking_number,
        listing:listings (id, title, price, image_url)
      `)
      .eq('id', txId)
      .single();

    if (err) {
      setError(err.message);
      setIsLoading(false);
      return;
    }

    const userId = session.user.id;

    // Seller accidentally opened the buyer tracking URL — send to their QR screen
    if (data.seller_id && userId === data.seller_id) {
      navigate(`/handoff/${data.id}`, { replace: true });
      return;
    }

    // Neither buyer nor seller for this transaction — unauthorized
    if (data.buyer_id && userId !== data.buyer_id) {
      navigate('/transactions', { replace: true });
      return;
    }

    // Fetch seller name separately — no FK from transactions→profiles exists yet
    let sellerName = null;
    if (data.seller_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', data.seller_id)
        .single();
      sellerName = profile?.full_name ?? null;
    }

    setTx({ ...data, seller: { full_name: sellerName } });
    if (data.status === 'completed') setConfirmed(true);
    setIsLoading(false);
  }

  async function handleConfirmReceipt() {
    if (!isDelivery) return; // Handoff escrow is released only via QR scan
    if (!window.confirm('Confirm you have received the item? This will release funds to the seller and cannot be undone.')) return;
    setConfirming(true);
    const { error: err } = await supabase
      .from('transactions')
      .update({ status: 'completed' })
      .eq('id', txId);
    setConfirming(false);
    if (err) { setError(err.message); }
    else { setConfirmed(true); setShowReviewModal(true); }
  }

  async function handleSubmitTracking() {
    if (!courier)         return setTrackingError('Please select a courier.');
    if (!trackingNo.trim()) return setTrackingError('Please enter a tracking number.');
    setTrackingError('');
    setTrackingLoading(true);
    const { error: err } = await supabase
      .from('transactions')
      .update({ courier, tracking_number: trackingNo.trim() })
      .eq('id', txId);
    setTrackingLoading(false);
    if (err) {
      setTrackingError(err.message);
    } else {
      setTx(prev => ({ ...prev, courier, tracking_number: trackingNo.trim() }));
    }
  }

  async function openSellerChat() {
    const sellerId = tx?.seller_id;
    const myId     = session?.user?.id;
    if (!sellerId || !myId) { navigate('/messages'); return; }

    setChatLoading(true);
    try {
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .eq('buyer_id', myId)
        .eq('seller_id', sellerId)
        .limit(1)
        .maybeSingle();

      if (existing?.id) { navigate(`/messages/${existing.id}`); return; }

      const { data: created } = await supabase
        .from('conversations')
        .insert({ buyer_id: myId, seller_id: sellerId })
        .select('id')
        .single();

      navigate(created?.id ? `/messages/${created.id}` : '/messages');
    } catch {
      navigate('/messages');
    } finally {
      setChatLoading(false);
    }
  }

  async function handleReviewSubmit({ rating, review }) {
    try {
      await supabase.from('reviews').insert({
        listing_id:  tx?.listing?.id,
        reviewer_id: session?.user?.id,
        rating,
        comment: review,
      });
    } catch (_) { /* non-blocking */ }
    navigate('/');
  }

  const meetupLoc    = tx?.meetup_location ?? passedLocation;
  const amount       = tx?.amount          ?? passedTotal;
  const isSeller     = session?.user?.id === tx?.seller_id;
  const isCompleted  = tx?.status === 'completed' || confirmed || currentStep >= 5;
  // Use DB fulfillment_method as fallback when navigation state is absent (e.g. on refresh)
  const isDelivery   = (passedMethod || tx?.fulfillment_method) === 'delivery';
  const displayAddr  = isDelivery
    ? (passedAddress || tx?.delivery_address || '')
    : (meetupLoc || '');
  const hasTracking  = !!tx?.tracking_number;

  const courierLabel = MY_COURIERS.find(c => c.value === tx?.courier)?.label ?? tx?.courier ?? '';

  // Per-step status copy (delivery mode)
  const STEP_COPY = [
    null,
    { title: 'Order Confirmed · Awaiting Shipment',   subtitle: 'Your payment is locked in escrow — seller is preparing your item.',   icon: 'inventory_2'    },
    { title: 'Packed · Awaiting Collection',          subtitle: 'Seller has packed your item and is waiting for courier pickup.',        icon: 'inventory_2'    },
    { title: 'In Transit · On the Way',               subtitle: 'Your item is with the courier and on its way to you.',                  icon: 'local_shipping' },
    { title: 'Delivered · Confirm Receipt',           subtitle: 'Your item has been delivered! Please inspect and confirm receipt.',     icon: 'home'           },
    { title: 'Order Complete',                        subtitle: 'Funds have been released to the seller. Thank you for using Plumio.',   icon: 'check_circle'   },
  ];
  const stepCopy     = STEP_COPY[currentStep] ?? STEP_COPY[1];
  const deliveryTitle    = isDelivery ? stepCopy.title    : (isCompleted ? 'Handoff Complete'            : 'Funds Locked · Escrow Active');
  const deliverySubtitle = isDelivery ? stepCopy.subtitle : (isCompleted ? 'Handoff confirmed. Funds released to seller.' : 'Payment held securely — released after you scan the QR.');

  return (
    <div className="bg-gray-50 min-h-screen pb-[120px]" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* Header */}
      <header className="bg-white border-b border-gray-100 fixed top-0 w-full z-40">
        <div className="flex items-center px-4 h-14 max-w-2xl mx-auto gap-3">
          <button onClick={() => navigate('/transactions')} className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-600">
            <span className="material-symbols-outlined text-[22px]">arrow_back</span>
          </button>
          <h1 className="font-bold text-gray-900 flex-1 text-center text-base pr-8">
            {isDelivery ? 'Order Status' : 'Escrow Status'}
          </h1>
        </div>
      </header>

      <main className="pt-14 max-w-2xl mx-auto px-4 flex flex-col gap-4 py-5">

        {/* ── Delivered toast ── */}
        {showToast && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-2rem)] max-w-sm bg-green-600 text-white rounded-2xl px-4 py-3 shadow-xl flex items-center gap-3 animate-bounce">
            <span className="material-symbols-outlined text-[22px] shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>local_shipping</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold leading-tight">Your item has been delivered!</p>
              <p className="text-xs text-green-100 mt-0.5">Please inspect and confirm receipt below.</p>
            </div>
            <button onClick={() => setShowToast(false)} className="text-green-200 hover:text-white shrink-0">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-red-700 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <span className="material-symbols-outlined text-[18px] shrink-0">error_outline</span>
            <span className="flex-1">{error}</span>
          </div>
        )}

        {/* ── Status Banner ── */}
        {isDelivery ? (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-green-600 text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  {stepCopy.icon}
                </span>
              </div>
              <div>
                <p className="font-bold text-gray-900 text-sm">{deliveryTitle}</p>
                <p className="text-xs text-gray-500 mt-0.5">{deliverySubtitle}</p>
              </div>
            </div>
            {/* Dynamic progress bar */}
            <div className="flex items-center gap-0 mt-4">
              {['Paid', 'Packed', 'Shipped', 'Delivered', 'Done'].map((step, i) => (
                <React.Fragment key={step}>
                  <div className="flex flex-col items-center gap-1 flex-1">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold border-2 transition-all duration-500 ${
                      i + 1 <= currentStep
                        ? 'bg-purple-500 border-purple-500 text-white shadow-sm shadow-purple-200'
                        : 'bg-white border-gray-300 text-gray-400'
                    }`}>{i + 1}</div>
                    <span className={`text-[9px] text-center leading-tight transition-colors ${i + 1 <= currentStep ? 'text-purple-600 font-semibold' : 'text-gray-400'}`}>{step}</span>
                  </div>
                  {i < 4 && (
                    <div className={`h-0.5 flex-1 mb-4 transition-all duration-500 ${i + 1 < currentStep ? 'bg-purple-500' : 'bg-gray-200'}`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        ) : isCompleted ? (
          /* Handoff complete */
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-green-200 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-green-600 text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">Handoff Complete</p>
              <p className="text-xs text-gray-500 mt-0.5">Handoff confirmed. Funds released to seller.</p>
            </div>
          </div>
        ) : sellerArrived ? (
          /* Seller has arrived — prompt buyer to scan */
          <div className="bg-green-50 rounded-2xl p-5 shadow-sm border border-green-300 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-white text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>location_on</span>
              </div>
              <div>
                <p className="font-bold text-green-900 text-sm">Your seller has arrived! 📍</p>
                <p className="text-xs text-green-700 mt-0.5">Head to the meetup spot and scan the QR code to complete the handoff.</p>
              </div>
            </div>
            <button
              onClick={() => navigate(`/handoff/confirm/${txId}`)}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-md shadow-green-200/60 animate-pulse"
            >
              <span className="material-symbols-outlined text-[20px]">qr_code_scanner</span>
              Scan QR Code Now
            </button>
          </div>
        ) : (
          /* Waiting for seller to arrive */
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-purple-100 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[#A855F7] text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>schedule</span>
              </div>
              <div>
                <p className="font-bold text-gray-900 text-sm">Waiting for Seller to Arrive</p>
                <p className="text-xs text-gray-500 mt-0.5">You'll receive a notification when the seller reaches the meetup spot.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-purple-50 rounded-xl px-3 py-2.5">
              <span className="material-symbols-outlined text-[#A855F7] text-[15px] shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
              <p className="text-xs text-purple-700 leading-snug">
                <span className="font-semibold">RM {Number(amount ?? 0).toFixed(2)}</span> locked safely in escrow until handoff is confirmed.
              </p>
            </div>
          </div>
        )}

        {/* ── Item Card ── */}
        {isLoading ? <Skeleton /> : tx?.listing ? (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
            <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 shrink-0">
              {tx.listing.image_url
                ? <img className="w-full h-full object-cover" src={tx.listing.image_url} alt={tx.listing.title} />
                : <div className="w-full h-full flex items-center justify-center"><span className="material-symbols-outlined text-gray-300 text-[32px]">image</span></div>
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">{tx.listing.title}</p>
              <p className="text-base font-black text-[#A855F7] mt-1">
                RM {Number(amount ?? tx.listing.price ?? 0).toFixed(2)}
              </p>
              <p className="text-[11px] text-gray-400 mt-1">
                Order ID: <span className="font-mono">{txId?.slice(0, 8).toUpperCase()}</span>
              </p>
            </div>
          </div>
        ) : null}

        {/* ── Tracking Section (delivery mode only) ── */}
        {isDelivery && !isLoading && (
          hasTracking ? (
            /* ── Tracking info card (visible to all parties) ── */
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-[#A855F7] text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  local_shipping
                </span>
                <p className="font-bold text-gray-900 text-sm">Shipment Tracking</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 font-medium">Courier</span>
                  <span className="text-xs font-semibold text-gray-800">{courierLabel}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 font-medium">Tracking No.</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono font-semibold text-gray-800">{tx.tracking_number}</span>
                    <button
                      onClick={() => navigator.clipboard?.writeText(tx.tracking_number)}
                      className="p-1 rounded-md bg-gray-200 hover:bg-gray-300 transition-colors"
                      aria-label="Copy tracking number"
                    >
                      <span className="material-symbols-outlined text-[13px] text-gray-600">content_copy</span>
                    </button>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-gray-400 mt-2 text-center">
                Visit the {courierLabel} website to track your parcel in real time.
              </p>
            </div>
          ) : isSeller ? (
            /* ── Seller tracking input form ── */
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-amber-100">
              <div className="flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-amber-500 text-[20px]">package_2</span>
                <p className="font-bold text-gray-900 text-sm">Enter Shipment Details</p>
              </div>
              <p className="text-xs text-gray-400 mb-4">
                Once you've dropped off the parcel, enter the tracking info so the buyer can follow its progress.
              </p>

              {/* Courier select */}
              <div className="flex flex-col gap-1 mb-3">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Courier</label>
                <div className="relative">
                  <select
                    value={courier}
                    onChange={e => { setCourier(e.target.value); setTrackingError(''); }}
                    className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#A855F7]/30 focus:border-[#A855F7] transition-all pr-8"
                  >
                    <option value="" disabled>Select courier…</option>
                    {MY_COURIERS.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[18px] pointer-events-none">expand_more</span>
                </div>
              </div>

              {/* Tracking number input */}
              <div className="flex flex-col gap-1 mb-4">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tracking Number</label>
                <input
                  type="text"
                  value={trackingNo}
                  onChange={e => { setTrackingNo(e.target.value); setTrackingError(''); }}
                  placeholder="e.g. JT123456789MY"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#A855F7]/30 focus:border-[#A855F7] transition-all"
                />
              </div>

              {trackingError && (
                <p className="text-xs text-red-500 mb-3 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">error_outline</span>
                  {trackingError}
                </p>
              )}

              <button
                onClick={handleSubmitTracking}
                disabled={trackingLoading}
                className="w-full bg-[#A855F7] hover:bg-[#9333EA] disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {trackingLoading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span className="material-symbols-outlined text-[18px]">local_shipping</span>
                )}
                {trackingLoading ? 'Saving…' : 'Submit Tracking Info'}
              </button>
            </div>
          ) : (
            /* ── Buyer waiting card ── */
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-start gap-3">
              <span className="material-symbols-outlined text-amber-500 text-[22px] shrink-0 mt-0.5">package_2</span>
              <div>
                <p className="text-sm font-semibold text-amber-800">Waiting for Seller to Ship</p>
                <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                  The seller is packing your item. Tracking details will appear here once they ship it.
                </p>
              </div>
            </div>
          )
        )}

        {/* ── Location Card ── */}
        {displayAddr ? (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center shrink-0 mt-0.5">
              <span className="material-symbols-outlined text-[#A855F7] text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                {isDelivery ? 'home' : 'location_on'}
              </span>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {isDelivery ? 'Delivery Address' : 'Meetup Location'}
              </p>
              <p className="text-sm font-semibold text-gray-900 mt-1">{displayAddr}</p>
            </div>
          </div>
        ) : null}

        {/* ── Steps ── */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-4">
            {isDelivery ? 'What Happens Next' : 'Handoff Steps'}
          </p>
          <div className="flex flex-col gap-4">
            {(isDelivery ? DELIVERY_STEPS : HANDOFF_STEPS).map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-50 border border-purple-100 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[#A855F7] text-[16px]">{step.icon}</span>
                </div>
                <div className="flex-1 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-[#A855F7] bg-purple-50 rounded-full w-4 h-4 flex items-center justify-center">{i + 1}</span>
                    <p className="text-sm text-gray-600 leading-snug">{step.text}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Return to Home button (always visible for demo) ── */}
        <button
          onClick={() => navigate('/')}
          className="w-full bg-[#A855F7] hover:bg-[#9333EA] text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-md shadow-purple-200/60 active:scale-[0.98] text-base"
        >
          <span className="material-symbols-outlined text-[20px]">home</span>
          Return to Plumio Home
        </button>

        {/* ── Escrow protection badge ── */}
        <div className="bg-green-50 border border-green-100 rounded-2xl p-4 flex items-start gap-3">
          <span className="material-symbols-outlined text-green-600 text-[22px] shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
          <div>
            <p className="text-sm font-semibold text-green-800">Plumio Escrow Protection</p>
            <p className="text-xs text-green-700 mt-0.5 leading-relaxed">
              {isDelivery
                ? 'Your money is locked and safe. Funds only release to the seller after you confirm receipt.'
                : 'Funds locked until you physically verify and scan the QR code. You are protected.'}
            </p>
          </div>
        </div>

        {/* Seller shortcut (handoff only) */}
        {!isDelivery && isSeller && (
          <button
            onClick={() => navigate(`/handoff/${txId}`)}
            className="w-full bg-[#A855F7] hover:bg-[#9333EA] text-white font-bold py-3 rounded-2xl transition-colors flex items-center justify-center gap-2 shadow-md shadow-purple-200/60"
          >
            <span className="material-symbols-outlined text-[20px]">qr_code_2</span>
            Show My Handoff QR Code
          </button>
        )}

      </main>

      {/* ── Sticky Bottom Actions ─────────────────────────────── */}
      <div className="fixed bottom-0 left-0 w-full z-50 bg-gradient-to-t from-white via-white/95 to-transparent px-4 pb-6 pt-3">
        <div className="max-w-2xl mx-auto flex flex-col gap-3">

          {isDelivery ? (
            <>
              <button
                onClick={handleConfirmReceipt}
                disabled={confirming || isCompleted}
                className="w-full bg-[#A855F7] hover:bg-[#9333EA] disabled:bg-purple-300 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-200/60 disabled:cursor-not-allowed text-base active:scale-[0.98]"
              >
                {confirming ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Confirming…
                  </>
                ) : isCompleted ? (
                  <>
                    <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    Receipt Confirmed
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    I've Received My Item
                  </>
                )}
              </button>
              <button
                onClick={() => navigate('/report', {
                  state: {
                    listingId:         tx?.listing?.id,
                    sellerId:          tx?.seller_id,
                    listingTitle:      tx?.listing?.title,
                    sellerName:        tx?.seller?.full_name ?? null,
                    listingImage:      tx?.listing?.image_url,
                    fulfillmentMethod: isDelivery ? 'delivery' : 'handoff',
                    amount:            tx?.amount,
                    txId:              txId,
                  }
                })}
                className="w-full border border-gray-200 text-gray-500 font-medium py-3 rounded-2xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <span className="material-symbols-outlined text-[18px]">report</span>
                Report Issue / Dispute
              </button>
            </>
          ) : !isSeller ? (
            <>
              {sellerArrived ? (
                <button
                  onClick={() => navigate(`/handoff/confirm/${txId}`)}
                  className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-200/60 text-base active:scale-[0.98] animate-pulse"
                >
                  <span className="material-symbols-outlined text-[20px]">qr_code_scanner</span>
                  Scan QR Code Now
                </button>
              ) : (
                <button
                  onClick={openSellerChat}
                  disabled={chatLoading}
                  className="w-full bg-[#A855F7] hover:bg-[#9333EA] disabled:bg-purple-300 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-200/60 text-base active:scale-[0.98]"
                >
                  {chatLoading
                    ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>chat</span>
                  }
                  {chatLoading ? 'Opening Chat…' : 'Message Seller'}
                </button>
              )}
              <button
                onClick={() => navigate('/report', {
                  state: {
                    listingId:         tx?.listing?.id,
                    sellerId:          tx?.seller_id,
                    listingTitle:      tx?.listing?.title,
                    sellerName:        tx?.seller?.full_name ?? null,
                    listingImage:      tx?.listing?.image_url,
                    fulfillmentMethod: isDelivery ? 'delivery' : 'handoff',
                    amount:            tx?.amount,
                    txId:              txId,
                  }
                })}
                className="w-full border border-gray-200 text-gray-500 font-medium py-3 rounded-2xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <span className="material-symbols-outlined text-[18px]">report</span>
                Report Issue / Dispute
              </button>
            </>
          ) : (
            <button
              onClick={() => navigate('/report', {
                state: {
                  listingId:    tx?.listing?.id,
                  sellerId:     tx?.seller_id,
                  listingTitle: tx?.listing?.title,
                  sellerName:   tx?.seller?.full_name ?? null,
                  listingImage: tx?.listing?.image_url,
                }
              })}
              className="w-full border border-gray-200 text-gray-500 font-medium py-3 rounded-2xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <span className="material-symbols-outlined text-[18px]">report</span>
              Report Issue / Dispute
            </button>
          )}
        </div>
      </div>

      {/* ── Review modal — fires immediately on Confirm Receipt ── */}
      {showReviewModal && (
        <OrderReceivedModal
          itemName={tx?.listing?.title}
          itemImage={tx?.listing?.image_url}
          itemPrice={tx?.listing?.price ? `RM ${Number(tx.listing.price).toFixed(2)}` : undefined}
          onClose={() => setShowReviewModal(false)}
          onSubmit={handleReviewSubmit}
        />
      )}
    </div>
  );
}
