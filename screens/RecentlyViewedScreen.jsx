import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import BottomNav from '../components/BottomNav';

function timeAgo(iso) {
  const seconds = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

// ── Product card ────────────────────────────────────────────────
function ViewedCard({ listing, viewedAt }) {
  const navigate = useNavigate();
  const isSold = listing.status === 'sold' || listing.status === 'completed';

  return (
    <div
      onClick={() => navigate(`/product/${listing.id}`)}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98] flex flex-col"
    >
      {/* Image */}
      <div className="relative w-full aspect-square bg-gray-100">
        {listing.image_url ? (
          <img
            src={listing.image_url}
            alt={listing.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="material-symbols-outlined text-gray-300 text-[36px]">image</span>
          </div>
        )}
        {isSold && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
              Sold
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col gap-1">
        <p className="text-xs font-medium text-gray-800 line-clamp-2 leading-snug">{listing.title}</p>
        <p className="text-sm font-bold text-[#A855F7]">RM {Number(listing.price ?? 0).toFixed(2)}</p>
        <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-0.5">
          <span className="material-symbols-outlined text-[11px]">schedule</span>
          {timeAgo(viewedAt)}
        </p>
      </div>
    </div>
  );
}

// ── Main screen ─────────────────────────────────────────────────
export default function RecentlyViewedScreen() {
  const navigate    = useNavigate();
  const { session } = useAuth();
  const [items,     setItems]     = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState(null);

  useEffect(() => {
    if (!session) { setIsLoading(false); return; }
    fetchViewed();
  }, [session]);

  async function fetchViewed() {
    setIsLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('user_activity')
      .select(`
        id,
        created_at,
        listing:listings (id, title, price, image_url, status)
      `)
      .eq('user_id', session.user.id)
      .eq('activity_type', 'view')
      .order('created_at', { ascending: false })
      .limit(60);

    if (err) { setError(err.message); }
    else      { setItems((data ?? []).filter(i => i.listing)); }
    setIsLoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="max-w-lg mx-auto px-4 py-5">

        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 animate-pulse">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden bg-gray-200 aspect-[3/4]" />
            ))}
          </div>

        ) : error ? (
          <div className="flex flex-col items-center py-16 gap-3">
            <p className="text-red-500 text-sm">{error}</p>
            <button onClick={fetchViewed} className="text-[#A855F7] text-sm font-semibold hover:underline">
              Retry
            </button>
          </div>

        ) : items.length === 0 ? (
          <div className="flex flex-col items-center py-24 gap-4 text-center">
            <div className="w-20 h-20 rounded-full bg-purple-50 flex items-center justify-center">
              <span
                className="material-symbols-outlined text-[40px] text-[#A855F7]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                history
              </span>
            </div>
            <div>
              <h2 className="font-bold text-gray-800 text-base">No items viewed yet</h2>
              <p className="text-gray-400 text-sm mt-1 max-w-[220px]">
                Listings you browse will appear here automatically.
              </p>
            </div>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-2.5 bg-[#A855F7] text-white text-sm font-bold rounded-full hover:bg-[#9333EA] transition-colors"
            >
              Browse Listings
            </button>
          </div>

        ) : (
          <div className="grid grid-cols-2 gap-3">
            {items.map(item => (
              <ViewedCard
                key={item.id}
                listing={item.listing}
                viewedAt={item.created_at}
              />
            ))}
          </div>
        )}
      </div>

      <BottomNav activeTab="Account" />
    </div>
  );
}
