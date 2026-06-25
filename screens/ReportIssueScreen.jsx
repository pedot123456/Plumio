import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const LOCAL_ISSUES = [
  'Item not as described',
  'Buyer/Seller no-show',
  'Escrow release error',
  'Other',
];

const COURIER_ISSUES = [
  'Item not as described',
  'Package arrived damaged',
  'Item not received',
  'Escrow release error',
  'Other',
];

const REFUND_STEPS = [
  { icon: 'lock',           text: 'Request submitted — escrow funds remain locked immediately.' },
  { icon: 'notifications',  text: 'Seller is notified and has 48 hours to respond or dispute.' },
  { icon: 'manage_search',  text: 'Our team reviews your evidence (typically 1–2 business days).' },
  { icon: 'account_balance',text: 'If approved, funds are reversed to your DuitNow within 3–5 business days.' },
];

export default function ReportIssueScreen() {
  const navigate = useNavigate();
  const [deliveryType, setDeliveryType] = useState('local');
  const [selectedIssue, setSelectedIssue] = useState('Item not as described');
  const [description, setDescription] = useState('');

  const issueTypes = deliveryType === 'courier' ? COURIER_ISSUES : LOCAL_ISSUES;
  const isCourier  = deliveryType === 'courier';

  function handleDeliveryChange(type) {
    setDeliveryType(type);
    setSelectedIssue(type === 'courier' ? 'Item not as described' : 'Item not as described');
  }

  return (
    <div className="bg-background text-on-background min-h-screen font-body-md pb-8">
      {/* Top App Bar */}
      <header className="w-full top-0 sticky bg-surface shadow-sm z-50">
        <div className="flex items-center justify-between px-margin-mobile py-sm w-full max-w-container-max mx-auto">
          <button
            className="text-primary hover:bg-surface-container transition-colors active:scale-95 p-2 rounded-full flex items-center justify-center"
            onClick={() => navigate(-1)}
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="font-headline-md text-headline-md text-primary text-center flex-1">Report an Issue</h1>
          <button className="text-on-surface-variant hover:bg-surface-container transition-colors active:scale-95 p-2 rounded-full flex items-center justify-center">
            <span className="material-symbols-outlined">more_vert</span>
          </button>
        </div>
      </header>

      <main className="px-margin-mobile pt-lg max-w-container-max mx-auto md:px-gutter flex flex-col gap-lg">
        {/* Transaction Reference */}
        <div className="bg-surface-container-lowest rounded-xl p-sm flex items-center gap-sm shadow-level-1 border border-outline-variant/20">
          <div className="w-16 h-16 rounded-lg bg-surface-container overflow-hidden shrink-0">
            <img
              className="w-full h-full object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDEFlWacW0MlZKGgRtgGtUnG0J4kLKDN03bh-p04walkb_3vneRlpcLf_LLuXE5Rgqog30JxpAL6-TVX_dayghh6lFCPQka3e1J_b4k_vQOsUQUJOGB3P3bag9x720ssexHtpob2lFuIuStHn8UYBZAEavBFukyTBt7yIvw6OxGg__LHQdtsWfv035by8F0s7hpyFp8HOrLmufWPaNNyeEN673hhdwGFJ-mYY8NaIRmTOd7bC60c9HZqtgb-WOCalJwSDu77H3tCd8"
              alt="Item"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-body-md text-body-md text-primary truncate">Engineering Math Vol 2</p>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-xs">Order ID: TT-88291</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-label-md text-label-md text-primary">RM 45.00</p>
            <p className="font-label-sm text-label-sm text-on-surface-variant mt-xs">RM in Escrow</p>
          </div>
        </div>

        {/* Delivery Type Selector */}
        <section>
          <h2 className="font-headline-sm text-headline-sm text-primary mb-sm">How was this item delivered?</h2>
          <div className="flex bg-surface-container-high rounded-lg p-1 relative">
            <div
              className="absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] bg-surface-container-lowest rounded shadow-level-1 transition-all duration-300 ease-out"
              style={{ transform: isCourier ? 'translateX(100%)' : 'translateX(0)' }}
            />
            <button
              type="button"
              onClick={() => handleDeliveryChange('local')}
              className={`flex-1 py-[10px] rounded font-label-md text-label-md text-center transition-colors duration-200 z-10 relative flex items-center justify-center gap-1.5 ${
                !isCourier ? 'text-primary' : 'text-on-surface-variant'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">handshake</span>
              Face-to-Face
            </button>
            <button
              type="button"
              onClick={() => handleDeliveryChange('courier')}
              className={`flex-1 py-[10px] rounded font-label-md text-label-md text-center transition-colors duration-200 z-10 relative flex items-center justify-center gap-1.5 ${
                isCourier ? 'text-primary' : 'text-on-surface-variant'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">local_shipping</span>
              Courier / Online
            </button>
          </div>
        </section>

        {/* Issue Categories */}
        <section>
          <h2 className="font-headline-sm text-headline-sm text-primary mb-sm">What is the issue?</h2>
          <div className="flex flex-wrap gap-base">
            {issueTypes.map(issue => (
              <button
                key={issue}
                onClick={() => setSelectedIssue(issue)}
                className={`px-md py-[10px] rounded-full font-label-md text-label-md transition-all active:scale-[0.98] ${
                  selectedIssue === issue
                    ? 'border-2 border-secondary bg-secondary/10 text-secondary'
                    : 'border border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container hover:border-outline'
                }`}
              >
                {issue}
              </button>
            ))}
          </div>
        </section>

        {/* Description */}
        <section>
          <h2 className="font-headline-sm text-headline-sm text-primary mb-sm">Provide details</h2>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-sm font-body-md text-body-md text-on-surface focus:border-secondary focus:ring-2 focus:ring-secondary/30 outline-none transition-all resize-none shadow-level-1 placeholder:text-on-surface-variant/50"
            placeholder={
              isCourier
                ? 'Describe the issue with the delivery — e.g. package condition, missing items, tracking status...'
                : 'Describe what happened during the physical handoff — e.g. item condition, no-show, communication...'
            }
            rows={5}
          />
        </section>

        {/* Evidence Upload */}
        <section>
          <h2 className="font-headline-sm text-headline-sm text-primary mb-sm">Evidence</h2>
          <button className="w-full border-2 border-dashed border-outline-variant rounded-xl p-xl flex flex-col items-center justify-center bg-surface-container-lowest hover:bg-surface-container transition-colors active:scale-[0.98] group">
            <div className="w-12 h-12 rounded-full bg-primary-container/10 flex items-center justify-center mb-sm group-hover:bg-primary-container/20 transition-colors">
              <span className="material-symbols-outlined text-primary-container">photo_camera</span>
            </div>
            <span className="font-label-md text-label-md text-primary-container">Upload photo or video evidence</span>
            <span className="font-body-sm text-body-sm text-on-surface-variant mt-xs">PNG, JPG, MP4 — up to 10 MB each</span>
          </button>
        </section>

        {/* ── Courier-specific: Online Refund flow ─────────────── */}
        {isCourier && (
          <section className="flex flex-col gap-md animate-fade-in-up">
            {/* Refund process card */}
            <div className="bg-secondary/5 border border-secondary/20 rounded-xl p-md">
              <div className="flex items-center gap-sm mb-md">
                <span
                  className="material-symbols-outlined text-secondary text-[20px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  account_balance
                </span>
                <h3 className="font-headline-sm text-headline-sm text-primary">Online Refund Process</h3>
              </div>
              <ol className="flex flex-col gap-sm">
                {REFUND_STEPS.map((step, i) => (
                  <li key={i} className="flex items-start gap-sm">
                    <div className="w-7 h-7 rounded-full bg-secondary/15 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="font-label-sm text-label-sm text-secondary font-bold">{i + 1}</span>
                    </div>
                    <div className="flex items-start gap-2 flex-1 pt-0.5">
                      <span className="material-symbols-outlined text-[16px] text-secondary shrink-0 mt-0.5">{step.icon}</span>
                      <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">{step.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            {/* Request Online Refund CTA */}
            <button className="w-full border-2 border-error text-error font-label-md text-label-md py-4 rounded-xl hover:bg-error/8 active:scale-[0.98] transition-all flex justify-center items-center gap-sm shadow-sm">
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                currency_exchange
              </span>
              Request Online Refund
            </button>
            <p className="font-body-sm text-body-sm text-on-surface-variant flex items-start gap-xs px-xs -mt-sm">
              <span className="material-symbols-outlined text-[14px] mt-0.5 shrink-0">info</span>
              Escrow funds will be digitally reversed to your DuitNow once the case is resolved. No physical visit required.
            </p>

            {/* Divider */}
            <div className="flex items-center gap-md">
              <div className="flex-1 h-px bg-outline-variant/50" />
              <span className="font-label-sm text-label-sm text-on-surface-variant">or raise a general dispute</span>
              <div className="flex-1 h-px bg-outline-variant/50" />
            </div>
          </section>
        )}

        {/* ── Submit Dispute (always visible) ─────────────────── */}
        <section className="flex flex-col gap-sm pb-xxl">
          <button className="w-full bg-primary-container text-on-primary font-label-md text-label-md py-4 rounded-xl hover:bg-primary active:scale-[0.98] transition-all shadow-level-2 flex justify-center items-center gap-xs">
            <span className="material-symbols-outlined text-[20px]">gavel</span>
            Submit Dispute Request
          </button>
          <div className="flex items-start gap-xs px-xs">
            <span className="material-symbols-outlined text-on-surface-variant text-[14px] mt-0.5 shrink-0">lock</span>
            <p className="font-body-sm text-body-sm text-on-surface-variant leading-tight">
              Escrow funds remain locked until our team reviews and resolves this case.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
