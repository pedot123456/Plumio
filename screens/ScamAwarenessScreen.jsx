import React from 'react';
import { SCAMS, TIPS } from '../data/scamAwareness';

const QUICK_LINKS = [
  { label: 'Fake payment receipts',        target: 'scam-0' },
  { label: 'Suspicious bank transfers',    target: 'scam-1' },
  { label: 'Fake parcel tracking / phishing links', target: 'scam-2' },
  { label: 'Overpayment refund tricks',    target: 'scam-3' },
  { label: 'Off-platform messaging',       target: 'scam-4' },
];

function ScamCard({ scam, index }) {
  return (
    <div id={`scam-${index}`} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden scroll-mt-20">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="text-base font-bold text-gray-900">{scam.title}</h2>
      </div>
      <div className="p-5 flex flex-col gap-4">
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
  return (
    <div className="min-h-screen bg-gray-50 pb-16" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="max-w-2xl mx-auto px-5 py-8">

        {/* Header */}
        <div className="mb-8 text-center flex flex-col items-center gap-3">
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
            {QUICK_LINKS.map(link => (
              <a
                key={link.target}
                href={`#${link.target}`}
                className="text-xs font-medium bg-white border border-gray-200 text-gray-600 hover:border-[#A855F7] hover:text-[#A855F7] rounded-full px-3 py-1.5 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>

        {/* Scam cards */}
        <div className="flex flex-col gap-4 mb-10">
          {SCAMS.map((scam, i) => <ScamCard key={scam.title} scam={scam} index={i} />)}
        </div>

        {/* Tips before making payment */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-8">
          <h2 className="text-base font-bold text-gray-900 mb-4">🛡️ Tips Before Making Payment</h2>
          <ul className="flex flex-col gap-3">
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
          <a
            href="tel:997"
            className="inline-flex items-center gap-2 mt-3 bg-red-600 hover:bg-red-700 text-white font-bold text-sm px-5 py-2.5 rounded-full transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">call</span>
            Call 997 (NSRC)
          </a>
        </div>

      </div>
    </div>
  );
}
