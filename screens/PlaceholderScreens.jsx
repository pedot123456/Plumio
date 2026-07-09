/**
 * PlaceholderScreens.jsx
 * All "coming soon" screens in one file.
 * Each export is a standalone route component that uses a shared shell.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';

// ── Shared shell ────────────────────────────────────────────────
function ComingSoon({ title, icon, description }) {
  const navigate = useNavigate();

  return (
    <div
      className="min-h-screen bg-gray-50 flex flex-col"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* Body */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 pb-28 text-center">
        <div className="w-20 h-20 rounded-full bg-purple-50 flex items-center justify-center">
          <span
            className="material-symbols-outlined text-[40px] text-[#A855F7]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            {icon}
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <h2 className="font-bold text-gray-900 text-lg">{title}</h2>
          <p className="text-gray-400 text-sm max-w-[260px] leading-relaxed">
            {description}
          </p>
        </div>

        <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-600 text-xs font-semibold px-3 py-1.5 rounded-full border border-amber-100">
          <span className="material-symbols-outlined text-[14px]">construction</span>
          Coming Soon
        </span>

        <button
          onClick={() => navigate(-1)}
          className="mt-2 px-6 py-2.5 bg-[#A855F7] text-white text-sm font-bold rounded-full hover:bg-[#9333EA] transition-colors"
        >
          Go Back
        </button>
      </div>

      <BottomNav activeTab="Account" />
    </div>
  );
}

// ── Individual screen exports ───────────────────────────────────

export function WalletScreen() {
  return (
    <ComingSoon
      title="PlumioPay Wallet"
      icon="account_balance_wallet"
      description="View your PlumioPay balance, top up, and see your full transaction history."
    />
  );
}

export function CoinsScreen() {
  return (
    <ComingSoon
      title="Plumio Coins"
      icon="toll"
      description="Earn Plumio Coins on every purchase and redeem them for discounts."
    />
  );
}

export function PayLaterScreen() {
  return (
    <ComingSoon
      title="PlumioPayLater"
      icon="credit_score"
      description="Buy now and pay later with flexible credit — no interest for 30 days."
    />
  );
}

export function LikesScreen() {
  return (
    <ComingSoon
      title="My Likes"
      icon="favorite"
      description="All the listings you've liked or saved for later, in one place."
    />
  );
}

export function BuyAgainScreen() {
  return (
    <ComingSoon
      title="Buy Again"
      icon="shopping_bag"
      description="Quickly reorder items from your past purchases."
    />
  );
}

export function SettingsScreen() {
  return (
    <ComingSoon
      title="Settings"
      icon="settings"
      description="Manage your account details, notifications, privacy, and preferences."
    />
  );
}

export function HelpScreen() {
  return (
    <ComingSoon
      title="Help Centre"
      icon="help"
      description="Browse FAQs, guides, and support articles to get the most out of Plumio."
    />
  );
}

export function SupportChatScreen() {
  return (
    <ComingSoon
      title="Chat with Plumio"
      icon="support_agent"
      description="Talk to the Plumio support team — we're here Monday to Friday, 9 am – 6 pm."
    />
  );
}
