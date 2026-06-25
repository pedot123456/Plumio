import React from 'react';
import { useNavigate } from 'react-router-dom';
import TopAppBar from '../components/TopAppBar';
import BottomNav from '../components/BottomNav';

const CATEGORIES = [
  { icon: 'devices',     label: 'Electronics',       path: '/search?cat=electronics' },
  { icon: 'styler',      label: 'Preloved Fashion',  path: '/search?cat=fashion' },
  { icon: 'menu_book',   label: 'Textbooks & Notes', path: '/search?cat=textbooks' },
  { icon: 'chair',       label: 'Dorm & Living',     path: '/search?cat=dorm' },
  { icon: 'auto_awesome',label: 'Collectibles',      path: '/search?cat=collectibles' },
  { icon: 'handshake',   label: 'Micro-Services',    path: '/search?cat=services' },
];

export default function BrowseCategoriesScreen() {
  const navigate = useNavigate();

  return (
    <div className="bg-background text-on-background min-h-screen font-body-md pb-20">
      <TopAppBar variant="brand" />

      <main className="pt-lg px-margin-mobile max-w-container-max mx-auto">
        <h1 className="font-headline-md text-headline-md font-bold text-primary mb-lg">Browse Categories</h1>

        {/* Grid */}
        <div className="grid grid-cols-2 gap-md">
          {CATEGORIES.map(cat => (
            <button
              key={cat.label}
              className="bg-white rounded-xl p-md shadow-level-1 flex flex-col items-center justify-center aspect-square text-center group cursor-pointer hover:shadow-level-2 transition-shadow active:scale-[0.98]"
              onClick={() => navigate(cat.path)}
            >
              <div className="w-16 h-16 rounded-full bg-[#f3eff4] flex items-center justify-center mb-sm group-active:bg-primary-fixed transition-colors">
                <span
                  className="material-symbols-outlined text-[32px] text-secondary"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {cat.icon}
                </span>
              </div>
              <h3 className="font-label-md text-label-md text-primary">{cat.label}</h3>
            </button>
          ))}
        </div>
      </main>

      <BottomNav activeTab="Categories" />
    </div>
  );
}
