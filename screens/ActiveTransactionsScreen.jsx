import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import OrderReceivedModal from '../components/OrderReceivedModal';

// Keyed by real DB status values
const STATUS_CONFIG = {
  escrow_locked: {
    icon:     'lock',
    label:    'Escrow Locked',
    iconCls:  'text-secondary',
    labelCls: 'text-secondary',
    badgeCls: 'bg-secondary text-on-secondary',
  },
  completed: {
    icon:     'check_circle',
    label:    'Completed',
    iconCls:  'text-green-600',
    labelCls: 'text-green-600',
    badgeCls: 'bg-green-100 text-green-700',
  },
  pending: {
    icon:     'pending',
    label:    'Pending',
    iconCls:  'text-on-surface-variant',
    labelCls: 'text-on-surface-variant',
    badgeCls: 'bg-surface/90 text-on-surface-variant',
  },
  disputed: {
    icon:     'report',
    label:    'Under Dispute',
    iconCls:  'text-error',
    labelCls: 'text-error',
    badgeCls: 'bg-error/10 text-error',
  },
  cancelled: {
    icon:     'cancel',
    label:    'Cancelled',
    iconCls:  'text-on-surface-variant',
    labelCls: 'text-on-surface-variant',
    badgeCls: 'bg-surface/90 text-on-surface-variant',
  },
};

function getCtaConfig(status, isSeller) {
  switch (status) {
    case 'escrow_locked':
      return isSeller
        ? { label: 'Show QR',     icon: 'qr_code_2',    cls: 'bg-secondary text-on-secondary hover:bg-secondary/90' }
        : { label: 'View Escrow', icon: 'lock',          cls: 'bg-primary-container text-on-primary hover:bg-primary' };
    case 'completed':
      return { label: 'Leave Review', icon: 'rate_review', cls: 'bg-secondary-container text-on-secondary-container hover:bg-secondary hover:text-on-secondary' };
    case 'disputed':
      return { label: 'View Dispute', icon: 'report',       cls: 'bg-error/10 text-error hover:bg-error/20' };
    default:
      return { label: 'View',         icon: 'arrow_forward', cls: 'border border-outline-variant text-on-surface-variant hover:bg-surface-container' };
  }
}

function TransactionSkeleton() {
  return (
    <div className="animate-pulse bg-surface-container-lowest rounded-[16px] p-md flex flex-col md:flex-row gap-md border border-outline-variant/20">
      <div className="w-full md:w-28 h-28 rounded-[12px] bg-surface-container-high shrink-0" />
      <div className="flex-1 space-y-sm py-xs">
        <div className="h-4 bg-surface-container-high rounded w-2/3" />
        <div className="h-5 bg-surface-container-high rounded w-1/4" />
        <div className="h-3 bg-surface-container-high rounded w-1/2 mt-sm" />
        <div className="h-9 bg-surface-container-high rounded-lg w-36 ml-auto mt-md" />
      </div>
    </div>
  );
}

export default function ActiveTransactionsScreen() {
  const navigate = useNavigate();
  const { session } = useAuth();

  const [tab, setTab] = useState('Buying');
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reviewModal, setReviewModal] = useState(null);

  useEffect(() => {
    if (!session) { setIsLoading(false); return; }
    fetchTransactions();
  }, [session, tab]);

  async function fetchTransactions() {
    setIsLoading(true);
    setError(null);
    try {
      const column = tab === 'Buying' ? 'buyer_id' : 'seller_id';
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id,
          status,
          amount,
          meetup_location,
          buyer_id,
          seller_id,
          listing:listings (
            id,
            title,
            price,
            image_url
          )
        `)
        .eq(column, session.user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setTransactions(data ?? []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  function handleCta(tx) {
    const isSeller = tab === 'Selling';
    switch (tx.status) {
      case 'escrow_locked':
        return isSeller
          ? navigate(`/handoff/${tx.id}`)
          : navigate(`/escrow/${tx.id}`);
      case 'completed':
        return setReviewModal(tx);
      case 'disputed':
        return navigate('/report');
      default:
        return navigate(`/escrow/${tx.id}`);
    }
  }

  async function handleFeedbackSubmit({ rating, review }) {
    if (!reviewModal || !session) return;
    try {
      await Promise.all([
        supabase.from('reviews').insert({
          listing_id:  reviewModal.listing?.id,
          reviewer_id: session.user.id,
          rating,
          comment: review,
        }),
        supabase
          .from('transactions')
          .update({ status: 'completed' })
          .eq('id', reviewModal.id),
      ]);
    } catch (_) {
      // Non-blocking — modal closes regardless
    } finally {
      setReviewModal(null);
      navigate('/');
    }
  }

  return (
    <div className="bg-background text-on-background min-h-screen font-body-md">
      {/* Top App Bar */}
      <header className="w-full top-0 sticky z-50 bg-surface shadow-sm flex items-center justify-between px-margin-mobile md:px-gutter h-16">
        <button
          className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-surface-container transition-colors text-primary active:scale-95"
          onClick={() => navigate(-1)}
        >
          <span className="material-symbols-outlined text-[24px]">arrow_back</span>
        </button>
        <h1 className="font-headline-md text-headline-md font-bold text-primary flex-1 text-center pr-10">
          Active Transactions
        </h1>
      </header>

      <main className="max-w-container-max mx-auto px-margin-mobile md:px-gutter py-lg pb-xxl">
        {/* Segmented Control */}
        <div className="flex w-full bg-surface-container-low rounded-lg p-1 mb-lg shadow-level-1">
          {['Buying', 'Selling'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-center rounded-md font-label-md text-label-md transition-all active:scale-[0.98] ${
                tab === t
                  ? 'bg-primary-container text-on-primary shadow-sm'
                  : 'text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {error && (
          <div className="flex items-center gap-sm text-error font-body-sm text-body-sm bg-error/10 rounded-lg px-md py-sm mb-md">
            <span className="material-symbols-outlined text-[18px]">error_outline</span>
            {error}
            <button onClick={fetchTransactions} className="ml-auto font-label-sm underline">Retry</button>
          </div>
        )}

        <div className="flex flex-col gap-md">
          {isLoading ? (
            <>
              <TransactionSkeleton />
              <TransactionSkeleton />
              <TransactionSkeleton />
            </>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-xxl gap-md text-on-surface-variant">
              <span className="material-symbols-outlined text-[56px]">receipt_long</span>
              <p className="font-headline-sm text-headline-sm">No active transactions</p>
              <p className="font-body-sm text-body-sm text-center max-w-xs">
                {tab === 'Buying'
                  ? 'Items you purchase will appear here.'
                  : 'Items you sell will appear here.'}
              </p>
            </div>
          ) : (
            transactions.map(tx => {
              const isSeller = tab === 'Selling';
              const cfg      = STATUS_CONFIG[tx.status] ?? STATUS_CONFIG.pending;
              const cta      = getCtaConfig(tx.status, isSeller);
              return (
                <div
                  key={tx.id}
                  className="bg-surface-container-lowest rounded-[16px] p-md shadow-level-1 hover:shadow-level-2 transition-shadow flex flex-col md:flex-row gap-md border border-outline-variant/20"
                >
                  {/* Image */}
                  <div className="w-full md:w-28 h-28 md:h-auto rounded-[12px] overflow-hidden shrink-0 bg-surface-container relative">
                    {tx.listing?.image_url
                      ? <img className="w-full h-full object-cover" src={tx.listing.image_url} alt={tx.listing.title} />
                      : <div className="w-full h-full flex items-center justify-center">
                          <span className="material-symbols-outlined text-[40px] text-outline-variant">image</span>
                        </div>
                    }
                    <div className={`absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full font-label-sm text-label-sm shadow-sm ${cfg.badgeCls}`}>
                      <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                        {cfg.icon}
                      </span>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="flex flex-col justify-between flex-1 gap-sm min-w-0">
                    <div>
                      <h2 className="font-headline-sm text-headline-sm text-primary mb-1 truncate">
                        {tx.listing?.title ?? 'Item'}
                      </h2>
                      <p className="font-headline-sm text-headline-sm text-primary font-bold">
                        RM {Number(tx.amount ?? tx.listing?.price ?? 0).toFixed(2)}
                      </p>
                    </div>

                    <div className="flex flex-col gap-xs">
                      <div className="flex items-center gap-2">
                        <span className={`material-symbols-outlined text-[16px] ${cfg.iconCls}`}
                          style={{ fontVariationSettings: "'FILL' 1" }}>
                          {cfg.icon}
                        </span>
                        <span className={`font-label-md text-label-md ${cfg.labelCls}`}>
                          {cfg.label}
                        </span>
                      </div>
                      {tx.meetup_location && (
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-on-surface-variant text-[16px]">location_on</span>
                          <span className="font-body-sm text-body-sm text-on-surface-variant truncate">
                            {tx.meetup_location}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="mt-1 flex justify-end gap-sm">
                      <button
                        className={`font-label-md text-label-md py-2 px-md rounded-lg flex items-center gap-2 transition-all active:scale-[0.98] ${cta.cls}`}
                        onClick={() => handleCta(tx)}
                      >
                        <span className="material-symbols-outlined text-[18px]">{cta.icon}</span>
                        {cta.label}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {!isLoading && transactions.length > 0 && (
          <div className="mt-lg text-center">
            <button className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center gap-2 mx-auto active:scale-95">
              <span className="material-symbols-outlined text-[18px]">history</span>
              View Completed Transactions
            </button>
          </div>
        )}
      </main>

      {reviewModal && (
        <OrderReceivedModal
          itemName={reviewModal.listing?.title ?? 'Item'}
          itemImage={reviewModal.listing?.image_url}
          itemPrice={`RM ${Number(reviewModal.amount ?? reviewModal.listing?.price ?? 0).toFixed(2)}`}
          onClose={() => setReviewModal(null)}
          onSubmit={handleFeedbackSubmit}
        />
      )}
    </div>
  );
}
