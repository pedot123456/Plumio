import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import BottomNav from '../components/BottomNav';
import { Plus, Minus, ArrowDownLeft, ArrowUpRight, X, CheckCircle } from 'lucide-react';

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-MY', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function StatusBadge({ status }) {
  const map = {
    completed:  'bg-green-100 text-green-700',
    pending:    'bg-amber-100 text-amber-700',
    cancelled:  'bg-red-100   text-red-600',
    in_escrow:  'bg-blue-100  text-blue-700',
  };
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full capitalize ${map[status] ?? 'bg-gray-100 text-gray-500'}`}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
}

// ── Amount-entry modal ──────────────────────────────────────────
function AmountModal({ mode, balance, onConfirm, onClose, loading }) {
  const [amount, setAmount] = useState('');
  const parsed  = parseFloat(amount) || 0;
  const isTopUp = mode === 'topup';
  const invalid = parsed <= 0 || (!isTopUp && parsed > balance);

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative bg-white rounded-t-3xl w-full max-w-lg p-6 z-10 flex flex-col gap-5"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-gray-900 text-lg">
            {isTopUp ? 'Top Up Wallet' : 'Withdraw Funds'}
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <X size={16} className="text-gray-600" />
          </button>
        </div>

        <div className="bg-gray-50 rounded-2xl p-4 flex flex-col gap-1">
          <p className="text-xs text-gray-400 font-medium">Current Balance</p>
          <p className="text-2xl font-black text-[#A855F7]">RM {Number(balance).toFixed(2)}</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Amount (RM)
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">RM</span>
            <input
              type="number"
              min="1"
              step="0.01"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full border border-gray-200 rounded-xl pl-12 pr-4 py-3.5 text-gray-900 font-bold text-lg focus:outline-none focus:ring-2 focus:ring-[#A855F7]/30 focus:border-[#A855F7] transition-all"
            />
          </div>
          {!isTopUp && parsed > balance && (
            <p className="text-xs text-red-500 font-medium">Insufficient balance</p>
          )}
        </div>

        {/* Quick amounts */}
        <div className="grid grid-cols-4 gap-2">
          {[10, 20, 50, 100].map(q => (
            <button
              key={q}
              onClick={() => setAmount(String(q))}
              className={`py-2 rounded-xl text-sm font-semibold border transition-all ${
                parseFloat(amount) === q
                  ? 'border-[#A855F7] bg-purple-50 text-[#A855F7]'
                  : 'border-gray-200 text-gray-500 hover:border-purple-200'
              }`}
            >
              RM {q}
            </button>
          ))}
        </div>

        <button
          onClick={() => onConfirm(parsed)}
          disabled={invalid || loading}
          className="w-full bg-[#A855F7] hover:bg-[#9333EA] disabled:opacity-50 text-white font-bold py-4 rounded-2xl transition-colors flex items-center justify-center gap-2"
        >
          {loading
            ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : isTopUp ? <><Plus size={18} /> Top Up RM {parsed > 0 ? parsed.toFixed(2) : '0.00'}</>
                      : <><Minus size={18} /> Withdraw RM {parsed > 0 ? parsed.toFixed(2) : '0.00'}</>
          }
        </button>
      </div>
    </div>
  );
}

// ── Main screen ─────────────────────────────────────────────────
export default function WalletScreen() {
  const { session }       = useAuth();
  const [profile,     setProfile]     = useState(null);
  const [transactions,setTransactions]= useState([]);
  const [isLoading,   setIsLoading]   = useState(true);
  const [error,       setError]       = useState(null);
  const [modal,       setModal]       = useState(null); // 'topup' | 'withdraw' | null
  const [actionLoad,  setActionLoad]  = useState(false);
  const [toast,       setToast]       = useState('');

  useEffect(() => {
    if (!session) { setIsLoading(false); return; }
    fetchData();
  }, [session]);

  async function fetchData() {
    setIsLoading(true);
    setError(null);
    const uid = session.user.id;
    try {
      const [profileRes, txnRes] = await Promise.all([
        supabase.from('profiles').select('balance, full_name').eq('id', uid).maybeSingle(),
        supabase
          .from('transactions')
          .select('id, amount, status, created_at, buyer_id, listing:listings(title)')
          .or(`buyer_id.eq.${uid},seller_id.eq.${uid}`)
          .order('created_at', { ascending: false })
          .limit(20),
      ]);
      if (profileRes.error) throw profileRes.error;
      setProfile(profileRes.data ?? { balance: 0, full_name: '' });
      setTransactions(txnRes.data ?? []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleTopUp(amount) {
    setActionLoad(true);
    const newBalance = Number(profile.balance ?? 0) + amount;
    const { error } = await supabase
      .from('profiles')
      .update({ balance: newBalance })
      .eq('id', session.user.id);
    setActionLoad(false);
    if (!error) {
      setProfile(p => ({ ...p, balance: newBalance }));
      setModal(null);
      showToast(`RM ${amount.toFixed(2)} added to your wallet`);
    }
  }

  async function handleWithdraw(amount) {
    setActionLoad(true);
    const newBalance = Number(profile.balance ?? 0) - amount;
    const { error } = await supabase
      .from('profiles')
      .update({ balance: newBalance })
      .eq('id', session.user.id);
    setActionLoad(false);
    if (!error) {
      setProfile(p => ({ ...p, balance: newBalance }));
      setModal(null);
      showToast(`RM ${amount.toFixed(2)} withdrawn`);
    }
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  const balance = Number(profile?.balance ?? 0);
  const uid     = session?.user?.id;

  return (
    <div className="min-h-screen bg-gray-50 pb-24" style={{ fontFamily: "'Inter', sans-serif" }}>

      <div className="max-w-lg mx-auto px-4 py-5 flex flex-col gap-4">

        {isLoading ? (
          <div className="flex flex-col gap-4 animate-pulse">
            <div className="h-44 bg-gray-200 rounded-3xl" />
            <div className="h-12 bg-gray-200 rounded-2xl" />
            <div className="h-48 bg-gray-200 rounded-2xl" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center py-16 gap-3">
            <p className="text-red-500 text-sm">{error}</p>
            <button onClick={fetchData} className="text-[#A855F7] text-sm font-semibold hover:underline">Retry</button>
          </div>
        ) : (
          <>
            {/* ── Balance hero card ── */}
            <div className="rounded-3xl overflow-hidden bg-gradient-to-br from-[#1E1B4B] to-[#7C3AED] p-6 flex flex-col gap-4 shadow-lg shadow-purple-900/20">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-purple-300 text-xs font-semibold uppercase tracking-wider">PlumioPay Balance</p>
                  <p className="text-white text-4xl font-black mt-1 tracking-tight">
                    RM {balance.toFixed(2)}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-white text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    account_balance_wallet
                  </span>
                </div>
              </div>
              <p className="text-purple-200 text-xs">{session?.user?.email}</p>
            </div>

            {/* ── Action buttons ── */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setModal('topup')}
                className="flex items-center justify-center gap-2 bg-[#A855F7] hover:bg-[#9333EA] text-white font-bold py-3.5 rounded-2xl transition-colors shadow-sm shadow-purple-200"
              >
                <Plus size={18} />
                Top Up
              </button>
              <button
                onClick={() => setModal('withdraw')}
                disabled={balance <= 0}
                className="flex items-center justify-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50 text-gray-700 font-bold py-3.5 rounded-2xl transition-colors"
              >
                <Minus size={18} />
                Withdraw
              </button>
            </div>

            {/* ── Transaction history ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 pt-4 pb-2 border-b border-gray-50">
                <h2 className="font-bold text-gray-900 text-sm">Transaction History</h2>
              </div>

              {transactions.length === 0 ? (
                <div className="flex flex-col items-center py-10 gap-2">
                  <span className="material-symbols-outlined text-[36px] text-gray-300">receipt_long</span>
                  <p className="text-gray-400 text-sm">No transactions yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {transactions.map(tx => {
                    const isIncoming = tx.buyer_id !== uid;
                    return (
                      <div key={tx.id} className="flex items-center gap-3 px-4 py-3.5">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${isIncoming ? 'bg-green-50' : 'bg-red-50'}`}>
                          {isIncoming
                            ? <ArrowDownLeft size={18} className="text-green-600" />
                            : <ArrowUpRight  size={18} className="text-red-500"   />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">
                            {tx.listing?.title ?? 'Transaction'}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <StatusBadge status={tx.status} />
                            <span className="text-[11px] text-gray-400">{formatDate(tx.created_at)}</span>
                          </div>
                        </div>
                        <span className={`text-sm font-bold shrink-0 ${isIncoming ? 'text-green-600' : 'text-gray-800'}`}>
                          {isIncoming ? '+' : '−'} RM {Number(tx.amount ?? 0).toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <BottomNav activeTab="Account" />

      {/* ── Modals ── */}
      {modal && (
        <AmountModal
          mode={modal}
          balance={balance}
          loading={actionLoad}
          onClose={() => setModal(null)}
          onConfirm={modal === 'topup' ? handleTopUp : handleWithdraw}
        />
      )}

      {/* ── Toast ── */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[80] flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-4 py-2.5 rounded-full shadow-xl animate-bounce-once">
          <CheckCircle size={16} className="text-green-400" />
          {toast}
        </div>
      )}
    </div>
  );
}
