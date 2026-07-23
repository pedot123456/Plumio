import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { SCAMS, TIPS } from '../data/scamAwareness';

const QUICK_LINKS = [
  { label: 'Fake payment receipts',        target: 'scam-0' },
  { label: 'Suspicious bank transfers',    target: 'scam-1' },
  { label: 'Fake parcel tracking / phishing links', target: 'scam-2' },
  { label: 'Overpayment refund tricks',    target: 'scam-3' },
  { label: 'Off-platform messaging',       target: 'scam-4' },
];

const STATS = [
  { icon: 'fact_check',  value: String(SCAMS.length), label: 'Scam patterns tracked' },
  { icon: 'lock',        value: '1',                  label: 'Golden rule to remember' },
  { icon: 'support_agent', value: '997',              label: 'NSRC hotline (24/7)' },
];

function ScamCard({ scam, index }) {
  return (
    <div id={`scam-${index}`} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden scroll-mt-20 flex flex-col">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
        <span className="w-9 h-9 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-[18px] text-[#A855F7]">{scam.icon}</span>
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-bold text-[#A855F7] uppercase tracking-wider">{scam.category}</p>
          <h2 className="text-base font-bold text-gray-900 leading-snug">{scam.title}</h2>
        </div>
      </div>
      <div className="p-5 flex flex-col gap-4 flex-1">
        <div className="flex items-start gap-3">
          <span className="text-lg shrink-0 leading-none mt-0.5">🔴</span>
          <div>
            <p className="text-xs font-bold text-red-500 uppercase tracking-wider mb-1">Common Scam</p>
            <p className="text-sm text-gray-600 leading-relaxed">{scam.scam}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <span className="text-lg shrink-0 leading-none mt-0.5">✅</span>
          <div>
            <p className="text-xs font-bold text-green-600 uppercase tracking-wider mb-1">What to Do</p>
            <p className="text-sm text-gray-600 leading-relaxed">{scam.action}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ScamAwarenessScreen() {
  const navigate = useNavigate();
  const { session } = useAuth();

  function handleReport() {
    navigate(session ? '/report' : '/login');
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* Page header — richer than the generic back-bar, matches the shield/purple theme below */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-4xl mx-auto px-5 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="flex items-center gap-1.5 -ml-2 p-2 rounded-full text-gray-500 hover:text-[#A855F7] hover:bg-purple-50 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px] text-[#A855F7]" style={{ fontVariationSettings: "'FILL' 1" }}>
              shield
            </span>
            <span className="font-bold text-sm text-gray-900">Scam Awareness Center</span>
          </div>
          <Link to="/" aria-label="Go to home" className="hover:opacity-75 transition-opacity">
            <img src="/Plumio.png" alt="Plumio" className="h-7 w-auto object-contain" />
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-5 py-8">

        {/* Intro */}
        <div className="mb-6 text-center flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-[#A855F7]/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-[28px] text-[#A855F7]" style={{ fontVariationSettings: "'FILL' 1" }}>
              shield
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Scam Awareness Center</h1>
          <p className="text-sm text-gray-500 leading-relaxed max-w-md">
            Buying and selling safely starts with recognising the tricks scammers actually use.
            Here are the most common scams reported around online marketplaces in Malaysia —
            and exactly what to do if you spot one.
          </p>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {STATS.map(stat => (
            <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-3 py-4 flex flex-col items-center text-center gap-1">
              <span className="material-symbols-outlined text-[20px] text-[#A855F7]">{stat.icon}</span>
              <span className="text-lg font-extrabold text-gray-900 leading-none">{stat.value}</span>
              <span className="text-[11px] text-gray-500 leading-tight">{stat.label}</span>
            </div>
          ))}
        </div>

        {/* Golden rule banner */}
        <div className="bg-[#2d1943] text-white rounded-2xl px-5 py-4 mb-8 flex items-start gap-3">
          <span className="material-symbols-outlined text-[22px] text-purple-300 shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>
            lock
          </span>
          <div>
            <p className="font-bold text-sm">The Golden Rule</p>
            <p className="text-purple-200 text-sm leading-relaxed mt-0.5">
              Stay inside Plumio and never pay or communicate outside the official checkout and chat.
              Our Secure Escrow only protects transactions completed on the platform.
            </p>
          </div>
        </div>

        {/* Quick jump links */}
        <div className="mb-8">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Jump to</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_LINKS.map((link, i) => (
              <a
                key={link.target}
                href={`#${link.target}`}
                className="inline-flex items-center gap-1.5 text-xs font-medium bg-white border border-gray-200 text-gray-600 hover:border-[#A855F7] hover:text-[#A855F7] rounded-full pl-2.5 pr-3 py-1.5 transition-colors"
              >
                <span className="material-symbols-outlined text-[14px]">{SCAMS[i].icon}</span>
                {link.label}
              </a>
            ))}
          </div>
        </div>

        {/* Scam cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          {SCAMS.map((scam, i) => <ScamCard key={scam.title} scam={scam} index={i} />)}
        </div>

        {/* Tips before making payment */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-8">
          <h2 className="text-base font-bold text-gray-900 mb-4">🛡️ Tips Before Making Payment</h2>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
            {TIPS.map(tip => (
              <li key={tip} className="flex items-start gap-2.5 text-sm text-gray-600 leading-relaxed">
                <span className="material-symbols-outlined text-[16px] text-[#A855F7] shrink-0 mt-0.5">check_circle</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>

        {/* Emergency contact */}
        <div className="bg-red-50 border border-red-100 rounded-2xl p-5 text-center">
          <p className="text-sm font-bold text-red-700">Think you've been scammed?</p>
          <p className="text-sm text-red-600 mt-1 leading-relaxed">
            Stop all communication immediately and contact the National Scam Response Centre (NSRC).
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-3">
            <a
              href="tel:997"
              className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold text-sm px-5 py-2.5 rounded-full transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">call</span>
              Call 997 (NSRC)
            </a>
            <button
              onClick={handleReport}
              className="inline-flex items-center gap-2 bg-white border border-red-200 hover:bg-red-100 text-red-700 font-bold text-sm px-5 py-2.5 rounded-full transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">flag</span>
              Report on Plumio
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
