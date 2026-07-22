import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { TIPS } from '../data/scamAwareness';

const TIP_INDEX_KEY = 'scam_tip_index';

// Advances to the next tip (wrapping around) and persists it, so each fresh
// mount of this banner — i.e. each time the user visits a page showing it —
// shows a different tip than last time instead of the same one forever.
function getNextTipIndex() {
  const stored  = Number(localStorage.getItem(TIP_INDEX_KEY));
  const current = Number.isFinite(stored) ? stored : -1;
  const next    = (current + 1) % TIPS.length;
  localStorage.setItem(TIP_INDEX_KEY, String(next));
  return next;
}

export default function ScamAlertBanner({ className = '' }) {
  const [tipIndex,  setTipIndex]  = useState(null);
  const [dismissed, setDismissed] = useState(false);
  // Guards against React StrictMode's dev-only double-invoke of effects,
  // which would otherwise advance the persisted index twice per real visit.
  const ranOnce = useRef(false);

  useEffect(() => {
    if (ranOnce.current) return;
    ranOnce.current = true;
    setTipIndex(getNextTipIndex());
  }, []);

  if (dismissed || tipIndex === null) return null;

  return (
    <div className={`bg-purple-50 border border-purple-100 rounded-xl px-4 py-3 flex items-start gap-3 ${className}`}>
      <span
        className="material-symbols-outlined text-[#A855F7] text-[20px] shrink-0 mt-0.5"
        style={{ fontVariationSettings: "'FILL' 1" }}
      >
        shield
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-[#7C3AED] uppercase tracking-wide">
          Scam Prevention Tip #{tipIndex + 1}
        </p>
        <p className="text-sm text-gray-700 mt-0.5 leading-relaxed">{TIPS[tipIndex]}</p>
        <Link
          to="/scam-awareness"
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#A855F7] hover:underline mt-1.5"
        >
          Learn More <span aria-hidden="true">→</span>
        </Link>
      </div>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss tip"
        className="text-gray-400 hover:text-gray-600 p-1 -m-1 shrink-0"
      >
        <span className="material-symbols-outlined text-[18px]">close</span>
      </button>
    </div>
  );
}
