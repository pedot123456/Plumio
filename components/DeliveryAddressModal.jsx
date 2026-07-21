import React, { useState } from 'react';

const MALAYSIAN_STATES = [
  '',
  'Johor, Johor Bahru, Johor Bahru',
  'Kedah, Kota Setar, Alor Setar',
  'Kelantan, Kota Bharu, Kota Bharu',
  'Melaka, Melaka Tengah, Melaka',
  'Negeri Sembilan, Seremban, Seremban',
  'Pahang, Kuantan, Kuantan',
  'Perak, Perak Tengah, Bota, Seri Iskandar',
  'Pulau Pinang, Timur Laut, Georgetown',
  'Sabah, Kota Kinabalu, Kota Kinabalu',
  'Sarawak, Kuching, Kuching',
  'Selangor, Petaling, Subang Jaya',
  'Terengganu, Kuala Terengganu, Kuala Terengganu',
  'W.P. Kuala Lumpur, Kuala Lumpur',
  'W.P. Putrajaya, Putrajaya',
];

// Floating-label input wrapper — keeps the overlapping label look
function FloatingInput({ label, children }) {
  return (
    <div className="relative border border-gray-300 rounded-sm focus-within:border-purple-500 transition-colors">
      <span className="absolute -top-2 left-3 bg-white px-1 text-xs text-gray-500 leading-none z-10">
        {label}
      </span>
      {children}
    </div>
  );
}

// Close (X) icon — shared by both views
function CloseButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  );
}

const emptyForm = {
  fullName:      '',
  phone:         '',
  stateArea:     '',
  postalCode:    '',
  unitNo:        '',
  streetAddress: '',
  addressLabel:  'Home',
  isDefault:     false,
};

export default function DeliveryAddressModal({ onClose, onSelect, onSaveDefault }) {
  const [view,            setView]            = useState('list');
  const [savedAddresses,  setSavedAddresses]  = useState([]);
  const [selectedIndex,   setSelectedIndex]   = useState(0);
  const [editIndex,       setEditIndex]       = useState(null); // null = new address

  // ── Form fields ──────────────────────────────────────────────
  const [fullName,        setFullName]        = useState('');
  const [phone,           setPhone]           = useState('');
  const [stateArea,       setStateArea]       = useState('');
  const [postalCode,      setPostalCode]      = useState('');
  const [unitNo,          setUnitNo]          = useState('');
  const [streetAddress,   setStreetAddress]   = useState('');
  const [addressLabel,    setAddressLabel]    = useState('Home');
  const [isDefault,       setIsDefault]       = useState(false);
  const [locationSearch,  setLocationSearch]  = useState('');
  const [detecting,       setDetecting]       = useState(false);
  const [isSaving,        setIsSaving]        = useState(false);

  // ── Helpers ──────────────────────────────────────────────────
  function openNewForm() {
    setEditIndex(null);
    setFullName('');
    setPhone('');
    setStateArea('');
    setPostalCode('');
    setUnitNo('');
    setStreetAddress('');
    setAddressLabel('Home');
    setIsDefault(savedAddresses.length === 0);
    setLocationSearch('');
    setView('form');
  }

  function openEditForm(idx) {
    const a = savedAddresses[idx];
    setEditIndex(idx);
    setFullName(a.fullName);
    setPhone(a.phone);
    setStateArea(a.stateArea);
    setPostalCode(a.postalCode);
    setUnitNo(a.unitNo);
    setStreetAddress(a.streetAddress);
    setAddressLabel(a.addressLabel);
    setIsDefault(a.isDefault);
    setLocationSearch('');
    setView('form');
  }

  function handleDetectLocation() {
    if (!navigator.geolocation) return;
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      position => {
        // Placeholder: in production replace with reverse-geocoding API
        const { latitude, longitude } = position.coords;
        setStreetAddress(`Near ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        setDetecting(false);
      },
      () => setDetecting(false),
    );
  }

  async function handleSubmit() {
    const entry = { fullName, phone, stateArea, postalCode, unitNo, streetAddress, addressLabel, isDefault };

    if (isDefault && onSaveDefault) {
      setIsSaving(true);
      await onSaveDefault(entry);
      setIsSaving(false);
      // Save complete — select this address immediately and close
      const formatted = [
        entry.fullName, entry.phone,
        entry.unitNo ? `${entry.unitNo}, ${entry.streetAddress}` : entry.streetAddress,
        entry.postalCode, entry.stateArea,
      ].filter(Boolean).join(', ');
      onSelect?.(formatted);
      onClose?.();
      return;
    }

    // Not default — add to local session list, go to list view
    setSavedAddresses(prev => {
      if (editIndex !== null) return prev.map((a, i) => i === editIndex ? entry : a);
      return [...prev, entry];
    });
    setSelectedIndex(editIndex !== null ? editIndex : savedAddresses.length);
    setView('list');
  }

  function handleConfirm() {
    const a = savedAddresses[selectedIndex];
    if (!a) return;
    const formatted = [
      a.fullName,
      a.phone,
      a.unitNo ? `${a.unitNo}, ${a.streetAddress}` : a.streetAddress,
      a.postalCode,
      a.stateArea,
    ].filter(Boolean).join(', ');
    onSelect?.(formatted);
    onClose?.();
  }

  // ════════════════════════════════════════════════════════════
  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-md w-full max-w-lg overflow-hidden shadow-xl flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >

        {/* ══════════════════════════════════════════════════════
            VIEW 1 — Address List
        ══════════════════════════════════════════════════════ */}
        {view === 'list' && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 shrink-0">
              <h2 className="font-medium text-lg text-gray-900">My Address</h2>
              <CloseButton onClick={onClose} />
            </div>

            {/* Body */}
            <div className="px-5 py-4 flex-1 overflow-y-auto">
              {savedAddresses.length === 0 ? (
                /* ── Empty state ── */
                <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8">
                      <path
                        d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"
                        fill="#9333ea"
                        opacity="0.5"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 mb-1">No saved addresses yet</p>
                    <p className="text-sm text-gray-500">Add your delivery address to get started.</p>
                  </div>
                  <button
                    onClick={openNewForm}
                    className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-6 py-2.5 rounded-full transition-all active:scale-[0.98] shadow-sm"
                  >
                    + Add My First Address
                  </button>
                </div>
              ) : (
                /* ── Address cards ── */
                <>
                  <p className="font-medium text-gray-700 mt-1 mb-3 text-sm">Malaysia</p>
                  <div className="flex flex-col gap-4">
                    {savedAddresses.map((a, idx) => (
                      <div
                        key={idx}
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedIndex === idx
                            ? 'border-purple-400 bg-purple-50/40'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setSelectedIndex(idx)}
                      >
                        {/* Radio */}
                        <div className={`mt-0.5 shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          selectedIndex === idx ? 'border-purple-600' : 'border-gray-300'
                        }`}>
                          {selectedIndex === idx && (
                            <div className="w-2 h-2 rounded-full bg-purple-600" />
                          )}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-bold text-sm text-gray-900">{a.fullName || '—'}</span>
                            {a.phone && (
                              <>
                                <span className="w-px h-3.5 bg-gray-300 shrink-0" />
                                <span className="text-sm text-gray-600">{a.phone}</span>
                              </>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 leading-snug">
                            {[a.unitNo, a.streetAddress, a.postalCode, a.stateArea].filter(Boolean).join(', ')}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-[11px] text-gray-400 border border-gray-200 rounded px-1.5 py-0.5">
                              {a.addressLabel}
                            </span>
                            {a.isDefault && (
                              <span className="text-[11px] font-medium text-purple-600 border border-purple-300 rounded px-1.5 py-0.5">
                                Default
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Edit */}
                        <button
                          onClick={e => { e.stopPropagation(); openEditForm(idx); }}
                          className="text-purple-600 text-sm font-medium hover:underline shrink-0"
                        >
                          Edit
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            {savedAddresses.length > 0 && (
              <div className="border-t border-gray-200 px-5 py-3 flex items-center justify-between shrink-0">
                <button
                  onClick={openNewForm}
                  className="text-sm text-purple-600 font-medium hover:underline"
                >
                  + Add New Address
                </button>
                <button
                  onClick={handleConfirm}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-6 py-2 rounded-sm transition-all active:scale-[0.98]"
                >
                  Use This Address
                </button>
              </div>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════════════
            VIEW 2 — Address Form
        ══════════════════════════════════════════════════════ */}
        {view === 'form' && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 shrink-0">
              <h2 className="font-medium text-lg text-gray-900">
                {editIndex !== null ? 'Edit Address' : 'New Address'}
              </h2>
              <CloseButton onClick={onClose} />
            </div>

            {/* Scrollable form body */}
            <div className="px-5 py-5 flex-1 overflow-y-auto flex flex-col gap-5">

              {/* Row 1 — Full Name | Phone */}
              <div className="grid grid-cols-2 gap-4">
                <FloatingInput label="Full Name">
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="e.g. Ahmad Firdaus"
                    className="w-full px-3 pt-3 pb-2 text-sm text-gray-900 placeholder:text-gray-300 bg-transparent focus:outline-none rounded-sm"
                  />
                </FloatingInput>
                <FloatingInput label="Phone Number">
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+60 11 xxxx xxxx"
                    className="w-full px-3 pt-3 pb-2 text-sm text-gray-900 placeholder:text-gray-300 bg-transparent focus:outline-none rounded-sm"
                  />
                </FloatingInput>
              </div>

              {/* Row 2 — State / Area */}
              <FloatingInput label="State, Area">
                <select
                  value={stateArea}
                  onChange={e => setStateArea(e.target.value)}
                  className="w-full px-3 pt-3 pb-2 text-sm bg-transparent focus:outline-none appearance-none rounded-sm text-gray-900"
                >
                  <option value="" disabled>Select your state and area</option>
                  {MALAYSIAN_STATES.filter(Boolean).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>
                </span>
              </FloatingInput>

              {/* Row 3 — Postal Code */}
              <FloatingInput label="Postal Code">
                <input
                  type="text"
                  value={postalCode}
                  onChange={e => setPostalCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 32610"
                  maxLength={5}
                  className="w-full px-3 pt-3 pb-2 text-sm text-gray-900 placeholder:text-gray-300 bg-transparent focus:outline-none rounded-sm"
                />
              </FloatingInput>

              {/* Row 4 — Unit No */}
              <FloatingInput label="Unit No (Optional)">
                <input
                  type="text"
                  value={unitNo}
                  onChange={e => setUnitNo(e.target.value)}
                  placeholder="e.g. A-12-3"
                  className="w-full px-3 pt-3 pb-2 text-sm text-gray-900 placeholder:text-gray-300 bg-transparent focus:outline-none rounded-sm"
                />
              </FloatingInput>

              {/* Row 5 — Street address */}
              <FloatingInput label="House Number, Building, Street Name">
                <textarea
                  value={streetAddress}
                  onChange={e => setStreetAddress(e.target.value)}
                  placeholder="e.g. No. 17, Lorong Bayu Emas 7, Taman Bayu Emas"
                  rows={2}
                  className="w-full px-3 pt-3 pb-2 text-sm text-gray-900 placeholder:text-gray-300 bg-transparent focus:outline-none resize-none rounded-sm"
                />
              </FloatingInput>

              {/* ── Interactive Location Section ── */}
              <div className="flex flex-col gap-2">
                {/* Search bar */}
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                      <circle cx="11" cy="11" r="8" />
                      <path strokeLinecap="round" d="m21 21-4.35-4.35" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    value={locationSearch}
                    onChange={e => setLocationSearch(e.target.value)}
                    placeholder="Search for your building or area..."
                    className="w-full pl-9 pr-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 border border-gray-300 rounded-sm focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>

                {/* Auto-detect button */}
                <button
                  type="button"
                  onClick={handleDetectLocation}
                  disabled={detecting}
                  className="flex items-center gap-2 justify-center w-full py-2 border border-purple-200 text-purple-600 text-sm font-medium rounded-sm hover:bg-purple-50 transition-colors disabled:opacity-60"
                >
                  {detecting ? (
                    <span className="w-4 h-4 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
                  ) : (
                    <span>📍</span>
                  )}
                  {detecting ? 'Detecting location…' : 'Auto-Detect My Location'}
                </button>

                {/* Static map placeholder */}
                <div className="relative w-full h-32 bg-gray-100 rounded-sm overflow-hidden flex flex-col items-center justify-center gap-1">
                  <svg viewBox="0 0 24 24" fill="none" className="w-9 h-9 drop-shadow-sm">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#9333ea" opacity="0.18" />
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z" fill="#9333ea" />
                  </svg>
                  <p className="text-xs text-gray-400">Map preview · tap to pin your exact location</p>
                </div>
              </div>

              {/* Label As — pill buttons */}
              <div>
                <p className="text-sm text-gray-600 mb-2.5">Label As</p>
                <div className="flex gap-3">
                  {['Home', 'Work'].map(lbl => (
                    <button
                      key={lbl}
                      type="button"
                      onClick={() => setAddressLabel(lbl)}
                      className={`flex items-center gap-1.5 rounded-full px-6 py-2 text-sm font-medium border transition-all duration-200 cursor-pointer ${
                        addressLabel === lbl
                          ? 'bg-purple-100 text-purple-700 border-purple-500 shadow-sm'
                          : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[15px]">
                        {lbl === 'Home' ? 'home' : 'work'}
                      </span>
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Default checkbox */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={e => setIsDefault(e.target.checked)}
                  className="w-4 h-4 accent-purple-600 rounded-sm"
                />
                <span className="text-sm text-gray-700">Set as Default Address</span>
              </label>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 px-5 py-4 shrink-0">
              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => setView('list')}
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSaving}
                  className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white text-sm font-medium px-8 py-2 rounded-sm transition-all active:scale-[0.98] flex items-center gap-2"
                >
                  {isSaving && (
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  )}
                  {isSaving ? 'Saving…' : 'Submit'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
