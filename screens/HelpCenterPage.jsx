import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Search,
  Shield,
  ShoppingBag,
  Tag,
  Truck,
  Wallet,
  Users,
  ShieldCheck,
  Wrench,
  ChevronDown,
  MessageCircle,
  Mail,
  Sparkles,
} from 'lucide-react';
import Header from '../components/Header';

const CATEGORIES = [
  { Icon: Shield,      id: 'account-security',    label: 'Account & Security',         color: 'text-indigo-500',  bg: 'bg-indigo-50',  border: 'border-indigo-100'  },
  { Icon: ShoppingBag, id: 'buying-transactions',  label: 'Buying & Transactions',       color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
  { Icon: Tag,         id: 'selling-listings',     label: 'Selling & Listings',          color: 'text-purple-600',  bg: 'bg-purple-50',  border: 'border-purple-100'  },
  { Icon: Truck,       id: 'campus-logistics',     label: 'Campus Logistics & Delivery', color: 'text-orange-500',  bg: 'bg-orange-50',  border: 'border-orange-100'  },
  { Icon: Wallet,      id: 'payments-escrow',      label: 'Payments & Escrow',           color: 'text-blue-500',    bg: 'bg-blue-50',    border: 'border-blue-100'    },
  { Icon: Users,       id: 'community-events',     label: 'Community & Events',          color: 'text-pink-500',    bg: 'bg-pink-50',    border: 'border-pink-100'    },
  { Icon: ShieldCheck, id: 'safety-trust',         label: 'Safety & Trust',              color: 'text-rose-500',    bg: 'bg-rose-50',    border: 'border-rose-100'    },
  { Icon: Wrench,      id: 'technical-support',    label: 'Technical Support',           color: 'text-gray-600',    bg: 'bg-gray-100',   border: 'border-gray-200'    },
];

const HOT_QUESTIONS = [
  {
    q: 'How do I start a transaction on Plumio?',
    a: 'Browse to a listing you like and tap "Make Offer" or "Buy Now". Plumio holds your payment securely in escrow and notifies the seller. Once both parties confirm the physical handoff by scanning the Secure QR code, the funds are released to the seller automatically.',
  },
  {
    q: "What happens if a seller doesn't show up for the handoff?",
    a: "If a seller misses the agreed meeting window, open a dispute from your Transactions page within 48 hours. Plumio's escrow keeps your funds frozen during the review. We always recommend meeting in a visible, public campus area — the library foyer or cafeteria work well.",
  },
  {
    q: 'How do I get my account verified?',
    a: 'Go to your Profile page and tap "Get Verified". Complete the one-time RM 9.90 verification payment and your Verified Peer badge activates immediately — boosting your listing visibility and giving buyers extra confidence when they see your items.',
  },
  {
    q: 'Which items are not allowed on Plumio?',
    a: 'Prohibited items include counterfeit or stolen goods, weapons, controlled substances, digital software keys, and anything banned under Malaysian law. Listing prohibited items results in immediate removal and may lead to permanent account suspension.',
  },
  {
    q: "How does Plumio's escrow system protect me?",
    a: "When you purchase an item, your payment is held securely — the seller cannot access it until both of you scan the Secure QR code confirming the physical handoff. This two-way confirmation prevents scams, no-shows, and item misrepresentation from either side.",
  },
];

export default function HelpCenterPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [openIdx, setOpenIdx] = useState(null);

  const toggle = (i) => setOpenIdx(prev => (prev === i ? null : i));

  const filtered = searchQuery.trim()
    ? HOT_QUESTIONS.filter(
        item =>
          item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.a.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : HOT_QUESTIONS;

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'Inter', sans-serif" }}>

      <Header
        title="Help Center"
        right={
          <Link
            to="/terms"
            className="text-sm font-medium text-gray-500 hover:text-[#A855F7] transition-colors"
          >
            Policies
          </Link>
        }
      />

      {/* ── HERO + SEARCH ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#1E1B4B] via-[#3730A3] to-[#7C3AED] px-4 py-16 text-center">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-purple-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-indigo-500/20 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-2xl">
          <div className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-purple-200">
            <Sparkles size={11} />
            Plumio Support
          </div>

          <h2 className="mb-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            How can we help you?
          </h2>
          <p className="mb-8 text-sm leading-relaxed text-purple-200 sm:text-base">
            Search our guides, or browse categories below to find what you need.
          </p>

          <div className="relative mx-auto max-w-lg">
            <Search
              size={17}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search articles, topics, or guides…"
              className="w-full rounded-2xl bg-white py-3.5 pl-11 pr-5 text-sm text-gray-800 shadow-xl placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#A855F7]/40 transition-all"
            />
          </div>

          {searchQuery.trim() && (
            <p className="mt-3 text-xs text-purple-300">
              {filtered.length === 0
                ? 'No results — try a different keyword.'
                : `${filtered.length} result${filtered.length !== 1 ? 's' : ''} found`}
            </p>
          )}
        </div>
      </section>

      {/* ── MAIN CONTENT ──────────────────────────────────────────── */}
      <div className="mx-auto max-w-5xl px-4 py-10 flex flex-col gap-12">

        {/* Categories — hidden while searching */}
        {!searchQuery.trim() && (
          <section>
            <h2 className="mb-5 text-lg font-bold text-gray-900">Browse by Category</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {CATEGORIES.map(({ Icon, id, label, color, bg, border }) => (
                <button
                  key={label}
                  onClick={() => navigate(`/help/${id}`)}
                  className={`group flex flex-col items-center gap-3 rounded-2xl border ${border} bg-white px-3 py-5 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md`}
                >
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl ${bg} transition-transform group-hover:scale-110`}
                  >
                    <Icon size={20} className={color} />
                  </div>
                  <span className="text-xs font-semibold leading-tight text-gray-700">{label}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* FAQ Accordion */}
        <section>
          <h2 className="mb-5 text-lg font-bold text-gray-900">
            {searchQuery.trim() ? 'Search Results' : 'Frequently Asked Questions'}
          </h2>

          {filtered.length === 0 ? (
            <div className="py-12 text-center">
              <Search size={38} className="mx-auto mb-3 text-gray-300" />
              <p className="text-sm text-gray-400">No matching articles found.</p>
              <button
                onClick={() => setSearchQuery('')}
                className="mt-3 text-sm font-semibold text-[#A855F7] hover:underline"
              >
                Clear search
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filtered.map((item, i) => {
                const isOpen = openIdx === i;
                return (
                  <div
                    key={i}
                    className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
                  >
                    <button
                      onClick={() => toggle(i)}
                      className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-gray-50"
                    >
                      <span className="pr-4 text-sm font-semibold leading-snug text-gray-800">
                        {item.q}
                      </span>
                      <ChevronDown
                        size={17}
                        className={`shrink-0 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                      />
                    </button>

                    <div
                      className={`overflow-hidden transition-all duration-300 ease-in-out ${
                        isOpen ? 'max-h-56' : 'max-h-0'
                      }`}
                    >
                      <p className="border-t border-gray-50 px-5 pb-5 pt-3 text-sm leading-relaxed text-gray-500">
                        {item.a}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Contact Options */}
        <section>
          <h2 className="mb-5 text-lg font-bold text-gray-900">Still need help?</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

            <button
              onClick={() => {
                if (typeof window !== 'undefined' && window.chatbase) {
                  window.chatbase('open');
                }
              }}
              className="group flex items-center gap-4 rounded-2xl bg-gradient-to-r from-[#A855F7] to-[#7C3AED] px-6 py-5 text-left shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20 transition-transform group-hover:scale-110">
                <MessageCircle size={22} className="text-white" />
              </div>
              <div>
                <p className="text-base font-bold leading-tight text-white">Chat with AI Assistant</p>
                <p className="mt-0.5 text-xs text-purple-200">Instant answers, available 24 / 7</p>
              </div>
            </button>

            <button
              onClick={() => navigate('/contact')}
              className="group flex items-center gap-4 rounded-2xl border border-gray-200 bg-white px-6 py-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 transition-transform group-hover:scale-110">
                <Mail size={22} className="text-blue-500" />
              </div>
              <div>
                <p className="text-base font-bold leading-tight text-gray-900">Contact Support</p>
                <p className="mt-0.5 text-xs text-gray-400">Reach our team — Mon–Fri, 9 am–6 pm</p>
              </div>
            </button>

          </div>
        </section>

      </div>

      {/* ── FOOTER ────────────────────────────────────────────────── */}
      <footer className="mt-4 border-t border-gray-100 bg-white px-4 py-8 text-center">
        <div className="mb-3 flex flex-wrap items-center justify-center gap-5">
          <Link to="/terms"   className="text-xs font-medium text-gray-400 transition-colors hover:text-[#A855F7]">Terms of Service</Link>
          <Link to="/privacy" className="text-xs font-medium text-gray-400 transition-colors hover:text-[#A855F7]">Privacy Policy</Link>
          <Link to="/"        className="text-xs font-medium text-gray-400 transition-colors hover:text-[#A855F7]">Back to Plumio</Link>
        </div>
        <p className="text-xs text-gray-300">
          &copy; {new Date().getFullYear()} Plumio · UTP Campus Marketplace · All rights reserved.
        </p>
      </footer>

    </div>
  );
}
