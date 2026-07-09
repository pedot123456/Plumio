import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';

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
  const passedTotal     = location.state?.total             ?? null;
  const passedMethod    = location.state?.fulfillmentMethod ?? 'handoff';

  const [tx,              setTx]              = useState(null);
  const [isLoading,       setIsLoading]       = useState(true);
  const [error,           setError]           = useState('');
  const [confirming,      setConfirming]      = useState(false);
  const [confirmed,       setConfirmed]       = useState(false);

  // Shipping tracking fields (seller entry)
  const [courier,         setCourier]         = useState('');
  const [trackingNo,      setTrackingNo]      = useState('');
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError,   setTrackingError]   = useState('');

  useEffect(() => {
    if (!txId) return;
    fetchTransaction();
  }, [txId]);

  async function fetchTransaction() {
    setIsLoading(true);
    const { data, error: err } = await supabase
      .from('transactions')
      .select(`
        id, status, amount, meetup_location,
        buyer_id, seller_id,
        courier, tracking_number,
        listing:listings (id, title, price, image_url)
      `)
      .eq('id', txId)
      .single();
    if (err) setError(err.message);
    else setTx(data);
    setIsLoading(false);
  }

  async function handleConfirmReceipt() {
    if (!window.confirm('Confirm you have received the item? This will release funds to the seller and cannot be undone.')) return;
    setConfirming(true);
    const { error: err } = await supabase
      .from('transactions')
      .update({ status: 'completed' })
      .eq('id', txId);
    setConfirming(false);
    if (err) setError(err.message);
    else setConfirmed(true);
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

  const meetupLoc   = tx?.meetup_location ?? passedLocation;
  const amount      = tx?.amount          ?? passedTotal;
  const isSeller    = session?.user?.id === tx?.seller_id;
  const isCompleted = tx?.status === 'completed' || confirmed;
  const isDelivery  = passedMethod === 'delivery';
  const hasTracking = !!tx?.tracking_number;

  // Progress step: 0=Paid, 1=Packed(unused), 2=Shipped, 3=Delivered(unused), 4=Done
  const progressStep = isCompleted ? 4 : hasTracking ? 2 : 0;

  const courierLabel = MY_COURIERS.find(c => c.value === tx?.courier)?.label ?? tx?.courier ?? '';

  // Delivery status banner copy
  const deliveryTitle = isCompleted
    ? 'Order Complete'
    : hasTracking
      ? 'In Transit · Track Your Package'
      : 'Order Confirmed · Awaiting Shipment';
  const deliverySubtitle = isCompleted
    ? 'Funds have been released to the seller.'
    : hasTracking
      ? `Shipped via ${courierLabel}. Tap "I've Received My Item" once it arrives.`
      : 'Your payment is locked in escrow — seller is preparing your item.';

  // ── Confirmed success overlay ────────────────────────────────
  if (confirmed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4" style={{ fontFamily: "'Inter', sans-serif" }}>
        <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-xl flex flex-col items-center text-center gap-5">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
            <span className="material-symbols-outlined text-green-500" style={{ fontSize: 44, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
          </div>
          <div>
            <h2 className="font-bold text-gray-900 text-xl mb-1">Receipt Confirmed!</h2>
            <p className="text-gray-500 text-sm leading-relaxed">
              Funds of <span className="font-semibold text-gray-800">RM {Number(amount ?? 0).toFixed(2)}</span> have been released to the seller. Thank you for using Plumio Escrow.
            </p>
          </div>
          <div className="w-full flex flex-col gap-3">
            <button onClick={() => navigate('/')} className="w-full bg-[#A855F7] hover:bg-[#9333EA] text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-[18px]">home</span>
              Back to Home
            </button>
            <button onClick={() => navigate('/transactions')} className="w-full border border-gray-200 text-gray-600 font-medium py-3 rounded-xl hover:bg-gray-50 transition-colors">
              View Transactions
            </button>
          </div>
        </div>
      </div>
    );
  }

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
                  {isCompleted ? 'check_circle' : hasTracking ? 'local_shipping' : 'inventory_2'}
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
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold border-2 transition-colors ${
                      i <= progressStep
                        ? 'bg-[#A855F7] border-[#A855F7] text-white'
                        : 'bg-white border-gray-200 text-gray-400'
                    }`}>{i + 1}</div>
                    <span className="text-[9px] text-gray-400 text-center leading-tight">{step}</span>
                  </div>
                  {i < 4 && (
                    <div className={`h-0.5 flex-1 mb-4 transition-colors ${i < progressStep ? 'bg-[#A855F7]' : 'bg-gray-200'}`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        ) : (
          <div className={`bg-white rounded-2xl p-5 shadow-sm border flex items-center gap-3 ${
            isCompleted ? 'border-green-200' : 'border-purple-100'
          }`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
              isCompleted ? 'bg-green-100' : 'bg-purple-100'
            }`}>
              <span className={`material-symbols-outlined text-[22px] ${isCompleted ? 'text-green-600' : 'text-[#A855F7]'}`}
                style={{ fontVariationSettings: "'FILL' 1" }}>
                {isCompleted ? 'check_circle' : 'lock'}
              </span>
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">
                {isCompleted ? 'Handoff Complete' : 'Funds Locked · Escrow Active'}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {isCompleted
                  ? 'Handoff confirmed. Funds released to seller.'
                  : 'Payment held securely — released after you scan the QR.'}
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
        {meetupLoc ? (
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
              <p className="text-sm font-semibold text-gray-900 mt-1">{meetupLoc}</p>
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
                onClick={() => navigate('/report')}
                className="w-full border border-gray-200 text-gray-500 font-medium py-3 rounded-2xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <span className="material-symbols-outlined text-[18px]">report</span>
                Report Issue / Dispute
              </button>
            </>
          ) : !isSeller ? (
            <>
              <button
                onClick={() => navigate(`/handoff/confirm/${txId}`)}
                className="w-full bg-[#A855F7] hover:bg-[#9333EA] text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-200/60 text-base active:scale-[0.98]"
              >
                <span className="material-symbols-outlined text-[20px]">qr_code_scanner</span>
                Scan Handoff QR
              </button>
              <button
                onClick={() => navigate('/report')}
                className="w-full border border-gray-200 text-gray-500 font-medium py-3 rounded-2xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <span className="material-symbols-outlined text-[18px]">report</span>
                Report Issue / Dispute
              </button>
            </>
          ) : (
            <button
              onClick={() => navigate('/report')}
              className="w-full border border-gray-200 text-gray-500 font-medium py-3 rounded-2xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <span className="material-symbols-outlined text-[18px]">report</span>
              Report Issue / Dispute
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
