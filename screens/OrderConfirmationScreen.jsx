import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';

const ESCROW_RATE  = 0.03;
const SHIPPING_FEE = 5.00;

const METHOD_LABEL = {
  duitnow: { label: 'DuitNow QR',        icon: 'qr_code_2'              },
  grabpay: { label: 'GrabPay',            icon: 'account_balance_wallet' },
  fpx:     { label: 'FPX Online Banking', icon: 'account_balance'        },
};

function Row({ label, value, bold, green, red }) {
  return (
    <div className="flex justify-between items-center">
      <span className={`text-sm ${bold ? 'font-bold text-gray-900' : 'text-gray-500'}`}>{label}</span>
      <span className={`text-sm font-semibold ${bold ? 'text-[#A855F7] text-base font-black' : ''} ${green ? 'text-green-600' : ''} ${red ? 'text-red-500' : 'text-gray-700'}`}>
        {value}
      </span>
    </div>
  );
}

export default function OrderConfirmationScreen() {
  const navigate    = useNavigate();
  const location    = useLocation();
  const { session } = useAuth();

  const {
    txId,
    count       = 1,
    items       = [],
    fulfillmentMethod = 'handoff',
    meetupLocation,
    deliveryAddress,
    total       = 0,
    paymentMethod = 'fpx',
  } = location.state ?? {};

  const [checked,          setChecked]          = useState(false);
  const [showWaitingModal, setShowWaitingModal] = useState(fulfillmentMethod !== 'delivery');
  const [chatLoading,      setChatLoading]      = useState(false);

  // animate the checkmark in after a brief delay
  useEffect(() => {
    const t = setTimeout(() => setChecked(true), 100);
    return () => clearTimeout(t);
  }, []);

  const isDelivery    = fulfillmentMethod === 'delivery';
  const subtotal      = items.reduce((s, i) => s + Number(i.listing?.price ?? 0) * i.quantity, 0);
  const shippingFee   = isDelivery ? SHIPPING_FEE : 0;
  const escrowFee     = subtotal * ESCROW_RATE;
  const displayTotal  = total || subtotal + shippingFee + escrowFee;

  // Normalize txId — DB may return bigint (number) or UUID (string)
  const txIdStr = txId != null ? String(txId) : null;
  const orderId = txIdStr ? `PLM-${txIdStr.slice(0, 8).toUpperCase()}` : `PLM-${Date.now().toString(36).toUpperCase()}`;

  async function openSellerChat() {
    const sellerId = items[0]?.listing?.user_id ?? items[0]?.listing?.seller_id ?? null;
    const myId     = session?.user?.id;
    if (!sellerId || !myId || sellerId === myId) { navigate('/messages'); return; }

    setChatLoading(true);
    try {
      // Find an existing conversation with this seller first
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .eq('buyer_id', myId)
        .eq('seller_id', sellerId)
        .limit(1)
        .maybeSingle();

      if (existing?.id) {
        navigate(`/messages/${existing.id}`);
        return;
      }

      // None found — create one
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

  function handleTrackOrder() {
    if (count === 1 && txIdStr) {
      navigate(`/escrow/${txIdStr}`, {
        state: { fulfillmentMethod, meetupLocation, deliveryAddress, total: displayTotal },
      });
    } else {
      navigate('/transactions');
    }
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-32" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ── Success hero ─────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 pt-10 pb-8 px-4 flex flex-col items-center text-center gap-3">
        {/* animated ring + checkmark */}
        <div className="relative">
          <div className={`w-20 h-20 rounded-full border-4 border-green-200 flex items-center justify-center transition-all duration-700 ${checked ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}
            style={{ background: 'radial-gradient(circle, #dcfce7 60%, #bbf7d0)' }}>
            <span className="material-symbols-outlined text-green-600 text-[42px]"
              style={{ fontVariationSettings: "'FILL' 1" }}>
              check_circle
            </span>
          </div>
          {/* pulse ring */}
          <div className={`absolute inset-0 rounded-full border-4 border-green-300 transition-all duration-1000 ${checked ? 'scale-150 opacity-0' : 'scale-100 opacity-100'}`} />
        </div>

        <div className={`transition-all duration-500 delay-200 ${checked ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <h1 className="text-xl font-black text-gray-900">Payment Successful!</h1>
          <p className="text-sm text-gray-500 mt-1">Your order has been placed and is now secured in escrow.</p>
        </div>

        <div className={`flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full px-4 py-1.5 transition-all duration-500 delay-300 ${checked ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <span className="material-symbols-outlined text-gray-400 text-[15px]">receipt</span>
          <span className="text-xs font-mono font-semibold text-gray-600">{orderId}</span>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 flex flex-col gap-4 py-5">

        {/* ── Items ordered ─────────────────────────────────────── */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 pt-4 pb-2 flex items-center justify-between">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              Items Ordered ({items.length})
            </p>
            <span className="material-symbols-outlined text-[#A855F7] text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>inventory_2</span>
          </div>

          <div className="divide-y divide-gray-50">
            {items.map((item, idx) => (
              <div key={item.id ?? idx} className="flex items-center gap-3 px-5 py-3">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 shrink-0 border border-gray-100">
                  {item.listing?.image_url
                    ? <img src={item.listing.image_url} alt={item.listing.title} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-gray-300 text-[28px]">image</span>
                      </div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">{item.listing?.title ?? '—'}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {item.quantity > 1 && (
                      <span className="text-[11px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
                        Qty {item.quantity}
                      </span>
                    )}
                    <span className="text-[11px] bg-purple-50 text-[#A855F7] px-2 py-0.5 rounded-full font-semibold">
                      {isDelivery ? '🚚 Delivery' : '🤝 Handoff'}
                    </span>
                  </div>
                </div>
                <p className="text-sm font-black text-gray-900 shrink-0">
                  RM {(Number(item.listing?.price ?? 0) * item.quantity).toFixed(2)}
                </p>
              </div>
            ))}
          </div>

          {/* Escrow lock notice */}
          <div className="mx-5 mb-4 mt-1 flex items-center gap-2 bg-purple-50 border border-purple-100 rounded-xl px-3 py-2.5">
            <span className="material-symbols-outlined text-[#A855F7] text-[16px] shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
            <p className="text-xs text-purple-700 leading-snug">
              <span className="font-semibold">Funds locked in escrow.</span> Seller receives payment only after you confirm receipt.
            </p>
          </div>
        </section>

        {/* ── Payment breakdown ─────────────────────────────────── */}
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Payment Breakdown</p>
            <span className="material-symbols-outlined text-gray-300 text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              {METHOD_LABEL[paymentMethod]?.icon ?? 'payments'}
            </span>
          </div>
          <div className="flex flex-col gap-3">
            <Row label="Subtotal"                                          value={`RM ${subtotal.toFixed(2)}`} />
            <Row label="Shipping Fee"
              value={isDelivery ? `RM ${shippingFee.toFixed(2)}` : 'FREE'}
              green={!isDelivery} />
            <Row label={`Escrow Fee (${(ESCROW_RATE * 100).toFixed(0)}%)`} value={`RM ${escrowFee.toFixed(2)}`} />
            <div className="border-t border-gray-100 pt-3">
              <Row label="Total Paid" value={`RM ${displayTotal.toFixed(2)}`} bold />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-gray-400 justify-center">
            <span className="material-symbols-outlined text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              {METHOD_LABEL[paymentMethod]?.icon ?? 'payments'}
            </span>
            Paid via {METHOD_LABEL[paymentMethod]?.label ?? 'Online Banking'}
          </div>
        </section>

        {/* ── Fulfillment details ───────────────────────────────── */}
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-4">Fulfillment Details</p>

          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isDelivery ? 'bg-blue-50' : 'bg-purple-50'}`}>
              <span className={`material-symbols-outlined text-[20px] ${isDelivery ? 'text-blue-500' : 'text-[#A855F7]'}`}
                style={{ fontVariationSettings: "'FILL' 1" }}>
                {isDelivery ? 'local_shipping' : 'handshake'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900">{isDelivery ? 'Delivery to Address' : 'Face-to-Face Handoff'}</p>
              <p className="text-sm text-gray-600 mt-0.5 leading-snug">
                {isDelivery ? (deliveryAddress || 'Address on file') : (meetupLocation || 'Location to be confirmed')}
              </p>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="material-symbols-outlined text-amber-500 text-[14px]">schedule</span>
                <p className="text-xs text-gray-400">
                  {isDelivery ? 'Estimated 3–5 business days after seller ships' : 'Coordinate with seller on a meetup time'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── What happens next ─────────────────────────────────── */}
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-4">What Happens Next</p>
          <div className="flex flex-col gap-4">
            {(isDelivery ? [
              { icon: 'notifications',  color: 'text-purple-500', bg: 'bg-purple-50', text: 'Seller is notified and prepares your item for shipment.' },
              { icon: 'local_shipping', color: 'text-blue-500',   bg: 'bg-blue-50',   text: 'Seller ships the item and adds a tracking number.' },
              { icon: 'home',           color: 'text-green-500',  bg: 'bg-green-50',  text: 'Item arrives at your address. Inspect before confirming.' },
              { icon: 'check_circle',   color: 'text-[#A855F7]',  bg: 'bg-purple-50', text: 'Tap "Confirm Receipt" to release funds to the seller.' },
            ] : [
              { icon: 'notifications',  color: 'text-purple-500', bg: 'bg-purple-50', text: 'Seller is notified and will reach out to arrange a meetup.' },
              { icon: 'location_on',    color: 'text-blue-500',   bg: 'bg-blue-50',   text: 'Head to the agreed meetup location at the scheduled time.' },
              { icon: 'qr_code_scanner',color: 'text-amber-500',  bg: 'bg-amber-50',  text: 'Scan the seller\'s QR code after inspecting the item.' },
              { icon: 'verified',       color: 'text-green-500',  bg: 'bg-green-50',  text: 'Funds instantly released to seller. Transaction complete.' },
            ]).map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${step.bg}`}>
                  <span className={`material-symbols-outlined text-[16px] ${step.color}`}
                    style={{ fontVariationSettings: "'FILL' 1" }}>
                    {step.icon}
                  </span>
                </div>
                <div className="flex-1 pt-1 flex items-start gap-2">
                  <span className="text-[10px] font-bold text-[#A855F7] bg-purple-50 rounded-full w-4 h-4 flex items-center justify-center shrink-0">{i + 1}</span>
                  <p className="text-sm text-gray-600 leading-snug">{step.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Escrow protection badge ───────────────────────────── */}
        <div className="bg-green-50 border border-green-100 rounded-2xl p-4 flex items-start gap-3">
          <span className="material-symbols-outlined text-green-600 text-[22px] shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
          <div>
            <p className="text-sm font-semibold text-green-800">Plumio Escrow Protection</p>
            <p className="text-xs text-green-700 mt-0.5 leading-relaxed">
              Your payment of <span className="font-bold">RM {displayTotal.toFixed(2)}</span> is fully secured. Funds are only released to the seller once you confirm you've received your item in satisfactory condition.
            </p>
          </div>
        </div>

      </main>

      {/* ── Sticky CTAs ───────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 w-full z-50 px-4 pb-6 pt-3 bg-gradient-to-t from-white via-white/95 to-transparent">
        <div className="max-w-2xl mx-auto flex flex-col gap-3">
          {isDelivery ? (
            /* Delivery: track shipment progress */
            <button
              onClick={handleTrackOrder}
              className="w-full bg-[#A855F7] hover:bg-[#9333EA] text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-200/60 text-base active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>local_shipping</span>
              {count === 1 ? 'Track My Order' : `Track ${count} Orders`}
            </button>
          ) : (
            /* Handoff: go home and WAIT — seller will notify buyer when they arrive */
            <button
              onClick={() => navigate('/')}
              className="w-full bg-[#A855F7] hover:bg-[#9333EA] text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-200/60 text-base active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>home</span>
              Back to Home · We'll Notify You
            </button>
          )}

          <button
            onClick={() => navigate('/')}
            className="w-full border border-gray-200 text-gray-600 font-semibold py-3 rounded-2xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <span className="material-symbols-outlined text-[18px]">storefront</span>
            Continue Shopping
          </button>
        </div>
      </div>

      {/* ── Handoff waiting notice (pops up immediately for handoff orders) ── */}
      {!isDelivery && showWaitingModal && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowWaitingModal(false)} />
          <div className="relative bg-white rounded-t-[28px] w-full max-w-lg shadow-2xl overflow-hidden"
            style={{ fontFamily: "'Inter', sans-serif" }}>

            {/* drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            <div className="px-6 pt-4 pb-8 flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-amber-500 text-[32px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}>schedule</span>
              </div>

              <div>
                <h2 className="text-lg font-black text-gray-900">Waiting for Seller to Arrive</h2>
                <p className="text-sm text-gray-500 mt-1.5 leading-relaxed max-w-xs mx-auto">
                  Your payment is safely locked in escrow. The seller has been notified and will head to the meetup spot.
                  <br /><br />
                  <span className="font-semibold text-gray-700">You'll get a notification when they arrive.</span> While waiting, feel free to chat with the seller.
                </p>
              </div>

              <div className="flex items-center gap-2 bg-purple-50 border border-purple-100 rounded-full px-4 py-2">
                <span className="material-symbols-outlined text-[#A855F7] text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
                <span className="text-xs font-semibold text-purple-700">
                  RM {displayTotal.toFixed(2)} locked in escrow
                </span>
              </div>

              <div className="w-full flex flex-col gap-3 mt-1">
                <button
                  onClick={() => { setShowWaitingModal(false); openSellerChat(); }}
                  disabled={chatLoading}
                  className="w-full bg-[#A855F7] hover:bg-[#9333EA] disabled:bg-purple-300 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-200/60 active:scale-[0.98]"
                >
                  {chatLoading ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>chat</span>
                  )}
                  {chatLoading ? 'Opening Chat…' : 'Chat with Seller'}
                </button>
                <button
                  onClick={() => { setShowWaitingModal(false); navigate('/'); }}
                  className="w-full border border-gray-200 text-gray-600 font-semibold py-3 rounded-2xl hover:bg-gray-50 transition-colors text-sm flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">home</span>
                  Got it · Go Home
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
