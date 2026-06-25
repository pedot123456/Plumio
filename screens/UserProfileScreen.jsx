import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import TopAppBar from '../components/TopAppBar';
import BottomNav from '../components/BottomNav';

const MOCK_PROFILE = {
  full_name: 'Alex Johnson',
  email: 'alexj@utp.edu.my',
  avatar_url: null,
  rating: 4.8,
  active_items_count: 5,
  trades_count: 23,
  wallet_balance: 150,
  verified: true,
  member_since: 'Jan 2024',
};

// Static navigation items — not DB-driven
const MENU_ITEMS = [
  {
    icon: 'storefront',
    title: 'My Listings',
    subtitle: 'Manage your marketplace items',
    path: '/my-listings',
    activeBg: 'group-hover:bg-primary-container group-hover:text-on-primary-container',
  },
  {
    icon: 'lock',
    title: 'Transaction Escrow',
    subtitle: 'Secure payments and release',
    path: '/transactions',
    activeBg: 'group-hover:bg-secondary group-hover:text-on-secondary',
    badge: '1 Action',
  },
  {
    icon: 'settings',
    title: 'Settings',
    subtitle: 'Preferences and account details',
    path: '#',
    activeBg: 'group-hover:bg-on-surface-variant group-hover:text-surface-container-lowest',
  },
];

function ProfileSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="flex flex-col items-center gap-sm py-lg">
        <div className="w-28 h-28 rounded-full bg-surface-container-high" />
        <div className="h-5 bg-surface-container-high rounded w-36" />
        <div className="h-3 bg-surface-container-high rounded w-48" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-md mt-md">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-surface-container-low rounded-[16px] p-md h-24" />
        ))}
      </div>
    </div>
  );
}

export default function UserProfileScreen() {
  const navigate = useNavigate();
  const { session, signOut } = useAuth();

  const [profile] = useState(MOCK_PROFILE);
  const isLoading = false;
  const error = null;

  // Derive stats from live profile data
  const STATS = profile ? [
    {
      icon: 'star',
      value: profile.rating != null ? Number(profile.rating).toFixed(1) : '—',
      label: 'Peer Rating',
      bg: 'bg-primary-fixed',
      color: 'text-primary',
    },
    {
      icon: 'inventory_2',
      value: profile.active_items_count ?? 0,
      label: 'Active Items',
      bg: 'bg-secondary-fixed',
      color: 'text-secondary',
    },
    {
      icon: 'handshake',
      value: profile.trades_count ?? 0,
      label: 'Trades Done',
      bg: 'bg-tertiary-fixed',
      color: 'text-tertiary',
    },
    {
      icon: 'account_balance_wallet',
      value: profile.wallet_balance != null ? `RM ${Number(profile.wallet_balance).toFixed(0)}` : '—',
      label: 'Balance',
      bg: 'bg-surface-variant',
      color: 'text-on-surface-variant',
    },
  ] : [];

  async function handleSignOut() {
    await signOut();
    navigate('/login', { replace: true });
  }

  return (
    <div className="bg-background text-on-background min-h-screen bg-grid-pattern pb-[80px] md:pb-0">
      <TopAppBar variant="brand" />

      <main className="max-w-container-max mx-auto md:px-xxl md:grid md:grid-cols-12 md:gap-gutter pt-lg">
        {isLoading ? (
          <div className="md:col-span-12 px-margin-mobile">
            <ProfileSkeleton />
          </div>
        ) : error ? (
          <div className="md:col-span-12 flex flex-col items-center justify-center py-xxl gap-md text-on-surface-variant px-margin-mobile">
            <span className="material-symbols-outlined text-[48px] text-error">error_outline</span>
            <p className="font-body-md text-error">{error}</p>
            <button onClick={fetchProfile} className="bg-primary-container text-on-primary font-label-md text-label-md px-lg py-sm rounded-lg hover:bg-primary transition-colors">
              Try Again
            </button>
          </div>
        ) : (
          <>
            {/* Profile Header */}
            <div className="md:col-span-4 lg:col-span-3">
              <section className="px-margin-mobile md:px-0 py-lg flex flex-col items-center text-center bg-surface-container-lowest md:bg-transparent rounded-xl shadow-sm md:shadow-none mb-lg relative overflow-hidden">
                <div className="absolute top-[-50px] w-full h-[120px] bg-gradient-to-b from-primary-fixed to-transparent opacity-50 z-0 rounded-t-xl" />
                <div className="relative z-10 mt-md">
                  <div className="w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-surface shadow-md bg-surface-container">
                    {profile?.avatar_url ? (
                      <img className="w-full h-full object-cover" src={profile.avatar_url} alt="Profile" />
                    ) : (
                      <div className="w-full h-full bg-secondary-container flex items-center justify-center">
                        <span className="font-headline-lg text-headline-lg text-on-secondary-container font-bold">
                          {profile?.full_name?.[0]?.toUpperCase() ?? '?'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <h1 className="mt-md font-headline-md text-headline-md text-primary z-10">
                  {profile?.full_name ?? session?.user?.email ?? 'User'}
                </h1>
                <p className="font-body-sm text-body-sm text-on-surface-variant z-10">
                  {profile?.email ?? session?.user?.email}
                </p>
                {profile?.verified && (
                  <div className="mt-md inline-flex items-center gap-base bg-secondary-container text-on-secondary-container px-sm py-xs rounded-full shadow-sm z-10 border border-secondary/20">
                    <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
                    <span className="font-label-md text-label-md">Verified Peer</span>
                  </div>
                )}
                {profile?.member_since && (
                  <p className="mt-lg font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider z-10">
                    Member since {profile.member_since}
                  </p>
                )}
              </section>
            </div>

            {/* Dashboard */}
            <div className="md:col-span-8 lg:col-span-9 space-y-lg px-margin-mobile md:px-0">
              {/* Stats */}
              <section className="grid grid-cols-2 md:grid-cols-4 gap-md">
                {STATS.map(stat => (
                  <div
                    key={stat.label}
                    className="bg-surface-container-lowest shadow-[0_4px_12px_rgba(0,0,0,0.02)] rounded-[16px] p-md flex flex-col justify-center items-start border border-outline-variant/30 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-shadow"
                  >
                    <div className={`w-10 h-10 rounded-full ${stat.bg} flex items-center justify-center ${stat.color} mb-sm`}>
                      <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>{stat.icon}</span>
                    </div>
                    <span className="font-headline-md text-headline-md text-primary">{stat.value}</span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">{stat.label}</span>
                  </div>
                ))}
              </section>

              {/* Menu */}
              <section className="bg-surface-container-lowest shadow-[0_4px_12px_rgba(0,0,0,0.02)] rounded-[24px] overflow-hidden border border-outline-variant/20">
                <div className="flex flex-col divide-y divide-outline-variant/20">
                  {MENU_ITEMS.map(item => (
                    <button
                      key={item.title}
                      className="w-full flex items-center justify-between p-lg hover:bg-surface-container transition-colors text-left group"
                      onClick={() => navigate(item.path)}
                    >
                      <div className="flex items-center gap-md">
                        <div className={`w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-primary ${item.activeBg} transition-colors shadow-sm`}>
                          <span className="material-symbols-outlined">{item.icon}</span>
                        </div>
                        <div>
                          <span className="font-headline-sm text-headline-sm text-on-surface block">{item.title}</span>
                          <span className="font-body-sm text-body-sm text-on-surface-variant">{item.subtitle}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-sm">
                        {item.badge && (
                          <span className="bg-error text-on-error font-label-sm text-label-sm px-2 py-0.5 rounded-full">
                            {item.badge}
                          </span>
                        )}
                        <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors">
                          chevron_right
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </section>

              <div className="pt-md pb-xxl flex justify-center">
                <button
                  onClick={handleSignOut}
                  className="font-label-md text-label-md text-on-surface-variant hover:text-error transition-colors px-lg py-sm rounded-lg hover:bg-error-container/30"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </>
        )}
      </main>

      <BottomNav activeTab="Account" />
    </div>
  );
}
