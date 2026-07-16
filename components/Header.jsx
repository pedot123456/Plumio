import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

/**
 * Reusable Plumio branded header.
 *
 * Logo mode  (no `back` prop)  →  [Logo + "Plumio"]  [title]  [right]
 * Back mode  (`back` prop set) →  [← backLabel]      [title]  [Logo]
 *
 * Props
 *   title      – page label shown in the centre (optional)
 *   back       – path string, numeric delta (-1), or `true` (≡ -1) to enable ← button
 *   backLabel  – text shown beside the arrow, e.g. "Back to Help Centre" (optional)
 *   right      – ReactNode for the right slot in logo mode (optional)
 */
export default function Header({ title, back, backLabel = '', right }) {
  const navigate = useNavigate();
  const hasBack  = back !== undefined && back !== null && back !== false;

  function handleBack() {
    if (back === true || typeof back === 'number') {
      navigate(typeof back === 'number' ? back : -1);
    } else {
      navigate(back);
    }
  }

  return (
    <header
      className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between relative">

        {/* ── Left ── */}
        {hasBack ? (
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-[#A855F7] transition-colors"
          >
            <ArrowLeft size={16} />
            {backLabel}
          </button>
        ) : (
          <Link
            to="/"
            className="flex items-center gap-2 hover:opacity-75 transition-opacity"
          >
            <img src="/Plumio.png" alt="Plumio" className="h-8 w-auto object-contain" />
            <span className="font-black text-gray-900 text-sm tracking-tight hidden sm:inline">
              Plumio
            </span>
          </Link>
        )}

        {/* ── Centre ── */}
        {title && (
          <span className="absolute left-1/2 -translate-x-1/2 font-bold text-gray-900 text-sm pointer-events-none truncate max-w-[40%] text-center">
            {title}
          </span>
        )}

        {/* ── Right ── */}
        <div className="flex items-center">
          {hasBack ? (
            <Link to="/" className="hover:opacity-75 transition-opacity" aria-label="Home">
              <img src="/Plumio.png" alt="Plumio" className="h-8 w-auto object-contain" />
            </Link>
          ) : (
            right ?? null
          )}
        </div>

      </div>
    </header>
  );
}
