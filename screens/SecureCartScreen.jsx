import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';

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
  const navigate    = useNavigate();
  const { session } = useAuth();

  const [cartItems,       setCartItems]       = useState([]);
  const [isLoading,       setIsLoading]       = useState(true);
  const [error,           setError]           = useState('');
  const [fulfillment,     setFulfillment]     = useState('handoff'); // 'handoff' | 'delivery'
  const [meetupLocation,  setMeetupLocation]  = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentMethod,   setPaymentMethod]   = useState('duitnow');
  const [paying,          setPaying]          = useState(false);

  useEffect(() => {
    if (!session) { setIsLoading(false); return; }
    fetchCart();
  }, [session]);

  async function fetchCart() {
    setIsLoading(true);
    setError('');
    const { data, error: err } = await supabase
      .from('cart_items')
      .select(`
        id, quantity,
        listing:listings (
          id, title, price, image_url,
          location_label, user_id, seller_id
        )
      `)
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (err) { setError(err.message); }
    else {
      setCartItems(data ?? []);
      const firstLoc = data?.find(i => i.listing?.location_label)?.listing?.location_label;
      if (firstLoc) setMeetupLocation(firstLoc);
    }
    setIsLoading(false);
  }

  const subtotal    = cartItems.reduce((s, i) => s + Number(i.listing?.price ?? 0) * i.quantity, 0);
  const shippingFee = fulfillment === 'delivery' ? SHIPPING_FEE : 0;
  const escrowFee   = subtotal * ESCROW_RATE;
  const total       = subtotal + shippingFee + escrowFee;

  async function handlePay() {
    if (!session || cartItems.length === 0) return;
    const location = fulfillment === 'delivery' ? deliveryAddress.trim() : meetupLocation.trim();
    if (!location) {
      setError(fulfillment === 'delivery' ? 'Please enter a delivery address.' : 'Please enter a meetup location.');
      return;
    }
    setPaying(true);
    setError('');
    try {
      let firstTxId = null;
      for (const item of cartItems) {
        const sellerId = item.listing?.user_id ?? item.listing?.seller_id;
        const { data: tx, error: txErr } = await supabase
          .from('transactions')
          .insert({
            listing_id:       item.listing.id,
            amount:           total,
            status:           'escrow_locked',
            transaction_type: 'escrow',
            meetup_location:  location,
            ...(session.user.id && { buyer_id:  session.user.id }),
            ...(sellerId         && { seller_id: sellerId }),
          })
          .select('id')
          .single();
        if (txErr) throw txErr;
        if (tx && !firstTxId) firstTxId = tx.id;
      }
      await supabase.from('cart_items').delete().eq('user_id', session.user.id);
      navigate(`/escrow/${firstTxId}`, { state: { meetupLocation: location, total } });
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
                  </div>
                  <p className="text-sm font-bold text-gray-900 shrink-0">
                    RM {(Number(item.listing?.price ?? 0) * item.quantity).toFixed(2)}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>

        {/* ── 3. Fulfillment Toggle ──────────────────────────────── */}
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-4">Fulfillment Method</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: 'handoff',  icon: 'handshake',     label: 'Handoff',  sub: 'Meet in person · No shipping fee' },
              { id: 'delivery', icon: 'local_shipping', label: 'Delivery', sub: `Ship to address · +RM ${SHIPPING_FEE.toFixed(2)}` },
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => setFulfillment(opt.id)}
                className={`flex flex-col items-start gap-1.5 rounded-xl border-2 p-4 text-left transition-all ${
                  fulfillment === opt.id
                    ? 'border-[#A855F7] bg-purple-50'
                    : 'border-gray-200 bg-white hover:border-purple-200'
                }`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                  fulfillment === opt.id ? 'bg-[#A855F7] text-white' : 'bg-gray-100 text-gray-400'
                }`}>
                  <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>{opt.icon}</span>
                </div>
                <span className={`font-semibold text-sm ${fulfillment === opt.id ? 'text-[#7C3AED]' : 'text-gray-700'}`}>{opt.label}</span>
                <span className="text-xs text-gray-400 leading-snug">{opt.sub}</span>
                {fulfillment === opt.id && (
                  <span className="material-symbols-outlined text-[#A855F7] text-[16px] self-end" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                )}
              </button>
            ))}
          </div>

          <div className="mt-4">
            {fulfillment === 'handoff' ? (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-500" htmlFor="meetup-input">
                  Meetup Location <span className="text-red-400">*</span>
                </label>
                <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2.5 focus-within:border-[#A855F7] focus-within:ring-2 focus-within:ring-[#A855F7]/20 bg-white transition-all">
                  <span className="material-symbols-outlined text-[#A855F7] text-[18px] shrink-0">location_on</span>
                  <input
                    id="meetup-input"
                    type="text"
                    value={meetupLocation}
                    onChange={e => { setMeetupLocation(e.target.value); if (error) setError(''); }}
                    placeholder="e.g. UTP IRC, V5 Cafe, Block 22 Lobby…"
                    className="flex-1 text-sm text-gray-800 placeholder:text-gray-400 bg-transparent focus:outline-none"
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-500" htmlFor="address-input">
                  Delivery Address <span className="text-red-400">*</span>
                </label>
                <div className="flex items-start gap-2 border border-gray-200 rounded-xl px-3 py-2.5 focus-within:border-[#A855F7] focus-within:ring-2 focus-within:ring-[#A855F7]/20 bg-white transition-all">
                  <span className="material-symbols-outlined text-[#A855F7] text-[18px] shrink-0 mt-0.5">home</span>
                  <textarea
                    id="address-input"
                    rows={2}
                    value={deliveryAddress}
                    onChange={e => { setDeliveryAddress(e.target.value); if (error) setError(''); }}
                    placeholder="Block, unit number, street, postcode…"
                    className="flex-1 text-sm text-gray-800 placeholder:text-gray-400 bg-transparent focus:outline-none resize-none"
                  />
                </div>
              </div>
            )}
          </div>
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
        </section>

      </main>

      {/* ── Sticky Pay Button ────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 w-full z-50 px-4 pb-6 pt-3 bg-gradient-to-t from-white via-white/95 to-transparent">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={handlePay}
            disabled={paying || isLoading || cartItems.length === 0}
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
          <p className="text-center text-[11px] text-gray-400 mt-2 flex items-center justify-center gap-1">
            <span className="material-symbols-outlined text-[13px]">shield</span>
            Secured by Plumio Escrow · Funds held until confirmed
          </p>
        </div>
      </div>
    </div>
  );
}
