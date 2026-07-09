import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabase';
import ProductCard from '../components/ProductCard';

const DISTANCE_FILTERS = ['< 1km', '< 5km', '< 10km'];
const CATEGORY_FILTERS = ['Electronics', 'Fashion', 'Textbooks', 'Dorm & Living'];
const ALL_FILTERS      = [...DISTANCE_FILTERS, ...CATEGORY_FILTERS];

const CATEGORY_MAP = {
  Electronics:    'electronics',
  Fashion:        'fashion',
  Textbooks:      'textbooks',
  'Dorm & Living':'dorm',
};

const RADIUS_MAP = { '< 1km': 1, '< 5km': 5, '< 10km': 10 };

const MY_STATES = [
  'Johor', 'Kedah', 'Kelantan', 'Melaka', 'Negeri Sembilan',
  'Pahang', 'Perak', 'Perlis', 'Pulau Pinang', 'Sabah', 'Sarawak',
  'Selangor', 'Terengganu',
  'W.P. Kuala Lumpur', 'W.P. Labuan', 'W.P. Putrajaya',
];

function ProductSkeleton() {
  return (
    <div className="animate-pulse bg-surface-container-low rounded-[16px] overflow-hidden">
      <div className="aspect-square bg-surface-container-high" />
      <div className="p-sm space-y-xs">
        <div className="h-3 bg-surface-container-highest rounded w-3/4" />
        <div className="h-3 bg-surface-container-highest rounded w-1/2" />
        <div className="h-4 bg-surface-container-highest rounded w-1/3 mt-xs" />
      </div>
    </div>
  );
}

export default function ProximitySearchScreen() {
  const navigate = useNavigate();
  const location = useLocation();

  const urlParams    = new URLSearchParams(location.search);
  const initialQuery = urlParams.get('q') ?? '';

  const [searchText,   setSearchText]   = useState(initialQuery);
  const [activeFilter, setActiveFilter] = useState('< 5km');
  const [results,      setResults]      = useState([]);
  const [isLoading,    setIsLoading]    = useState(false);
  const [error,        setError]        = useState(null);

  // Location state
  const [nearMeActive,    setNearMeActive]    = useState(false);
  const [userCoords,      setUserCoords]      = useState(null); // { lat, lng }
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError,   setLocationError]   = useState('');
  const [stateFilter,     setStateFilter]     = useState('');

  useEffect(() => {
    fetchResults(searchText, nearMeActive, userCoords);
  }, [activeFilter]);

  async function fetchResults(
    query    = searchText,
    useProx  = nearMeActive,
    coords   = userCoords
  ) {
    setIsLoading(true);
    setError(null);
    try {
      let data, err;

      if (useProx && coords) {
        // ── Proximity mode: call Haversine RPC ──
        const radius = RADIUS_MAP[activeFilter] ?? 5;
        ({ data, error: err } = await supabase.rpc('nearby_listings', {
          user_lat:  coords.lat,
          user_lng:  coords.lng,
          radius_km: radius,
        }));

        // Client-side text filter
        if (data && query.trim()) {
          const q = query.trim().toLowerCase();
          data = data.filter(item => item.title?.toLowerCase().includes(q));
        }
        // Client-side category filter
        if (data && CATEGORY_FILTERS.includes(activeFilter)) {
          data = data.filter(item => item.category === CATEGORY_MAP[activeFilter]);
        }
      } else {
        // ── Regular mode: plain query ──
        let q = supabase
          .from('listings')
          .select('id, title, price, image_url, category, location_label')
          .order('created_at', { ascending: false })
          .limit(30);

        if (query.trim())
          q = q.ilike('title', `%${query.trim()}%`);

        if (CATEGORY_FILTERS.includes(activeFilter))
          q = q.eq('category', CATEGORY_MAP[activeFilter]);

        if (stateFilter)
          q = q.eq('state', stateFilter);

        ({ data, error: err } = await q);
      }

      if (err) throw err;
      setResults(data ?? []);
    } catch (e) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }

  function handleNearMe() {
    if (nearMeActive) {
      // Toggle off
      setNearMeActive(false);
      setUserCoords(null);
      setLocationError('');
      fetchResults(searchText, false, null);
      return;
    }
    // Turning on Near Me clears the state filter (different location modes)
    setStateFilter('');

    if (!navigator.geolocation) {
      setLocationError('Your browser does not support location.');
      return;
    }

    setLocationLoading(true);
    setLocationError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserCoords(coords);
        setNearMeActive(true);
        setLocationLoading(false);
        fetchResults(searchText, true, coords);
      },
      () => {
        setLocationLoading(false);
        setLocationError('Location access denied. Please allow location in your browser and try again.');
      },
      { timeout: 10000 }
    );
  }

  function handleFilterClick(f) {
    setActiveFilter(f);
    // If user picks a distance filter but Near Me is off, prompt them
    if (DISTANCE_FILTERS.includes(f) && !nearMeActive) {
      handleNearMe();
    }
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    fetchResults(searchText);
  }

  function formatDistance(km) {
    if (km < 1) return `${Math.round(km * 1000)}m away`;
    return `${Number(km).toFixed(1)}km away`;
  }

  return (
    <div className="bg-background text-on-background min-h-screen font-body-md pb-6">

      {/* Top Nav */}
      <div className="sticky top-0 z-50 bg-surface shadow-sm">
        <form className="flex items-center gap-sm px-margin-mobile h-16" onSubmit={handleSearchSubmit}>
          <button
            type="button"
            className="p-2 -ml-2 text-primary hover:bg-surface-container-high rounded-full transition-colors flex items-center justify-center shrink-0"
            onClick={() => navigate(-1)}
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>

          <div className="flex-1 relative">
            <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-primary z-10 text-[20px]">search</span>
            <input
              className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-full py-sm pl-[38px] pr-sm font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-secondary shadow-level-1"
              placeholder="Search listings…"
              type="text"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
            />
          </div>

          {/* Near Me button */}
          <button
            type="button"
            onClick={handleNearMe}
            disabled={locationLoading}
            className={`flex items-center gap-1 px-sm py-xs rounded-full font-label-md text-label-md transition-all shrink-0 ${
              nearMeActive
                ? 'bg-secondary text-on-secondary shadow-sm'
                : 'border border-outline-variant/40 text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            {locationLoading ? (
              <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
            ) : (
              <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: nearMeActive ? "'FILL' 1" : "'FILL' 0" }}>
                near_me
              </span>
            )}
            {nearMeActive ? 'Near Me' : 'Near Me'}
          </button>
        </form>

        {/* Filter Strip */}
        <div className="flex gap-sm px-margin-mobile pb-sm overflow-x-auto no-scrollbar">
          {ALL_FILTERS.map(f => (
            <button
              key={f}
              onClick={() => handleFilterClick(f)}
              className={`whitespace-nowrap px-md py-xs rounded-full font-label-md text-label-md transition-all shrink-0 flex items-center gap-1 ${
                activeFilter === f
                  ? 'bg-secondary-container text-on-secondary-container shadow-sm'
                  : 'bg-surface-container-lowest border border-outline-variant/40 text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              {DISTANCE_FILTERS.includes(f) && (
                <span className="material-symbols-outlined text-[14px]">location_on</span>
              )}
              {f}
            </button>
          ))}
        </div>

        {/* State Filter Row */}
        <div className="flex items-center gap-sm px-margin-mobile pb-sm">
          <span className="material-symbols-outlined text-on-surface-variant text-[18px] shrink-0">map</span>
          <div className="relative flex-1">
            <select
              value={stateFilter}
              onChange={e => {
                setStateFilter(e.target.value);
                // selecting a state turns off GPS proximity mode
                if (e.target.value) {
                  setNearMeActive(false);
                  setUserCoords(null);
                }
                fetchResults(searchText, false, null);
              }}
              className="w-full appearance-none bg-surface-container-lowest border border-outline-variant/40 rounded-full py-xs pl-md pr-8 font-label-md text-label-md text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/30 transition-all"
            >
              <option value="">All States</option>
              {MY_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[16px] pointer-events-none">expand_more</span>
          </div>
          {stateFilter && (
            <button
              onClick={() => { setStateFilter(''); fetchResults(searchText); }}
              className="shrink-0 font-label-sm text-label-sm text-secondary underline"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <main className="max-w-container-max mx-auto px-margin-mobile pt-md">

        {/* Location error */}
        {locationError && (
          <div className="flex items-start gap-sm text-error font-body-sm text-body-sm bg-error/10 rounded-lg px-md py-sm mb-md">
            <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">location_off</span>
            <span>{locationError}</span>
          </div>
        )}

        {/* State filter active banner */}
        {stateFilter && (
          <div className="flex items-center gap-sm bg-secondary/10 border border-secondary/20 rounded-lg px-md py-sm mb-md">
            <span className="material-symbols-outlined text-secondary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>map</span>
            <span className="font-label-md text-label-md text-secondary">
              Showing listings in {stateFilter}
            </span>
          </div>
        )}

        {/* Near Me active banner */}
        {nearMeActive && !locationError && (
          <div className="flex items-center gap-sm bg-secondary/10 border border-secondary/20 rounded-lg px-md py-sm mb-md">
            <span className="material-symbols-outlined text-secondary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>near_me</span>
            <span className="font-label-md text-label-md text-secondary">
              Showing listings within {RADIUS_MAP[activeFilter] ?? 5}km of your location
            </span>
            <button
              onClick={handleNearMe}
              className="ml-auto font-label-sm text-secondary underline shrink-0"
            >
              Turn off
            </button>
          </div>
        )}

        {/* Result count */}
        {!isLoading && (
          <div className="flex justify-between items-center mb-md">
            <span className="font-label-md text-label-md text-on-surface-variant">
              {results.length} result{results.length !== 1 ? 's' : ''}{nearMeActive ? ' nearby' : ''}
            </span>
          </div>
        )}

        {/* Guarantee Banner */}
        <div className="bg-secondary-container text-on-secondary-container rounded-lg px-md py-sm mb-md flex items-center gap-sm">
          <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
          <span className="font-label-md text-label-md">All sellers are Verified Peers</span>
        </div>

        {error && (
          <div className="flex items-center gap-sm text-error font-body-sm text-body-sm bg-error/10 rounded-lg px-md py-sm mb-md">
            <span className="material-symbols-outlined text-[18px]">error_outline</span>
            {error}
            <button onClick={() => fetchResults()} className="ml-auto font-label-sm underline">Retry</button>
          </div>
        )}

        {/* Results Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-md">
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => <ProductSkeleton key={i} />)
            : results.length === 0
              ? (
                <div className="col-span-2 md:col-span-4 flex flex-col items-center justify-center py-xxl gap-md text-on-surface-variant">
                  <span className="material-symbols-outlined text-[56px]">
                    {nearMeActive ? 'location_searching' : 'search_off'}
                  </span>
                  <p className="font-headline-sm text-headline-sm">
                    {nearMeActive ? 'No listings nearby' : 'No results found'}
                  </p>
                  <p className="font-body-sm text-center max-w-xs">
                    {nearMeActive
                      ? 'Try increasing the distance filter or check back later.'
                      : 'Try a different search term or filter.'}
                  </p>
                </div>
              )
              : results.map(item => (
                <div key={item.id} className="flex flex-col">
                  <ProductCard
                    id={item.id}
                    title={item.title}
                    price={Number(item.price).toFixed(2)}
                    image={item.image_url}
                  />
                  {item.distance_km != null && (
                    <div className="flex items-center gap-1 mt-xs px-xs">
                      <span className="material-symbols-outlined text-secondary text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>location_on</span>
                      <span className="font-label-sm text-label-sm text-secondary">
                        {formatDistance(item.distance_km)}
                      </span>
                    </div>
                  )}
                  {!item.distance_km && item.location_label && (
                    <div className="flex items-center gap-1 mt-xs px-xs">
                      <span className="material-symbols-outlined text-on-surface-variant text-[14px]">location_on</span>
                      <span className="font-label-sm text-label-sm text-on-surface-variant truncate">
                        {item.location_label}
                      </span>
                    </div>
                  )}
                </div>
              ))
          }
        </div>
      </main>
    </div>
  );
}
