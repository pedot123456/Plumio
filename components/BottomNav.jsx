import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import GuestModal from './GuestModal';

const TABS = [
  { label: 'Home',       icon: 'home',          path: '/' },
  { label: 'Categories', icon: 'category',       path: '/categories' },
  { label: 'Cart',       icon: 'shopping_cart',  path: '/cart', badge: true, protected: true },
  { label: 'Account',    icon: 'person',         path: '/profile', protected: true },
];

const GUEST_MESSAGES = {
  Cart: 'Save and purchase items from verified UTP sellers — log in to access your cart.',
  Account: 'View your profile, active listings, and transaction history.',
};

export default function BottomNav({ activeTab }) {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [guestModal, setGuestModal] = useState(null);

  function handleTabClick(tab) {
    if (tab.protected && !session) {
      setGuestModal(GUEST_MESSAGES[tab.label]);
      return;
    }
    navigate(tab.path);
  }

  return (
    <>
      <nav className="md:hidden bg-surface fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 py-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] border-t border-outline-variant/30">
        {TABS.map(tab => {
          const isActive = tab.label === activeTab;
          return (
            <button
              key={tab.label}
              onClick={() => handleTabClick(tab)}
              className={`flex flex-col items-center justify-center transition-all relative ${
                isActive
                  ? 'bg-secondary-container text-on-secondary-container rounded-xl px-4 py-1 scale-90'
                  : 'text-on-surface-variant hover:text-secondary'
              }`}
            >
              <span
                className="material-symbols-outlined"
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {tab.icon}
              </span>
              {tab.badge && !isActive && (
                <span className="absolute top-0 right-2 w-2 h-2 bg-secondary rounded-full" />
              )}
              <span className="font-label-sm text-label-sm mt-1">{tab.label}</span>
            </button>
          );
        })}
      </nav>
      {guestModal && (
        <GuestModal message={guestModal} onClose={() => setGuestModal(null)} />
      )}
    </>
  );
}
