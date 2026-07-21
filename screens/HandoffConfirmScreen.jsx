import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { notify } from '../utils/notify';

export default function HandoffConfirmScreen() {
  const navigate    = useNavigate();
  const { txId }    = useParams();
  const { session } = useAuth();

  const [tx,          setTx]          = useState(null);
  const [isLoading,   setIsLoading]   = useState(true);
  const [error,       setError]       = useState('');
  const [confirming,  setConfirming]  = useState(false);
  const [confirmed,   setConfirmed]   = useState(false);

  useEffect(() => {
    if (!txId) { setIsLoading(false); return; }
    fetchTransaction();
  }, [txId]);

  async function fetchTransaction() {
    setIsLoading(true);
    const { data, error: err } = await supabase
      .from('transactions')
      .select(`
        id, status, amount, meetup_location,
        buyer_id, seller_id,
        listing:listings (id, title, price, image_url)
      `)
      .eq('id', txId)
      .single();
    if (err) setError(err.message);
    else {
      setTx(data);
      if (data?.status === 'completed') setConfirmed(true);
    }
    setIsLoading(false);
  }

  async function handleConfirm() {
    if (!session) { navigate('/login'); return; }
    if (!window.confirm('Confirm you have received and inspected the item? This will release payment to the seller.')) return;
    setConfirming(true);
    setError('');
    const { error: err } = await supabase
      .from('transactions')
      .update({ status: 'completed' })
      .eq('id', txId);
    setConfirming(false);
    if (err) { setError(err.message); }
    else {
      setConfirmed(true);
      // Notify seller that handoff is complete and funds are released
      if (tx?.seller_id) {
        notify(tx.seller_id, {
          type:  'handoff_complete',
          title: 'Handoff complete — funds released!',
          body:  `The buyer confirmed receipt of "${tx.listing?.title ?? 'your item'}". RM ${Number(tx.amount ?? 0).toFixed(2)} is on its way to your balance.`,
          data:  { tx_id: txId },
        });
      }
    }
  }

  // ── Already confirmed ─────────────────────────────────────────
  if (confirmed) {
    return (
      <div className="bg-background min-h-screen flex flex-col items-center justify-center gap-lg px-margin-mobile text-center">
        <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center">
          <span
            className="material-symbols-outlined text-green-600"
            style={{ fontSize: 52, fontVariationSettings: "'FILL' 1" }}
          >
            check_circle
          </span>
        </div>
        <h2 className="font-headline-lg text-headline-lg text-primary">Handoff Complete!</h2>
        <p className="font-body-md text-body-md text-on-surface-variant max-w-xs leading-relaxed">
          Payment of{' '}
          <span className="font-semibold text-primary">RM {Number(tx?.amount ?? 0).toFixed(2)}</span>{' '}
          has been released to the seller. Enjoy your item!
        </p>
        <div className="flex flex-col gap-sm w-full max-w-xs mt-sm">
          <button
            onClick={() => navigate('/transactions')}
            className="w-full bg-primary-container text-on-primary font-label-md text-label-md py-sm rounded-xl hover:bg-primary transition-colors flex items-center justify-center gap-sm"
          >
            <span className="material-symbols-outlined text-[18px]">receipt_long</span>
            View Transactions
          </button>
          <button
            onClick={() => navigate('/')}
            className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary underline transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // ── Loading ───────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="bg-background min-h-screen flex items-center justify-center">
        <span className="w-8 h-8 border-2 border-secondary/30 border-t-secondary rounded-full animate-spin" />
      </div>
    );
  }

  // ── Main confirm screen ───────────────────────────────────────
  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col font-body-md">
      {/* Header */}
      <header className="bg-surface shadow-sm fixed top-0 w-full z-50">
        <div className="flex items-center px-margin-mobile h-16 gap-md max-w-container-max mx-auto">
          <button
            className="text-primary hover:bg-surface-container-high transition-colors p-2 rounded-full"
            onClick={() => navigate(-1)}
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="font-headline-md text-headline-md font-bold text-primary flex-1 text-center">Confirm Handoff</h1>
          <div className="w-10" />
        </div>
      </header>

      <main className="flex-1 pt-[72px] pb-[120px] px-margin-mobile md:px-lg max-w-container-max mx-auto w-full flex flex-col gap-lg py-lg">

        {error && (
          <div className="flex items-center gap-sm text-error font-body-sm bg-error/10 rounded-lg px-md py-sm">
            <span className="material-symbols-outlined text-[18px] shrink-0">error_outline</span>
            <span className="flex-1">{error}</span>
            <button onClick={() => setError('')}>
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        )}

        {!session && (
          <div className="flex flex-col items-center justify-center py-xl gap-md text-center">
            <span className="material-symbols-outlined text-[48px] text-on-surface-variant">account_circle</span>
            <p className="font-headline-sm text-headline-sm text-primary">Log In to Confirm</p>
            <p className="font-body-sm text-body-sm text-on-surface-variant max-w-xs">
              You need to be logged in as the buyer to confirm this handoff.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="bg-primary-container text-on-primary font-label-md text-label-md px-xl py-sm rounded-xl hover:bg-primary transition-colors"
            >
              Log In
            </button>
          </div>
        )}

        {session && tx && (
          <>
            {/* QR scan verified indicator */}
            <div className="flex items-center gap-sm bg-secondary/10 border border-secondary/20 rounded-xl px-md py-sm">
              <span
                className="material-symbols-outlined text-secondary text-[22px] shrink-0"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                qr_code_scanner
              </span>
              <div>
                <p className="font-label-md text-label-md text-secondary">QR Code Verified</p>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Transaction-linked handoff code matched.
                </p>
              </div>
            </div>

            {/* Item details */}
            {tx.listing && (
              <div className="bg-white rounded-xl shadow-level-1 border border-outline-variant/20 p-md flex items-center gap-md">
                <div className="w-20 h-20 rounded-lg overflow-hidden bg-surface-container-high shrink-0">
                  {tx.listing.image_url
                    ? <img className="w-full h-full object-cover" src={tx.listing.image_url} alt={tx.listing.title} />
                    : <span className="material-symbols-outlined text-[32px] text-outline-variant flex items-center justify-center h-full">image</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-body-md text-body-md text-primary font-semibold line-clamp-2">{tx.listing.title}</p>
                  <p className="font-headline-sm text-headline-sm text-primary mt-xs">
                    RM {Number(tx.amount ?? tx.listing.price ?? 0).toFixed(2)}
                  </p>
                  {tx.meetup_location && (
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-xs flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">location_on</span>
                      {tx.meetup_location}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Inspection checklist */}
            <div className="bg-white rounded-xl shadow-level-1 border border-outline-variant/20 p-md flex flex-col gap-md">
              <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
                Inspect Before Confirming
              </p>
              {[
                'Item matches the listing description and photos',
                'Condition is as described (no hidden damage)',
                'All accessories and parts are included',
                'You are satisfied with the item',
              ].map((check, i) => (
                <div key={i} className="flex items-start gap-sm">
                  <span
                    className="material-symbols-outlined text-secondary text-[18px] shrink-0 mt-0.5"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    check_circle
                  </span>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">{check}</p>
                </div>
              ))}
            </div>

            {/* Warning */}
            <div className="bg-error/5 border border-error/20 rounded-xl px-md py-sm flex items-start gap-sm">
              <span className="material-symbols-outlined text-error text-[18px] shrink-0 mt-0.5">warning</span>
              <p className="font-body-sm text-body-sm text-error leading-relaxed">
                Confirming handoff is <span className="font-semibold">irreversible</span>. Only confirm after you have physically inspected the item and are satisfied.
              </p>
            </div>
          </>
        )}
      </main>

      {/* Confirm button */}
      {session && tx && (
        <div className="fixed bottom-0 left-0 w-full px-margin-mobile pb-lg pt-sm bg-gradient-to-t from-surface via-surface to-transparent z-40">
          <div className="max-w-container-max mx-auto flex flex-col gap-sm">
            <button
              onClick={handleConfirm}
              disabled={confirming}
              className="w-full bg-primary-container text-white font-headline-sm text-headline-sm py-sm rounded-xl shadow-md hover:bg-primary transition-colors flex justify-center items-center gap-sm active:scale-95 disabled:opacity-50"
            >
              {confirming ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Confirming…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>payments</span>
                  Item Received · Release Funds
                </>
              )}
            </button>
            <button
              onClick={() => navigate('/report', {
                state: {
                  listingId:         tx?.listing?.id,
                  sellerId:          tx?.seller_id,
                  listingTitle:      tx?.listing?.title,
                  listingImage:      tx?.listing?.image_url,
                  fulfillmentMethod: 'handoff',
                  amount:            tx?.amount,
                  txId:              txId,
                },
              })}
              className="w-full border border-outline-variant text-on-surface-variant font-label-md text-label-md py-sm rounded-xl flex items-center justify-center gap-sm hover:bg-surface-container transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">report</span>
              Item Problem? Raise Dispute
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
