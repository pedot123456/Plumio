import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const CATEGORIES = [
  { value: 'electronics', label: 'Electronics & Gadgets' },
  { value: 'fashion',     label: 'Fashion & Apparel' },
  { value: 'home',        label: 'Home & Furniture' },
  { value: 'collectibles',label: 'Collectibles & Art' },
];

const DELIVERY_HINTS = {
  local:   'Buyer will meet you at a mutually agreed location.',
  courier: 'You will need to pack and ship the item to the buyer.',
};

export default function CreateListingScreen() {
  const navigate = useNavigate();
  const [delivery, setDelivery] = useState('local');
  const [acceptTrades, setAcceptTrades] = useState(false);

  return (
    <div className="bg-background text-on-background min-h-screen font-body-md">
      {/* Top App Bar */}
      <header className="bg-surface fixed top-0 w-full shadow-sm flex items-center px-margin-mobile h-16 z-50 justify-between">
        <button
          className="text-primary hover:bg-surface-container-high transition-colors active:scale-95 p-2 rounded-full flex items-center justify-center -ml-2"
          onClick={() => navigate(-1)}
        >
          <span className="material-symbols-outlined">close</span>
        </button>
        <h1 className="font-headline-sm text-headline-sm text-primary font-bold tracking-tight">List an Item</h1>
        <div className="w-10" />
      </header>

      <main className="pt-[80px] pb-[100px] max-w-2xl mx-auto w-full flex flex-col">
        {/* Photo Upload */}
        <section className="px-margin-mobile mb-lg">
          <div className="w-full aspect-square md:aspect-[2/1] rounded-xl border-2 border-dashed border-tertiary/20 bg-surface-container-lowest flex flex-col items-center justify-center cursor-pointer hover:bg-surface-container-low transition-colors duration-200 group relative overflow-hidden">
            <div className="absolute inset-0 bg-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="flex flex-col items-center justify-center space-y-sm z-10 p-md text-center">
              <span className="material-symbols-outlined text-display-lg text-secondary group-hover:scale-110 transition-transform duration-300">
                photo_camera
              </span>
              <p className="font-label-md text-label-md text-secondary">Tap to snap or upload photos</p>
              <p className="font-body-sm text-body-sm text-tertiary/60 mt-xs">
                Add up to 8 photos. First photo is the cover.
              </p>
            </div>
          </div>
        </section>

        {/* Form */}
        <section className="px-margin-mobile space-y-lg flex-1">
          {/* Title */}
          <div className="flex flex-col gap-xs">
            <label className="font-label-md text-label-md text-primary-container uppercase tracking-wider text-[11px] opacity-80" htmlFor="item-title">
              Item Title
            </label>
            <input
              id="item-title"
              type="text"
              placeholder="e.g. Vintage Leather Camera Bag"
              className="w-full bg-surface-container-lowest border border-tertiary/20 rounded-lg px-md py-sm font-body-md text-body-md text-primary-container focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent placeholder:text-outline shadow-level-1 transition-all duration-200"
            />
          </div>

          {/* Category */}
          <div className="flex flex-col gap-xs">
            <label className="font-label-md text-label-md text-primary-container uppercase tracking-wider text-[11px] opacity-80" htmlFor="item-category">
              Category
            </label>
            <div className="relative">
              <select
                id="item-category"
                className="w-full appearance-none bg-surface-container-lowest border border-tertiary/20 rounded-lg pl-md pr-xl py-sm font-body-md text-body-md text-primary-container focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent shadow-level-1 transition-all duration-200 cursor-pointer"
                defaultValue=""
              >
                <option value="" disabled>Select a relevant category</option>
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-md top-1/2 -translate-y-1/2 text-primary-container/50 pointer-events-none">
                expand_more
              </span>
            </div>
          </div>

          {/* Price */}
          <div className="flex flex-col gap-xs">
            <label className="font-label-md text-label-md text-primary-container uppercase tracking-wider text-[11px] opacity-80" htmlFor="item-price">
              Price (RM)
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-md font-headline-sm text-headline-sm text-primary-container font-semibold pointer-events-none">RM</span>
              <input
                id="item-price"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                className="w-full bg-surface-container-lowest border border-tertiary/20 rounded-lg pl-[3.5rem] pr-md py-sm font-headline-sm text-headline-sm text-primary-container focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent placeholder:text-outline/50 shadow-level-1 transition-all duration-200 tracking-tight"
              />
            </div>
          </div>

          {/* Delivery Method */}
          <div className="flex flex-col gap-sm pt-sm">
            <label className="font-label-md text-label-md text-primary-container uppercase tracking-wider text-[11px] opacity-80">
              Delivery Method
            </label>
            <div className="flex bg-surface-container-high rounded-lg p-1 relative">
              <div
                className="absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] bg-surface-container-lowest rounded shadow-level-1 transition-all duration-300 ease-out"
                style={{ transform: delivery === 'courier' ? 'translateX(100%)' : 'translateX(0)' }}
              />
              <button
                type="button"
                onClick={() => setDelivery('local')}
                className={`flex-1 py-sm rounded font-label-md text-label-md text-center transition-colors duration-200 z-10 relative ${
                  delivery === 'local' ? 'text-primary-container' : 'text-on-surface-variant'
                }`}
              >
                Face-to-Face Local Handoff
              </button>
              <button
                type="button"
                onClick={() => setDelivery('courier')}
                className={`flex-1 py-sm rounded font-label-md text-label-md text-center transition-colors duration-200 z-10 relative ${
                  delivery === 'courier' ? 'text-primary-container' : 'text-on-surface-variant'
                }`}
              >
                Courier Delivery
              </button>
            </div>
            <p className="font-body-sm text-body-sm text-tertiary/60 mt-xs min-h-[20px] transition-opacity">
              {DELIVERY_HINTS[delivery]}
            </p>
          </div>
          {/* Accept Trade Offers toggle */}
          <div className="flex flex-col gap-sm pt-sm">
            <div className="flex items-start justify-between gap-md">
              <div className="flex flex-col gap-xs flex-1">
                <span className="font-label-md text-label-md text-primary-container">Accept Trade Offers</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                  Let buyers propose an item exchange instead of paying full price.
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={acceptTrades}
                onClick={() => setAcceptTrades(v => !v)}
                className={`relative inline-flex items-center h-7 w-[52px] rounded-full shrink-0 mt-xs transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 ${
                  acceptTrades ? 'bg-secondary' : 'bg-surface-container-high border border-outline-variant'
                }`}
              >
                <span
                  className={`inline-block w-5 h-5 rounded-full shadow-sm transition-transform duration-300 ${
                    acceptTrades ? 'bg-surface translate-x-[28px]' : 'bg-outline translate-x-[4px]'
                  }`}
                />
              </button>
            </div>

            {acceptTrades && (
              <div className="flex items-start gap-sm bg-secondary/5 border border-secondary/20 rounded-xl px-md py-sm animate-fade-in-up">
                <span className="material-symbols-outlined text-secondary text-[18px] shrink-0 mt-0.5">swap_horiz</span>
                <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                  A{' '}
                  <span className="font-semibold text-primary-container">RM 2.00 platform fee</span>
                  {' '}applies when a trade is successfully completed and both parties confirm the handoff.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Sticky Publish Button */}
      <div className="fixed bottom-0 left-0 w-full bg-surface/95 backdrop-blur-md border-t border-surface-container-highest px-margin-mobile py-margin-mobile z-50">
        <div className="max-w-2xl mx-auto">
          <button className="w-full bg-primary-container text-on-primary font-headline-sm text-headline-sm py-sm rounded-lg hover:bg-primary transition-all active:scale-[0.98] duration-200 shadow-level-1 flex items-center justify-center gap-xs">
            Publish Listing
            <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
          </button>
        </div>
      </div>
    </div>
  );
}
