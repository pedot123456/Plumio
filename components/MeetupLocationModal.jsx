import React, { useState } from 'react';

const MALAYSIAN_STATES = [
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

export default function MeetupLocationModal({ onClose, onSelect }) {
  const [landmark,  setLandmark]  = useState('');
  const [stateArea, setStateArea] = useState('');
  const [details,   setDetails]   = useState('');
  const [detecting, setDetecting] = useState(false);
  const [formError, setFormError] = useState('');

  function handleDetectLocation() {
    if (!navigator.geolocation) return;
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLandmark(`Near ${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`);
        setDetecting(false);
      },
      () => setDetecting(false),
    );
  }

  function handleSubmit() {
    if (!landmark.trim()) { setFormError('Please enter a location name or landmark.'); return; }
    if (!stateArea)       { setFormError('Please select a state and area.'); return; }
    setFormError('');
    onSelect?.({ landmark: landmark.trim(), stateArea, details: details.trim() });
    onClose?.();
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-md w-full max-w-lg overflow-hidden shadow-xl flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 shrink-0">
          <h2 className="font-medium text-lg text-gray-900">Meetup Location</h2>
          <CloseButton onClick={onClose} />
        </div>

        {/* Scrollable body */}
        <div className="px-5 py-5 flex-1 overflow-y-auto flex flex-col gap-5">

          {formError && (
            <p className="text-xs text-red-500 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px] shrink-0">error_outline</span>
              {formError}
            </p>
          )}

          {/* Location Name / Landmark */}
          <FloatingInput label="Location Name / Landmark *">
            <input
              type="text"
              value={landmark}
              onChange={e => { setLandmark(e.target.value); if (formError) setFormError(''); }}
              placeholder="e.g. Mall Entrance, LRT Station, Block Lobby"
              className="w-full px-3 pt-3 pb-2 text-sm text-gray-900 placeholder:text-gray-300 bg-transparent focus:outline-none rounded-sm"
            />
          </FloatingInput>

          {/* State, City, Area */}
          <FloatingInput label="State, City, Area *">
            <select
              value={stateArea}
              onChange={e => { setStateArea(e.target.value); if (formError) setFormError(''); }}
              className="w-full px-3 pt-3 pb-2 text-sm bg-transparent focus:outline-none appearance-none rounded-sm text-gray-900"
            >
              <option value="" disabled>Select your state and area</option>
              {MALAYSIAN_STATES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </span>
          </FloatingInput>

          {/* Specific Meetup Details */}
          <FloatingInput label="Specific Meetup Details (Optional)">
            <textarea
              value={details}
              onChange={e => setDetails(e.target.value)}
              placeholder="e.g. Wait near the north entrance ticketing counter, I'll be wearing a blue cap"
              rows={3}
              className="w-full px-3 pt-3 pb-2 text-sm text-gray-900 placeholder:text-gray-300 bg-transparent focus:outline-none resize-none rounded-sm"
            />
          </FloatingInput>

          {/* Auto-detect + map placeholder */}
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handleDetectLocation}
              disabled={detecting}
              className="flex items-center gap-2 justify-center w-full py-2 border border-purple-200 text-purple-600 text-sm font-medium rounded-sm hover:bg-purple-50 transition-colors disabled:opacity-60"
            >
              {detecting
                ? <span className="w-4 h-4 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
                : <span>📍</span>
              }
              {detecting ? 'Detecting location…' : 'Auto-Detect My Location'}
            </button>

            <div className="relative w-full h-32 bg-gray-100 rounded-sm overflow-hidden flex flex-col items-center justify-center gap-1">
              <svg viewBox="0 0 24 24" fill="none" className="w-9 h-9 drop-shadow-sm">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#9333ea" opacity="0.18" />
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z" fill="#9333ea" />
              </svg>
              <p className="text-xs text-gray-400">Map preview · location will appear here</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-5 py-4 shrink-0">
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors px-4 py-2"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-8 py-2 rounded-sm transition-all active:scale-[0.98]"
            >
              Confirm Location
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
