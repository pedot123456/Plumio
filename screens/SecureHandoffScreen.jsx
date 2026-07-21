import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { notify } from '../utils/notify';

export default function SecureHandoffScreen() {
  const navigate    = useNavigate();
  const { txId }    = useParams();
  const { session } = useAuth();

  const [tx,        setTx]        = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState('');
  const [completing,   setCompleting]   = useState(false);
  const [done,         setDone]         = useState(false);
  const [arrivedNotif, setArrivedNotif] = useState(false);
  const [notifying,    setNotifying]    = useState(false);

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
    if (err) { setError(err.message); }
    else {
      setTx(data);
      // Notify buyer that the QR code is ready for scanning
      if (data?.buyer_id && data.buyer_id !== session?.user?.id) {
        notify(data.buyer_id, {
          type:  'qr_generated',
          title: 'Meetup QR is ready',
          body:  `The seller has opened the QR for "${data.listing?.title ?? 'your item'}". Head to the meetup to scan it.`,
          data:  { tx_id: data.id },
        });
      }
    }
    setIsLoading(false);
  }

  async function handleIveArrived() {
    if (!tx?.buyer_id) return;
    setNotifying(true);
    await notify(tx.buyer_id, {
      type:  'seller_arrived',
      title: '📍 Your seller has arrived!',
      body:  `Head to the meetup spot for "${tx.listing?.title ?? 'your item'}". Tap to scan the QR code.`,
      data:  { tx_id: String(txId) },
    });
    setArrivedNotif(true);
    setNotifying(false);
  }

  // Seller can manually mark complete if buyer can't scan
  async function handleManualComplete() {
    if (!window.confirm('Mark this handoff as complete? Funds will be released to you.')) return;
    setCompleting(true);
    const { error: err } = await supabase
      .from('transactions')
      .update({ status: 'completed' })
      .eq('id', txId);
    setCompleting(false);
    if (err) {
      setError(err.message);
    } else {
      setDone(true);
      if (tx?.buyer_id) {
        notify(tx.buyer_id, {
          type:  'handoff_complete',
          title: 'Handoff confirmed',
          body:  `The seller confirmed your handoff for "${tx.listing?.title ?? 'your item'}". Your escrow is complete.`,
          data:  { tx_id: txId },
        });
      }
    }
  }

  // The URL embedded in the QR — buyer scans and lands on HandoffConfirmScreen
  const confirmUrl = `${window.location.origin}/handoff/confirm/${txId}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=10&data=${encodeURIComponent(confirmUrl)}`;


  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col font-body-md">
      {/* Header */}
      <header className="bg-surface fixed top-0 w-full z-50 shadow-sm">
        <div className="flex items-center px-margin-mobile h-16 gap-md max-w-container-max mx-auto">
          <button
            className="text-primary hover:bg-surface-container-high transition-colors p-2 rounded-full"
            onClick={() => navigate(-1)}
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="font-headline-md text-headline-md font-bold text-primary flex-1 text-center">Local Handoff</h1>
          <div className="w-10" />
        </div>
      </header>

      {/* Escrow locked banner */}
      <div className="mt-16 w-full bg-secondary text-on-secondary py-sm px-margin-mobile flex items-center justify-center gap-sm">
        <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
        <span className="font-label-md text-label-md">Escrow Locked · Funds are secure</span>
      </div>

      <main className="flex-1 px-margin-mobile flex flex-col items-center py-lg gap-lg max-w-container-max mx-auto w-full">

        {error && (
          <div className="w-full flex items-center gap-sm text-error font-body-sm bg-error/10 rounded-lg px-md py-sm">
            <span className="material-symbols-outlined text-[18px] shrink-0">error_outline</span>
            <span>{error}</span>
          </div>
        )}

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <span className="w-8 h-8 border-2 border-secondary/30 border-t-secondary rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* ── I've Arrived notification button ── */}
            {!arrivedNotif ? (
              <div className="w-full flex flex-col gap-sm">
                <div className="bg-amber-50 border border-amber-100 rounded-2xl px-md py-sm flex items-start gap-sm">
                  <span className="material-symbols-outlined text-amber-500 text-[16px] shrink-0 mt-0.5">info</span>
                  <p className="font-body-sm text-body-sm text-amber-800 leading-snug">
                    When you reach the meetup spot, tap the button below to notify the buyer to come and scan your QR.
                  </p>
                </div>
                <button
                  onClick={handleIveArrived}
                  disabled={notifying || !tx?.buyer_id}
                  className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-sm shadow-lg transition-all active:scale-[0.98]"
                >
                  {notifying
                    ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>location_on</span>
                  }
                  <span>{notifying ? 'Notifying Buyer…' : "📍 I've Arrived at Meetup!"}</span>
                </button>
              </div>
            ) : (
              <div className="w-full bg-green-50 border border-green-200 rounded-2xl p-md flex items-center gap-md">
                <span className="material-symbols-outlined text-green-600 text-[24px] shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                <div>
                  <p className="font-label-md text-label-md text-green-800 font-bold">Buyer Notified!</p>
                  <p className="font-body-sm text-body-sm text-green-700 mt-xs leading-snug">The buyer has been notified you've arrived. Show them the QR code below to scan.</p>
                </div>
              </div>
            )}

            {/* QR code */}
            <div className="flex flex-col items-center gap-md">
              <p className="font-body-md text-body-md text-on-surface-variant text-center max-w-xs">
                Show this QR code to the buyer. They scan it to confirm they received the item.
              </p>
              <div className="bg-white rounded-2xl shadow-level-2 p-lg border border-outline-variant/20 flex flex-col items-center gap-md">
                <img
                  src={qrImageUrl}
                  alt="Handoff QR Code"
                  className="w-[200px] h-[200px] sm:w-[240px] sm:h-[240px]"
                  onError={e => { e.target.style.display = 'none'; }}
                />
                <div className="flex items-center gap-xs text-secondary">
                  <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>qr_code_2</span>
                  <span className="font-label-sm text-label-sm">Dynamic · Single-use</span>
                </div>
              </div>
            </div>

            {/* Transaction summary */}
            {tx?.listing && (
              <div className="w-full bg-white rounded-xl shadow-level-1 border border-outline-variant/20 p-md flex items-center gap-md">
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-surface-container-high shrink-0">
                  {tx.listing.image_url
                    ? <img className="w-full h-full object-cover" src={tx.listing.image_url} alt={tx.listing.title} />
                    : <span className="material-symbols-outlined text-[28px] text-outline-variant flex items-center justify-center h-full">image</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-body-md text-body-md text-primary font-semibold line-clamp-2">{tx.listing.title}</p>
                  {tx.meetup_location && (
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-xs flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">location_on</span>
                      {tx.meetup_location}
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-label-sm text-label-sm text-on-surface-variant">Total Held</p>
                  <p className="font-headline-sm text-headline-sm text-primary font-bold">
                    RM {Number(tx.amount ?? 0).toFixed(2)}
                  </p>
                </div>
              </div>
            )}

            {/* Manual complete (seller fallback) */}
            <div className="w-full flex flex-col gap-sm mt-auto pt-md">
              <button
                onClick={handleManualComplete}
                disabled={completing || tx?.status === 'completed'}
                className="w-full border border-secondary text-secondary font-label-md text-label-md py-sm rounded-xl flex items-center justify-center gap-sm hover:bg-secondary/5 transition-colors disabled:opacity-50"
              >
                {completing
                  ? <span className="w-4 h-4 border-2 border-secondary/30 border-t-secondary rounded-full animate-spin" />
                  : <span className="material-symbols-outlined text-[20px]">how_to_reg</span>
                }
                Buyer Can't Scan? Mark Complete Manually
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
                Report Issue / Dispute
              </button>
            </div>
          </>
        )}
      </main>
      {/* ── Handoff complete popup ── */}
      {done && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-margin-mobile">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative bg-surface rounded-2xl w-full max-w-sm p-lg shadow-level-2 flex flex-col items-center gap-md text-center z-10">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
              <span
                className="material-symbols-outlined text-green-600"
                style={{ fontSize: 44, fontVariationSettings: "'FILL' 1" }}
              >
                check_circle
              </span>
            </div>
            <h2 className="font-headline-md text-headline-md text-primary">Handoff Complete!</h2>
            <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
              Funds of{' '}
              <span className="font-semibold text-primary">
                RM {Number(tx?.amount ?? 0).toFixed(2)}
              </span>{' '}
              have been released to your account.
            </p>
            <div className="flex flex-col gap-sm w-full mt-sm">
              <button
                onClick={() => navigate('/')}
                className="w-full bg-primary-container text-on-primary font-label-md text-label-md py-sm rounded-xl hover:bg-primary transition-colors flex items-center justify-center gap-sm"
              >
                <span className="material-symbols-outlined text-[18px]">home</span>
                Back to Home
              </button>
              <button
                onClick={() => navigate('/transactions')}
                className="w-full border border-outline-variant text-on-surface-variant font-label-md text-label-md py-sm rounded-xl hover:bg-surface-container transition-colors"
              >
                View Transactions
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
