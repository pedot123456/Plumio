import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import BottomNav from '../components/BottomNav';

const ESCROW_FEE = 1.00;

function ItemSkeleton() {
  return (
    <div className="animate-pulse bg-white rounded-lg p-sm flex items-center gap-md shadow-level-1">
      <div className="w-20 h-20 rounded-md bg-surface-container-high shrink-0" />
      <div className="flex-1 space-y-sm">
        <div className="h-4 bg-surface-container-high rounded w-3/4" />
        <div className="h-4 bg-surface-container-high rounded w-1/4" />
      </div>
    </div>
  );
}

export default function SecureCartScreen() {
  const navigate    = useNavigate();
  const { session } = useAuth();

  const [cartItems,      setCartItems]      = useState([]);
  const [isLoading,      setIsLoading]      = useState(true);
  const [error,          setError]          = useState('');
  const [meetupLocation, setMeetupLocation] = useState('');
  const [locking,        setLocking]        = useState(false);

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
        id,
        quantity,
        listing:listings (
          id,
          title,
          price,
          image_url,
          location_label,
          user_id,
          seller_id
        )
      `)
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (err) {
      setError(err.message);
    } else {
      setCartItems(data ?? []);
      // Pre-fill meetup from first listing that has a location
      const firstLoc = data?.find(i => i.listing?.location_label)?.listing?.location_label;
      if (firstLoc) setMeetupLocation(firstLoc);
    }
    setIsLoading(false);
  }

  async function handleLockEscrow() {
    if (!session || cartItems.length === 0) return;
    if (!meetupLocation.trim()) {
      setError('Please enter a meetup / handoff location.');
      return;
    }
    setLocking(true);
    setError('');
    try {
      let firstTxId = null;
      for (const item of cartItems) {
        const sellerId = item.listing?.user_id ?? item.listing?.seller_id;
        const { data: tx, error: txErr } = await supabase
          .from('transactions')
          .insert({
            listing_id:       item.listing.id,
            amount:           Number(item.listing.price ?? 0) * item.quantity,
            status:           'escrow_locked',
            transaction_type: 'escrow',
            meetup_location:  meetupLocation.trim(),
            ...(session.user.id && { buyer_id:  session.user.id }),
            ...(sellerId         && { seller_id: sellerId }),
          })
          .select('id')
          .single();
        if (txErr) throw txErr;
        if (tx && !firstTxId) firstTxId = tx.id;
      }
      // Clear cart after locking
      await supabase.from('cart_items').delete().eq('user_id', session.user.id);
      navigate(`/escrow/${firstTxId}`, { state: { meetupLocation, total } });
    } catch (err) {
      setError(err.message);
    } finally {
      setLocking(false);
    }
  }

  const subtotal = cartItems.reduce(
    (sum, i) => sum + Number(i.listing?.price ?? 0) * i.quantity, 0
  );
  const total = subtotal + ESCROW_FEE;

  // ── Main checkout screen ───────────────────────────────────────
  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col font-body-md pb-[144px] md:pb-[100px]">
      {/* Top App Bar */}
      <header className="bg-surface shadow-sm fixed top-0 w-full z-40">
        <div className="flex justify-between items-center w-full px-lg py-md max-w-container-max mx-auto">
          <button
            className="text-primary hover:bg-surface-container-high transition-colors p-2 rounded-full"
            onClick={() => navigate(-1)}
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="font-headline-md text-headline-md font-bold text-primary text-center flex-1">Secure Checkout</h1>
          <div className="w-10" />
        </div>
      </header>

      <main className="flex-grow pt-[72px] px-margin-mobile md:px-lg max-w-container-max mx-auto w-full flex flex-col gap-lg py-lg">

        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-sm text-error font-body-sm text-body-sm bg-error/10 rounded-lg px-md py-sm">
            <span className="material-symbols-outlined text-[18px] shrink-0">error_outline</span>
            <span className="flex-1">{error}</span>
            <button onClick={() => setError('')} className="shrink-0">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        )}

        {/* Cart Items */}
        <section className="flex flex-col gap-md">
          <h2 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
            Items {!isLoading && `(${cartItems.length})`}
          </h2>
          {isLoading ? (
            <><ItemSkeleton /><ItemSkeleton /></>
          ) : cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-xxl gap-md text-on-surface-variant">
              <span className="material-symbols-outlined text-[56px]">shopping_cart</span>
              <p className="font-headline-sm text-headline-sm">Your cart is empty</p>
              <button
                onClick={() => navigate('/')}
                className="mt-sm bg-primary-container text-on-primary font-label-md text-label-md px-lg py-sm rounded-lg hover:bg-primary transition-colors"
              >
                Start Shopping
              </button>
            </div>
          ) : (
            cartItems.map(item => (
              <div key={item.id} className="bg-white rounded-lg p-sm flex items-center gap-md shadow-level-1">
                <div className="w-20 h-20 rounded-md overflow-hidden bg-surface-container-high shrink-0 flex items-center justify-center">
                  {item.listing?.image_url ? (
                    <img className="w-full h-full object-cover" src={item.listing.image_url} alt={item.listing.title} />
                  ) : (
                    <span className="material-symbols-outlined text-[32px] text-outline-variant">image</span>
                  )}
                </div>
                <div className="flex-grow flex flex-col justify-center min-w-0">
                  <h3 className="font-body-md text-body-md text-primary line-clamp-2 leading-tight">
                    {item.listing?.title ?? 'Item'}
                  </h3>
                  {item.quantity > 1 && (
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-xs">Qty: {item.quantity}</p>
                  )}
                  <p className="font-headline-sm text-headline-sm text-primary mt-xs">
                    RM {(Number(item.listing?.price ?? 0) * item.quantity).toFixed(2)}
                  </p>
                </div>
              </div>
            ))
          )}
        </section>

        {/* Fulfillment / Meetup Location */}
        <section className="bg-white rounded-lg p-md shadow-level-1 border border-outline-variant/30 flex flex-col gap-sm">
          <h2 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Fulfillment</h2>
          <label className="font-body-sm text-body-sm text-on-surface-variant" htmlFor="meetup-input">
            Meetup / Handoff Location <span className="text-error">*</span>
          </label>
          <div className="flex items-center gap-sm border border-outline-variant/50 rounded-lg px-md py-sm bg-surface-container-lowest focus-within:ring-2 focus-within:ring-secondary focus-within:border-transparent transition-all">
            <span className="material-symbols-outlined text-secondary text-[20px] shrink-0">location_on</span>
            <input
              id="meetup-input"
              type="text"
              value={meetupLocation}
              onChange={e => setMeetupLocation(e.target.value)}
              placeholder="e.g. UTP IRC, V5 Cafe, Block 22 Lobby…"
              className="flex-1 bg-transparent font-body-md text-body-md text-primary outline-none placeholder:text-outline"
            />
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant/70">
            Both you and the seller will meet here to complete the handoff.
          </p>
        </section>

        {/* Escrow explanation */}
        <section className="bg-secondary/5 border border-secondary/20 rounded-lg p-md flex items-start gap-sm">
          <span
            className="material-symbols-outlined text-secondary text-[22px] shrink-0 mt-0.5"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            shield
          </span>
          <div>
            <p className="font-label-md text-label-md text-secondary">How Escrow Protects You</p>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-xs leading-relaxed">
              Your payment is held by Plumio. Once both parties scan the handoff QR code, funds are released to the seller.
              If the item doesn't arrive or doesn't match, you get a full refund.
            </p>
          </div>
        </section>

        {/* Order Summary */}
        <section className="bg-surface-container-low rounded-lg p-md shadow-level-1">
          <h2 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider mb-sm">Order Summary</h2>
          <div className="flex flex-col gap-xs">
            <div className="flex justify-between items-center text-on-surface-variant font-body-sm text-body-sm">
              <span>Subtotal ({cartItems.length} item{cartItems.length !== 1 ? 's' : ''})</span>
              <span>RM {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-on-surface-variant font-body-sm text-body-sm">
              <span>Escrow Fee</span>
              <span>RM {ESCROW_FEE.toFixed(2)}</span>
            </div>
            <div className="h-px bg-outline-variant opacity-50 my-sm" />
            <div className="flex justify-between items-center text-primary font-headline-sm text-headline-sm font-bold">
              <span>Total</span>
              <span>RM {total.toFixed(2)}</span>
            </div>
          </div>
        </section>
      </main>

      {/* Pinned CTA */}
      <div className="fixed bottom-[72px] md:bottom-0 left-0 w-full px-margin-mobile md:px-lg pb-md md:pb-lg pt-sm bg-gradient-to-t from-surface via-surface to-transparent z-40">
        <div className="max-w-container-max mx-auto">
          <button
            onClick={handleLockEscrow}
            disabled={locking || isLoading || cartItems.length === 0}
            className="w-full bg-primary-container text-white font-headline-md text-headline-md py-sm px-lg rounded-lg shadow-md hover:bg-primary transition-colors flex justify-center items-center gap-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {locking ? (
              <>
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Locking…
              </>
            ) : (
              <>
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
                Lock Escrow · RM {total.toFixed(2)}
              </>
            )}
          </button>
        </div>
      </div>

      <BottomNav activeTab="Cart" />
    </div>
  );
}
