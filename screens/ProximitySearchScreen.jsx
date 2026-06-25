import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabase';
import ProductCard from '../components/ProductCard';

// Static filter options — active distance filter sent to query
const DISTANCE_FILTERS = ['< 1km', '< 5km', '< 10km'];
const CATEGORY_FILTERS = ['Electronics', 'Fashion', 'Textbooks', 'Dorm & Living'];
const ALL_FILTERS = [...DISTANCE_FILTERS, ...CATEGORY_FILTERS];

// Map filter label → DB category value
const CATEGORY_MAP = {
  Electronics: 'electronics',
  Fashion: 'fashion',
  Textbooks: 'textbooks',
  'Dorm & Living': 'dorm',
};

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

  // Read initial query from URL (set by the header search bar)
  const urlParams = new URLSearchParams(location.search);
  const initialQuery = urlParams.get('q') ?? '';
  const initialCat   = urlParams.get('cat') ?? '';

  const [searchText, setSearchText]   = useState(initialQuery);
  const [activeFilter, setActiveFilter] = useState(initialCat ? CATEGORY_MAP[initialCat] ?? '< 5km' : '< 5km');
  const [results, setResults]          = useState([]);
  const [isLoading, setIsLoading]      = useState(true);
  const [error, setError]              = useState(null);

  useEffect(() => {
    fetchResults();
  }, [activeFilter]);

  async function fetchResults(query = searchText) {
    setIsLoading(true);
    setError(null);
    try {
      let q = supabase
        .from('listings')
        .select('id, title, price, image_url, distance_km, category')
        .eq('status', 'active')
        .order('distance_km', { ascending: true, nullsFirst: false })
        .limit(20);

      // Text search
      if (query.trim()) {
        q = q.ilike('title', `%${query.trim()}%`);
      }

      // Category filter
      if (CATEGORY_FILTERS.includes(activeFilter)) {
        q = q.eq('category', CATEGORY_MAP[activeFilter]);
      }

      // Distance filter — requires distance_km column (populated by location service / PostGIS)
      if (DISTANCE_FILTERS.includes(activeFilter)) {
        const maxKm = activeFilter === '< 1km' ? 1 : activeFilter === '< 5km' ? 5 : 10;
        q = q.lte('distance_km', maxKm);
      }

      const { data, error } = await q;
      if (error) throw error;
      setResults(data ?? []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    fetchResults(searchText);
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
              placeholder="Search nearby..."
              type="text"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
            />
          </div>
          <button
            type="button"
            className="p-2 text-primary hover:bg-surface-container-high rounded-full transition-colors flex items-center justify-center shrink-0"
          >
            <span className="material-symbols-outlined">tune</span>
          </button>
        </form>

        {/* Filter Strip */}
        <div className="flex gap-sm px-margin-mobile pb-sm overflow-x-auto no-scrollbar">
          {ALL_FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`whitespace-nowrap px-md py-xs rounded-full font-label-md text-label-md transition-all shrink-0 ${
                activeFilter === f
                  ? 'bg-secondary-container text-on-secondary-container shadow-sm'
                  : 'bg-surface-container-lowest border border-outline-variant/40 text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-container-max mx-auto px-margin-mobile pt-md">
        {/* Result count */}
        {!isLoading && (
          <div className="flex justify-between items-center mb-md">
            <span className="font-label-md text-label-md text-on-surface-variant">
              {results.length} result{results.length !== 1 ? 's' : ''} nearby
            </span>
          </div>
        )}

        {/* Guarantee Banner */}
        <div className="bg-secondary-container text-on-secondary-container rounded-lg px-md py-sm mb-md flex items-center gap-sm">
          <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
          <span className="font-label-md text-label-md">All nearby sellers are Verified Peers</span>
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
                  <span className="material-symbols-outlined text-[56px]">search_off</span>
                  <p className="font-headline-sm text-headline-sm">No results found</p>
                  <p className="font-body-sm text-center max-w-xs">Try a different search term or expand the distance filter.</p>
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
                      <span className="material-symbols-outlined text-secondary text-[14px]">location_on</span>
                      <span className="font-label-sm text-label-sm text-on-surface-variant">
                        {item.distance_km < 1
                          ? `${Math.round(item.distance_km * 1000)}m away`
                          : `${Number(item.distance_km).toFixed(1)}km away`}
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
