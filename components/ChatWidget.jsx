import { useEffect } from 'react';

// The unique script ID Chatbase assigns to your bot.
// It doubles as a DOM guard — getElementById(SCRIPT_ID) tells us
// whether the embed script is already on the page.
const SCRIPT_ID = 'GP8dBWychLmj2ZIdia-pk';

/**
 * ChatWidget — mounts the Chatbase AI bubble only while this component
 * is in the tree (i.e. only for authenticated users).
 *
 * Usage: drop <ChatWidget /> anywhere inside a route/screen that requires
 * auth, e.g. at the bottom of HomeScreen's JSX return.
 *
 * Renders nothing itself — Chatbase injects its own fixed-position UI
 * directly into <body>.
 */
export default function ChatWidget() {
  useEffect(() => {
    // ── Step 1: initialise the window.chatbase command queue ──────
    // Mirrors the inline IIFE from the Chatbase snippet. Safe to call
    // multiple times — the guard condition prevents re-initialisation.
    if (!window.chatbase || window.chatbase('getState') !== 'initialized') {
      window.chatbase = (...args) => {
        if (!window.chatbase.q) window.chatbase.q = [];
        window.chatbase.q.push(args);
      };
      window.chatbase = new Proxy(window.chatbase, {
        get(target, prop) {
          if (prop === 'q') return target.q;
          return (...args) => target(prop, ...args);
        },
      });
    }

    // ── Step 2: inject the embed script once ─────────────────────
    // If the script tag is already in the DOM (e.g. the user navigated
    // away and back), skip injection entirely to avoid duplicates.
    if (document.getElementById(SCRIPT_ID)) return;

    const script = document.createElement('script');
    script.src    = 'https://www.chatbase.co/embed.min.js';
    script.id     = SCRIPT_ID;
    script.domain = 'www.chatbase.co';
    document.body.appendChild(script);

    // ── Cleanup: runs when the user logs out / component unmounts ─
    // Removes the embed script and resets the global so the widget
    // re-initialises cleanly on the next authenticated session.
    return () => {
      document.getElementById(SCRIPT_ID)?.remove();
      delete window.chatbase;
    };
  }, []); // empty dep array — runs once on mount, cleanup on unmount

  return null;
}
