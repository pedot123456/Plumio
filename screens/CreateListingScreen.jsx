import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { MY_STATES, reverseGeocode } from '../utils/malaysiaLocation';

const isVideoUrl = (url = '') => /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url || '');

const CATEGORIES = [
  { value: 'electronics', label: 'Electronics & Gadgets' },
  { value: 'fashion',     label: 'Fashion & Apparel' },
  { value: 'food',        label: 'Food & Beverages' },
  { value: 'kraftangan',  label: 'Kraftangan & Handicraft' },
  { value: 'beauty',      label: 'Beauty & Personal Care' },
  { value: 'agriculture', label: 'Agriculture & Fresh Produce' },
  { value: 'home',        label: 'Home & Furniture' },
  { value: 'collectibles',label: 'Collectibles & Art' },
];

const CONDITIONS = [
  { value: 'new',       label: 'New' },
  { value: 'like_new',  label: 'Like New' },
  { value: 'good',      label: 'Good' },
  { value: 'fair',      label: 'Fair' },
];

export default function CreateListingScreen() {
  const navigate = useNavigate();
  const { id: editId } = useParams();
  const isEditMode = Boolean(editId);
  const { session } = useAuth();
  const fileInputRef = useRef(null);

  // Form state
  const [title, setTitle]           = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice]           = useState('');
  const [category, setCategory]     = useState('');
  const [condition, setCondition]   = useState('');
  const [allowsHandoff,  setAllowsHandoff]  = useState(true);
  const [allowsDelivery, setAllowsDelivery] = useState(true);
  const [state,    setState]        = useState('');
  const [acceptTrades, setAcceptTrades] = useState(false);

  // Media state — each item is either
  //   { kind: 'existing', url: string }                      — already-uploaded, edit mode only
  //   { kind: 'new', file: File, preview: string (object URL) } — newly picked file, not yet uploaded
  const [mediaItems, setMediaItems] = useState([]);
  const [mediaError, setMediaError] = useState('');

  // Location state — GPS pin (optional, precise) plus editable structured
  // fields. Auto-Detect just pre-fills city/district/postcode/state; the
  // seller can still type or change any of them afterward.
  const [latitude, setLatitude]           = useState(null);
  const [longitude, setLongitude]         = useState(null);
  const [city,     setCity]     = useState('');
  const [district, setDistrict] = useState('');
  const [postcode, setPostcode] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState('');

  // Submit state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError]               = useState(null);

  // Edit mode — load the existing listing and pre-fill the form
  const [loadingExisting, setLoadingExisting] = useState(isEditMode);

  useEffect(() => {
    if (!isEditMode) return;
    // App.js's splash screen already blocks rendering until auth resolves, so by the
    // time this runs `session` is either a real session or genuinely logged-out.
    if (!session) { navigate('/login'); return; }

    (async () => {
      setLoadingExisting(true);
      const { data, error: fetchError } = await supabase
        .from('listings')
        .select('*')
        .eq('id', editId)
        .single();

      if (fetchError || !data) {
        setError(fetchError?.message || 'Listing not found.');
        setLoadingExisting(false);
        return;
      }
      if (data.user_id !== session.user.id && data.seller_id !== session.user.id) {
        setError('You can only edit your own listings.');
        setLoadingExisting(false);
        return;
      }

      setTitle(data.title ?? '');
      setDescription(data.description ?? '');
      setPrice(data.price != null ? String(data.price) : '');
      setCategory(data.category ?? '');
      setCondition(data.condition ?? '');
      setAllowsHandoff(data.allows_handoff ?? true);
      setAllowsDelivery(data.allows_delivery ?? true);
      setState(data.state ?? '');
      setAcceptTrades(Boolean(data.accepts_trade));
      setLatitude(data.latitude ?? null);
      setLongitude(data.longitude ?? null);
      setCity(data.pickup_city ?? '');
      setDistrict(data.pickup_district ?? '');
      setPostcode(data.pickup_postcode ?? '');

      const existingUrls = Array.isArray(data.media_urls) && data.media_urls.length > 0
        ? data.media_urls
        : data.image_url ? [data.image_url] : [];
      setMediaItems(existingUrls.map(url => ({ kind: 'existing', url })));

      setLoadingExisting(false);
    })();
  }, [isEditMode, editId, session]);

  const handleMediaSelect = (e) => {
    const incoming = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (!incoming.length) return;

    setMediaItems(prev => {
      const combined = [...prev, ...incoming.map(f => ({ kind: 'new', file: f, preview: URL.createObjectURL(f) }))];
      if (combined.length > 5) {
        setMediaError('You can only upload a maximum of 5 files.');
        // revoke the ones we can't keep
        combined.slice(5).forEach(item => item.kind === 'new' && URL.revokeObjectURL(item.preview));
        return combined.slice(0, 5);
      }
      setMediaError('');
      return combined;
    });
  };

  const handleRemoveMedia = (index) => {
    setMediaItems(prev => {
      const item = prev[index];
      if (item.kind === 'new') URL.revokeObjectURL(item.preview);
      return prev.filter((_, i) => i !== index);
    });
    setMediaError('');
  };

  // Auto-Detect just pre-fills City/District/Postcode (and State, above) from
  // the device's GPS — it never overrides anything the seller already typed,
  // and every field stays freely editable afterward either way.
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
          const result = await reverseGeocode(lat, lng);
          if (result.state)    setState(result.state);
          if (result.city)     setCity(result.city);
          if (result.district) setDistrict(result.district);
          if (result.postcode) setPostcode(result.postcode);
          if (!result.state && !result.city) {
            setLocationError('Could not match your location to a state/city — please fill them in manually.');
          }
        } catch {
          setLocationError('Could not detect your address. Please fill in the fields manually.');
        }
        setLocationLoading(false);
      },
      () => {
        setLocationError('Location access denied. Please allow location in your browser settings.');
        setLocationLoading(false);
      }
    );
  };

  // Clears just the captured GPS pin — the typed City/District/Postcode/State
  // text is left alone, since those are now normal editable fields the seller owns.
  const handleClearGpsPin = () => {
    setLatitude(null);
    setLongitude(null);
  };

  const handlePublish = async () => {
    setError(null);

    if (!title.trim())                return setError('Item title is required.');
    if (!category)                    return setError('Please select a category.');
    if (!price || Number(price) <= 0) return setError('Please enter a valid price.');
    if (mediaItems.length < 3) {
      return setError('Please upload at least 3 photos/videos to help buyers see your item clearly.');
    }
    if (mediaItems.length > 5) {
      return setError('You can only upload a maximum of 5 files.');
    }
    if (!allowsHandoff && !allowsDelivery) {
      return setError('Please enable at least one fulfillment method — Handoff, Delivery, or both.');
    }
    if (!session) return navigate('/login');

    setIsSubmitting(true);
    try {
      // Upload only newly-picked files; existing (already-uploaded) items keep their URL as-is.
      // Final order follows mediaItems' current order, so a reordered/removed cover still works.
      const media_urls = [];
      for (let i = 0; i < mediaItems.length; i++) {
        const item = mediaItems[i];
        if (item.kind === 'existing') {
          media_urls.push(item.url);
          continue;
        }
        const ext  = item.file.name.split('.').pop() || 'bin';
        const path = `${session.user.id}/${Date.now()}_${i}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('listing-images')
          .upload(path, item.file, { upsert: false });
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage
          .from('listing-images')
          .getPublicUrl(path);
        media_urls.push(publicUrl);
      }

      const image_url = media_urls[0] ?? null; // first file = cover

      // location_label is a derived display string kept for screens that just
      // show plain text (e.g. Proximity Search) — the structured fields below
      // are the source of truth and what re-populates the form on edit.
      const location_label = [city.trim(), district.trim(), state].filter(Boolean).join(', ') || null;

      const listingPayload = {
        title:          title.trim(),
        description:    description.trim() || null,
        price:          Number(price),
        category,
        condition:      condition || null,
        allows_handoff:  allowsHandoff,
        allows_delivery: allowsDelivery,
        image_url,
        media_urls,
        latitude:         latitude ?? null,
        longitude:        longitude ?? null,
        location_label,
        pickup_city:      city.trim() || null,
        pickup_district:  district.trim() || null,
        pickup_postcode:  postcode.trim() || null,
        state:          state || null,
        accepts_trade:  acceptTrades,
      };

      if (isEditMode) {
        const { error: updateError } = await supabase
          .from('listings')
          .update(listingPayload)
          .eq('id', editId);
        if (updateError) throw updateError;
        navigate(`/product/${editId}`);
      } else {
        const { error: insertError } = await supabase
          .from('listings')
          .insert({ user_id: session.user.id, ...listingPayload });
        if (insertError) throw insertError;
        navigate('/my-listings');
      }
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
        <h1 className="font-headline-sm text-headline-sm text-primary font-bold tracking-tight">
          {isEditMode ? 'Edit Listing' : 'List an Item'}
        </h1>
        <button
          className="text-primary hover:bg-surface-container-high transition-colors active:scale-95 p-2 rounded-full flex items-center justify-center"
          onClick={() => navigate('/')}
          title="Go to Home"
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>storefront</span>
        </button>
      </header>

      <main className="pt-[80px] pb-[100px] max-w-2xl mx-auto w-full flex flex-col">

        {/* Error Banner */}
        {error && (
          <div className="mx-margin-mobile mb-md flex items-center gap-sm text-error font-body-sm text-body-sm bg-error/10 rounded-lg px-md py-sm">
            <span className="material-symbols-outlined text-[18px] shrink-0">error_outline</span>
            {error}
          </div>
        )}

        {loadingExisting ? (
          <div className="px-margin-mobile flex flex-col items-center justify-center py-xxl gap-sm text-on-surface-variant">
            <span className="w-8 h-8 border-2 border-outline/30 border-t-secondary rounded-full animate-spin" />
            <p className="font-body-sm text-body-sm">Loading your listing…</p>
          </div>
        ) : (
        <>
        {/* Photo / Video Upload */}
        <section className="px-margin-mobile mb-lg">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/mp4,video/quicktime,video/webm"
            multiple
            className="hidden"
            onChange={handleMediaSelect}
          />

          {/* Empty state */}
          {mediaItems.length === 0 && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full aspect-[2/1] rounded-xl border-2 border-dashed border-tertiary/20 bg-surface-container-lowest flex flex-col items-center justify-center hover:bg-surface-container-low transition-colors duration-200 group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="flex flex-col items-center justify-center space-y-sm z-10 p-md text-center">
                <span className="material-symbols-outlined text-display-lg text-secondary group-hover:scale-110 transition-transform duration-300">
                  add_photo_alternate
                </span>
                <p className="font-label-md text-label-md text-secondary">Tap to upload photos or videos</p>
                <p className="font-body-sm text-body-sm text-tertiary/60 mt-xs">
                  Minimum 3, maximum 5 files · First file is the cover
                </p>
              </div>
            </button>
          )}

          {/* Thumbnail grid */}
          {mediaItems.length > 0 && (
            <div className="grid grid-cols-3 gap-4">
              {mediaItems.map((item, i) => {
                const src = item.kind === 'new' ? item.preview : item.url;
                const isVideo = item.kind === 'new' ? item.file.type.startsWith('video/') : isVideoUrl(item.url);
                return (
                <div key={i} className="relative h-32 rounded-md overflow-hidden bg-gray-100">
                  {isVideo ? (
                    <>
                      <video
                        src={src}
                        muted
                        playsInline
                        preload="metadata"
                        className="w-full h-full object-cover"
                      />
                      {/* Centered play overlay so the user knows it's a video */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/25 pointer-events-none">
                        <span
                          className="material-symbols-outlined text-white text-[34px] drop-shadow"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          play_circle
                        </span>
                      </div>
                    </>
                  ) : (
                    <img
                      src={src}
                      alt={`Media ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                  )}

                  {/* Cover badge — purple, first item only */}
                  {i === 0 && (
                    <span className="absolute bottom-1 left-1 bg-purple-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded-sm leading-none">
                      Cover
                    </span>
                  )}

                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveMedia(i)}
                    className="absolute top-1 right-1 w-6 h-6 bg-red-500 hover:bg-red-600 active:bg-red-700 rounded-full flex items-center justify-center text-white transition-colors shadow"
                    aria-label="Remove"
                  >
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                </div>
                );
              })}

              {/* Add more slot — matches grid cell height */}
              {mediaItems.length < 5 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-32 rounded-md border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center gap-1 hover:bg-gray-100 active:bg-gray-200 transition-colors"
                >
                  <span className="material-symbols-outlined text-purple-600 text-[28px]">add</span>
                  <span className="text-[11px] text-gray-500 font-medium">Add more</span>
                </button>
              )}
            </div>
          )}

          {/* File count hint */}
          <div className="mt-2 flex items-center justify-between min-h-[18px]">
            <p className={`text-xs font-medium transition-colors ${
              mediaItems.length === 0
                ? 'text-on-surface-variant/50'
                : mediaItems.length < 3
                  ? 'text-amber-600'
                  : 'text-green-600'
            }`}>
              {mediaItems.length === 0
                ? 'Upload 3–5 photos or videos'
                : mediaItems.length < 3
                  ? `${mediaItems.length} / 5 · Add ${3 - mediaItems.length} more to continue`
                  : `${mediaItems.length} / 5 files selected`}
            </p>
            {mediaItems.length >= 3 && (
              <span
                className="material-symbols-outlined text-green-600 text-[16px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                check_circle
              </span>
            )}
          </div>

          {/* Inline error (max exceeded) */}
          {mediaError && (
            <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">error_outline</span>
              {mediaError}
            </p>
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

          {/* Fulfillment Methods — seller can offer either or both; buyer picks at checkout */}
          <div className="flex flex-col gap-md pt-sm">
            <label className="font-label-md text-label-md text-primary-container uppercase tracking-wider text-[11px] opacity-80">
              Fulfillment Methods *
            </label>

            {/* Handoff toggle */}
            <div className="flex items-start justify-between gap-md">
              <div className="flex flex-col gap-xs flex-1">
                <span className="font-label-md text-label-md text-primary-container">Face-to-Face Handoff</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                  Buyer will meet you at a mutually agreed location.
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={allowsHandoff}
                onClick={() => setAllowsHandoff(v => !v)}
                className={`relative inline-flex items-center h-7 w-[52px] rounded-full shrink-0 mt-xs transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 ${
                  allowsHandoff ? 'bg-secondary' : 'bg-surface-container-high border border-outline-variant'
                }`}
              >
                <span
                  className={`inline-block w-5 h-5 rounded-full shadow-sm transition-transform duration-300 ${
                    allowsHandoff ? 'bg-surface translate-x-[28px]' : 'bg-outline translate-x-[4px]'
                  }`}
                />
              </button>
            </div>

            {/* Delivery toggle */}
            <div className="flex items-start justify-between gap-md">
              <div className="flex flex-col gap-xs flex-1">
                <span className="font-label-md text-label-md text-primary-container">Courier Delivery</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                  You will need to pack and ship the item to the buyer.
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={allowsDelivery}
                onClick={() => setAllowsDelivery(v => !v)}
                className={`relative inline-flex items-center h-7 w-[52px] rounded-full shrink-0 mt-xs transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 ${
                  allowsDelivery ? 'bg-secondary' : 'bg-surface-container-high border border-outline-variant'
                }`}
              >
                <span
                  className={`inline-block w-5 h-5 rounded-full shadow-sm transition-transform duration-300 ${
                    allowsDelivery ? 'bg-surface translate-x-[28px]' : 'bg-outline translate-x-[4px]'
                  }`}
                />
              </button>
            </div>

            {!allowsHandoff && !allowsDelivery && (
              <p className="font-body-sm text-body-sm text-error flex items-center gap-xs">
                <span className="material-symbols-outlined text-[16px]">error_outline</span>
                Enable at least one method so buyers can check out.
              </p>
            )}
          </div>

          {/* Pickup Location */}
          <div className="flex flex-col gap-sm pt-sm">
            <label className="font-label-md text-label-md text-primary-container uppercase tracking-wider text-[11px] opacity-80">
              Pickup Location
            </label>

            <div className="flex items-center gap-sm">
              <button
                type="button"
                onClick={handleGetLocation}
                disabled={locationLoading}
                className="flex-1 flex items-center justify-center gap-sm border-2 border-dashed border-tertiary/20 rounded-xl py-sm text-secondary hover:bg-secondary/5 transition-colors disabled:opacity-60"
              >
                {locationLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-secondary/30 border-t-secondary rounded-full animate-spin" />
                    Detecting…
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[20px]">my_location</span>
                    <span className="font-label-md text-label-md">Auto-Detect My Location</span>
                  </>
                )}
              </button>
              {latitude != null && (
                <button
                  type="button"
                  onClick={handleClearGpsPin}
                  title="Clear GPS pin — keeps your typed fields"
                  className="text-error hover:bg-error/10 p-2 rounded-full transition-colors shrink-0"
                >
                  <span className="material-symbols-outlined text-[20px]">location_off</span>
                </button>
              )}
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant/60 -mt-xs">
              Auto-Detect fills City / District / Postcode / State below — you can still edit any of them, the final details are always up to you.
            </p>

            {locationError && (
              <p className="font-body-sm text-body-sm text-error flex items-center gap-xs">
                <span className="material-symbols-outlined text-[16px]">error_outline</span>
                {locationError}
              </p>
            )}

            <div className="grid grid-cols-2 gap-sm">
              <div className="flex flex-col gap-xs">
                <label className="font-label-md text-label-md text-primary-container uppercase tracking-wider text-[11px] opacity-80" htmlFor="pickup-city">
                  City
                </label>
                <input
                  id="pickup-city"
                  type="text"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  placeholder="e.g. Putrajaya"
                  className="w-full bg-surface-container-lowest border border-tertiary/20 rounded-lg px-md py-sm font-body-md text-body-md text-primary-container focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent placeholder:text-outline shadow-level-1 transition-all duration-200"
                />
              </div>
              <div className="flex flex-col gap-xs">
                <label className="font-label-md text-label-md text-primary-container uppercase tracking-wider text-[11px] opacity-80" htmlFor="pickup-district">
                  District (Optional)
                </label>
                <input
                  id="pickup-district"
                  type="text"
                  value={district}
                  onChange={e => setDistrict(e.target.value)}
                  placeholder="e.g. Presint 8"
                  className="w-full bg-surface-container-lowest border border-tertiary/20 rounded-lg px-md py-sm font-body-md text-body-md text-primary-container focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent placeholder:text-outline shadow-level-1 transition-all duration-200"
                />
              </div>
            </div>

            <div className="flex flex-col gap-xs">
              <label className="font-label-md text-label-md text-primary-container uppercase tracking-wider text-[11px] opacity-80" htmlFor="pickup-postcode">
                Postcode (Optional)
              </label>
              <input
                id="pickup-postcode"
                type="text"
                value={postcode}
                onChange={e => setPostcode(e.target.value.replace(/\D/g, ''))}
                placeholder="e.g. 62502"
                maxLength={5}
                className="w-full bg-surface-container-lowest border border-tertiary/20 rounded-lg px-md py-sm font-body-md text-body-md text-primary-container focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent placeholder:text-outline shadow-level-1 transition-all duration-200"
              />
            </div>

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
        </>
        )}
      </main>

      {/* Sticky Publish Button */}
      {!loadingExisting && (
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
                {isEditMode ? 'Saving…' : 'Publishing…'}
              </>
            ) : (
              <>
                {isEditMode ? 'Save Changes' : 'Publish Listing'}
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </>
            )}
          </button>
        </div>
      </div>
      )}
    </div>
  );
}
