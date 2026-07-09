import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import BottomNav from '../components/BottomNav';
import { Heart } from 'lucide-react';

// ── Product card with unlike button ────────────────────────────
function LikedCard({ activityId, listing, onUnlike }) {
  const navigate   = useNavigate();
  const [removing, setRemoving] = useState(false);

  async function handleUnlike(e) {
    e.stopPropagation();
    setRemoving(true);
    await onUnlike(activityId);
  }

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

        {/* Unlike button */}
        <button
          onClick={handleUnlike}
          disabled={removing}
          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 shadow-sm flex items-center justify-center hover:bg-red-50 transition-colors disabled:opacity-50"
          aria-label="Unlike"
        >
          {removing
            ? <span className="w-3.5 h-3.5 border-2 border-red-400/40 border-t-red-400 rounded-full animate-spin" />
            : <Heart size={15} className="text-red-500 fill-red-500" />
          }
        </button>
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col gap-1">
        <p className="text-xs font-medium text-gray-800 line-clamp-2 leading-snug">{listing.title}</p>
        <p className="text-sm font-bold text-[#A855F7]">RM {Number(listing.price ?? 0).toFixed(2)}</p>
      </div>
    </div>
  );
}

// ── Main screen ─────────────────────────────────────────────────
export default function LikesScreen() {
  const navigate      = useNavigate();
  const { session }   = useAuth();
  const [items,     setItems]     = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState(null);

  useEffect(() => {
    if (!session) { setIsLoading(false); return; }
    fetchLikes();
  }, [session]);

  async function fetchLikes() {
    setIsLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('user_activity')
      .select(`
        id,
        listing_id,
        created_at,
        listing:listings (id, title, price, image_url, status)
      `)
      .eq('user_id', session.user.id)
      .eq('activity_type', 'like')
      .order('created_at', { ascending: false });

    if (err) { setError(err.message); }
    else {
      // Only show active listings (seller may have taken it down)
      setItems((data ?? []).filter(i => i.listing && i.listing.status !== 'cancelled'));
    }
    setIsLoading(false);
  }

  async function handleUnlike(activityId) {
    const { error: err } = await supabase
      .from('user_activity')
      .delete()
      .eq('id', activityId);

    if (!err) {
      setItems(prev => prev.filter(i => i.id !== activityId));
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24" style={{ fontFamily: "'Inter', sans-serif" }}>

      <div className="max-w-lg mx-auto px-4 py-5">

        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 animate-pulse">
            {[0,1,2,3,4,5].map(i => (
              <div key={i} className="rounded-2xl overflow-hidden bg-gray-200 aspect-[3/4]" />
            ))}
          </div>

        ) : error ? (
          <div className="flex flex-col items-center py-16 gap-3">
            <p className="text-red-500 text-sm">{error}</p>
            <button onClick={fetchLikes} className="text-[#A855F7] text-sm font-semibold hover:underline">Retry</button>
          </div>

        ) : items.length === 0 ? (
          /* ── Empty state ── */
          <div className="flex flex-col items-center py-24 gap-4 text-center">
            <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center">
              <Heart size={36} className="text-red-300" />
            </div>
            <div>
              <h2 className="font-bold text-gray-800 text-base">No liked items yet</h2>
              <p className="text-gray-400 text-sm mt-1 max-w-[220px]">
                Tap the heart on any listing to save it here.
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
              <LikedCard
                key={item.id}
                activityId={item.id}
                listing={item.listing}
                onUnlike={handleUnlike}
              />
            ))}
          </div>
        )}
      </div>

      <BottomNav activeTab="Account" />
    </div>
  );
}
