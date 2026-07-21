import React, { useState, useEffect } from 'react';

const QR_DURATION = 5 * 60; // 5 minutes in seconds

const BANK_LOGOS = [
  { name: 'Maybank',  color: '#F8C300', letter: 'M'  },
  { name: 'CIMB',    color: '#CC0001', letter: 'C'  },
  { name: 'PBe',     color: '#003087', letter: 'P'  },
  { name: 'RHB',     color: '#005BAA', letter: 'R'  },
  { name: 'HLB',     color: '#D10A10', letter: 'H'  },
  { name: 'AmBank',  color: '#C41230', letter: 'A'  },
];

export default function DuitNowQrModal({ total, orderId, onClose, onApprove }) {
  const [timeLeft, setTimeLeft] = useState(QR_DURATION);
  const [expired,  setExpired]  = useState(false);
  const [paid,     setPaid]     = useState(false);

  // 5-minute countdown
  useEffect(() => {
    if (expired) return;
    if (timeLeft <= 0) { setExpired(true); return; }
    const tick = setInterval(() => setTimeLeft(n => n - 1), 1000);
    return () => clearInterval(tick);
  }, [timeLeft, expired]);

  function refresh() {
    setExpired(false);
    setTimeLeft(QR_DURATION);
  }

  function handleConfirm() {
    setPaid(true);
    // brief success flash then call onApprove
    setTimeout(() => onApprove?.(), 1200);
  }

  const mm  = Math.floor(timeLeft / 60);
  const ss  = timeLeft % 60;
  const low = timeLeft < 60;

  // QR data — encodes a DuitNow-style payment reference
  const qrPayload  = `https://plumio.app/pay?ref=${orderId}&amount=${total.toFixed(2)}&merchant=PlumioEscrow`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=${encodeURIComponent(qrPayload)}`;

  // ── Success flash ──────────────────────────────────────────────
  if (paid) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60">
        <div className="bg-white rounded-3xl p-8 flex flex-col items-center gap-4 shadow-2xl w-72 text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
            <span className="material-symbols-outlined text-green-600 text-[44px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
          </div>
          <div>
            <p className="text-lg font-black text-gray-900">Payment Received!</p>
            <p className="text-sm text-gray-500 mt-1">RM {total.toFixed(2)} secured in escrow</p>
          </div>
          <div className="w-5 h-5 border-2 border-gray-200 border-t-[#0054A6] rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-t-[28px] sm:rounded-[28px] w-full max-w-sm shadow-2xl overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>

        {/* ── DuitNow brand header ─────────────────────────────── */}
        <div className="bg-[#0054A6] px-5 pt-5 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-[#0054A6] text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>qr_code_2</span>
            </div>
            <div>
              <p className="text-white font-black text-base leading-none">DuitNow QR</p>
              <p className="text-blue-200 text-[11px] mt-0.5">Scan to pay securely</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
            <span className="material-symbols-outlined text-white text-[18px]">close</span>
          </button>
        </div>

        <div className="px-5 py-5 flex flex-col items-center gap-4">

          {/* ── Merchant + amount ────────────────────────────────── */}
          <div className="w-full text-center">
            <p className="text-[11px] text-gray-400 uppercase tracking-widest mb-1">Pay to</p>
            <p className="text-base font-bold text-gray-900">Plumio Escrow Services</p>
            <p className="text-[11px] text-gray-400 mt-0.5 font-mono">{orderId}</p>
          </div>

          {/* Amount pill */}
          <div className="bg-[#E8F0FC] rounded-2xl px-10 py-3 text-center w-full">
            <p className="text-[11px] text-[#0054A6] font-semibold uppercase tracking-wider mb-0.5">Amount</p>
            <p className="text-3xl font-black text-[#0054A6]">RM {total.toFixed(2)}</p>
            <p className="text-[10px] text-blue-400 mt-0.5">Held in escrow · released after handoff</p>
          </div>

          {/* ── QR code ──────────────────────────────────────────── */}
          {expired ? (
            <div className="w-[200px] h-[200px] rounded-2xl bg-gray-100 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-2">
              <span className="material-symbols-outlined text-gray-400 text-[40px]">qr_code</span>
              <p className="text-sm text-gray-500 font-medium">QR Expired</p>
              <button onClick={refresh}
                className="text-[#0054A6] text-xs font-bold bg-blue-50 rounded-full px-3 py-1 hover:bg-blue-100 transition-colors">
                Generate New Code
              </button>
            </div>
          ) : (
            <div className="p-3 bg-white border-2 border-[#0054A6]/20 rounded-2xl shadow-sm relative">
              <img
                src={qrImageUrl}
                alt="DuitNow QR Code"
                className="w-[200px] h-[200px] block"
                onError={e => { e.target.style.opacity = '0.3'; }}
              />
              {/* DuitNow logo overlay in centre of QR */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-9 h-9 rounded-lg bg-[#0054A6] flex items-center justify-center shadow-md border-2 border-white">
                  <span className="material-symbols-outlined text-white text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>qr_code_2</span>
                </div>
              </div>
            </div>
          )}

          {/* Timer */}
          {!expired && (
            <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full ${low ? 'bg-red-50 text-red-500' : 'bg-gray-100 text-gray-500'}`}>
              <span className={`material-symbols-outlined text-[14px] ${low ? 'text-red-500 animate-pulse' : ''}`}>timer</span>
              <span className="font-mono font-bold">{mm}:{ss.toString().padStart(2, '0')}</span>
              <span>remaining</span>
            </div>
          )}

          {/* ── Supported banks ──────────────────────────────────── */}
          <div className="w-full">
            <p className="text-[10px] text-gray-400 text-center mb-2 uppercase tracking-wider">Scan with any banking app</p>
            <div className="flex justify-center gap-2 flex-wrap">
              {BANK_LOGOS.map(b => (
                <div key={b.name} className="flex flex-col items-center gap-0.5">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-black shadow-sm"
                    style={{ backgroundColor: b.color }}>
                    {b.letter}
                  </div>
                  <span className="text-[8px] text-gray-400">{b.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Confirm button ────────────────────────────────────── */}
          <button
            onClick={handleConfirm}
            disabled={expired}
            className="w-full bg-[#0054A6] hover:bg-[#003d7a] disabled:bg-gray-300 text-white font-bold py-4 rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-blue-200/60"
          >
            <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            I've Paid · Confirm Payment
          </button>

          <p className="text-[10px] text-gray-400 text-center leading-relaxed pb-1">
            Only confirm after your banking app shows a successful transfer. Funds go to Plumio Escrow — not released to seller until you confirm handoff.
          </p>
        </div>
      </div>
    </div>
  );
}
