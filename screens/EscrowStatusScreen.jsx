import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import BottomNav from '../components/BottomNav';

const STATUS_LABEL = {
  escrow_locked: { label: 'Funds Locked',   icon: 'lock',          cls: 'text-secondary bg-secondary/10 border-secondary/20' },
  completed:     { label: 'Handoff Done',   icon: 'check_circle',  cls: 'text-green-600 bg-green-50 border-green-200' },
  disputed:      { label: 'Under Dispute',  icon: 'report',        cls: 'text-error bg-error/10 border-error/20' },
  cancelled:     { label: 'Cancelled',      icon: 'cancel',        cls: 'text-outline bg-surface-container border-outline-variant' },
};

export default function EscrowStatusScreen() {
  const navigate      = useNavigate();
  const { txId }      = useParams();
  const location      = useLocation();
  const { session }   = useAuth();

  // State passed from SecureCartScreen (instant display while loading)
  const passedLocation = location.state?.meetupLocation ?? '';
  const passedTotal    = location.state?.total ?? null;

  const [tx,        setTx]        = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState('');

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
        listing:listings (id, title, price, image_url)
      `)
      .eq('id', txId)
      .single();
    if (err) setError(err.message);
    else setTx(data);
    setIsLoading(false);
  }

  const status    = STATUS_LABEL[tx?.status] ?? STATUS_LABEL.escrow_locked;
  const meetupLoc = tx?.meetup_location ?? passedLocation;
  const amount    = tx?.amount ?? passedTotal;
  const isSeller  = session?.user?.id === tx?.seller_id;

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col font-body-md pb-[144px]">
      {/* Header */}
      <header className="bg-surface shadow-sm fixed top-0 w-full z-40">
        <div className="flex items-center px-lg py-md max-w-container-max mx-auto gap-md">
          <button
            className="text-primary hover:bg-surface-container-high transition-colors p-2 rounded-full shrink-0"
            onClick={() => navigate('/transactions')}
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="font-headline-md text-headline-md font-bold text-primary flex-1">Escrow Status</h1>
        </div>
      </header>

      <main className="flex-grow pt-[72px] px-margin-mobile md:px-lg max-w-container-max mx-auto w-full flex flex-col gap-lg py-lg">

        {error && (
          <div className="flex items-center gap-sm text-error font-body-sm bg-error/10 rounded-lg px-md py-sm">
            <span className="material-symbols-outlined text-[18px] shrink-0">error_outline</span>
            <span>{error}</span>
          </div>
        )}

        {/* Locked banner */}
        <div className={`flex items-center gap-sm border rounded-xl px-md py-sm ${status.cls}`}>
          <span
            className="material-symbols-outlined text-[22px] shrink-0"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            {status.icon}
          </span>
          <div>
            <p className="font-label-md text-label-md font-semibold">{status.label}</p>
            <p className="font-body-sm text-body-sm opacity-80">
              {tx?.status === 'completed'
                ? 'Handoff confirmed. Funds released to seller.'
                : 'Your payment is held securely until you confirm the handoff.'}
            </p>
          </div>
        </div>

        {/* Item card */}
        {isLoading ? (
          <div className="animate-pulse bg-white rounded-xl p-md flex items-center gap-md shadow-level-1">
            <div className="w-20 h-20 rounded-lg bg-surface-container-high shrink-0" />
            <div className="flex-1 space-y-sm">
              <div className="h-4 bg-surface-container-high rounded w-3/4" />
              <div className="h-5 bg-surface-container-high rounded w-1/4" />
            </div>
          </div>
        ) : tx?.listing ? (
          <div className="bg-white rounded-xl p-md flex items-center gap-md shadow-level-1 border border-outline-variant/20">
            <div className="w-20 h-20 rounded-lg overflow-hidden bg-surface-container-high shrink-0">
              {tx.listing.image_url
                ? <img className="w-full h-full object-cover" src={tx.listing.image_url} alt={tx.listing.title} />
                : <span className="material-symbols-outlined text-[32px] text-outline-variant flex items-center justify-center h-full">image</span>
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-body-md text-body-md text-primary font-semibold line-clamp-2">{tx.listing.title}</p>
              <p className="font-headline-sm text-headline-sm text-primary mt-xs">
                RM {Number(amount ?? tx.listing.price ?? 0).toFixed(2)}
              </p>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-xs">
                Escrow ID: <span className="font-mono text-[11px]">{txId?.slice(0, 8)}…</span>
              </p>
            </div>
          </div>
        ) : null}

        {/* Meetup location */}
        {meetupLoc ? (
          <div className="bg-white rounded-xl p-md shadow-level-1 border border-outline-variant/20 flex items-start gap-sm">
            <span
              className="material-symbols-outlined text-secondary text-[22px] shrink-0 mt-0.5"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              location_on
            </span>
            <div>
              <p className="font-label-md text-label-md text-on-surface-variant">Meetup Location</p>
              <p className="font-body-md text-body-md text-primary font-semibold mt-xs">{meetupLoc}</p>
            </div>
          </div>
        ) : null}

        {/* Escrow bridge explanation */}
        <div className="bg-secondary/5 border border-secondary/20 rounded-xl p-md flex flex-col gap-sm">
          <div className="flex items-center gap-sm">
            <span
              className="material-symbols-outlined text-secondary text-[20px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              shield
            </span>
            <p className="font-label-md text-label-md text-secondary">Hyperlocal Secure Escrow Bridge</p>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
            Your funds are placed in a controlled transaction ledger within Plumio — not sent to the seller yet.
            Once you physically inspect the item and scan the seller's QR code, funds are released automatically.
          </p>
        </div>

        {/* QR Handoff steps */}
        <div className="bg-white rounded-xl p-md shadow-level-1 border border-outline-variant/20 flex flex-col gap-md">
          <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Handoff Steps</p>
          {[
            { icon: 'handshake',  step: '1', text: `Meet the seller at ${meetupLoc || 'the agreed location'}` },
            { icon: 'inventory',  step: '2', text: 'Inspect the item carefully before confirming' },
            { icon: 'qr_code_scanner', step: '3', text: "Ask seller to open Plumio → Show QR, then scan it" },
            { icon: 'payments',   step: '4', text: 'Funds released to seller instantly after your scan' },
          ].map(({ icon, step, text }) => (
            <div key={step} className="flex items-start gap-md">
              <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-secondary text-[16px]">{icon}</span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed pt-1">{text}</p>
            </div>
          ))}
        </div>

        {/* If current user is the seller, offer shortcut to QR screen */}
        {isSeller && (
          <button
            onClick={() => navigate(`/handoff/${txId}`)}
            className="w-full bg-secondary text-on-secondary font-label-md text-label-md py-sm rounded-xl flex items-center justify-center gap-sm hover:bg-secondary/90 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">qr_code_2</span>
            Show Handoff QR Code
          </button>
        )}
      </main>

      {/* Pinned bottom actions */}
      <div className="fixed bottom-[72px] left-0 w-full px-margin-mobile pb-md pt-sm bg-gradient-to-t from-surface via-surface to-transparent z-40 flex flex-col gap-sm max-w-container-max mx-auto">
        {isSeller ? null : (
          <button
            onClick={() => navigate(`/handoff/${txId}`)}
            className="w-full bg-secondary text-on-secondary font-label-md text-label-md py-sm rounded-xl flex items-center justify-center gap-sm hover:bg-secondary/90 transition-colors shadow-md"
          >
            <span className="material-symbols-outlined text-[20px]">qr_code_scanner</span>
            Scan Handoff QR
          </button>
        )}
        <button
          onClick={() => navigate('/report')}
          className="w-full border border-outline-variant text-on-surface-variant font-label-md text-label-md py-sm rounded-xl flex items-center justify-center gap-sm hover:bg-surface-container transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">report</span>
          Report Issue / Dispute
        </button>
      </div>

      <BottomNav activeTab="Home" />
    </div>
  );
}
