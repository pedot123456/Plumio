import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Heart } from 'lucide-react';

/**
 * LikeButton
 * Props:
 *   listingId  — UUID of the listing being liked
 *   userId     — UUID of the current user (pass null/undefined if guest)
 *   size       — icon size in px (default 18)
 *   className  — extra classes for the button wrapper (position, bg, etc.)
 *
 * Usage in a card overlay:
 *   <LikeButton listingId={id} userId={session?.user?.id}
 *               className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 shadow-sm" />
 */
export default function LikeButton({ listingId, userId, size = 18, className = '' }) {
  const [isLiked,   setIsLiked]   = useState(false);
  const [isChecking, setIsChecking] = useState(true);  // true while initial DB check runs
  const [isPending,  setIsPending]  = useState(false);  // true while toggle DB call runs

  // ── Initial load: check whether this user has already liked this listing ──
  useEffect(() => {
    if (!userId || !listingId) {
      setIsChecking(false);
      return;
    }

    let cancelled = false;

    async function checkLike() {
      const { data } = await supabase
        .from('user_activity')
        .select('id')
        .eq('user_id',       userId)
        .eq('listing_id',    listingId)
        .eq('activity_type', 'like')
        .maybeSingle();

      if (!cancelled) {
        setIsLiked(!!data);
        setIsChecking(false);
      }
    }

    checkLike();
    return () => { cancelled = true; };
  }, [userId, listingId]);

  // ── Toggle handler ──────────────────────────────────────────────
  async function handleToggle(e) {
    e.stopPropagation(); // prevent parent card click / navigation

    if (!userId || isPending || isChecking) return;

    const wasLiked = isLiked;

    // Optimistic update — flip immediately so the UI feels instant
    setIsLiked(!wasLiked);
    setIsPending(true);

    try {
      if (wasLiked) {
        // Unlike: remove the record
        const { error } = await supabase
          .from('user_activity')
          .delete()
          .eq('user_id',       userId)
          .eq('listing_id',    listingId)
          .eq('activity_type', 'like');

        if (error) throw error;
      } else {
        // Like: insert a new record
        const { error } = await supabase
          .from('user_activity')
          .insert({ user_id: userId, listing_id: listingId, activity_type: 'like' });

        if (error) throw error;
      }
    } catch (err) {
      console.error('LikeButton toggle failed:', err.message);
      setIsLiked(wasLiked); // revert to truth on failure
    } finally {
      setIsPending(false);
    }
  }

  // Don't render for guests — nothing to like as
  if (!userId) return null;

  return (
    <button
      onClick={handleToggle}
      disabled={isPending || isChecking}
      aria-label={isLiked ? 'Unlike this listing' : 'Like this listing'}
      className={`flex items-center justify-center transition-transform active:scale-75 disabled:cursor-default ${className}`}
    >
      <Heart
        size={size}
        className={`transition-all duration-150 ${
          isChecking
            ? 'text-gray-300'                          // neutral while loading
            : isLiked
              ? 'fill-red-500 text-red-500 drop-shadow-sm'  // liked  — solid red
              : 'text-gray-400 hover:text-red-400'     // unliked — outline, red on hover
        } ${isPending ? 'opacity-50' : ''}`}
      />
    </button>
  );
}
