import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { notify } from '../utils/notify';
import DeliveryAddressModal  from '../components/DeliveryAddressModal';
import MeetupLocationModal   from '../components/MeetupLocationModal';
import FpxBankingModal       from '../components/FpxBankingModal';
import DuitNowQrModal        from '../components/DuitNowQrModal';

// ── Constants ──────────────────────────────────────────────────
const SHIPPING_FEE = 5.00;
const ESCROW_RATE  = 0.03; // 3%

const ESCROW_STAGES = [
  { icon: 'payments',       label: 'Payment\nReceived'  },
  { icon: 'lock',           label: 'Held\nSecurely'     },
  { icon: 'local_shipping', label: 'Delivery /\nMeetup' },
  { icon: 'verified',       label: 'Funds\nReleased'    },
];

const PAYMENT_METHODS = [
  { id: 'duitnow', label: 'DuitNow QR',        icon: 'qr_code_2',              description: 'Scan & pay instantly'     },
  { id: 'grabpay', label: 'GrabPay',            icon: 'account_balance_wallet', description: 'Pay with GrabPay wallet'  },
  { id: 'fpx',     label: 'FPX Online Banking', icon: 'account_balance',        description: 'Direct bank transfer'     },
];

function ItemSkeleton() {
  return (
    <div className="animate-pulse flex items-center gap-3">
      <div className="w-16 h-16 rounded-xl bg-gray-100 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-gray-100 rounded w-2/3" />
        <div className="h-3 bg-gray-100 rounded w-1/4" />
      </div>
    </div>
  );
}

function SummaryRow({ label, value, bold, green }) {
  return (
    <div className="flex justify-between items-center">
      <span className={`text-sm ${bold ? 'font-bold text-gray-900' : 'text-gray-500'}`}>{label}</span>
      <span className={`text-sm ${bold ? 'font-black text-[#A855F7] text-base' : ''} ${green ? 'text-green-600 font-medium' : 'text-gray-700'}`}>
        {value}
      </span>
    </div>
  );
}

export default function SecureCartScreen() {
  const navigate         = useNavigate();
  const { session }      = useAuth();
  const { setCartCount } = useCart();

  const [cartItems,       setCartItems]       = useState([]);
  const [isLoading,       setIsLoading]       = useState(true);
  const [error,           setError]           = useState('');
  const [fulfillment,      setFulfillment]      = useState('handoff'); // 'handoff' | 'delivery'
  const [meetupDetails,    setMeetupDetails]    = useState(null);      // { landmark, state, city, district, postcode, details }
  const [deliveryAddress,  setDeliveryAddress]  = useState('');
  const [paymentMethod,    setPaymentMethod]    = useState('duitnow');
  const [paying,           setPaying]           = useState(false);
  const [showAddressModal,  setShowAddressModal]  = useState(false);
  const [showMeetupModal,   setShowMeetupModal]   = useState(false);
  const [showFpxModal,      setShowFpxModal]      = useState(false);
  const [showDuitNowModal,  setShowDuitNowModal]  = useState(false);

  useEffect(() => {
    if (!session) { setIsLoading(false); return; }
    fetchCart();
    fetchDefaultAddress();
  }, [session]);

  async function fetchDefaultAddress() {
    if (!session) return;
    const { data } = await supabase
      .from('profiles')
      .select('default_address')
      .eq('id', session.user.id)
      .single();
    if (data?.default_address) {
      const a = data.default_address;
      const formatted = [
        a.fullName, a.phone,
        a.unitNo ? `${a.unitNo}, ${a.streetAddress}` : a.streetAddress,
        a.postalCode, a.city, a.district, a.state,
      ].filter(Boolean).join(', ');
      setDeliveryAddress(formatted);
    }
  }

  async function handleSaveDefaultAddress(addressObj) {
    if (!session) return;
    await supabase.from('profiles').upsert(
      { id: session.user.id, default_address: addressObj },
      { onConflict: 'id' }
    );
  }

  async function fetchCart() {
    setIsLoading(true);
    setError('');
    const { data, error: err } = await supabase
      .from('cart_items')
      .select(`
        id, quantity, offer_price,
        listing:listings (
          id, title, price, image_url,
          location_label, user_id, seller_id,
          allows_handoff, allows_delivery
        )
      `)
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (err) { setError(err.message); }
    else {
      setCartItems(data ?? []);
    }
    setIsLoading(false);
  }

  // A method is offered for the whole cart only if every item's seller allows it.
  // Missing values (older rows written before this column existed) default to allowed.
  const cartAllowsHandoff  = cartItems.every(i => i.listing?.allows_handoff  !== false);
  const cartAllowsDelivery = cartItems.every(i => i.listing?.allows_delivery !== false);
  const noCompatibleMethod = cartItems.length > 0 && !cartAllowsHandoff && !cartAllowsDelivery;

  // Keep the selected method valid as the cart changes (e.g. an item is removed)
  useEffect(() => {
    if (cartAllowsHandoff && fulfillment !== 'handoff' && !cartAllowsDelivery) {
      setFulfillment('handoff');
    } else if (cartAllowsDelivery && fulfillment !== 'delivery' && !cartAllowsHandoff) {
      setFulfillment('delivery');
    }
  }, [cartAllowsHandoff, cartAllowsDelivery]);

  // Build the meetup location string sent to the RPC and displayed in EscrowStatusScreen
  const meetupLocationStr = meetupDetails
    ? [
        meetupDetails.landmark,
        [meetupDetails.city, meetupDetails.district, meetupDetails.state].filter(Boolean).join(', '),
      ].filter(Boolean).join(' · ')
    : '';

  // Use negotiated offer_price when set, otherwise fall back to listing's original price
  const itemPrice   = (i) => Number(i.offer_price ?? i.listing?.price ?? 0);
  const subtotal    = cartItems.reduce((s, i) => s + itemPrice(i) * i.quantity, 0);
  const shippingFee = fulfillment === 'delivery' ? SHIPPING_FEE : 0;
  const escrowFee   = subtotal * ESCROW_RATE;
  const total       = subtotal + shippingFee + escrowFee;

  async function handlePay() {
    if (!session || cartItems.length === 0) return;

    // ── Validation ──────────────────────────────────────────────
    if (noCompatibleMethod) {
      setError('Your cart has items with no common fulfillment method — check out those items separately.');
      return;
    }
    if (fulfillment === 'handoff'  && !cartAllowsHandoff)  {
      setError('Handoff isn’t offered for one or more items in your cart.');
      return;
    }
    if (fulfillment === 'delivery' && !cartAllowsDelivery) {
      setError('Delivery isn’t offered for one or more items in your cart.');
      return;
    }
    if (fulfillment === 'delivery' && !deliveryAddress.trim()) {
      setError('Please choose a delivery address before proceeding.');
      return;
    }
    if (fulfillment === 'handoff' && !meetupLocationStr.trim()) {
      setError('Please choose a meetup location.');
      return;
    }

    setPaying(true);
    setError('');
    try {
      // Single atomic DB transaction via RPC — all items succeed or all roll back
      const { data: rpcData, error: rpcErr } = await supabase.rpc('checkout_cart', {
        p_fulfillment_method: fulfillment,
        p_meetup_location:    fulfillment === 'handoff'   ? meetupLocationStr      : null,
        p_delivery_address:   fulfillment === 'delivery'  ? deliveryAddress.trim() : null,
      });
      if (rpcErr) throw rpcErr;

      // RPC returns JSONB; `id` may be UUID string or bigint number — normalise to string
      const result      = Array.isArray(rpcData) ? (rpcData[0] ?? {}) : (rpcData ?? {});
      const first_tx_id = result.first_tx_id != null ? String(result.first_tx_id) : null;
      const count       = result.count ?? 0;
      // Snapshot cart items before clearing for the confirmation screen
      const itemsSnapshot = [...cartItems];
      setCartCount(0);

      // Notifications are best-effort and fire outside the DB transaction
      for (const item of cartItems) {
        const sellerId  = item.listing?.user_id ?? item.listing?.seller_id;
        const listingId = item.listing?.id;
        const itemTitle = item.listing?.title ?? 'your item';
        const price     = itemPrice(item);
        const itemAmt   = `RM ${price.toFixed(2)}`;

        if (sellerId) {
          if (fulfillment === 'handoff') {
            // Find or create a conversation so we can auto-send the escrow-lock message
            let chatId = null;
            try {
              const { data: existing } = await supabase
                .from('conversations')
                .select('id')
                .eq('buyer_id', session.user.id)
                .eq('seller_id', sellerId)
                .limit(1)
                .maybeSingle();

              if (existing?.id) {
                chatId = existing.id;
              } else {
                const { data: created } = await supabase
                  .from('conversations')
                  .insert({ buyer_id: session.user.id, seller_id: sellerId, listing_id: listingId })
                  .select('id')
                  .single();
                chatId = created?.id ?? null;
              }

              if (chatId) {
                // Auto-message from buyer into the chat
                await supabase.from('messages').insert({
                  conversation_id: chatId,
                  sender_id:       session.user.id,
                  receiver_id:     sellerId,
                  content:         `🔒 Escrow locked! My payment of ${itemAmt} for "${itemTitle}" is confirmed. Let's arrange our meetup — when and where works for you?`,
                  type:            'text',
                });
              }
            } catch (_) { /* non-fatal */ }

            notify(sellerId, {
              type:  'new_order_handoff',
              title: `🤝 New order — arrange meetup`,
              body:  `Buyer confirmed payment for "${itemTitle}" (${itemAmt}). Tap to open chat and coordinate meetup.`,
              data:  { chat_id: chatId, tx_id: first_tx_id },
            });
          } else {
            notify(sellerId, {
              type:  'new_order_ship',
              title: `📦 New order — please ship!`,
              body:  `Pack and ship "${itemTitle}" (${itemAmt}) — funds locked in escrow until buyer confirms receipt.`,
              data:  { tx_id: first_tx_id },
            });
          }
        }

        // Confirm to buyer that their payment went through
        notify(session.user.id, {
          type:  'order_confirmed',
          title: `✅ Order confirmed!`,
          body:  fulfillment === 'delivery'
            ? `Payment for "${itemTitle}" secured in escrow. Seller has been asked to ship it.`
            : `Payment for "${itemTitle}" secured in escrow. Coordinate meetup details with the seller.`,
          data:  { tx_id: first_tx_id },
        });
      }

      navigate('/order-confirmed', {
        state: {
          txId:             first_tx_id,
          count,
          items:            itemsSnapshot,
          fulfillmentMethod: fulfillment,
          meetupLocation:   fulfillment === 'handoff'  ? meetupLocationStr      : null,
          deliveryAddress:  fulfillment === 'delivery' ? deliveryAddress.trim() : null,
          total,
          paymentMethod,
        },
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setPaying(false);
    }
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-[120px]" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* Header */}
      <header className="bg-white shadow-sm fixed top-0 w-full z-40 border-b border-gray-100">
        <div className="flex items-center px-4 h-14 max-w-2xl mx-auto gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-600">
            <span className="material-symbols-outlined text-[22px]">arrow_back</span>
          </button>
          <h1 className="font-bold text-gray-900 flex-1 text-center text-base pr-8">Secure Checkout</h1>
        </div>
      </header>

      <main className="pt-14 max-w-2xl mx-auto px-4 flex flex-col gap-4 py-5">

        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-2 text-red-700 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <span className="material-symbols-outlined text-[18px] shrink-0">error_outline</span>
            <span className="flex-1">{error}</span>
            <button onClick={() => setError('')}><span className="material-symbols-outlined text-[18px]">close</span></button>
          </div>
        )}

        {/* ── 1. Escrow Progress Tracker ─────────────────────────── */}
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-4">Escrow Flow</p>
          <div className="flex items-start justify-between relative">
            <div className="absolute top-5 left-[12.5%] right-[12.5%] h-0.5 bg-purple-100 z-0" />
            {ESCROW_STAGES.map((stage, i) => (
              <div key={i} className="flex flex-col items-center gap-2 relative z-10 flex-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 shadow-sm transition-colors ${
                  i === 0
                    ? 'bg-[#A855F7] border-[#A855F7] text-white'
                    : 'bg-white border-purple-200 text-purple-300'
                }`}>
                  <span className="material-symbols-outlined text-[18px]"
                    style={{ fontVariationSettings: i === 0 ? "'FILL' 1" : "'FILL' 0" }}>
                    {stage.icon}
                  </span>
                </div>
                <span className="text-[10px] text-center leading-tight text-gray-400 whitespace-pre-line font-medium">{stage.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-start gap-2 bg-purple-50 border border-purple-100 rounded-xl px-3 py-2.5">
            <span className="material-symbols-outlined text-[#A855F7] text-[16px] shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>info</span>
            <p className="text-xs text-purple-700 leading-relaxed">
              Your funds are <span className="font-semibold">locked in escrow</span> and only released to the seller once you confirm receipt. You're fully protected.
            </p>
          </div>
        </section>

        {/* ── 2. Cart Items ──────────────────────────────────────── */}
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Items {!isLoading && `(${cartItems.length})`}
          </p>
          <div className="flex flex-col gap-4">
            {isLoading ? (
              <><ItemSkeleton /><ItemSkeleton /></>
            ) : cartItems.length === 0 ? (
              <div className="flex flex-col items-center py-8 gap-3 text-gray-400">
                <span className="material-symbols-outlined text-[40px]">shopping_cart</span>
                <p className="text-sm">Your cart is empty</p>
                <button onClick={() => navigate('/')} className="text-[#A855F7] text-sm font-semibold hover:underline">Start Shopping</button>
              </div>
            ) : (
              cartItems.map(item => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                    {item.listing?.image_url
                      ? <img className="w-full h-full object-cover" src={item.listing.image_url} alt={item.listing.title} />
                      : <div className="w-full h-full flex items-center justify-center"><span className="material-symbols-outlined text-gray-300 text-[28px]">image</span></div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 line-clamp-2 leading-snug">{item.listing?.title}</p>
                    {item.quantity > 1 && <p className="text-xs text-gray-400 mt-0.5">Qty: {item.quantity}</p>}
                  {item.offer_price != null && (
                    <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                      ✅ Negotiated price
                    </span>
                  )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-gray-900">
                      RM {(itemPrice(item) * item.quantity).toFixed(2)}
                    </p>
                    {item.offer_price != null && (
                      <p className="text-xs text-gray-400 line-through">
                        RM {(Number(item.listing?.price ?? 0) * item.quantity).toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* ── 3. Fulfillment Toggle ──────────────────────────────── */}
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-4">Fulfillment Method</p>

          {noCompatibleMethod ? (
            <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
              <span className="material-symbols-outlined text-red-500 text-[18px] shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
              <p className="text-xs text-red-600 leading-relaxed">
                <span className="font-semibold">No common fulfillment method.</span> Your cart has items whose sellers don't share a common option (e.g. one is handoff-only, another is delivery-only). Check those items out separately.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'handoff',  icon: 'handshake',      label: 'Handoff',  sub: 'Meet in person · No shipping fee',                 available: cartAllowsHandoff },
                { id: 'delivery', icon: 'local_shipping', label: 'Delivery', sub: `Ship to address · +RM ${SHIPPING_FEE.toFixed(2)}`, available: cartAllowsDelivery },
              ].map(opt => (
                <button
                  key={opt.id}
                  disabled={!opt.available}
                  onClick={() => setFulfillment(opt.id)}
                  className={`flex flex-col items-start gap-1.5 rounded-xl border-2 p-4 text-left transition-all ${
                    !opt.available
                      ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                      : fulfillment === opt.id
                        ? 'border-[#A855F7] bg-purple-50'
                        : 'border-gray-200 bg-white hover:border-purple-200'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                    opt.available && fulfillment === opt.id ? 'bg-[#A855F7] text-white' : 'bg-gray-100 text-gray-400'
                  }`}>
                    <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>{opt.icon}</span>
                  </div>
                  <span className={`font-semibold text-sm ${opt.available && fulfillment === opt.id ? 'text-[#7C3AED]' : 'text-gray-700'}`}>{opt.label}</span>
                  <span className="text-xs text-gray-400 leading-snug">
                    {opt.available ? opt.sub : 'Not offered for items in your cart'}
                  </span>
                  {opt.available && fulfillment === opt.id && (
                    <span className="material-symbols-outlined text-[#A855F7] text-[16px] self-end" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {!noCompatibleMethod && (
          <div className="mt-4">
            {fulfillment === 'handoff' ? (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-500">
                  Meetup Location <span className="text-red-400">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowMeetupModal(true)}
                  className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2.5 bg-white hover:border-[#A855F7] hover:ring-2 hover:ring-[#A855F7]/20 transition-all text-left w-full"
                >
                  <span className="material-symbols-outlined text-[#A855F7] text-[18px] shrink-0">location_on</span>
                  <span className={`flex-1 text-sm ${meetupLocationStr ? 'text-gray-800' : 'text-gray-400'}`}>
                    {meetupLocationStr || 'Please state handoff address…'}
                  </span>
                  <span className="material-symbols-outlined text-gray-400 text-[18px] shrink-0">chevron_right</span>
                </button>
                {meetupDetails?.details && (
                  <p className="text-xs text-gray-500 flex items-start gap-1 px-1 leading-snug">
                    <span className="material-symbols-outlined text-[13px] text-gray-400 shrink-0 mt-0.5">info</span>
                    {meetupDetails.details}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-500">
                  Delivery Address <span className="text-red-400">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowAddressModal(true)}
                  className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2.5 bg-white hover:border-[#A855F7] hover:ring-2 hover:ring-[#A855F7]/20 transition-all text-left w-full"
                >
                  <span className="material-symbols-outlined text-[#A855F7] text-[18px] shrink-0">home</span>
                  <span className={`flex-1 text-sm ${deliveryAddress ? 'text-gray-800' : 'text-gray-400'}`}>
                    {deliveryAddress || 'Choose delivery address…'}
                  </span>
                  <span className="material-symbols-outlined text-gray-400 text-[18px] shrink-0">chevron_right</span>
                </button>
              </div>
            )}
          </div>
          )}
        </section>

        {/* ── 4. Transaction Summary ─────────────────────────────── */}
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-4">Transaction Summary</p>
          <div className="flex flex-col gap-3">
            <SummaryRow label="Item Price" value={`RM ${subtotal.toFixed(2)}`} />
            <SummaryRow
              label="Shipping Fee"
              value={fulfillment === 'delivery' ? `RM ${shippingFee.toFixed(2)}` : 'FREE'}
              green={fulfillment === 'handoff'}
            />
            <SummaryRow label={`Secure Escrow Fee (${(ESCROW_RATE * 100).toFixed(0)}%)`} value={`RM ${escrowFee.toFixed(2)}`} />
            <div className="border-t border-gray-100 pt-3">
              <SummaryRow label="Total" value={`RM ${total.toFixed(2)}`} bold />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl px-3 py-2.5">
            <span className="material-symbols-outlined text-green-600 text-[18px] shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
            <p className="text-xs text-green-700">
              <span className="font-semibold">100% Escrow Protected</span> — funds locked until you confirm receipt.
            </p>
          </div>
        </section>

        {/* ── 5. Payment Method ──────────────────────────────────── */}
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-4">Payment Method</p>

          {fulfillment === 'handoff' ? (
            /* Handoff: no payment gateway — escrow locked directly on confirmation */
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 rounded-xl border-2 border-[#A855F7] bg-purple-50 px-4 py-4">
                <div className="w-12 h-12 rounded-full bg-[#A855F7] text-white flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-[#7C3AED]">Escrow Lock</p>
                  <p className="text-xs text-purple-500 mt-0.5">Funds locked instantly upon confirmation</p>
                </div>
                <div className="w-5 h-5 rounded-full border-2 border-[#A855F7] bg-[#A855F7] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-white text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
                </div>
              </div>
              <div className="flex items-start gap-2 bg-purple-50 border border-purple-100 rounded-xl px-3 py-2.5">
                <span className="material-symbols-outlined text-[#A855F7] text-[16px] shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>info</span>
                <p className="text-xs text-purple-700 leading-relaxed">
                  For face-to-face handoffs, your funds are <span className="font-semibold">locked in escrow immediately</span> when you tap "Lock Escrow" below. No payment gateway needed — the seller is notified and will head to the meetup spot. You'll get a notification when they arrive.
                </p>
              </div>
            </div>
          ) : (
            /* Delivery: all payment methods available */
            <div className="flex flex-col gap-3">
              {PAYMENT_METHODS.map(method => (
                <button
                  key={method.id}
                  onClick={() => setPaymentMethod(method.id)}
                  className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all ${
                    paymentMethod === method.id ? 'border-[#A855F7] bg-purple-50' : 'border-gray-200 hover:border-purple-200 bg-white'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    paymentMethod === method.id ? 'bg-[#A855F7] text-white' : 'bg-gray-100 text-gray-500'
                  }`}>
                    <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>{method.icon}</span>
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-semibold ${paymentMethod === method.id ? 'text-[#7C3AED]' : 'text-gray-800'}`}>{method.label}</p>
                    <p className="text-xs text-gray-400">{method.description}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                    paymentMethod === method.id ? 'border-[#A855F7] bg-[#A855F7]' : 'border-gray-300'
                  }`}>
                    {paymentMethod === method.id && (
                      <span className="material-symbols-outlined text-white text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

      </main>

      {/* ── Sticky Pay Button ────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 w-full z-50 px-4 pb-6 pt-3 bg-gradient-to-t from-white via-white/95 to-transparent">
        <div className="max-w-2xl mx-auto">
          {fulfillment === 'handoff' ? (
            /* Handoff: lock escrow directly — no payment modal */
            <button
              onClick={() => {
                if (!meetupLocationStr.trim()) {
                  setError('Please choose a meetup location before proceeding.'); return;
                }
                setError('');
                handlePay();
              }}
              disabled={paying || isLoading || cartItems.length === 0 || noCompatibleMethod}
              className="w-full bg-[#A855F7] hover:bg-[#9333EA] disabled:bg-purple-300 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-purple-200/60 disabled:cursor-not-allowed text-base active:scale-[0.98]"
            >
              {paying ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Locking Escrow…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
                  Lock Escrow · RM {total.toFixed(2)}
                </>
              )}
            </button>
          ) : (
            /* Delivery: open payment modal */
            <button
              onClick={() => {
                if (!deliveryAddress.trim()) {
                  setError('Please choose a delivery address before proceeding.'); return;
                }
                setError('');
                if (paymentMethod !== 'fpx') {
                  setShowDuitNowModal(true);
                } else {
                  setShowFpxModal(true);
                }
              }}
              disabled={paying || isLoading || cartItems.length === 0 || noCompatibleMethod}
              className="w-full bg-[#A855F7] hover:bg-[#9333EA] disabled:bg-purple-300 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-purple-200/60 disabled:cursor-not-allowed text-base active:scale-[0.98]"
            >
              {paying ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
                  Pay to Escrow · RM {total.toFixed(2)}
                </>
              )}
            </button>
          )}
          <p className="text-center text-[11px] text-gray-400 mt-2 flex items-center justify-center gap-1">
            <span className="material-symbols-outlined text-[13px]">shield</span>
            Secured by Plumio Escrow · Funds held until confirmed
          </p>
        </div>
      </div>

      {showAddressModal && (
        <DeliveryAddressModal
          onClose={() => setShowAddressModal(false)}
          onSaveDefault={handleSaveDefaultAddress}
          onSelect={addr => {
            setDeliveryAddress(addr);
            if (error) setError('');
            setShowAddressModal(false);
          }}
        />
      )}

      {showMeetupModal && (
        <MeetupLocationModal
          onClose={() => setShowMeetupModal(false)}
          onSelect={loc => {
            setMeetupDetails(loc);
            if (error) setError('');
          }}
        />
      )}

      {showFpxModal && (
        <FpxBankingModal
          total={total}
          orderId={`PLM-${Date.now().toString(36).toUpperCase()}`}
          onClose={() => setShowFpxModal(false)}
          onApprove={() => { setShowFpxModal(false); handlePay(); }}
        />
      )}

      {showDuitNowModal && (
        <DuitNowQrModal
          total={total}
          orderId={`PLM-${Date.now().toString(36).toUpperCase()}`}
          onClose={() => setShowDuitNowModal(false)}
          onApprove={() => { setShowDuitNowModal(false); handlePay(); }}
        />
      )}
    </div>
  );
}
