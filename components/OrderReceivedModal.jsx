import React, { useState, useEffect } from 'react';

const RATING_LABELS = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent!'];
const RATING_COLORS = ['', 'text-error', 'text-on-surface-variant', 'text-secondary', 'text-secondary', 'text-secondary'];

export default function OrderReceivedModal({ itemName, itemImage, itemPrice, onClose, onSubmit }) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [review, setReview] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const displayRating = hovered || rating;

  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  function handleSubmit() {
    if (!rating) return;
    onSubmit?.({ rating, review });
    setSubmitted(true);
  }

  // ── Success state ─────────────────────────────────────────
  if (submitted) {
    return (
      <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full md:max-w-[400px] bg-surface-container-lowest rounded-t-[28px] md:rounded-[28px] px-lg pt-lg pb-[calc(2rem+env(safe-area-inset-bottom))] md:pb-lg shadow-level-3 flex flex-col items-center text-center gap-md animate-fade-in-up">
          <div className="w-10 h-1 bg-outline-variant rounded-full md:hidden mb-xs" />

          <div className="w-20 h-20 rounded-full bg-secondary/10 flex items-center justify-center mt-sm">
            <span
              className="material-symbols-outlined text-[44px] text-secondary"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              check_circle
            </span>
          </div>

          <div>
            <h2 className="font-headline-md text-headline-md text-primary mb-xs">Feedback submitted!</h2>
            <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
              {rating >= 4
                ? "Glad you loved it — your review helps the community."
                : "Thanks for the honest feedback. It helps everyone trade better."}
            </p>
          </div>

          {/* Star recap */}
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(s => (
              <span
                key={s}
                className={`material-symbols-outlined text-[24px] ${s <= rating ? 'text-tertiary-fixed-dim' : 'text-outline-variant'}`}
                style={{ fontVariationSettings: s <= rating ? "'FILL' 1" : "'FILL' 0" }}
              >
                star
              </span>
            ))}
          </div>

          <button
            onClick={onClose}
            className="w-full h-12 bg-primary-container text-on-primary font-label-md text-label-md rounded-xl hover:bg-primary active:scale-[0.98] transition-all mt-sm"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  // ── Main modal ────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div className="relative w-full md:max-w-[440px] bg-surface-container-lowest rounded-t-[28px] md:rounded-[28px] shadow-level-3 animate-fade-in-up flex flex-col max-h-[92vh]">
        {/* Scrollable content */}
        <div className="overflow-y-auto px-lg pt-lg pb-4 flex flex-col gap-lg">
          {/* Drag pill */}
          <div className="w-10 h-1 bg-outline-variant rounded-full mx-auto md:hidden -mt-2 mb-xs" />

          {/* Close */}
          <button
            className="absolute top-md right-md p-2 text-on-surface-variant hover:bg-surface-container rounded-full transition-colors"
            onClick={onClose}
            aria-label="Close"
          >
            <span className="material-symbols-outlined">close</span>
          </button>

          {/* Item preview */}
          <div className="flex items-center gap-sm bg-surface-container-low rounded-xl p-sm border border-outline-variant/20">
            <div className="w-14 h-14 rounded-lg overflow-hidden bg-surface-container shrink-0">
              {itemImage
                ? <img src={itemImage} alt={itemName} className="w-full h-full object-cover" />
                : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-on-surface-variant">inventory_2</span>
                  </div>
                )
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-label-md text-label-md text-primary truncate">{itemName ?? 'Your Item'}</p>
              {itemPrice && <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">{itemPrice}</p>}
              <div className="flex items-center gap-1 mt-1">
                <span className="material-symbols-outlined text-[13px] text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>
                  verified
                </span>
                <span className="font-label-sm text-label-sm text-secondary">Handoff confirmed</span>
              </div>
            </div>
          </div>

          {/* Question */}
          <div className="text-center">
            <h2 className="font-headline-md text-headline-md text-primary mb-xs">
              Are you satisfied with this item?
            </h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Your rating is visible to the seller and helps other buyers.
            </p>
          </div>

          {/* Star rating */}
          <div className="flex flex-col items-center gap-sm">
            <div
              className="flex gap-1"
              onMouseLeave={() => setHovered(0)}
            >
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  aria-label={`Rate ${star} out of 5`}
                  onMouseEnter={() => setHovered(star)}
                  onClick={() => setRating(star)}
                  className="p-1 rounded-lg transition-transform hover:scale-110 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-1"
                  style={{ minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <span
                    className={`material-symbols-outlined text-[40px] transition-all duration-150 select-none ${
                      star <= displayRating ? 'text-tertiary-fixed-dim' : 'text-outline-variant'
                    }`}
                    style={{ fontVariationSettings: star <= displayRating ? "'FILL' 1" : "'FILL' 0" }}
                  >
                    star
                  </span>
                </button>
              ))}
            </div>

            {/* Contextual label */}
            <p className={`font-label-md text-label-md h-5 transition-all duration-150 ${RATING_COLORS[displayRating] ?? 'text-transparent'}`}>
              {displayRating > 0 ? RATING_LABELS[displayRating] : ''}
            </p>
          </div>

          {/* Written review */}
          <div className="flex flex-col gap-xs">
            <label className="font-label-md text-label-md text-on-surface" htmlFor="review-text">
              Written Review <span className="font-body-sm text-body-sm text-on-surface-variant font-normal">(Optional)</span>
            </label>
            <textarea
              id="review-text"
              value={review}
              onChange={e => setReview(e.target.value)}
              placeholder="Share what you thought about the item, the seller's communication, and the handoff..."
              rows={4}
              className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl p-sm font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent resize-none transition-all"
            />
            <p className="font-label-sm text-label-sm text-on-surface-variant text-right">
              {review.length}/500
            </p>
          </div>
        </div>

        {/* Pinned footer */}
        <div className="px-lg pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:pb-lg pt-sm border-t border-outline-variant/20 flex flex-col gap-sm bg-surface-container-lowest rounded-b-[28px]">
          <button
            onClick={handleSubmit}
            disabled={!rating}
            className="w-full h-12 bg-primary-container text-on-primary font-label-md text-label-md rounded-xl hover:bg-primary active:scale-[0.98] transition-all shadow-level-1 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Submit Feedback
          </button>
          <button
            onClick={onClose}
            className="w-full h-10 text-on-surface-variant font-label-sm text-label-sm hover:text-on-surface rounded-xl transition-colors active:scale-[0.98]"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}
