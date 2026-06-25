import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function GuestModal({ onClose, message }) {
  const navigate = useNavigate();

  // Close on Escape key
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const go = path => {
    onClose();
    navigate(path);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative w-full md:max-w-[400px] bg-surface-container-lowest rounded-t-[28px] md:rounded-[28px] px-lg pt-lg pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:pb-lg shadow-level-3 animate-fade-in-up">
        {/* Drag pill (mobile) */}
        <div className="w-10 h-1 bg-outline-variant rounded-full mx-auto mb-lg md:hidden" />

        {/* Close button */}
        <button
          className="absolute top-md right-md p-2 text-on-surface-variant hover:bg-surface-container rounded-full transition-colors"
          onClick={onClose}
          aria-label="Close"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-md">
          <div className="w-[72px] h-[72px] bg-primary-fixed rounded-full flex items-center justify-center">
            <span
              className="material-symbols-outlined text-[36px] text-primary-container"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              storefront
            </span>
          </div>
        </div>

        {/* Copy */}
        <h2 className="font-headline-md text-headline-md text-primary text-center mb-xs">
          Log in to continue
        </h2>
        <p className="font-body-md text-body-md text-on-surface-variant text-center mb-xl leading-relaxed">
          {message || 'Create an account or log in to access this feature on Plumio.'}
        </p>

        {/* CTAs */}
        <div className="flex flex-col gap-sm">
          <button
            onClick={() => go('/login')}
            className="w-full h-12 bg-primary-container text-on-primary font-label-md text-label-md rounded-xl hover:bg-primary active:scale-[0.98] transition-all shadow-level-1"
          >
            Log In
          </button>
          <button
            onClick={() => go('/signup')}
            className="w-full h-12 bg-surface-container text-on-surface font-label-md text-label-md rounded-xl hover:bg-surface-container-high active:scale-[0.98] transition-all border border-outline-variant"
          >
            Create Account
          </button>
        </div>

        <p className="text-center font-label-sm text-label-sm text-on-surface-variant mt-md">
          You can still browse — no account needed to explore listings.
        </p>
      </div>
    </div>
  );
}
