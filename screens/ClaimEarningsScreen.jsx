import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import BottomNav from '../components/BottomNav';
import { Banknote, CheckCircle, X, ChevronDown } from 'lucide-react';

const MY_BANKS = [
  'Maybank', 'CIMB Bank', 'Public Bank', 'RHB Bank', 'Hong Leong Bank',
  'AmBank', 'Bank Rakyat', 'Bank Islam Malaysia', 'Bank Muamalat Malaysia',
  'BSN (Bank Simpanan Nasional)', 'OCBC Bank Malaysia', 'Standard Chartered Malaysia',
  'HSBC Bank Malaysia', 'Affin Bank', 'Alliance Bank Malaysia', 'Agrobank',
];

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Claim modal — collects bank details (pre-filled if already on file) ──
function ClaimModal({ amount, defaults, onClose, onConfirm, loading }) {
  const [bankName,      setBankName]      = useState(defaults.bank_name ?? '');
  const [accountName,   setAccountName]   = useState(defaults.account_name ?? '');
  const [accountNumber, setAccountNumber] = useState(defaults.account_number ?? '');
  const [errors, setErrors] = useState({});

  function validate() {
    const errs = {};
    if (!bankName)                errs.bankName      = 'Please select your bank.';
    if (!accountName.trim())      errs.accountName   = 'Account holder name is required.';
    if (!accountNumber.trim())    errs.accountNumber = 'Account number is required.';
    else if (accountNumber.replace(/\D/g, '').length < 8) errs.accountNumber = 'Enter a valid account number.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    onConfirm({ bankName, accountName: accountName.trim(), accountNumber: accountNumber.replace(/\D/g, '') });
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 z-10 flex flex-col gap-5" style={{ fontFamily: "'Inter', sans-serif" }}>
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-gray-900 text-lg">Claim Earnings</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <X size={16} className="text-gray-600" />
          </button>
        </div>

        <div className="bg-gray-50 rounded-2xl p-4 flex flex-col gap-1">
          <p className="text-xs text-gray-400 font-medium">You're claiming</p>
          <p className="text-2xl font-black text-[#A855F7]">RM {amount.toFixed(2)}</p>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Bank</label>
            <div className="relative">
              <select
                value={bankName}
                onChange={e => setBankName(e.target.value)}
                className={`w-full appearance-none border rounded-xl px-4 py-3 text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#A855F7]/30 transition-all ${errors.bankName ? 'border-red-400' : 'border-gray-200 focus:border-[#A855F7]'}`}
              >
                <option value="" disabled>Select your bank</option>
                {MY_BANKS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            {errors.bankName && <p className="text-red-500 text-xs">{errors.bankName}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Account Holder Name</label>
            <input
              type="text"
              value={accountName}
              onChange={e => setAccountName(e.target.value)}
              placeholder="e.g. Ahmad Firdaus"
              className={`w-full border rounded-xl px-4 py-3 text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#A855F7]/30 transition-all ${errors.accountName ? 'border-red-400' : 'border-gray-200 focus:border-[#A855F7]'}`}
            />
            {errors.accountName && <p className="text-red-500 text-xs">{errors.accountName}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Account Number</label>
            <input
              type="text"
              inputMode="numeric"
              value={accountNumber}
              onChange={e => setAccountNumber(e.target.value.replace(/\D/g, ''))}
              placeholder="e.g. 1234567890"
              className={`w-full border rounded-xl px-4 py-3 text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#A855F7]/30 transition-all ${errors.accountNumber ? 'border-red-400' : 'border-gray-200 focus:border-[#A855F7]'}`}
            />
            {errors.accountNumber && <p className="text-red-500 text-xs">{errors.accountNumber}</p>}
          </div>

          {defaults.bank_name && (
            <p className="text-[11px] text-gray-400 flex items-center gap-1">
              <CheckCircle size={12} className="text-green-500" />
              Pre-filled from your saved bank details — edit anytime.
            </p>
          )}
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-[#A855F7] hover:bg-[#9333EA] disabled:opacity-50 text-white font-bold py-4 rounded-2xl transition-colors flex items-center justify-center gap-2"
        >
          {loading
            ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <><Banknote size={18} /> Confirm Claim · RM {amount.toFixed(2)}</>
          }
        </button>
      </div>
    </div>
  );
}

// ── Success popup ──────────────────────────────────────────────
function SuccessModal({ result, onClose }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 px-6">
      <div className="bg-white rounded-3xl p-8 flex flex-col items-center gap-4 shadow-2xl w-full max-w-xs text-center" style={{ fontFamily: "'Inter', sans-serif" }}>
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle size={44} className="text-green-600" />
        </div>
        <div>
          <p className="text-lg font-black text-gray-900">Money Transferred!</p>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">
            RM {result.amount.toFixed(2)} has been sent to your {result.bankName} account
            ending in <span className="font-semibold">{result.accountNumber.slice(-4)}</span>.
            It may take 1–3 business days to reflect.
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-full bg-[#A855F7] hover:bg-[#9333EA] text-white font-bold py-3.5 rounded-2xl transition-colors mt-2"
        >
          Done
        </button>
      </div>
    </div>
  );
}

export default function ClaimEarningsScreen() {
  const { session } = useAuth();

  const [profile,  setProfile]  = useState(null);
  const [sales,    setSales]    = useState([]);
  const [payouts,  setPayouts]  = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState(null);

  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claiming,       setClaiming]       = useState(false);
  const [claimResult,    setClaimResult]    = useState(null);

  useEffect(() => {
    if (!session) { setIsLoading(false); return; }
    fetchData();
  }, [session]);

  async function fetchData() {
    setIsLoading(true);
    setError(null);
    const uid = session.user.id;
    try {
      const [profileRes, salesRes, payoutsRes] = await Promise.all([
        supabase.from('profiles').select('bank_name, account_name, account_number, full_name').eq('id', uid).maybeSingle(),
        supabase
          .from('transactions')
          .select('id, amount, created_at, payout_claimed, listing:listings(id, title, image_url)')
          .eq('seller_id', uid)
          .eq('status', 'completed')
          .order('created_at', { ascending: false }),
        supabase
          .from('payouts')
          .select('id, amount, bank_name, account_number, status, created_at')
          .eq('user_id', uid)
          .order('created_at', { ascending: false }),
      ]);
      if (profileRes.error) throw profileRes.error;
      setProfile(profileRes.data ?? {});
      setSales(salesRes.data ?? []);
      setPayouts(payoutsRes.data ?? []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  // Claimable Earnings is computed directly from real sales — the sum of every
  // completed sale that hasn't been paid out yet — rather than a separately
  // tracked balance number, so it can never drift out of sync with what
  // "Your Sales" below actually shows.
  const salesTotal      = sales.reduce((s, tx) => s + Number(tx.amount ?? 0), 0);
  const claimableAmount = sales.filter(tx => !tx.payout_claimed).reduce((s, tx) => s + Number(tx.amount ?? 0), 0);

  async function handleConfirmClaim({ bankName, accountName, accountNumber }) {
    setClaiming(true);
    try {
      const uid = session.user.id;

      // Marks exactly the sales that made up claimableAmount as paid out, so
      // a repeat claim (or a screenshot mid-demo) can't double-count them —
      // and any new sale that completes afterwards starts fresh as unclaimed.
      const { error: updateErr } = await supabase
        .from('transactions')
        .update({ payout_claimed: true })
        .eq('seller_id', uid)
        .eq('status', 'completed')
        .eq('payout_claimed', false);
      if (updateErr) throw updateErr;

      await supabase.from('profiles').update({
        bank_name:       bankName,
        account_name:    accountName,
        account_number:  accountNumber,
      }).eq('id', uid);

      await supabase.from('payouts').insert({
        user_id:        uid,
        amount:         claimableAmount,
        bank_name:       bankName,
        account_name:    accountName,
        account_number:  accountNumber,
        status:         'completed',
      });

      setProfile(p => ({ ...p, bank_name: bankName, account_name: accountName, account_number: accountNumber }));
      setShowClaimModal(false);
      setClaimResult({ amount: claimableAmount, bankName, accountNumber });
      fetchData(); // re-fetch so sales flip to "Claimed" and the total resets to RM 0.00
    } catch (err) {
      setError(err.message);
    } finally {
      setClaiming(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="max-w-lg mx-auto px-4 py-5 flex flex-col gap-4">

        {isLoading ? (
          <div className="flex flex-col gap-4 animate-pulse">
            <div className="h-40 bg-gray-200 rounded-3xl" />
            <div className="h-48 bg-gray-200 rounded-2xl" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center py-16 gap-3">
            <p className="text-red-500 text-sm">{error}</p>
            <button onClick={fetchData} className="text-[#A855F7] text-sm font-semibold hover:underline">Retry</button>
          </div>
        ) : (
          <>
            {/* ── Claimable balance hero ── */}
            <div className="rounded-3xl overflow-hidden bg-gradient-to-br from-[#1E1B4B] to-[#7C3AED] p-6 flex flex-col gap-4 shadow-lg shadow-purple-900/20">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-purple-300 text-xs font-semibold uppercase tracking-wider">Claimable Earnings</p>
                  <p className="text-white text-4xl font-black mt-1 tracking-tight">RM {claimableAmount.toFixed(2)}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                  <Banknote size={22} className="text-white" />
                </div>
              </div>
              <p className="text-purple-200 text-xs">From {sales.length} completed sale{sales.length !== 1 ? 's' : ''}</p>
              <button
                onClick={() => setShowClaimModal(true)}
                disabled={claimableAmount <= 0}
                className="w-full bg-white text-[#7C3AED] font-bold py-3.5 rounded-2xl hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                <Banknote size={18} />
                {claimableAmount > 0 ? `Claim RM ${claimableAmount.toFixed(2)}` : 'Nothing to claim yet'}
              </button>
            </div>

            {/* ── Your Sales ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 pt-4 pb-2 border-b border-gray-50 flex items-center justify-between">
                <h2 className="font-bold text-gray-900 text-sm">Your Sales</h2>
                <span className="text-xs text-gray-400">RM {salesTotal.toFixed(2)} total</span>
              </div>
              {sales.length === 0 ? (
                <div className="flex flex-col items-center py-10 gap-2">
                  <span className="material-symbols-outlined text-[36px] text-gray-300">storefront</span>
                  <p className="text-gray-400 text-sm">No completed sales yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {sales.map(tx => (
                    <div key={tx.id} className="flex items-center gap-3 px-4 py-3.5">
                      <div className="w-11 h-11 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                        {tx.listing?.image_url && (
                          <img src={tx.listing.image_url} alt={tx.listing.title} className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{tx.listing?.title ?? 'Item'}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <p className="text-[11px] text-gray-400">{formatDate(tx.created_at)}</p>
                          {tx.payout_claimed ? (
                            <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">Claimed</span>
                          ) : (
                            <span className="text-[10px] font-semibold text-green-700 bg-green-50 px-1.5 py-0.5 rounded-full">Unclaimed</span>
                          )}
                        </div>
                      </div>
                      <span className={`text-sm font-bold shrink-0 ${tx.payout_claimed ? 'text-gray-400' : 'text-green-600'}`}>
                        +RM {Number(tx.amount ?? 0).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Claim History ── */}
            {payouts.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-4 pt-4 pb-2 border-b border-gray-50">
                  <h2 className="font-bold text-gray-900 text-sm">Claim History</h2>
                </div>
                <div className="divide-y divide-gray-50">
                  {payouts.map(p => (
                    <div key={p.id} className="flex items-center gap-3 px-4 py-3.5">
                      <div className="w-9 h-9 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
                        <Banknote size={16} className="text-[#A855F7]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800">{p.bank_name} •••• {p.account_number?.slice(-4)}</p>
                        <p className="text-[11px] text-gray-400">{formatDate(p.created_at)}</p>
                      </div>
                      <span className="text-sm font-bold text-gray-800 shrink-0">RM {Number(p.amount ?? 0).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <BottomNav activeTab="Account" />

      {showClaimModal && (
        <ClaimModal
          amount={claimableAmount}
          defaults={profile ?? {}}
          loading={claiming}
          onClose={() => setShowClaimModal(false)}
          onConfirm={handleConfirmClaim}
        />
      )}

      {claimResult && (
        <SuccessModal result={claimResult} onClose={() => setClaimResult(null)} />
      )}
    </div>
  );
}
