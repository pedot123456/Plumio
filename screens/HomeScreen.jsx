import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import TopAppBar from '../components/TopAppBar';
import BottomNav from '../components/BottomNav';
import ProductCard from '../components/ProductCard';
import Footer from '../components/Footer';
import ScamAlertBanner from '../components/ScamAlertBanner';

const PAGE_SIZE = 8;

// Static UI taxonomy — not DB-driven. Kept in sync with the category values
// sellers can pick in CreateListingScreen and with BrowseCategoriesScreen's CATEGORY_META.
const CATEGORIES = [
  { key: 'electronics',  icon: 'devices',     label: 'Electronics' },
  { key: 'fashion',      icon: 'checkroom',   label: 'Fashion' },
  { key: 'food',         icon: 'restaurant',  label: 'Food & Beverages' },
  { key: 'kraftangan',   icon: 'palette',     label: 'Kraftangan & Handicraft' },
  { key: 'beauty',       icon: 'spa',         label: 'Beauty & Personal Care' },
  { key: 'agriculture',  icon: 'agriculture', label: 'Agriculture & Fresh Produce' },
  { key: 'home',         icon: 'chair',       label: 'Home & Furniture' },
  { key: 'collectibles', icon: 'diamond',     label: 'Collectibles' },
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

export default function HomeScreen() {
  const navigate = useNavigate();
  const { session } = useAuth();

  const [listings,       setListings]       = useState([]);
  const [isLoading,      setIsLoading]      = useState(true);
  const [isLoadingMore,  setIsLoadingMore]  = useState(false);
  const [hasMore,        setHasMore]        = useState(false);
  const [offset,         setOffset]         = useState(0);
  const [error,          setError]          = useState(null);

  useEffect(() => { fetchPage(0, true); }, []);

  async function fetchPage(start, replace) {
    replace ? setIsLoading(true) : setIsLoadingMore(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('listings')
        .select('*')
        // Legacy rows created before the status column existed have status=null —
        // treat those as active too, same as MyListingsScreen does.
        .or('status.eq.active,status.is.null')
        .order('created_at', { ascending: false })
        .range(start, start + PAGE_SIZE - 1);
      if (err) throw err;
      const items = data ?? [];
      replace
        ? setListings(items)
        : setListings(prev => [...prev, ...items]);
      setOffset(start + PAGE_SIZE);
      setHasMore(items.length === PAGE_SIZE);
    } catch (err) {
      setError(err.message);
    } finally {
      replace ? setIsLoading(false) : setIsLoadingMore(false);
    }
  }

  const goIfAuth = path => {
    if (!session) navigate('/login');
    else navigate(path);
  };

  return (
    <div className="bg-background text-on-background pb-20 md:pb-0 font-body-md min-h-screen">
      <TopAppBar variant="home" />

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-lg flex flex-col gap-lg">
        {/* Hero */}
        <section className="w-full rounded-xl overflow-hidden relative level-1-shadow bg-surface-container-lowest flex items-center min-h-[200px] md:min-h-[300px]">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-80 z-0"
            style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCIe7DZXHXcv2iL1qTh2blM1g5M-MFDcXTez0rCTB-WZKPt8PWt0xlgi0fQfPR8wnoB02agXIAkTKZxyFqoyJfNdEYBzI6-o-b8vd4Dx5oeX4aFumimc5YIMP8gVpVkGHDEPNOFk-CfI5xgFK0jMBpk-F70b6oBzEfEXv6uwozphZxc64hgzLRqozgHTZd02YcjBnP6FOpBD_sR40Bu8HhpNRlRAsVedLeSCeNA2WOkspl-J16f7IKs6t8TlxX2ISZWYGHOEDgXiL4')" }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-primary-container/90 to-transparent z-10" />
          <div className="relative z-20 p-lg md:p-xxl max-w-[80%] md:max-w-md">
            <span className="inline-block px-sm py-xs bg-secondary-container text-on-secondary-container rounded-md font-label-sm text-label-sm mb-sm font-bold uppercase tracking-wider">
              Trusted Seller Guarantee
            </span>
            <h1 className="font-headline-lg-mobile text-headline-lg-mobile md:font-display-lg md:text-display-lg text-on-primary mb-md">
              Secure Local Marketplace
            </h1>
            <p className="font-body-md text-body-md text-on-primary/90 mb-lg">
              Discover high-quality items from verified sellers in your community.
            </p>
            <button
              className="bg-secondary text-on-secondary px-lg py-sm rounded-lg font-label-md text-label-md hover:bg-secondary/90 active:scale-[0.98] transition-all shadow-sm"
              onClick={() => goIfAuth('/categories')}
            >
              Explore Deals
            </button>
          </div>
        </section>

        <ScamAlertBanner />

        {/* Categories */}
        <section>
          <div className="flex justify-between items-end mb-md">
            <h2 className="font-headline-md text-headline-md text-primary">Browse Categories</h2>
            <button
              className="font-label-md text-label-md text-on-tertiary-fixed-variant hover:text-secondary transition-colors active:scale-95"
              onClick={() => goIfAuth('/categories')}
            >
              See All
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
            {CATEGORIES.map(cat => (
              <div
                key={cat.key}
                className="bg-surface-container-lowest rounded-xl p-md level-1-shadow flex flex-col justify-between h-[120px] hover:level-2-shadow transition-shadow group cursor-pointer border border-outline-variant/30"
                onClick={() => goIfAuth(`/categories?tab=${cat.key}`)}
              >
                <span className="material-symbols-outlined text-secondary text-3xl mb-auto group-hover:scale-110 transition-transform">
                  {cat.icon}
                </span>
                <span className="font-label-md text-label-md text-primary mt-auto">{cat.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Recommended listings */}
        <section className="mb-xxl">
          <div className="flex justify-between items-end mb-md">
            <h2 className="font-headline-md text-headline-md text-primary">Recommended for You</h2>
          </div>

          {error && (
            <div className="flex items-center gap-sm text-error font-body-sm text-body-sm bg-error/10 rounded-lg px-md py-sm mb-md">
              <span className="material-symbols-outlined text-[18px]">error_outline</span>
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
            {isLoading
              ? Array.from({ length: PAGE_SIZE }).map((_, i) => <ProductSkeleton key={i} />)
              : listings.length === 0
                ? (
                  <div className="col-span-2 sm:col-span-3 md:col-span-4 lg:col-span-5 flex flex-col items-center justify-center py-xxl gap-md text-on-surface-variant">
                    <span className="material-symbols-outlined text-[48px]">storefront</span>
                    <p className="font-body-md">No listings yet. Be the first to sell!</p>
                  </div>
                )
                : listings.map(item => (
                  <ProductCard
                    key={item.id}
                    id={item.id}
                    title={item.title ?? item.name}
                    price={Number(item.price).toFixed(2)}
                    image={item.image_url}
                    mediaUrls={item.media_urls}
                    badge={item.badge ?? item.label ?? undefined}
                    badgeVariant={item.badge_variant ?? undefined}
                    onClick={!session ? () => navigate('/login') : undefined}
                  />
                ))
            }
          </div>

          {/* View More */}
          {!isLoading && hasMore && (
            <div className="flex justify-center mt-lg">
              <button
                onClick={() => fetchPage(offset, false)}
                disabled={isLoadingMore}
                className="flex items-center gap-sm border border-outline text-on-surface-variant font-label-md text-label-md px-xl py-sm rounded-lg hover:bg-surface-container active:scale-[0.98] transition-all disabled:opacity-60"
              >
                {isLoadingMore ? (
                  <>
                    <span className="w-4 h-4 border-2 border-outline/40 border-t-secondary rounded-full animate-spin" />
                    Loading...
                  </>
                ) : (
                  'View More'
                )}
              </button>
            </div>
          )}
        </section>
      </main>

      <Footer />

      <BottomNav activeTab="Home" />
    </div>
  );
}
