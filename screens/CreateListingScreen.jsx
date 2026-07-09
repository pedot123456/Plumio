import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = [
  { value: 'electronics', label: 'Electronics & Gadgets' },
  { value: 'fashion',     label: 'Fashion & Apparel' },
  { value: 'home',        label: 'Home & Furniture' },
  { value: 'collectibles',label: 'Collectibles & Art' },
];

const CONDITIONS = [
  { value: 'new',       label: 'New' },
  { value: 'like_new',  label: 'Like New' },
  { value: 'good',      label: 'Good' },
  { value: 'fair',      label: 'Fair' },
];

const DELIVERY_HINTS = {
  local:   'Buyer will meet you at a mutually agreed location.',
  courier: 'You will need to pack and ship the item to the buyer.',
};

const MY_STATES = [
  'Johor', 'Kedah', 'Kelantan', 'Melaka', 'Negeri Sembilan',
  'Pahang', 'Perak', 'Perlis', 'Pulau Pinang', 'Sabah', 'Sarawak',
  'Selangor', 'Terengganu',
  'W.P. Kuala Lumpur', 'W.P. Labuan', 'W.P. Putrajaya',
];

export default function CreateListingScreen() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const fileInputRef = useRef(null);

  // Form state
  const [title, setTitle]           = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice]           = useState('');
  const [category, setCategory]     = useState('');
  const [condition, setCondition]   = useState('');
  const [delivery, setDelivery]     = useState('local');
  const [state,    setState]        = useState('');
  const [acceptTrades, setAcceptTrades] = useState(false);

  // Image state
  const [imageFile, setImageFile]       = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // Location state
  const [latitude, setLatitude]           = useState(null);
  const [longitude, setLongitude]         = useState(null);
  const [locationLabel, setLocationLabel] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState('');

  // Submit state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError]               = useState(null);

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Your browser does not support location.');
      return;
    }
    setLocationLoading(true);
    setLocationError('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLatitude(lat);
        setLongitude(lng);
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
            { headers: { 'Accept-Language': 'en' } }
          );
          const json = await res.json();
          const parts = json.display_name?.split(',') ?? [];
          setLocationLabel(parts.slice(0, 3).join(',').trim() || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        } catch {
          setLocationLabel(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        }
        setLocationLoading(false);
      },
      () => {
        setLocationError('Location access denied. Please allow location in your browser settings.');
        setLocationLoading(false);
      }
    );
  };

  const handleClearLocation = () => {
    setLatitude(null);
    setLongitude(null);
    setLocationLabel('');
    setLocationError('');
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePublish = async () => {
    setError(null);

    if (!title.trim())              return setError('Item title is required.');
    if (!category)                  return setError('Please select a category.');
    if (!price || Number(price) <= 0) return setError('Please enter a valid price.');
    if (!session)                   return navigate('/login');

    setIsSubmitting(true);
    try {
      let image_url = null;

      // Upload image to Supabase Storage
      if (imageFile) {
        const ext  = imageFile.name.split('.').pop();
        const path = `${session.user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('listing-images')
          .upload(path, imageFile, { upsert: false });
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('listing-images')
          .getPublicUrl(path);
        image_url = publicUrl;
      }

      // Insert listing row
      const { error: insertError } = await supabase.from('listings').insert({
        user_id:        session.user.id,
        title:          title.trim(),
        description:    description.trim() || null,
        price:          Number(price),
        category,
        condition:      condition || null,
        image_url,
        latitude:       latitude ?? null,
        longitude:      longitude ?? null,
        location_label: locationLabel || null,
        state:          state || null,
        accepts_trade:  acceptTrades,
      });
      if (insertError) throw insertError;

      navigate('/my-listings');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

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

        {/* Error Banner */}
        {error && (
          <div className="mx-margin-mobile mb-md flex items-center gap-sm text-error font-body-sm text-body-sm bg-error/10 rounded-lg px-md py-sm">
            <span className="material-symbols-outlined text-[18px] shrink-0">error_outline</span>
            {error}
          </div>
        )}

        {/* Photo Upload */}
        <section className="px-margin-mobile mb-lg">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageSelect}
          />

          {imagePreview ? (
            <div className="relative w-full aspect-square md:aspect-[2/1] rounded-xl overflow-hidden group">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full h-full object-cover"
              />
              {/* Overlay controls */}
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-md">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-surface text-primary-container px-md py-sm rounded-lg font-label-md text-label-md flex items-center gap-xs shadow"
                >
                  <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                  Change
                </button>
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="bg-error text-on-error px-md py-sm rounded-lg font-label-md text-label-md flex items-center gap-xs shadow"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full aspect-square md:aspect-[2/1] rounded-xl border-2 border-dashed border-tertiary/20 bg-surface-container-lowest flex flex-col items-center justify-center hover:bg-surface-container-low transition-colors duration-200 group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="flex flex-col items-center justify-center space-y-sm z-10 p-md text-center">
                <span className="material-symbols-outlined text-display-lg text-secondary group-hover:scale-110 transition-transform duration-300">
                  photo_camera
                </span>
                <p className="font-label-md text-label-md text-secondary">Tap to upload a photo</p>
                <p className="font-body-sm text-body-sm text-tertiary/60 mt-xs">
                  JPG, PNG or WEBP. First photo is the cover.
                </p>
              </div>
            </button>
          )}
        </section>

        {/* Form */}
        <section className="px-margin-mobile space-y-lg flex-1">

          {/* Title */}
          <div className="flex flex-col gap-xs">
            <label className="font-label-md text-label-md text-primary-container uppercase tracking-wider text-[11px] opacity-80" htmlFor="item-title">
              Item Title *
            </label>
            <input
              id="item-title"
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Vintage Leather Camera Bag"
              className="w-full bg-surface-container-lowest border border-tertiary/20 rounded-lg px-md py-sm font-body-md text-body-md text-primary-container focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent placeholder:text-outline shadow-level-1 transition-all duration-200"
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-xs">
            <label className="font-label-md text-label-md text-primary-container uppercase tracking-wider text-[11px] opacity-80" htmlFor="item-desc">
              Description
            </label>
            <textarea
              id="item-desc"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="Describe the item — brand, specs, why you're selling it…"
              className="w-full bg-surface-container-lowest border border-tertiary/20 rounded-lg px-md py-sm font-body-md text-body-md text-primary-container focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent placeholder:text-outline shadow-level-1 transition-all duration-200 resize-none"
            />
          </div>

          {/* Category */}
          <div className="flex flex-col gap-xs">
            <label className="font-label-md text-label-md text-primary-container uppercase tracking-wider text-[11px] opacity-80" htmlFor="item-category">
              Category *
            </label>
            <div className="relative">
              <select
                id="item-category"
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full appearance-none bg-surface-container-lowest border border-tertiary/20 rounded-lg pl-md pr-xl py-sm font-body-md text-body-md text-primary-container focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent shadow-level-1 transition-all duration-200 cursor-pointer"
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

          {/* State / Location */}
          <div className="flex flex-col gap-xs">
            <label className="font-label-md text-label-md text-primary-container uppercase tracking-wider text-[11px] opacity-80" htmlFor="item-state">
              State
            </label>
            <div className="relative">
              <select
                id="item-state"
                value={state}
                onChange={e => setState(e.target.value)}
                className="w-full appearance-none bg-surface-container-lowest border border-tertiary/20 rounded-lg pl-md pr-xl py-sm font-body-md text-body-md text-primary-container focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent shadow-level-1 transition-all duration-200 cursor-pointer"
              >
                <option value="">Select your state</option>
                {MY_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <span className="material-symbols-outlined absolute right-md top-1/2 -translate-y-1/2 text-primary-container/50 pointer-events-none">
                expand_more
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant/60">
              Buyers nationwide can filter listings by state.
            </p>
          </div>

          {/* Condition */}
          <div className="flex flex-col gap-xs">
            <label className="font-label-md text-label-md text-primary-container uppercase tracking-wider text-[11px] opacity-80" htmlFor="item-condition">
              Condition
            </label>
            <div className="grid grid-cols-4 gap-sm">
              {CONDITIONS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCondition(c.value)}
                  className={`py-sm rounded-lg font-label-sm text-label-sm border transition-all duration-150 ${
                    condition === c.value
                      ? 'bg-secondary text-on-secondary border-secondary'
                      : 'bg-surface-container-lowest border-tertiary/20 text-on-surface-variant hover:border-secondary/50'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Price */}
          <div className="flex flex-col gap-xs">
            <label className="font-label-md text-label-md text-primary-container uppercase tracking-wider text-[11px] opacity-80" htmlFor="item-price">
              Price (RM) *
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-md font-headline-sm text-headline-sm text-primary-container font-semibold pointer-events-none">RM</span>
              <input
                id="item-price"
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={e => setPrice(e.target.value)}
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

          {/* Pickup Location */}
          <div className="flex flex-col gap-sm pt-sm">
            <label className="font-label-md text-label-md text-primary-container uppercase tracking-wider text-[11px] opacity-80">
              Pickup Location
            </label>

            {latitude ? (
              <div className="flex items-start gap-sm bg-secondary/5 border border-secondary/20 rounded-xl px-md py-sm">
                <span className="material-symbols-outlined text-secondary text-[20px] shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>location_on</span>
                <div className="flex-1 min-w-0">
                  <p className="font-label-md text-label-md text-primary-container truncate">{locationLabel}</p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                    {latitude.toFixed(5)}, {longitude.toFixed(5)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleClearLocation}
                  className="text-error hover:bg-error/10 p-1 rounded-full transition-colors shrink-0"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleGetLocation}
                disabled={locationLoading}
                className="flex items-center justify-center gap-sm border-2 border-dashed border-tertiary/20 rounded-xl py-md text-secondary hover:bg-secondary/5 transition-colors disabled:opacity-60"
              >
                {locationLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-secondary/30 border-t-secondary rounded-full animate-spin" />
                    Getting location…
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[20px]">my_location</span>
                    <span className="font-label-md text-label-md">Use My Current Location</span>
                  </>
                )}
              </button>
            )}

            {locationError && (
              <p className="font-body-sm text-body-sm text-error flex items-center gap-xs">
                <span className="material-symbols-outlined text-[16px]">error_outline</span>
                {locationError}
              </p>
            )}
            <p className="font-body-sm text-body-sm text-on-surface-variant/60">
              Buyers will see approximately how far this item is from them.
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
              <div className="flex items-start gap-sm bg-secondary/5 border border-secondary/20 rounded-xl px-md py-sm">
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
          <button
            onClick={handlePublish}
            disabled={isSubmitting}
            className="w-full bg-primary-container text-on-primary font-headline-sm text-headline-sm py-sm rounded-lg hover:bg-primary transition-all active:scale-[0.98] duration-200 shadow-level-1 flex items-center justify-center gap-xs disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
                Publishing…
              </>
            ) : (
              <>
                Publish Listing
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
