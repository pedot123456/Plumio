import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import Header from '../components/Header';

const helpData = {
  'account-security': {
    title: 'Account & Security',
    purpose: 'Managing user verification, profile details, and account access.',
    faqs: [
      {
        q: 'How do I verify my student account?',
        a: 'Go to Profile ➔ Settings ➔ Verification. Upload a clear picture of your student ID card or use your official university email address to receive a secure activation link.',
      },
      {
        q: 'Can I change my registered phone number or email?',
        a: 'Yes. Navigate to Profile ➔ Settings ➔ Account Details. For security, changing your email requires a verification code sent to your old address.',
      },
      {
        q: 'What should I do if my account is compromised?',
        a: "Immediately change your password via the login screen using 'Forgot Password'. If you lose access entirely, please use the Support Option below to flag your account for dynamic freeze.",
      },
    ],
  },
  'buying-transactions': {
    title: 'Buying & Transactions',
    purpose: 'Guiding users safely through browsing, purchasing, and interacting with campus sellers.',
    faqs: [
      {
        q: 'How do I make a purchase on the student marketplace?',
        a: "Find an item you like, click 'Buy Now' or 'Make Offer,' select your preferred pickup method, and proceed to secure checkout.",
      },
      {
        q: 'Can I cancel an order after committing to buy?',
        a: "You can cancel an order as long as the seller has not changed the order status to 'Preparing'. Once accepted, you must message the seller directly to request a mutual cancellation.",
      },
      {
        q: "What happens if the item received does not match the description?",
        a: "Do not mark the transaction as 'Order Received'. Instead, immediately tap 'Raise Dispute/Return' within your order panel to pause funds in escrow.",
      },
    ],
  },
  'selling-listings': {
    title: 'Selling & Listings',
    purpose: 'Helping student creators and sellers manage their dynamic listings and Seller Centre dashboard.',
    faqs: [
      {
        q: 'How do I list an item for sale?',
        a: "Navigate to your Seller Centre via the profile dashboard, click 'Create New Listing', upload up to 5 clear photos, write a descriptive title, set your price, and choose a category.",
      },
      {
        q: "Why is my listing marked as 'Under Review'?",
        a: 'All new marketplace listings are automatically scanned by our security filters to ensure compliance with university guidelines. Reviews typically take less than 15 minutes.',
      },
      {
        q: 'How do I manage inventory for multiple items?',
        a: "Inside the Seller Centre dashboard, tap on 'My Listings,' select the specific product card, edit the stock count field, and hit save.",
      },
    ],
  },
  'campus-logistics': {
    title: 'Campus Logistics & Delivery',
    purpose: 'Standardizing delivery options, tracking orders, and handling on-campus handovers.',
    faqs: [
      {
        q: 'What are the available delivery methods?',
        a: 'Plumio supports two options: 1. Self-Physical Pickup: Meet face-to-face at designated safe zones. 2. Campus Rider: Have a registered student rider deliver items to your hostel block.',
      },
      {
        q: 'How do I track my active delivery?',
        a: "Go to the 'My Purchases' tab, select your active order, and view the real-time status tracker.",
      },
      {
        q: 'What if the buyer/seller does not show up?',
        a: 'Use the in-app chat to coordinate a 10-minute grace period. If unresponsive, cancel the arrangement through the order options.',
      },
    ],
  },
  'payments-escrow': {
    title: 'Payments & Escrow',
    purpose: 'Securing transaction values, explaining payment flows, and handling payouts.',
    faqs: [
      {
        q: 'How does the Transaction Escrow system protect me?',
        a: "When you purchase an item, your money is securely held. The funds are only released to the seller after you inspect the item and click 'Order Received'.",
      },
      {
        q: 'What payment channels are supported?',
        a: 'We support secure FPX Online Banking, debit/credit cards, and recognized local e-wallets.',
      },
      {
        q: 'How long do payouts take to reach my bank account?',
        a: 'Once a sale is completed, earnings move to your app wallet. Manual withdrawals to your commercial bank account take 1–3 business days.',
      },
    ],
  },
  'community-events': {
    title: 'Community & Events',
    purpose: 'Handling registrations, discovering student groups, and interacting with campus modules.',
    faqs: [
      {
        q: 'How do I register for a campus event?',
        a: "Head to the MyUTP+ community tab, open the event calendar, select the event, and tap 'Register'. A QR code will be generated in your ticket wallet.",
      },
      {
        q: 'Can I transfer my event registration?',
        a: "Check the specific event description page for the 'Transfer Ticket' action button, as rules depend on the organizer.",
      },
      {
        q: 'How do I create a community space for my student organization?',
        a: 'Registered campus clubs can apply for a verified community module via the organizational dashboard.',
      },
    ],
  },
  'safety-trust': {
    title: 'Safety & Trust',
    purpose: 'Enforcing platform behavior, reporting scams, and defining campus guidelines.',
    faqs: [
      {
        q: 'What are the guidelines for safe physical meetups?',
        a: 'Always pick heavily populated campus areas during daylight hours (library foyer, cafe). Never meet in isolated building corridors.',
      },
      {
        q: 'How do I report a suspicious user or scam listing?',
        a: "Click the three small dots (...) on any listing or profile and select 'Report User'.",
      },
      {
        q: 'What items are prohibited?',
        a: 'Forbidden items include illegal substances, hazardous materials, prescription medication, counterfeit goods, and anything violating university codes.',
      },
    ],
  },
  'technical-support': {
    title: 'Technical Support',
    purpose: 'Dealing with app crashes, cache issues, and bug reporting.',
    faqs: [
      {
        q: 'The application screen freezes. How do I fix it?',
        a: 'Log out, clear your web browser cache completely, restart your browser window, and log back in.',
      },
      {
        q: 'Why am I not receiving notifications?',
        a: 'Check your device settings to ensure notifications are permitted for Plumio, and toggle them on inside the app settings.',
      },
      {
        q: 'How do I report a technical bug?',
        a: "Capture a screenshot and submit a detailed report through the 'Contact Support' ticket option at the bottom of the Help Centre.",
      },
    ],
  },
};

export default function HelpCategoryPage() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const [openIdx, setOpenIdx] = useState(null);

  const category = helpData[categoryId];

  if (!category) {
    return (
      <div
        className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 px-4 text-center"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        <p className="text-4xl">🔍</p>
        <h2 className="text-lg font-bold text-gray-900">Category not found</h2>
        <p className="text-sm text-gray-400 max-w-xs">
          The help category you're looking for doesn't exist or may have been moved.
        </p>
        <button
          onClick={() => navigate('/help')}
          className="mt-2 px-5 py-2.5 bg-[#A855F7] text-white text-sm font-semibold rounded-xl hover:bg-[#9333EA] transition-colors"
        >
          Back to Help Centre
        </button>
      </div>
    );
  }

  const toggle = (i) => setOpenIdx(prev => (prev === i ? null : i));

  return (
    <div
      className="min-h-screen bg-gray-50"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <Header back="/help" backLabel="Back to Help Centre" title={category.title} />

      {/* ── HERO ── */}
      <section className="bg-gradient-to-br from-[#1E1B4B] via-[#3730A3] to-[#7C3AED] px-4 py-12 text-center relative overflow-hidden">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-purple-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="relative z-10 max-w-2xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
            {category.title}
          </h1>
          <p className="text-sm text-purple-200 leading-relaxed max-w-lg mx-auto">
            {category.purpose}
          </p>
        </div>
      </section>

      {/* ── FAQ ACCORDION ── */}
      <div className="max-w-3xl mx-auto px-4 py-10">
        <h2 className="text-lg font-bold text-gray-900 mb-5">
          Frequently Asked Questions
        </h2>

        <div className="flex flex-col gap-2">
          {category.faqs.map((item, i) => {
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
                    className={`shrink-0 text-gray-400 transition-transform duration-300 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isOpen ? 'max-h-64' : 'max-h-0'
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

        {/* Back link at bottom */}
        <button
          onClick={() => navigate('/help')}
          className="mt-8 flex items-center gap-1.5 text-sm font-medium text-gray-400 hover:text-[#A855F7] transition-colors"
        >
          <ArrowLeft size={15} />
          Back to Help Centre
        </button>
      </div>
    </div>
  );
}
