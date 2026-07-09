import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import LikeButton from './LikeButton';

// ── Carousel product card ───────────────────────────────────────
// Uses <div role="button"> instead of <button> so LikeButton (a real <button>)
// can nest inside without invalid HTML.
function CarouselCard({ id, title, price, image_url, userId }) {
  const navigate = useNavigate();

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/product/${id}`)}
      onKeyDown={e => e.key === 'Enter' && navigate(`/product/${id}`)}
      className="flex-none w-[140px] sm:w-[160px] md:w-[180px] lg:w-[200px] snap-start flex flex-col bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow active:scale-[0.97] cursor-pointer"
    >
      {/* Image + like overlay */}
      <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-gray-100">
        {image_url ? (
          <img
            src={image_url}
            alt={title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="material-symbols-outlined text-gray-300 text-[40px]">image</span>
          </div>
        )}

        <LikeButton
          listingId={id}
          userId={userId}
          size={14}
          className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-white/90 shadow-sm"
        />
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col gap-1">
        <p className="text-xs font-medium text-gray-800 line-clamp-2 leading-snug">
          {title}
        </p>
        <p className="text-sm font-bold text-[#A855F7]">
          RM {Number(price ?? 0).toFixed(2)}
        </p>
      </div>
    </div>
  );
}

// ── CategoryRow ─────────────────────────────────────────────────
export default function CategoryRow({ categoryName, products = [], path, userId }) {
  const navigate   = useNavigate();
  const scrollRef  = useRef(null);

  const [canScrollLeft,  setCanScrollLeft]  = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Check arrow visibility from current scroll position
  function updateArrows() {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }

  // Run on mount and when products change
  useEffect(() => {
    updateArrows();
  }, [products]);

  function scrollBy(direction) {
    const el = scrollRef.current;
    if (!el) return;
    // Scroll ~90% of the visible container so the user always lands on a new card
    el.scrollBy({ left: direction * el.clientWidth * 0.9, behavior: 'smooth' });
  }

  if (!products.length) return null;

  return (
    <section>

      {/* ── Row header ── */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-gray-900 text-[14px] tracking-tight">
          {categoryName}
        </h2>
        <button
          onClick={() => path && navigate(path)}
          className="flex items-center gap-0.5 text-[#A855F7] text-xs font-semibold hover:underline active:opacity-70"
        >
          See All
          <ChevronRight size={13} strokeWidth={2.5} />
        </button>
      </div>

      {/* ── Carousel ── */}
      <div className="relative">

        {/* Left arrow */}
        {canScrollLeft && (
          <button
            onClick={() => scrollBy(-1)}
            aria-label="Scroll left"
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10
                       w-7 h-7 bg-white border border-gray-200 rounded-full shadow-md
                       flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-transform"
          >
            <ChevronLeft size={15} className="text-gray-600" />
          </button>
        )}

        {/* Scroll track — scrollbar hidden cross-browser */}
        <div
          ref={scrollRef}
          onScroll={updateArrows}
          className="flex overflow-x-auto gap-4 snap-x pb-2 [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {products.map(product => (
            <CarouselCard key={product.id} {...product} userId={userId} />
          ))}
          {/* Trailing spacer so last card clears the right fade */}
          <div className="min-w-[6px]" aria-hidden="true" />
        </div>

        {/* Right arrow + gradient edge fade */}
        {canScrollRight && (
          <>
            <div className="absolute right-0 top-0 h-full w-14 bg-gradient-to-l from-gray-50 to-transparent pointer-events-none" />
            <button
              onClick={() => scrollBy(1)}
              aria-label="Scroll right"
              className="absolute right-1 top-1/2 -translate-y-1/2 z-10
                         w-7 h-7 bg-white border border-gray-200 rounded-full shadow-md
                         flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-transform"
            >
              <ChevronRight size={15} className="text-gray-600" />
            </button>
          </>
        )}
      </div>

    </section>
  );
}
