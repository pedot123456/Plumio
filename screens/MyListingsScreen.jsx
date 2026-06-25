import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import BottomNav from '../components/BottomNav';

const TABS = ['Active', 'Sold', 'Drafts'];

// Map UI tab label → DB status value(s)
const TAB_STATUS = {
  Active:  ['active', 'escrow'],
  Sold:    ['sold'],
  Drafts:  ['draft'],
};

function ListingSkeleton() {
  return (
    <div className="animate-pulse bg-surface-container-lowest rounded-xl p-md border border-outline-variant/30 flex gap-md">
      <div className="w-24 h-24 rounded-lg bg-surface-container-high shrink-0" />
      <div className="flex-1 space-y-sm py-xs">
        <div className="h-4 bg-surface-container-high rounded w-3/4" />
        <div className="h-4 bg-surface-container-high rounded w-1/3" />
        <div className="h-8 bg-surface-container-high rounded-lg w-full mt-sm" />
      </div>
    </div>
  );
}

export default function MyListingsScreen() {
  const navigate = useNavigate();
  const { session } = useAuth();

  const [activeTab, setActiveTab] = useState('Active');
  const [listings, setListings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!session) { setIsLoading(false); return; }
    fetchListings();
  }, [session, activeTab]);

  async function fetchListings() {
    setIsLoading(true);
    setError(null);
    try {
      const statuses = TAB_STATUS[activeTab] ?? ['active'];
      const { data, error } = await supabase
        .from('listings')
        .select('id, title, price, image_url, views_count, status, escrow_label, created_at')
        .eq('seller_id', session.user.id)
        .in('status', statuses)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setListings(data ?? []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  const totalValue = listings.reduce((sum, item) => sum + Number(item.price ?? 0), 0);

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col font-body-md pb-20">
      {/* Top App Bar */}
      <header className="w-full top-0 sticky bg-surface shadow-sm z-50">
        <div className="flex justify-between items-center px-4 h-16 w-full">
          <button
            className="text-primary hover:opacity-80 transition-opacity active:scale-95"
            onClick={() => navigate(-1)}
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="font-headline-md text-headline-md text-primary font-bold tracking-tight text-center flex-1 mx-4">
            My Listings
          </h1>
          <button
            className="text-primary hover:opacity-80 transition-opacity active:scale-95"
            onClick={() => navigate('/create-listing')}
          >
            <span className="material-symbols-outlined">add</span>
          </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-container-max mx-auto px-margin-mobile pt-md">
        {/* Status Tabs */}
        <div className="flex gap-sm mb-lg overflow-x-auto pb-2 -mx-margin-mobile px-margin-mobile snap-x no-scrollbar">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`snap-start whitespace-nowrap px-md py-2 rounded-full font-label-md text-label-md flex-shrink-0 transition-all active:scale-95 ${
                activeTab === t
                  ? 'bg-primary-container text-on-primary'
                  : 'bg-surface-variant text-on-surface-variant hover:bg-surface-dim'
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
            <button onClick={fetchListings} className="ml-auto font-label-sm underline">Retry</button>
          </div>
        )}

        {/* Listings */}
        <div className="flex flex-col gap-md">
          {isLoading ? (
            <>
              <ListingSkeleton />
              <ListingSkeleton />
            </>
          ) : listings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-xxl gap-md text-on-surface-variant">
              <span className="material-symbols-outlined text-[56px]">storefront</span>
              <p className="font-headline-sm text-headline-sm">
                {activeTab === 'Active' ? 'No active listings' : activeTab === 'Sold' ? 'No sold items yet' : 'No drafts'}
              </p>
              {activeTab === 'Active' && (
                <button
                  onClick={() => navigate('/create-listing')}
                  className="mt-sm bg-primary-container text-on-primary font-label-md text-label-md px-lg py-sm rounded-lg hover:bg-primary transition-colors active:scale-95"
                >
                  + Create Listing
                </button>
              )}
            </div>
          ) : (
            listings.map(item => (
              <article
                key={item.id}
                className="bg-surface-container-lowest rounded-xl p-md shadow-[0_4px_6px_-1px_rgba(0,0,0,0.02)] border border-outline-variant/30 flex gap-md"
              >
                <div className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-surface-variant">
                  {item.image_url && (
                    <img className="w-full h-full object-cover" src={item.image_url} alt={item.title} />
                  )}
                </div>
                <div className="flex flex-col justify-between flex-1">
                  <div>
                    <h2 className="font-body-md text-body-md text-primary font-semibold line-clamp-2">{item.title}</h2>
                    <div className="mt-xs flex items-center justify-between">
                      <span className="font-headline-sm text-headline-sm text-primary-container">
                        RM {Number(item.price).toFixed(2)}
                      </span>
                      {item.views_count != null && (
                        <div className="flex items-center gap-1 text-on-surface-variant/60">
                          <span className="material-symbols-outlined text-[16px]">visibility</span>
                          <span className="font-label-sm text-label-sm">{item.views_count} Views</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {item.status === 'active' ? (
                    <button className="mt-sm w-full py-2 px-4 rounded-lg border-2 border-secondary text-secondary font-label-md text-label-md flex items-center justify-center gap-xs hover:bg-secondary/5 transition-colors active:scale-[0.98]">
                      <span className="material-symbols-outlined text-[18px]">rocket_launch</span>
                      Boost Listing (RM 0.50)
                    </button>
                  ) : item.status === 'escrow' ? (
                    <div className="mt-auto pt-sm">
                      <div className="inline-flex items-center gap-xs px-2 py-1 bg-tertiary-container/10 text-tertiary-container rounded-md">
                        <span className="material-symbols-outlined text-[14px]">lock</span>
                        <span className="font-label-sm text-label-sm font-semibold">
                          {item.escrow_label ?? 'Escrow Locked — Pending Handoff'}
                        </span>
                      </div>
                    </div>
                  ) : item.status === 'sold' ? (
                    <div className="mt-auto pt-sm">
                      <div className="inline-flex items-center gap-xs px-2 py-1 bg-secondary-container/20 text-secondary rounded-md">
                        <span className="material-symbols-outlined text-[14px]">check_circle</span>
                        <span className="font-label-sm text-label-sm font-semibold">Sold</span>
                      </div>
                    </div>
                  ) : null}
                </div>
              </article>
            ))
          )}
        </div>
      </main>

      {/* Summary Bar — only for Active tab */}
      {activeTab === 'Active' && !isLoading && listings.length > 0 && (
        <div className="fixed bottom-20 w-full bg-primary-container text-on-primary py-sm px-margin-mobile shadow-[0_-4px_12px_-2px_rgba(0,0,0,0.1)] z-40 border-t border-primary/20">
          <div className="flex justify-between items-center max-w-container-max mx-auto">
            <span className="font-body-sm text-body-sm text-on-primary/80">Total Active Value</span>
            <span className="font-headline-sm text-headline-sm font-bold">RM {totalValue.toFixed(2)}</span>
          </div>
        </div>
      )}

      <BottomNav activeTab="Account" />
    </div>
  );
}
