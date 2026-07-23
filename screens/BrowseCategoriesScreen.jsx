import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import TopAppBar from '../components/TopAppBar';
import BottomNav from '../components/BottomNav';
import CategoryRow from '../components/CategoryRow';

// Order determines row order on screen — kept in sync with the category values
// sellers can actually pick in CreateListingScreen.
const CATEGORY_META = [
  { key: 'electronics',  label: 'Electronics',                 icon: 'devices'      },
  { key: 'fashion',      label: 'Fashion',                      icon: 'checkroom'    },
  { key: 'food',         label: 'Food & Beverages',             icon: 'restaurant'   },
  { key: 'kraftangan',   label: 'Kraftangan & Handicraft',      icon: 'palette'      },
  { key: 'beauty',       label: 'Beauty & Personal Care',       icon: 'spa'          },
  { key: 'agriculture',  label: 'Agriculture & Fresh Produce',  icon: 'agriculture'  },
  { key: 'home',         label: 'Home & Furniture',             icon: 'chair'        },
  { key: 'collectibles', label: 'Collectibles',                 icon: 'diamond'      },
];

// ── Skeleton placeholder while loading ─────────────────────────
function SkeletonRows() {
  return (
    <div className="px-4 flex flex-col gap-8 animate-pulse">
      {[0, 1, 2].map(i => (
        <div key={i} className="flex flex-col gap-3">
          <div className="flex justify-between">
            <div className="h-4 w-28 bg-gray-200 rounded-full" />
            <div className="h-4 w-12 bg-gray-200 rounded-full" />
          </div>
          <div className="flex gap-3">
            {[0, 1, 2, 3].map(j => (
              <div
                key={j}
                className="flex-none w-[140px] sm:w-[160px] md:w-[180px] lg:w-[200px] aspect-square bg-gray-200 rounded-2xl"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Empty state for a filtered category with no listings ────────
function EmptyCategory({ label }) {
  return (
    <div className="flex flex-col items-center py-16 gap-3">
      <div className="w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center">
        <span className="material-symbols-outlined text-[32px] text-purple-300">inbox</span>
      </div>
      <p className="text-gray-500 text-sm font-medium">No listings in {label} yet</p>
      <p className="text-gray-400 text-xs">Check back later or try another category</p>
    </div>
  );
}

// ── Main screen ─────────────────────────────────────────────────
export default function BrowseCategoriesScreen() {
  const navigate         = useNavigate();
  const { session }      = useAuth();
  const [searchParams]   = useSearchParams();
  const [grouped,   setGrouped]   = useState({});
  const [isLoading, setIsLoading] = useState(true);
  // Deep-link support — e.g. Home page tiles link to /categories?tab=food
  const requestedTab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(
    CATEGORY_META.some(c => c.key === requestedTab) ? requestedTab : 'all'
  );

  useEffect(() => { fetchListings(); }, []);

  async function fetchListings() {
    setIsLoading(true);
    const { data } = await supabase
      .from('listings')
      .select('id, title, price, image_url, category')
      // Legacy rows created before the status column existed have status=null —
      // treat those as active too, same as MyListingsScreen does.
      .or('status.eq.active,status.is.null')
      .order('created_at', { ascending: false })
      .limit(60);

    if (data) {
      const g = {};
      for (const item of data) {
        const cat = (item.category ?? 'other').toLowerCase();
        if (!g[cat]) g[cat] = [];
        g[cat].push(item);
      }
      setGrouped(g);
    }
    setIsLoading(false);
  }

  // Categories to show based on active tab
  const visibleCategories = activeTab === 'all'
    ? CATEGORY_META
    : CATEGORY_META.filter(c => c.key === activeTab);

  const activeMeta = CATEGORY_META.find(c => c.key === activeTab);

  return (
    <div
      className="min-h-screen bg-gray-50 pb-24"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <TopAppBar variant="brand" />

      <main className="pt-4 max-w-lg mx-auto">

        {/* ── Page heading ── */}
        <div className="px-4 mb-4">
          <h1 className="font-bold text-gray-900 text-lg tracking-tight">
            Browse Categories
          </h1>
          <p className="text-gray-400 text-xs mt-0.5">
            Discover products from local entrepreneurs and sellers nationwide
          </p>
        </div>

        {/* ── Category pill tabs ── */}
        <div
          className="flex gap-2 px-4 mb-5 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {/* "All" pill */}
          <button
            onClick={() => setActiveTab('all')}
            className={`shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all ${
              activeTab === 'all'
                ? 'bg-[#A855F7] text-white shadow-sm'
                : 'bg-white text-gray-500 border border-gray-200 hover:border-purple-200'
            }`}
          >
            All
          </button>

          {/* Category pills */}
          {CATEGORY_META.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold transition-all ${
                activeTab === key
                  ? 'bg-[#A855F7] text-white shadow-sm'
                  : 'bg-white text-gray-500 border border-gray-200 hover:border-purple-200'
              }`}
            >
              <span
                className="material-symbols-outlined text-[14px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {icon}
              </span>
              {label}
            </button>
          ))}
        </div>

        {/* ── Content ── */}
        {isLoading ? (
          <SkeletonRows />
        ) : (
          <div className="px-4 flex flex-col gap-8">
            {visibleCategories.map(({ key, label }) => {
              const products = grouped[key] ?? [];

              // In filtered view: always render (even if empty — show empty state)
              if (activeTab !== 'all') {
                return products.length ? (
                  <CategoryRow
                    key={key}
                    categoryName={label}
                    products={products}
                    path={`/search?cat=${key}`}
                  />
                ) : (
                  <EmptyCategory key={key} label={label} />
                );
              }

              // In "All" view: skip empty categories silently
              if (!products.length) return null;

              return (
                <CategoryRow
                  key={key}
                  categoryName={label}
                  products={products}
                  path={`/search?cat=${key}`}
                  userId={session?.user?.id}
                />
              );
            })}

            {/* If "All" view has no data at all */}
            {activeTab === 'all' &&
              !isLoading &&
              CATEGORY_META.every(c => !(grouped[c.key]?.length)) && (
                <div className="flex flex-col items-center py-20 gap-3">
                  <span className="material-symbols-outlined text-[48px] text-gray-300">
                    storefront
                  </span>
                  <p className="text-gray-500 text-sm font-medium">No listings yet</p>
                  <button
                    onClick={() => navigate('/create-listing')}
                    className="mt-2 px-5 py-2.5 bg-[#A855F7] text-white text-xs font-bold rounded-full hover:bg-[#9333EA] transition-colors"
                  >
                    Be the first to sell
                  </button>
                </div>
              )}
          </div>
        )}
      </main>

      <BottomNav activeTab="Categories" />
    </div>
  );
}
