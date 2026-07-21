import React, { useState, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';

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

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_FILES     = 5;

function formatBytes(bytes) {
  if (bytes < 1024)       return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ReportIssueScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session } = useAuth();
  const fileInputRef = useRef(null);

  const {
    listingId, sellerId, listingTitle, sellerName, listingImage,
    fulfillmentMethod, amount, txId,
  } = location.state || {};

  const [deliveryType,    setDeliveryType]    = useState(fulfillmentMethod === 'delivery' ? 'courier' : 'local');
  const [selectedIssue,  setSelectedIssue]  = useState('Item not as described');
  const [description,    setDescription]    = useState('');
  const [evidenceFiles,  setEvidenceFiles]  = useState([]); // { file, previewUrl, isVideo }
  const [fileError,      setFileError]      = useState('');
  const [isSubmitting,   setIsSubmitting]   = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0); // 0-100
  const [submitSuccess,  setSubmitSuccess]  = useState(false);

  const issueTypes = deliveryType === 'courier' ? COURIER_ISSUES : LOCAL_ISSUES;
  const isCourier  = deliveryType === 'courier';

  function handleDeliveryChange(type) {
    setDeliveryType(type);
    setSelectedIssue('Item not as described');
  }

  // ── File selection ────────────────────────────────────────────
  const handleFileSelect = useCallback((e) => {
    setFileError('');
    const incoming = Array.from(e.target.files || []);
    if (!incoming.length) return;

    const oversized = incoming.filter(f => f.size > MAX_FILE_SIZE);
    if (oversized.length) {
      setFileError(`${oversized[0].name} exceeds the 10 MB limit.`);
      e.target.value = '';
      return;
    }

    const remaining = MAX_FILES - evidenceFiles.length;
    if (incoming.length > remaining) {
      setFileError(`You can attach up to ${MAX_FILES} files. ${MAX_FILES - remaining} already added.`);
      e.target.value = '';
      return;
    }

    const newFiles = incoming.map(file => ({
      file,
      previewUrl: URL.createObjectURL(file),
      isVideo:    file.type.startsWith('video/'),
    }));
    setEvidenceFiles(prev => [...prev, ...newFiles]);
    e.target.value = ''; // allow re-selecting the same file
  }, [evidenceFiles]);

  function removeFile(idx) {
    setEvidenceFiles(prev => {
      URL.revokeObjectURL(prev[idx].previewUrl);
      return prev.filter((_, i) => i !== idx);
    });
    setFileError('');
  }

  // ── Submit ────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!session) { navigate('/login'); return; }
    setIsSubmitting(true);
    setUploadProgress(0);

    // Upload evidence files to Supabase Storage (best-effort)
    const evidenceUrls = [];
    if (evidenceFiles.length > 0) {
      for (let i = 0; i < evidenceFiles.length; i++) {
        const ef  = evidenceFiles[i];
        const ext = ef.file.name.split('.').pop().toLowerCase();
        const path = `${session.user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { data: up, error: upErr } = await supabase.storage
          .from('report-evidence')
          .upload(path, ef.file, { contentType: ef.file.type, upsert: false });
        if (!upErr && up) {
          const { data: { publicUrl } } = supabase.storage
            .from('report-evidence')
            .getPublicUrl(path);
          evidenceUrls.push(publicUrl);
        }
        setUploadProgress(Math.round(((i + 1) / evidenceFiles.length) * 60));
      }
    }

    // Build description — append URLs for storage if column doesn't exist yet
    const descParts = [description.trim()];
    if (evidenceUrls.length) descParts.push(`\n[Evidence]\n${evidenceUrls.join('\n')}`);
    const finalDesc = descParts.filter(Boolean).join('') || null;

    setUploadProgress(80);
    const { error } = await supabase.from('reports').insert({
      reporter_id:   session.user.id,
      listing_id:    listingId   ?? null,
      seller_id:     sellerId    ?? null,
      delivery_type: deliveryType,
      issue_type:    selectedIssue,
      description:   finalDesc,
    });
    setUploadProgress(100);
    setIsSubmitting(false);
    if (!error) setSubmitSuccess(true);
  }

  // ── Success state ─────────────────────────────────────────────
  if (submitSuccess) {
    return (
      <div className="bg-background text-on-background min-h-screen flex flex-col items-center justify-center px-margin-mobile gap-lg text-center">
        <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center">
          <span className="material-symbols-outlined text-secondary text-[40px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
        </div>
        <div>
          <h2 className="font-headline-md text-headline-md text-primary mb-xs">Report Submitted</h2>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-xs">
            Our team will review your report within 1–2 business days.
          </p>
        </div>
        <button
          onClick={() => navigate('/')}
          className="bg-primary-container text-on-primary font-label-md text-label-md px-xl py-sm rounded-xl hover:bg-primary transition-all active:scale-[0.98]"
        >
          Go Back to Home
        </button>
      </div>
    );
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
          <div className="w-10" />
        </div>
      </header>

      <main className="px-margin-mobile pt-lg max-w-container-max mx-auto md:px-gutter flex flex-col gap-lg">

        {/* Context banner */}
        {(listingTitle || sellerName) && (
          <div className="bg-error/5 border border-error/20 rounded-xl px-md py-sm flex items-center gap-sm">
            <span className="material-symbols-outlined text-error text-[22px] shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>flag</span>
            <div className="min-w-0">
              <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wide mb-[2px]">Reporting</p>
              {listingTitle && <p className="font-body-md text-body-md text-on-surface font-medium truncate">{listingTitle}</p>}
              {sellerName   && <p className="font-body-sm text-body-sm text-on-surface-variant">by {sellerName}</p>}
            </div>
          </div>
        )}

        {/* Transaction Reference */}
        <div className="bg-surface-container-lowest rounded-xl p-sm flex items-center gap-sm shadow-level-1 border border-outline-variant/20">
          <div className="w-16 h-16 rounded-lg bg-surface-container overflow-hidden shrink-0">
            {listingImage
              ? <img className="w-full h-full object-cover" src={listingImage} alt={listingTitle ?? 'Item'} />
              : <div className="w-full h-full flex items-center justify-center bg-surface-container">
                  <span className="material-symbols-outlined text-outline text-[28px]">image</span>
                </div>
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-body-md text-body-md text-primary truncate">{listingTitle ?? '—'}</p>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-xs">
              {txId ? `Order ID: TT-${String(txId).slice(0, 6).toUpperCase()}` : 'Order ID: —'}
            </p>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-[2px] flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">
                {fulfillmentMethod === 'delivery' ? 'local_shipping' : 'handshake'}
              </span>
              {fulfillmentMethod === 'delivery' ? 'Courier delivery' : 'Face-to-face handoff'}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-label-md text-label-md text-primary">
              {amount ? `RM ${Number(amount).toFixed(2)}` : '—'}
            </p>
            <p className="font-label-sm text-label-sm text-on-surface-variant mt-xs">In Escrow</p>
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
            <button type="button" onClick={() => handleDeliveryChange('local')}
              className={`flex-1 py-[10px] rounded font-label-md text-label-md text-center z-10 relative flex items-center justify-center gap-1.5 transition-colors ${!isCourier ? 'text-primary' : 'text-on-surface-variant'}`}>
              <span className="material-symbols-outlined text-[18px]">handshake</span>
              Face-to-Face
            </button>
            <button type="button" onClick={() => handleDeliveryChange('courier')}
              className={`flex-1 py-[10px] rounded font-label-md text-label-md text-center z-10 relative flex items-center justify-center gap-1.5 transition-colors ${isCourier ? 'text-primary' : 'text-on-surface-variant'}`}>
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
              <button key={issue} onClick={() => setSelectedIssue(issue)}
                className={`px-md py-[10px] rounded-full font-label-md text-label-md transition-all active:scale-[0.98] ${
                  selectedIssue === issue
                    ? 'border-2 border-secondary bg-secondary/10 text-secondary'
                    : 'border border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container hover:border-outline'
                }`}>
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
            placeholder={isCourier
              ? 'Describe the issue with the delivery — e.g. package condition, missing items, tracking status...'
              : 'Describe what happened during the physical handoff — e.g. item condition, no-show, communication...'}
            rows={5}
          />
        </section>

        {/* ── Evidence Upload ───────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-sm">
            <h2 className="font-headline-sm text-headline-sm text-primary">Evidence</h2>
            {evidenceFiles.length > 0 && (
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                {evidenceFiles.length}/{MAX_FILES} files
              </span>
            )}
          </div>

          {/* Hidden native file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />

          {/* Preview grid */}
          {evidenceFiles.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-3">
              {evidenceFiles.map((ef, idx) => (
                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden bg-surface-container border border-outline-variant/30 group">
                  {ef.isVideo ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-surface-container-high gap-1 p-2">
                      <span className="material-symbols-outlined text-[30px] text-on-surface-variant" style={{ fontVariationSettings: "'FILL' 1" }}>videocam</span>
                      <span className="text-[10px] text-on-surface-variant text-center leading-tight break-all line-clamp-2">{ef.file.name}</span>
                      <span className="text-[10px] text-on-surface-variant/60">{formatBytes(ef.file.size)}</span>
                    </div>
                  ) : (
                    <img src={ef.previewUrl} alt={`Evidence ${idx + 1}`} className="w-full h-full object-cover" />
                  )}
                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    className="absolute top-1 right-1 w-6 h-6 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
                    aria-label="Remove file"
                  >
                    <span className="material-symbols-outlined text-white text-[14px]">close</span>
                  </button>
                  {/* Size label on images */}
                  {!ef.isVideo && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/40 px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[10px] text-white">{formatBytes(ef.file.size)}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* File error */}
          {fileError && (
            <div className="flex items-center gap-xs text-error font-body-sm text-body-sm bg-error/8 border border-error/20 rounded-lg px-sm py-xs mb-sm">
              <span className="material-symbols-outlined text-[15px] shrink-0">error_outline</span>
              {fileError}
            </div>
          )}

          {/* Add files button */}
          {evidenceFiles.length < MAX_FILES && (
            <button
              type="button"
              onClick={() => { setFileError(''); fileInputRef.current?.click(); }}
              className="w-full border-2 border-dashed border-outline-variant rounded-xl p-xl flex flex-col items-center justify-center bg-surface-container-lowest hover:bg-surface-container hover:border-secondary/50 transition-all active:scale-[0.98] group"
            >
              <div className="w-12 h-12 rounded-full bg-primary-container/10 flex items-center justify-center mb-sm group-hover:bg-primary-container/20 transition-colors">
                <span className="material-symbols-outlined text-primary-container text-[26px]">
                  {evidenceFiles.length > 0 ? 'add_photo_alternate' : 'photo_camera'}
                </span>
              </div>
              <span className="font-label-md text-label-md text-primary-container">
                {evidenceFiles.length > 0 ? 'Add more files' : 'Upload photo or video evidence'}
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant mt-xs">
                PNG, JPG, MP4 · up to 10 MB · max {MAX_FILES} files
              </span>
            </button>
          )}

          {evidenceFiles.length >= MAX_FILES && (
            <p className="text-center font-body-sm text-body-sm text-on-surface-variant mt-xs">
              Maximum {MAX_FILES} files attached.
            </p>
          )}
        </section>

        {/* ── Courier-specific: Online Refund flow ─────────────── */}
        {isCourier && (
          <section className="flex flex-col gap-md">
            <div className="bg-secondary/5 border border-secondary/20 rounded-xl p-md">
              <div className="flex items-center gap-sm mb-md">
                <span className="material-symbols-outlined text-secondary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance</span>
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
            <button className="w-full border-2 border-error text-error font-label-md text-label-md py-4 rounded-xl hover:bg-error/8 active:scale-[0.98] transition-all flex justify-center items-center gap-sm shadow-sm">
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>currency_exchange</span>
              Request Online Refund
            </button>
            <p className="font-body-sm text-body-sm text-on-surface-variant flex items-start gap-xs px-xs -mt-sm">
              <span className="material-symbols-outlined text-[14px] mt-0.5 shrink-0">info</span>
              Escrow funds will be digitally reversed to your DuitNow once the case is resolved.
            </p>
            <div className="flex items-center gap-md">
              <div className="flex-1 h-px bg-outline-variant/50" />
              <span className="font-label-sm text-label-sm text-on-surface-variant">or raise a general dispute</span>
              <div className="flex-1 h-px bg-outline-variant/50" />
            </div>
          </section>
        )}

        {/* ── Submit ───────────────────────────────────────────── */}
        <section className="flex flex-col gap-sm pb-xxl">
          {/* Upload progress bar */}
          {isSubmitting && evidenceFiles.length > 0 && uploadProgress < 100 && (
            <div className="w-full">
              <div className="flex justify-between mb-1">
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  {uploadProgress < 60 ? 'Uploading evidence…' : 'Saving report…'}
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">{uploadProgress}%</span>
              </div>
              <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
                <div
                  className="h-full bg-secondary rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full bg-primary-container text-on-primary font-label-md text-label-md py-4 rounded-xl hover:bg-primary active:scale-[0.98] transition-all shadow-level-2 flex justify-center items-center gap-xs disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {evidenceFiles.length > 0 ? 'Uploading & Submitting…' : 'Submitting…'}
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[20px]">gavel</span>
                Submit Dispute Request
                {evidenceFiles.length > 0 && (
                  <span className="ml-1 text-xs bg-white/20 rounded-full px-2 py-0.5">
                    +{evidenceFiles.length} file{evidenceFiles.length !== 1 ? 's' : ''}
                  </span>
                )}
              </>
            )}
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
