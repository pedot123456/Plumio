import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function ChatNegotiationScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const [message, setMessage] = useState(location.state?.prefill ?? '');
  const inputRef = useRef(null);

  useEffect(() => {
    if (location.state?.prefill) {
      inputRef.current?.focus();
      // Place cursor at end of pre-filled text
      const len = location.state.prefill.length;
      inputRef.current?.setSelectionRange(len, len);
    }
  }, []);

  return (
    <div className="bg-background text-on-background h-screen flex flex-col font-body-md">
      {/* Top App Bar */}
      <header className="fixed top-0 w-full z-50 shadow-sm bg-surface">
        <div className="flex justify-between items-center px-4 h-16 w-full">
          <div className="flex items-center gap-4">
            <button
              className="text-primary hover:bg-surface-container transition-colors active:scale-95 p-2 rounded-full flex items-center justify-center"
              onClick={() => navigate(-1)}
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div className="flex flex-col">
              <h1 className="font-headline-sm text-headline-sm text-primary">Chat Support</h1>
              <span className="font-label-sm text-label-sm text-secondary-container flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-secondary-container inline-block" />
                Online
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <img
              className="w-10 h-10 rounded-lg object-cover shadow-level-1 border border-outline-variant/30"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCxNE6p6POJQa_zweD2yAzd4eG-c-jxh--Vm1OGndw4ehuKlaxJpsgR9bdb6ma6NQE2YbOCVMHpQWUoOOPB4bpAzMLs0FCP6c3xZTL-C2Vto45QA1qO95JgDv2JSmCWNk2AhQiWtkyyhrrMJAapbhcdIVDMEVhA2Yommrp0vXqU8JN-4HHjK6yIyPuGEFdvxqQr62g12DqvsqbL-R0G9uRLkqIucgyT8SzDlkOXM9B9rIP7VWDgF9iyDnKSEl-kFWk4VFGMIweK7Lg"
              alt="Item"
            />
            <button className="text-on-surface-variant hover:bg-surface-container transition-colors p-2 rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined">more_vert</span>
            </button>
          </div>
        </div>
      </header>

      {/* Chat Canvas */}
      <main className="flex-1 overflow-y-auto px-margin-mobile pt-24 pb-48 flex flex-col gap-6">
        {/* Date divider */}
        <div className="flex justify-center">
          <span className="font-label-sm text-label-sm text-outline px-3 py-1 bg-surface-container rounded-full shadow-level-1">
            Today
          </span>
        </div>

        {/* Incoming */}
        <div className="flex w-full justify-start pr-12">
          <div className="bg-surface-container-high text-on-surface p-sm rounded-xl rounded-tl-sm shadow-level-1">
            <p className="font-body-md text-body-md">Hi! I'm interested in the Arduino Starter Kit. Is it still available?</p>
            <div className="flex justify-end mt-1">
              <span className="font-label-sm text-label-sm text-outline">10:42 AM</span>
            </div>
          </div>
        </div>

        {/* Outgoing */}
        <div className="flex w-full justify-end pl-12">
          <div className="bg-secondary-container text-on-secondary-container p-sm rounded-xl rounded-tr-sm shadow-level-2">
            <p className="font-body-md text-body-md">Yes, it's still available! Brand new in box.</p>
            <div className="flex justify-end mt-1 items-center gap-1">
              <span className="font-label-sm text-label-sm text-on-secondary-container/70">10:45 AM</span>
              <span className="material-symbols-outlined text-[16px] text-on-secondary-container/70">done_all</span>
            </div>
          </div>
        </div>

        {/* Incoming */}
        <div className="flex w-full justify-start pr-12">
          <div className="bg-surface-container-high text-on-surface p-sm rounded-xl rounded-tl-sm shadow-level-1">
            <p className="font-body-md text-body-md">Great. Would you accept RM 55 for it?</p>
            <div className="flex justify-end mt-1">
              <span className="font-label-sm text-label-sm text-outline">10:46 AM</span>
            </div>
          </div>
        </div>

        {/* Offer Card */}
        <div className="flex w-full justify-start pr-8">
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl shadow-level-2 w-full overflow-hidden">
            <div className="bg-surface-container px-4 py-3 border-b border-outline-variant/30 flex justify-between items-center">
              <span className="font-headline-sm text-headline-sm text-primary">Offer Submitted</span>
              <span className="font-label-md text-label-md text-secondary-container">Pending</span>
            </div>
            <div className="p-4 flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <img
                  className="w-16 h-16 rounded-lg object-cover shadow-level-1 border border-outline-variant/30"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuD7EfK5o6dPXYejNZTIiygOJh6kHi2Do_G4dDsu0r-YsuOQpFh95vgKn4IUXm2qzZ5wP-B8M44HGy3R6AhVOuO3uxcIDKd7VCISffC8Sc_DICgKHuqXNwNqyecr9EPx37ssZ63tXOMsDbvcIMc5hUWkuUB-fUSIOqP7U3C6lXArtQfVxugJyFUqRPJxPqaxUqOSBItXWGZOqJ865u99-r8OtbQcV0rTrIMGOO6oIEp_CpFf8GOjp3Xe8tog8dF4we6-89CDINbawB4"
                  alt="Arduino"
                />
                <div>
                  <h3 className="font-body-md text-body-md text-on-surface font-semibold">Arduino Starter Kit</h3>
                  <p className="font-headline-md text-headline-md text-primary mt-1">RM 55.00</p>
                </div>
              </div>
              <div className="flex gap-2 w-full mt-2">
                <button className="flex-1 bg-primary-container text-on-primary hover:bg-primary-container/90 transition-colors py-2.5 rounded-lg font-label-md text-label-md flex justify-center items-center">
                  Accept Offer
                </button>
                <button className="flex-1 bg-transparent border border-outline text-on-surface hover:bg-surface-container transition-colors py-2.5 rounded-lg font-label-md text-label-md flex justify-center items-center">
                  Decline
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Action Area */}
      <div className="fixed bottom-0 w-full bg-surface shadow-[0_-4px_24px_rgba(0,0,0,0.1)] z-40">
        <div className="px-margin-mobile pt-4 pb-2">
          <button className="w-full bg-primary-container text-on-primary hover:bg-primary-container/90 transition-colors py-3 rounded-lg font-label-md text-label-md flex justify-center items-center shadow-level-2">
            Make New Offer
          </button>
        </div>
        <div className="px-margin-mobile pb-4 pt-2 flex items-center gap-3">
          <button className="text-on-surface-variant hover:text-primary transition-colors p-2 rounded-full flex items-center justify-center">
            <span className="material-symbols-outlined">photo_camera</span>
          </button>
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              className="w-full bg-surface-container-lowest border border-outline-variant/50 focus:border-secondary-container focus:ring-1 focus:ring-secondary-container rounded-full py-3 px-4 font-body-md text-body-md text-on-surface placeholder:text-outline shadow-level-1 outline-none transition-all"
              placeholder="Type a message..."
              type="text"
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && message.trim()) setMessage(''); }}
            />
          </div>
          <button
            className="bg-secondary-container text-on-secondary-container hover:bg-secondary-container/90 transition-colors p-3 rounded-full flex items-center justify-center shadow-level-2 active:scale-95 disabled:opacity-40"
            disabled={!message.trim()}
            onClick={() => setMessage('')}
          >
            <span className="material-symbols-outlined">send</span>
          </button>
        </div>
      </div>
    </div>
  );
}
