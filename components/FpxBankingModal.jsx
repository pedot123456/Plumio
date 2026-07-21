import React, { useState, useEffect, useRef } from 'react';

// ── Static reference data ──────────────────────────────────────
const BANKS = [
  { id: 'maybank',     name: 'Maybank2u',           bg: '#FFD700', fg: '#1a1a1a', abbr: 'M2U'  },
  { id: 'cimb',       name: 'CIMB Clicks',          bg: '#C8102E', fg: '#ffffff', abbr: 'CIMB' },
  { id: 'publicbank', name: 'Public Bank PBe',       bg: '#003087', fg: '#ffffff', abbr: 'PBe'  },
  { id: 'rhb',        name: 'RHB Now',              bg: '#1B5E91', fg: '#ffffff', abbr: 'RHB'  },
  { id: 'hongleong',  name: 'Hong Leong Connect',   bg: '#00863E', fg: '#ffffff', abbr: 'HLB'  },
  { id: 'ambank',     name: 'AmOnline',             bg: '#E31837', fg: '#ffffff', abbr: 'AM'   },
  { id: 'bsn',        name: 'BSN myBSN',            bg: '#005B8E', fg: '#ffffff', abbr: 'BSN'  },
  { id: 'affin',      name: 'Affin Online',         bg: '#004B8D', fg: '#ffffff', abbr: 'AFN'  },
  { id: 'ocbc',       name: 'OCBC OneTouch',        bg: '#C8102E', fg: '#ffffff', abbr: 'OCBC' },
  { id: 'hsbc',       name: 'HSBC Online Banking',  bg: '#DB0011', fg: '#ffffff', abbr: 'HSBC' },
];

const CAT_STYLE = {
  Food:      'bg-orange-100 text-orange-700',
  Income:    'bg-green-100 text-green-700',
  Bills:     'bg-red-100 text-red-700',
  Shopping:  'bg-purple-100 text-purple-700',
  Transport: 'bg-blue-100 text-blue-700',
  Transfer:  'bg-gray-100 text-gray-600',
};
const ALL_CATS = ['All', 'Food', 'Income', 'Bills', 'Shopping', 'Transport', 'Transfer'];

const INIT_ACCOUNTS = [
  { id: 'sav', type: 'Savings',  number: '5621-4890-1234', balance: 3842.50  },
  { id: 'cur', type: 'Current',  number: '8812-3347-9910', balance: 12450.00 },
];
const INIT_TXN = [
  { id: 't1', date: '21 Jul 2026', desc: 'Grab Food',          amount: -28.50,   cat: 'Food'      },
  { id: 't2', date: '20 Jul 2026', desc: 'Salary Credit',       amount: 4200.00,  cat: 'Income'    },
  { id: 't3', date: '19 Jul 2026', desc: 'TNB Electric Bill',   amount: -142.00,  cat: 'Bills'     },
  { id: 't4', date: '18 Jul 2026', desc: 'Shopee Online',       amount: -67.90,   cat: 'Shopping'  },
  { id: 't5', date: '17 Jul 2026', desc: 'Touch n Go Reload',   amount: -50.00,   cat: 'Transport' },
  { id: 't6', date: '16 Jul 2026', desc: 'KFC Delivery',        amount: -19.90,   cat: 'Food'      },
  { id: 't7', date: '15 Jul 2026', desc: 'Freelance Payment',   amount: 800.00,   cat: 'Income'    },
  { id: 't8', date: '14 Jul 2026', desc: 'Astro Subscription',  amount: -109.90,  cat: 'Bills'     },
  { id: 't9', date: '13 Jul 2026', desc: 'MRT Card Top-Up',     amount: -20.00,   cat: 'Transport' },
];
const MOCK_USER = { name: 'AHMAD FIRDAUS BIN RAZAK', id: 'USR-8821-4592', phone: '+60 11-**** 4821' };

function genTac()  { return String(Math.floor(100000 + Math.random() * 900000)); }
function genRef()  { return 'FPX-' + Date.now().toString(36).toUpperCase(); }
function dateFmt() { return new Date().toLocaleDateString('en-MY', { day:'2-digit', month:'short', year:'numeric' }); }
function maskAcc(num) { return '•••• ' + num.slice(-4); }

// ── Sub-components ─────────────────────────────────────────────
function CloseBtn({ onClick, light }) {
  return (
    <button onClick={onClick} className={`p-1 rounded-full transition-colors ${light ? 'text-white/60 hover:text-white hover:bg-white/10' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  );
}

function BackBtn({ onClick, light }) {
  return (
    <button onClick={onClick} className={`p-1 rounded-full transition-colors ${light ? 'text-white/70 hover:text-white hover:bg-white/10' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
    </button>
  );
}

function TacBox({ value, onChange, hasError }) {
  const inputRefs = Array.from({ length: 6 }, () => useRef(null));
  const digits    = value.split('').concat(Array(6).fill('')).slice(0, 6);

  function handleKey(e, i) {
    if (e.key === 'Backspace') {
      if (digits[i]) {
        onChange(value.slice(0, i) + value.slice(i + 1));
      } else if (i > 0) {
        inputRefs[i - 1].current?.focus();
        onChange(value.slice(0, i - 1) + value.slice(i));
      }
      return;
    }
    if (/^\d$/.test(e.key)) {
      const next = value.slice(0, i) + e.key + value.slice(i + 1);
      onChange(next.slice(0, 6));
      if (i < 5) inputRefs[i + 1].current?.focus();
    }
  }

  return (
    <div className="flex gap-2 justify-center">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={inputRefs[i]}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={() => {}}
          onKeyDown={e => handleKey(e, i)}
          onFocus={e => e.target.select()}
          className={`w-11 h-13 text-center text-xl font-bold border-2 rounded-lg outline-none transition-colors focus:ring-2 ${
            hasError
              ? 'border-red-400 bg-red-50 focus:ring-red-200'
              : d
              ? 'border-blue-500 bg-blue-50 focus:ring-blue-200'
              : 'border-gray-300 focus:border-blue-400 focus:ring-blue-100'
          }`}
          style={{ height: 52 }}
        />
      ))}
    </div>
  );
}

function VirtualCard({ account, userName, bankAbbr, bankBg, bankFg }) {
  return (
    <div
      className="rounded-2xl p-5 relative overflow-hidden text-white shadow-lg"
      style={{ background: `linear-gradient(135deg, ${bankBg ?? '#7C3AED'} 0%, ${bankBg ?? '#7C3AED'}cc 100%)`, color: bankFg ?? '#fff' }}
    >
      {/* Decorative circles */}
      <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full opacity-10" style={{ background: '#fff' }} />
      <div className="absolute -bottom-8 -left-4 w-36 h-36 rounded-full opacity-10" style={{ background: '#fff' }} />

      <div className="relative z-10 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="font-black text-sm tracking-widest opacity-80">{bankAbbr ?? 'BANK'}</span>
          <span className="text-xs font-semibold opacity-70">VISA DEBIT</span>
        </div>
        <p className="font-mono text-lg tracking-widest font-semibold">
          •••• •••• •••• {account?.number?.slice(-4) ?? '0000'}
        </p>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[10px] opacity-60 uppercase tracking-wider">Card Holder</p>
            <p className="text-sm font-bold">{userName ?? 'ACCOUNT HOLDER'}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] opacity-60 uppercase tracking-wider">Expires</p>
            <p className="text-sm font-bold">12/29</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
export default function FpxBankingModal({ total = 0, orderId, onApprove, onClose }) {
  const [view,         setView]         = useState('bank-select');
  const [bankId,       setBankId]       = useState(null);
  const [bankSearch,   setBankSearch]   = useState('');
  // Login
  const [username,     setUsername]     = useState('');
  const [password,     setPassword]     = useState('');
  const [showPw,       setShowPw]       = useState(false);
  const [loginErr,     setLoginErr]     = useState('');
  const [logging,      setLogging]      = useState(false);
  // TAC
  const [tacGen,       setTacGen]       = useState('');
  const [tacInput,     setTacInput]     = useState('');
  const [tacErr,       setTacErr]       = useState('');
  const [tacTimer,     setTacTimer]     = useState(60);
  // Dashboard
  const [accounts,     setAccounts]     = useState(INIT_ACCOUNTS);
  const [transactions, setTransactions] = useState(INIT_TXN);
  const [selAcc,       setSelAcc]       = useState('sav');
  const [dashTab,      setDashTab]      = useState('overview');
  const [txSearch,     setTxSearch]     = useState('');
  const [txCat,        setTxCat]        = useState('All');
  // Payment
  const [confirming,   setConfirming]   = useState(false);
  const [txRef,        setTxRef]        = useState('');
  const [navCountdown, setNavCountdown] = useState(3);
  // Admin
  const [adminPin,     setAdminPin]     = useState('');
  const [adminPinErr,  setAdminPinErr]  = useState(false);
  const [adminTab,     setAdminTab]     = useState('users');
  const [injectAcc,    setInjectAcc]    = useState('sav');
  const [injectAmt,    setInjectAmt]    = useState('');
  const [simulateFail, setSimulateFail] = useState(false);
  const [newDesc,      setNewDesc]      = useState('');
  const [newAmt,       setNewAmt]       = useState('');
  const [newCat,       setNewCat]       = useState('Transfer');
  const [newAmtSign,   setNewAmtSign]   = useState('-');

  const bank    = BANKS.find(b => b.id === bankId);
  const account = accounts.find(a => a.id === selAcc);
  const filteredBanks = BANKS.filter(b =>
    b.name.toLowerCase().includes(bankSearch.toLowerCase()) ||
    b.abbr.toLowerCase().includes(bankSearch.toLowerCase())
  );
  const filteredTx = transactions.filter(t => {
    if (txCat !== 'All' && t.cat !== txCat) return false;
    if (txSearch && !t.desc.toLowerCase().includes(txSearch.toLowerCase())) return false;
    return true;
  });

  // TAC countdown
  useEffect(() => {
    if (view !== 'tac' || tacTimer <= 0) return;
    const id = setInterval(() => setTacTimer(n => n - 1), 1000);
    return () => clearInterval(id);
  }, [view, tacTimer]);

  // Auto-navigate to order confirmation after success screen
  useEffect(() => {
    if (view !== 'success') return;
    setNavCountdown(3);
    const tick = setInterval(() => setNavCountdown(n => n - 1), 1000);
    const nav  = setTimeout(() => onApprove?.(), 3000);
    return () => { clearInterval(tick); clearTimeout(nav); };
  }, [view]);

  // ── Actions ─────────────────────────────────────────────────
  function selectBank(id) {
    setBankId(id); setLoginErr(''); setUsername(''); setPassword('');
    setView('login');
  }

  function handleLogin() {
    if (!username.trim() || !password.trim()) { setLoginErr('Please enter your username and password.'); return; }
    setLogging(true);
    setTimeout(() => {
      const code = genTac();
      setTacGen(code); setTacInput(''); setTacErr(''); setTacTimer(60);
      setLogging(false); setView('tac');
    }, 1300);
  }

  function handleVerifyTac() {
    if (tacInput !== tacGen) { setTacErr('Incorrect TAC. Please check your SMS and try again.'); return; }
    setTacErr(''); setView('dashboard');
  }

  function resendTac() {
    const code = genTac();
    setTacGen(code); setTacInput(''); setTacErr(''); setTacTimer(60);
  }

  function handleConfirmPayment() {
    if (simulateFail)          { setView('fail');         return; }
    if (account.balance < total) { setView('insufficient'); return; }
    setConfirming(true);
    setTimeout(() => {
      const ref = genRef();
      setTxRef(ref);
      setAccounts(prev => prev.map(a => a.id === selAcc ? { ...a, balance: a.balance - total } : a));
      setTransactions(prev => [{
        id: `t${Date.now()}`, date: dateFmt(),
        desc: 'Plumio Marketplace Sdn Bhd', amount: -total, cat: 'Transfer', ref,
      }, ...prev]);
      setConfirming(false);
      setView('success');
    }, 2000);
  }

  function handleAdminLogin() {
    if (adminPin === '0000') { setAdminPinErr(false); setAdminPin(''); setView('admin'); }
    else { setAdminPinErr(true); setAdminPin(''); }
  }

  function injectBalance() {
    const amt = parseFloat(injectAmt);
    if (!amt || amt <= 0) return;
    setAccounts(prev => prev.map(a => a.id === injectAcc ? { ...a, balance: a.balance + amt } : a));
    setInjectAmt('');
  }

  function addMockTx() {
    const raw = parseFloat(newAmt);
    if (!newDesc.trim() || !raw || raw <= 0) return;
    const signed = newAmtSign === '-' ? -raw : raw;
    setTransactions(prev => [{
      id: `t${Date.now()}`, date: dateFmt(), desc: newDesc.trim(), amount: signed, cat: newCat,
    }, ...prev]);
    setNewDesc(''); setNewAmt('');
  }

  // ── Shared bank portal header ──────────────────────────────
  function BankHeader({ title, subtitle, onBack }) {
    return (
      <div style={{ background: bank?.bg ?? '#003087', color: bank?.fg ?? '#fff' }}
        className="px-5 py-4 flex items-center gap-3 shrink-0"
      >
        {onBack && <BackBtn onClick={onBack} light />}
        <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-black text-sm"
          style={{ background: 'rgba(255,255,255,0.2)' }}>
          {bank?.abbr ?? 'FPX'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm leading-tight">{title}</p>
          {subtitle && <p className="text-[11px] opacity-70 leading-tight">{subtitle}</p>}
        </div>
        <CloseBtn onClick={onClose} light />
      </div>
    );
  }

  function MerchantBanner() {
    return (
      <div className="bg-blue-50 border-b border-blue-100 px-5 py-2.5 flex items-center justify-between shrink-0">
        <div>
          <p className="text-[10px] text-gray-400 uppercase font-medium tracking-wider">Paying to</p>
          <p className="text-sm font-bold text-gray-800">Plumio Marketplace Sdn Bhd</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-gray-400 uppercase font-medium tracking-wider">Amount</p>
          <p className="text-base font-black" style={{ color: bank?.bg ?? '#003087' }}>RM {total.toFixed(2)}</p>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════
  const isWide = view === 'admin' || view === 'dashboard';

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div
        className="bg-white rounded-2xl w-full overflow-hidden shadow-2xl flex flex-col transition-all duration-200"
        style={{ maxWidth: isWide ? 620 : 420, maxHeight: '94vh' }}
        onClick={e => e.stopPropagation()}
      >

        {/* ═══════════════════════════════════════════════════════
            BANK SELECT
        ═══════════════════════════════════════════════════════ */}
        {view === 'bank-select' && (
          <>
            <div className="bg-[#003087] px-5 py-4 flex items-center gap-3 shrink-0">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center font-black text-white text-sm">FPX</div>
              <div className="flex-1">
                <p className="text-white font-bold text-sm leading-tight">FPX Online Banking</p>
                <p className="text-blue-200 text-[11px]">Malaysia Interbank Funds Transfer</p>
              </div>
              <CloseBtn onClick={onClose} light />
            </div>

            <div className="bg-blue-50 border-b border-blue-100 px-5 py-3 flex items-center justify-between shrink-0">
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-medium tracking-wider">Merchant</p>
                <p className="text-sm font-bold text-gray-800">Plumio Marketplace Sdn Bhd</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-400 uppercase font-medium tracking-wider">Total</p>
                <p className="text-xl font-black text-[#003087]">RM {total.toFixed(2)}</p>
              </div>
            </div>

            <div className="px-5 py-4 flex-1 overflow-y-auto flex flex-col gap-4">
              <p className="text-sm font-semibold text-gray-700">Select Your Bank</p>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="m21 21-4.35-4.35"/>
                  </svg>
                </span>
                <input type="text" value={bankSearch} onChange={e => setBankSearch(e.target.value)}
                  placeholder="Search bank name…"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#003087] focus:ring-2 focus:ring-[#003087]/20 transition-all" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                {filteredBanks.map(b => (
                  <button key={b.id} onClick={() => selectBank(b.id)}
                    className="flex items-center gap-3 border border-gray-200 rounded-xl px-3 py-3 hover:border-[#003087] hover:bg-blue-50 transition-all text-left group">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-black text-xs"
                      style={{ background: b.bg, color: b.fg }}>{b.abbr}</div>
                    <span className="text-xs font-medium text-gray-700 group-hover:text-[#003087] leading-snug">{b.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-100 px-5 py-3 flex items-center justify-between shrink-0">
              <p className="text-[11px] text-gray-400 flex items-center gap-1">
                <span className="text-green-500 text-xs">🔒</span> SSL · Powered by FPX
              </p>
              <button onClick={() => setView('admin-auth')}
                className="text-[11px] text-gray-300 hover:text-gray-500 transition-colors">
                Admin
              </button>
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════
            ADMIN AUTH
        ═══════════════════════════════════════════════════════ */}
        {view === 'admin-auth' && (
          <>
            <div className="bg-gray-900 px-5 py-4 flex items-center gap-3 shrink-0">
              <BackBtn onClick={() => setView('bank-select')} light />
              <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-lg">🔐</div>
              <p className="text-white font-bold text-sm flex-1">Admin Access</p>
              <CloseBtn onClick={onClose} light />
            </div>

            <div className="px-6 py-8 flex flex-col items-center gap-5">
              <p className="text-sm text-gray-500 text-center">Enter the admin PIN to access the backend dashboard.</p>

              <div className="flex gap-2.5">
                {[0,1,2,3].map(i => (
                  <input key={i} type="password" inputMode="numeric" maxLength={1}
                    value={adminPin[i] ?? ''}
                    onChange={e => {
                      const v = adminPin.slice(0,i) + e.target.value + adminPin.slice(i+1);
                      setAdminPin(v.slice(0,4)); setAdminPinErr(false);
                    }}
                    className={`w-13 text-center text-2xl font-bold border-2 rounded-xl outline-none transition-colors focus:ring-2 ${
                      adminPinErr ? 'border-red-400 bg-red-50 focus:ring-red-200' : 'border-gray-300 focus:border-gray-700 focus:ring-gray-200'
                    }`}
                    style={{ width: 52, height: 56 }}
                  />
                ))}
              </div>
              {adminPinErr && <p className="text-xs text-red-500">Incorrect PIN. Try <strong>0000</strong>.</p>}

              <button onClick={handleAdminLogin}
                className="w-full bg-gray-900 hover:bg-gray-700 text-white font-semibold py-3 rounded-xl transition-colors text-sm">
                Enter Admin Panel
              </button>
              <p className="text-[11px] text-gray-400">Demo PIN: <strong>0000</strong></p>
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════
            LOGIN
        ═══════════════════════════════════════════════════════ */}
        {view === 'login' && (
          <>
            <BankHeader title={bank?.name} subtitle="Secure Internet Banking" onBack={() => setView('bank-select')} />
            <MerchantBanner />

            <div className="px-6 py-6 flex-1 overflow-y-auto flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Username / Account ID</label>
                <input type="text" value={username} onChange={e => { setUsername(e.target.value); setLoginErr(''); }}
                  placeholder="Enter your banking username"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Password</label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} value={password}
                    onChange={e => { setPassword(e.target.value); setLoginErr(''); }}
                    placeholder="Enter your password"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 pr-10 text-sm text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  />
                  <button type="button" onClick={() => setShowPw(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4.5 h-4.5" style={{ width: 18, height: 18 }}>
                      {showPw
                        ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round"/></>
                        : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                      }
                    </svg>
                  </button>
                </div>
                <button className="text-xs text-blue-600 self-end hover:underline">Forgot Password?</button>
              </div>

              {loginErr && (
                <p className="text-xs text-red-500 flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 shrink-0">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {loginErr}
                </p>
              )}

              <div className="text-[11px] text-gray-400 flex items-center gap-1.5 justify-center">
                <span className="text-green-500">🔒</span> Encrypted connection · Your credentials are never stored
              </div>
            </div>

            <div className="border-t border-gray-100 px-6 py-4 shrink-0">
              <button onClick={handleLogin} disabled={logging}
                className="w-full text-white font-bold py-3 rounded-xl transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-70"
                style={{ background: bank?.bg ?? '#003087' }}>
                {logging
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Verifying…</>
                  : 'Log In'}
              </button>
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════
            TAC / 2FA
        ═══════════════════════════════════════════════════════ */}
        {view === 'tac' && (
          <>
            <BankHeader title="Two-Factor Authentication" subtitle="Enter the TAC sent to your phone" onBack={() => setView('login')} />
            <MerchantBanner />

            <div className="px-6 py-6 flex-1 overflow-y-auto flex flex-col gap-5">
              {/* SMS preview banner */}
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-start gap-3">
                <span className="text-2xl">💬</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-green-700 uppercase tracking-wider mb-1">SMS Received — {MOCK_USER.phone}</p>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    Your TAC for FPX payment of <strong>RM {total.toFixed(2)}</strong> to Plumio Marketplace is{' '}
                    <strong className="text-green-700 text-base tracking-widest">{tacGen}</strong>. Valid for 5 minutes. Do not share.
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-center gap-4">
                <p className="text-sm text-gray-600 text-center">Enter the 6-digit TAC from your SMS</p>
                <TacBox value={tacInput} onChange={setTacInput} hasError={!!tacErr} />
                {tacErr && <p className="text-xs text-red-500">{tacErr}</p>}
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  {tacTimer > 0
                    ? <><span className="w-3.5 h-3.5 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />Resend in {tacTimer}s</>
                    : <button onClick={resendTac} className="text-blue-600 font-medium hover:underline">Resend TAC</button>
                  }
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 px-6 py-4 shrink-0">
              <button onClick={handleVerifyTac} disabled={tacInput.length < 6}
                className="w-full text-white font-bold py-3 rounded-xl transition-all text-sm disabled:opacity-50"
                style={{ background: bank?.bg ?? '#003087' }}>
                Verify & Continue
              </button>
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════
            DASHBOARD
        ═══════════════════════════════════════════════════════ */}
        {view === 'dashboard' && (
          <>
            <BankHeader title={`Welcome, ${MOCK_USER.name.split(' ')[0]}`} subtitle={bank?.name} />

            {/* Tab bar */}
            <div className="flex border-b border-gray-200 shrink-0" style={{ background: bank?.bg ? `${bank.bg}15` : '#f9fafb' }}>
              {[
                { id: 'overview',     label: 'Overview',    icon: '🏠' },
                { id: 'history',      label: 'Transactions', icon: '📋' },
                { id: 'cards',        label: 'Cards',        icon: '💳' },
              ].map(t => (
                <button key={t.id} onClick={() => setDashTab(t.id)}
                  className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
                    dashTab === t.id
                      ? 'border-current text-gray-900'
                      : 'border-transparent text-gray-400 hover:text-gray-700'
                  }`}
                  style={dashTab === t.id ? { borderColor: bank?.bg ?? '#7C3AED' } : {}}>
                  <span>{t.icon}</span>{t.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto">

              {/* ── OVERVIEW TAB ── */}
              {dashTab === 'overview' && (
                <div className="p-5 flex flex-col gap-4">
                  {/* Account selector */}
                  <div className="flex gap-2">
                    {accounts.map(a => (
                      <button key={a.id} onClick={() => setSelAcc(a.id)}
                        className={`flex-1 rounded-xl border-2 px-4 py-3 text-left transition-all ${
                          selAcc === a.id ? 'border-current bg-opacity-5' : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                        style={selAcc === a.id ? { borderColor: bank?.bg ?? '#7C3AED', background: `${bank?.bg ?? '#7C3AED'}08` } : {}}>
                        <p className="text-[10px] text-gray-400 uppercase font-medium tracking-wider">{a.type}</p>
                        <p className="text-sm font-black text-gray-900 mt-0.5">RM {a.balance.toFixed(2)}</p>
                        <p className="text-[10px] text-gray-400 font-mono mt-0.5">{maskAcc(a.number)}</p>
                      </button>
                    ))}
                  </div>

                  {/* Balance card */}
                  <div className="rounded-2xl p-5 text-white" style={{ background: `linear-gradient(135deg, ${bank?.bg ?? '#7C3AED'}, ${bank?.bg ?? '#7C3AED'}99)` }}>
                    <p className="text-xs opacity-70 uppercase tracking-wider">Available Balance</p>
                    <p className="text-3xl font-black mt-1">RM {account?.balance.toFixed(2)}</p>
                    <p className="text-xs opacity-60 font-mono mt-2">{account?.number}</p>
                    <p className="text-xs opacity-60 mt-0.5">{account?.type} Account · {MOCK_USER.name}</p>
                  </div>

                  {/* Pay now CTA */}
                  <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-1">Pending Payment</p>
                      <p className="text-sm font-bold text-gray-800">Plumio Marketplace Sdn Bhd</p>
                      <p className="text-xl font-black text-amber-700 mt-0.5">RM {total.toFixed(2)}</p>
                    </div>
                    <button onClick={() => setView('confirm')}
                      className="text-white font-bold px-5 py-3 rounded-xl text-sm flex flex-col items-center gap-0.5 shrink-0"
                      style={{ background: bank?.bg ?? '#7C3AED' }}>
                      <span className="text-lg">💳</span>
                      Pay Now
                    </button>
                  </div>

                  {/* Recent transactions (last 4) */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Recent Transactions</p>
                      <button onClick={() => setDashTab('history')} className="text-xs font-medium" style={{ color: bank?.bg ?? '#7C3AED' }}>View All</button>
                    </div>
                    <div className="flex flex-col gap-2">
                      {transactions.slice(0, 4).map(t => (
                        <div key={t.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 ${CAT_STYLE[t.cat] ?? 'bg-gray-100 text-gray-600'}`}>
                            {t.cat === 'Food' ? '🍔' : t.cat === 'Income' ? '💰' : t.cat === 'Bills' ? '📄' : t.cat === 'Shopping' ? '🛍️' : t.cat === 'Transport' ? '🚌' : '💸'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{t.desc}</p>
                            <p className="text-[11px] text-gray-400">{t.date}</p>
                          </div>
                          <p className={`text-sm font-bold shrink-0 ${t.amount >= 0 ? 'text-green-600' : 'text-gray-800'}`}>
                            {t.amount >= 0 ? '+' : ''}RM {Math.abs(t.amount).toFixed(2)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── HISTORY TAB ── */}
              {dashTab === 'history' && (
                <div className="p-5 flex flex-col gap-3">
                  {/* Search */}
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                        <circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="m21 21-4.35-4.35"/>
                      </svg>
                    </span>
                    <input type="text" value={txSearch} onChange={e => setTxSearch(e.target.value)}
                      placeholder="Search transactions…"
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-all" />
                  </div>

                  {/* Category filters */}
                  <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                    {ALL_CATS.map(c => (
                      <button key={c} onClick={() => setTxCat(c)}
                        className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                          txCat === c
                            ? 'text-white shadow-sm'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                        style={txCat === c ? { background: bank?.bg ?? '#7C3AED' } : {}}>
                        {c}
                      </button>
                    ))}
                  </div>

                  {/* Transaction list */}
                  <div className="flex flex-col gap-1">
                    {filteredTx.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-8">No transactions found.</p>
                    ) : filteredTx.map(t => (
                      <div key={t.id} className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm shrink-0 ${CAT_STYLE[t.cat] ?? 'bg-gray-100 text-gray-600'}`}>
                          {t.cat === 'Food' ? '🍔' : t.cat === 'Income' ? '💰' : t.cat === 'Bills' ? '📄' : t.cat === 'Shopping' ? '🛍️' : t.cat === 'Transport' ? '🚌' : '💸'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{t.desc}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-[11px] text-gray-400">{t.date}</p>
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${CAT_STYLE[t.cat] ?? 'bg-gray-100 text-gray-500'}`}>{t.cat}</span>
                          </div>
                        </div>
                        <p className={`text-sm font-bold shrink-0 ${t.amount >= 0 ? 'text-green-600' : 'text-gray-800'}`}>
                          {t.amount >= 0 ? '+' : ''}RM {Math.abs(t.amount).toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── CARDS TAB ── */}
              {dashTab === 'cards' && (
                <div className="p-5 flex flex-col gap-4">
                  <VirtualCard account={account} userName={MOCK_USER.name} bankAbbr={bank?.abbr} bankBg={bank?.bg} bankFg={bank?.fg} />
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Card Status', value: 'Active ✅' },
                      { label: 'Card Type', value: 'Visa Debit' },
                      { label: 'Daily Limit', value: 'RM 5,000.00' },
                      { label: 'Online Limit', value: 'RM 2,000.00' },
                    ].map(item => (
                      <div key={item.label} className="bg-gray-50 rounded-xl p-3">
                        <p className="text-[10px] text-gray-400 uppercase font-medium tracking-wider">{item.label}</p>
                        <p className="text-sm font-bold text-gray-800 mt-1">{item.value}</p>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setView('confirm')}
                    className="w-full text-white font-bold py-3 rounded-xl transition-all text-sm"
                    style={{ background: bank?.bg ?? '#7C3AED' }}>
                    Pay RM {total.toFixed(2)} with This Card
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════
            CONFIRM
        ═══════════════════════════════════════════════════════ */}
        {view === 'confirm' && (
          <>
            <BankHeader title="Confirm Transfer" subtitle="Review details before authorising" onBack={() => setView('dashboard')} />

            <div className="px-6 py-5 flex-1 overflow-y-auto flex flex-col gap-4">
              <div className="bg-gray-50 rounded-2xl divide-y divide-gray-100">
                {[
                  { label: 'From',      value: `${account?.type} — ${account?.number}` },
                  { label: 'To',        value: 'Plumio Marketplace Sdn Bhd' },
                  { label: 'Ref No.',   value: orderId ?? `PLM-${Math.random().toString(36).slice(2,8).toUpperCase()}` },
                  { label: 'Method',    value: 'FPX Online Transfer' },
                  { label: 'Date',      value: dateFmt() },
                  { label: 'Amount',    value: `RM ${total.toFixed(2)}`, bold: true },
                ].map(row => (
                  <div key={row.label} className="flex items-start justify-between px-4 py-3">
                    <span className="text-xs text-gray-400 font-medium shrink-0 w-20">{row.label}</span>
                    <span className={`text-sm text-right flex-1 ${row.bold ? 'font-black text-gray-900 text-base' : 'font-medium text-gray-700'}`}>{row.value}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700">
                <span className="mt-0.5 shrink-0">⚠️</span>
                Once authorised, this payment cannot be reversed. Funds will be held in escrow and only released when you confirm receipt.
              </div>
            </div>

            <div className="border-t border-gray-100 px-6 py-4 flex gap-3 shrink-0">
              <button onClick={() => setView('dashboard')}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl text-sm transition-colors">
                Cancel
              </button>
              <button onClick={handleConfirmPayment} disabled={confirming}
                className="flex-1 text-white font-bold py-3 rounded-xl text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                style={{ background: bank?.bg ?? '#003087' }}>
                {confirming
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing…</>
                  : '✅ Authorise Payment'}
              </button>
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════
            SUCCESS
        ═══════════════════════════════════════════════════════ */}
        {view === 'success' && (
          <div className="px-6 py-8 flex flex-col items-center gap-5 text-center">
            {/* Animated success ring */}
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center animate-bounce-once">
                <span className="text-5xl">✅</span>
              </div>
              <div className="absolute inset-0 rounded-full border-4 border-green-300 animate-ping opacity-30" />
            </div>

            <div>
              <p className="font-black text-gray-900 text-2xl">Payment Authorised!</p>
              <p className="text-sm text-gray-500 mt-1">Your FPX transfer was successful.</p>
            </div>

            {/* Receipt rows */}
            <div className="w-full bg-gray-50 rounded-2xl divide-y divide-gray-100 text-left">
              {[
                { label: 'Reference', value: txRef || 'FPX-REF' },
                { label: 'Amount',    value: `RM ${total.toFixed(2)}` },
                { label: 'To',        value: 'Plumio Marketplace Sdn Bhd' },
                { label: 'Bank',      value: bank?.name ?? 'FPX' },
                { label: 'Status',    value: '✅ Authorised' },
              ].map(row => (
                <div key={row.label} className="flex justify-between px-4 py-2.5">
                  <span className="text-xs text-gray-400">{row.label}</span>
                  <span className="text-xs font-semibold text-gray-700">{row.value}</span>
                </div>
              ))}
            </div>

            {/* Auto-navigate CTA */}
            <div className="w-full flex flex-col gap-2">
              <button
                onClick={() => onApprove?.()}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
              >
                <span>🛍️</span>
                View My Order
              </button>
              <p className="text-xs text-gray-400">
                Redirecting in <span className="font-bold text-gray-600">{navCountdown > 0 ? navCountdown : 0}s</span>…
              </p>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
            INSUFFICIENT FUNDS
        ═══════════════════════════════════════════════════════ */}
        {view === 'insufficient' && (
          <div className="px-6 py-10 flex flex-col items-center gap-5 text-center">
            <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center text-4xl">❌</div>
            <div>
              <p className="font-black text-gray-900 text-xl">Insufficient Funds</p>
              <p className="text-sm text-gray-500 mt-1">
                Your {account?.type} account balance of <strong>RM {account?.balance.toFixed(2)}</strong> is below the required amount of <strong>RM {total.toFixed(2)}</strong>.
              </p>
            </div>
            <div className="flex gap-3 w-full">
              <button onClick={() => setView('dashboard')}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl text-sm transition-colors">
                Switch Account
              </button>
              <button onClick={onClose}
                className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 font-semibold py-3 rounded-xl text-sm transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
            SIMULATED FAILURE
        ═══════════════════════════════════════════════════════ */}
        {view === 'fail' && (
          <div className="px-6 py-10 flex flex-col items-center gap-5 text-center">
            <div className="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center text-4xl">⚠️</div>
            <div>
              <p className="font-black text-gray-900 text-xl">Transaction Declined</p>
              <p className="text-sm text-gray-500 mt-1">This payment was declined by the bank. This is a simulated failure triggered from the Admin Panel.</p>
            </div>
            <button onClick={() => { setSimulateFail(false); setView('confirm'); }}
              className="w-full bg-gray-900 hover:bg-gray-700 text-white font-bold py-3 rounded-xl text-sm transition-colors">
              Try Again
            </button>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
            ADMIN PANEL
        ═══════════════════════════════════════════════════════ */}
        {view === 'admin' && (
          <>
            <div className="bg-gray-900 px-5 py-4 flex items-center gap-3 shrink-0">
              <BackBtn onClick={() => setView('bank-select')} light />
              <span className="text-xl">🛠️</span>
              <div className="flex-1">
                <p className="text-white font-bold text-sm">FPX Admin Panel</p>
                <p className="text-gray-400 text-[11px]">Backend simulation dashboard</p>
              </div>
              <CloseBtn onClick={onClose} light />
            </div>

            {/* Admin tabs */}
            <div className="flex border-b border-gray-800 bg-gray-900 shrink-0">
              {[
                { id: 'users',    label: '👥 Users'        },
                { id: 'inject',   label: '💉 Inject Data'  },
                { id: 'simulate', label: '🔁 Simulate'     },
              ].map(t => (
                <button key={t.id} onClick={() => setAdminTab(t.id)}
                  className={`flex-1 py-3 text-xs font-semibold border-b-2 transition-colors ${
                    adminTab === t.id ? 'border-purple-400 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto bg-gray-950 p-5">

              {/* ── USERS TAB ── */}
              {adminTab === 'users' && (
                <div className="flex flex-col gap-4">
                  <p className="text-xs text-gray-400 uppercase font-semibold tracking-wider">Mock User Accounts</p>
                  <div className="bg-gray-900 rounded-xl overflow-hidden">
                    <div className="grid grid-cols-4 px-4 py-2 border-b border-gray-800">
                      {['Account', 'Type', 'Number', 'Balance'].map(h => (
                        <p key={h} className="text-[10px] text-gray-500 uppercase font-semibold">{h}</p>
                      ))}
                    </div>
                    {accounts.map(a => (
                      <div key={a.id} className="grid grid-cols-4 px-4 py-3 border-b border-gray-800/50 last:border-0">
                        <p className="text-xs text-gray-300 font-medium">{MOCK_USER.name.split(' ')[0]}</p>
                        <p className="text-xs text-gray-400">{a.type}</p>
                        <p className="text-xs text-gray-400 font-mono">{maskAcc(a.number)}</p>
                        <p className="text-xs text-green-400 font-mono font-bold">RM {a.balance.toFixed(2)}</p>
                      </div>
                    ))}
                  </div>

                  <p className="text-xs text-gray-400 uppercase font-semibold tracking-wider mt-2">All Mock Transactions ({transactions.length})</p>
                  <div className="bg-gray-900 rounded-xl overflow-hidden">
                    {transactions.slice(0, 8).map(t => (
                      <div key={t.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-800/50 last:border-0">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${CAT_STYLE[t.cat] ?? 'bg-gray-700 text-gray-300'}`}>{t.cat}</span>
                        <p className="text-xs text-gray-300 flex-1 truncate">{t.desc}</p>
                        <p className="text-xs font-mono shrink-0" style={{ color: t.amount >= 0 ? '#4ade80' : '#f87171' }}>
                          {t.amount >= 0 ? '+' : ''}RM {Math.abs(t.amount).toFixed(2)}
                        </p>
                      </div>
                    ))}
                    {transactions.length > 8 && (
                      <p className="text-center text-[11px] text-gray-600 py-2">+{transactions.length - 8} more rows</p>
                    )}
                  </div>
                </div>
              )}

              {/* ── INJECT DATA TAB ── */}
              {adminTab === 'inject' && (
                <div className="flex flex-col gap-5">
                  <div className="bg-gray-900 rounded-xl p-4 flex flex-col gap-3">
                    <p className="text-xs text-gray-400 uppercase font-semibold tracking-wider">Inject Balance</p>
                    <div className="flex gap-2">
                      <select value={injectAcc} onChange={e => setInjectAcc(e.target.value)}
                        className="flex-1 bg-gray-800 text-gray-300 text-sm border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500">
                        {accounts.map(a => <option key={a.id} value={a.id}>{a.type} — {maskAcc(a.number)}</option>)}
                      </select>
                      <input type="number" value={injectAmt} onChange={e => setInjectAmt(e.target.value)}
                        placeholder="RM amount"
                        className="w-28 bg-gray-800 text-gray-300 text-sm border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500" />
                      <button onClick={injectBalance}
                        className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
                        Inject
                      </button>
                    </div>
                    <div className="flex gap-2">
                      {accounts.map(a => (
                        <div key={a.id} className="flex-1 bg-gray-800 rounded-lg px-3 py-2">
                          <p className="text-[10px] text-gray-500">{a.type}</p>
                          <p className="text-sm font-bold text-green-400 font-mono">RM {a.balance.toFixed(2)}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-gray-900 rounded-xl p-4 flex flex-col gap-3">
                    <p className="text-xs text-gray-400 uppercase font-semibold tracking-wider">Add Mock Transaction</p>
                    <input type="text" value={newDesc} onChange={e => setNewDesc(e.target.value)}
                      placeholder="Description (e.g. PETRONAS)"
                      className="w-full bg-gray-800 text-gray-300 text-sm border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500" />
                    <div className="flex gap-2">
                      <select value={newAmtSign} onChange={e => setNewAmtSign(e.target.value)}
                        className="w-16 bg-gray-800 text-gray-300 text-sm border border-gray-700 rounded-lg px-2 py-2 focus:outline-none focus:border-purple-500">
                        <option value="-">−</option>
                        <option value="+">+</option>
                      </select>
                      <input type="number" value={newAmt} onChange={e => setNewAmt(e.target.value)}
                        placeholder="Amount"
                        className="flex-1 bg-gray-800 text-gray-300 text-sm border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500" />
                      <select value={newCat} onChange={e => setNewCat(e.target.value)}
                        className="w-28 bg-gray-800 text-gray-300 text-sm border border-gray-700 rounded-lg px-2 py-2 focus:outline-none focus:border-purple-500">
                        {ALL_CATS.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <button onClick={addMockTx}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors">
                      Add Transaction
                    </button>
                  </div>
                </div>
              )}

              {/* ── SIMULATE TAB ── */}
              {adminTab === 'simulate' && (
                <div className="flex flex-col gap-4">
                  <div className="bg-gray-900 rounded-xl p-4 flex flex-col gap-3">
                    <p className="text-xs text-gray-400 uppercase font-semibold tracking-wider">Payment Simulation</p>

                    <label className="flex items-center justify-between cursor-pointer">
                      <div>
                        <p className="text-sm font-semibold text-gray-200">Simulate Payment Failure</p>
                        <p className="text-xs text-gray-500 mt-0.5">Next payment authorisation will return a "Declined" error.</p>
                      </div>
                      <div onClick={() => setSimulateFail(f => !f)}
                        className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer shrink-0 ${simulateFail ? 'bg-red-500' : 'bg-gray-700'}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${simulateFail ? 'translate-x-7' : 'translate-x-1'}`} />
                      </div>
                    </label>

                    <div className="border-t border-gray-800 pt-3">
                      <p className="text-xs text-gray-400 uppercase font-semibold tracking-wider mb-2">Drain Account Balance</p>
                      {accounts.map(a => (
                        <div key={a.id} className="flex items-center justify-between py-2">
                          <div>
                            <p className="text-sm text-gray-300">{a.type} Account</p>
                            <p className="text-xs text-gray-500 font-mono">{maskAcc(a.number)}</p>
                          </div>
                          <button onClick={() => setAccounts(prev => prev.map(x => x.id === a.id ? { ...x, balance: 0 } : x))}
                            className="text-xs text-red-400 hover:text-red-300 border border-red-800 hover:border-red-600 px-3 py-1.5 rounded-lg transition-colors">
                            Set to RM 0
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-gray-800 pt-3">
                      <p className="text-xs text-gray-400 uppercase font-semibold tracking-wider mb-2">Reset All Data</p>
                      <button onClick={() => { setAccounts(INIT_ACCOUNTS); setTransactions(INIT_TXN); }}
                        className="w-full bg-red-900/40 hover:bg-red-900/70 text-red-400 text-sm font-semibold py-2.5 rounded-lg border border-red-800 transition-colors">
                        Reset Accounts &amp; Transactions
                      </button>
                    </div>
                  </div>

                  <div className="bg-gray-900 rounded-xl p-4">
                    <p className="text-xs text-gray-400 uppercase font-semibold tracking-wider mb-3">Current State</p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Simulate failure</span>
                        <span className={simulateFail ? 'text-red-400' : 'text-green-400'}>{simulateFail ? 'ON 🔴' : 'OFF 🟢'}</span>
                      </div>
                      {accounts.map(a => (
                        <div key={a.id} className="flex justify-between text-xs">
                          <span className="text-gray-500">{a.type} balance</span>
                          <span className={a.balance < total ? 'text-red-400' : 'text-green-400'} style={{ fontFamily: 'monospace' }}>
                            RM {a.balance.toFixed(2)} {a.balance < total ? '⚠️' : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button onClick={() => { setSimulateFail(false); setView('dashboard'); }}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-xl text-sm transition-colors">
                    Go to Dashboard
                  </button>
                </div>
              )}

            </div>
          </>
        )}

      </div>
    </div>
  );
}
