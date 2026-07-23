import { useEffect } from 'react';

// The unique script ID Chatbase assigns to your bot.
// It doubles as a DOM guard — getElementById(SCRIPT_ID) tells us
// whether the embed script is already on the page.
const SCRIPT_ID          = 'GP8dBWychLmj2ZIdia-pk';
const BUBBLE_BUTTON_ID   = 'chatbase-bubble-button'; // id Chatbase's own script assigns to its toggle button
const POSITION_KEY       = 'chatbase_bubble_position'; // { xPct, yPct } of the button's dropped top-left corner
const DRAG_THRESHOLD_PX  = 6; // movement below this still counts as a tap (opens the chat), not a drag

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// Chatbase's script positions its bubble with inline `position:fixed; right; bottom`
// and has no built-in drag support, so we attach pointer handlers straight to the DOM
// node it creates and override those inline styles while dragging. This reaches into an
// undocumented third-party element (id observed from Chatbase's embed script) — every
// step is defensive so it just stops working rather than throwing if that ever changes.
function makeDraggable(button) {
  let dragging     = false;
  let moved        = false;
  let selfMutating = false; // true while WE are the ones changing button.style, to ignore our own mutations below
  let currentPos   = null;  // last position we applied — reasserted if Chatbase's script overwrites it later
  let startX = 0, startY = 0, startLeft = 0, startTop = 0;

  function applyPosition(left, top) {
    const rect    = button.getBoundingClientRect();
    const maxLeft = Math.max(4, window.innerWidth  - rect.width  - 4);
    const maxTop  = Math.max(4, window.innerHeight - rect.height - 4);
    const clampedLeft = clamp(left, 4, maxLeft);
    const clampedTop  = clamp(top, 4, maxTop);
    selfMutating = true;
    // Chatbase applies its own `transition: 0.2s ease-in-out` to this button, which
    // would animate every move we make — including a live drag — and makes an
    // immediate getBoundingClientRect() read the mid-animation position instead of
    // where we actually put it. Kill it so our positioning is instant.
    button.style.transition = 'none';
    button.style.left   = `${clampedLeft}px`;
    button.style.top    = `${clampedTop}px`;
    button.style.right  = 'auto';
    button.style.bottom = 'auto';
    queueMicrotask(() => { selfMutating = false; });
    currentPos = { left: clampedLeft, top: clampedTop };
    return currentPos;
  }

  // Chatbase re-applies its own inline position asynchronously after we set ours
  // — e.g. once it fetches the bot's style config — sometimes more than once and
  // not always as a plain style mutation on this node. The styleObserver below
  // catches same-node style changes immediately; these timers are a brute-force
  // backstop that re-wins the position for a few seconds after any (re)wiring,
  // in case Chatbase's own re-styling doesn't trigger that observer.
  let reassertTimers = [];
  function clearReassertTimers() {
    reassertTimers.forEach(clearTimeout);
    reassertTimers = [];
  }
  function scheduleReassert() {
    clearReassertTimers();
    [150, 400, 900, 1800, 3000].forEach(delay => {
      reassertTimers.push(setTimeout(() => {
        if (!dragging && currentPos) applyPosition(currentPos.left, currentPos.top);
      }, delay));
    });
  }

  // Restore wherever the user last dropped it
  try {
    const saved = JSON.parse(localStorage.getItem(POSITION_KEY) || 'null');
    if (saved && typeof saved.xPct === 'number' && typeof saved.yPct === 'number') {
      applyPosition(saved.xPct * window.innerWidth, saved.yPct * window.innerHeight);
      scheduleReassert();
    }
  } catch { /* malformed storage — keep Chatbase's default position */ }

  const styleObserver = new MutationObserver(() => {
    if (selfMutating || dragging || !currentPos) return;
    applyPosition(currentPos.left, currentPos.top);
  });
  styleObserver.observe(button, { attributes: true, attributeFilter: ['style'] });

  function onPointerDown(e) {
    dragging  = true;
    moved     = false;
    startX    = e.clientX;
    startY    = e.clientY;
    const rect = button.getBoundingClientRect();
    startLeft = rect.left;
    startTop  = rect.top;
    button.setPointerCapture?.(e.pointerId);
  }

  function onPointerMove(e) {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (!moved && Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) moved = true;
    if (!moved) return;
    applyPosition(startLeft + dx, startTop + dy);
  }

  function onPointerUp() {
    if (!dragging) return;
    dragging = false;
    if (!moved) return;

    const rect = button.getBoundingClientRect();
    localStorage.setItem(POSITION_KEY, JSON.stringify({
      xPct: rect.left / window.innerWidth,
      yPct: rect.top  / window.innerHeight,
    }));
    scheduleReassert();

    // Swallow the click Chatbase's handler would otherwise get right after
    // this drag, so dropping the bubble doesn't also toggle the chat open.
    const swallowClick = (ce) => {
      ce.stopImmediatePropagation();
      ce.preventDefault();
      button.removeEventListener('click', swallowClick, true);
    };
    button.addEventListener('click', swallowClick, true);
  }

  function onResize() {
    // Keep it on-screen across orientation changes / window resizes
    const rect = button.getBoundingClientRect();
    applyPosition(rect.left, rect.top);
  }

  button.style.cursor      = 'grab';
  button.style.touchAction = 'none';
  button.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('resize', onResize);

  return () => {
    clearReassertTimers();
    styleObserver.disconnect();
    button.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('resize', onResize);
  };
}

/**
 * ChatWidget — mounts the Chatbase AI bubble only while this component
 * is in the tree.
 *
 * Mounted once in Layout.jsx (outside <Outlet />) so it stays alive across
 * every route instead of unmounting/remounting per screen — that used to
 * mean the bubble (and its dragged position) only worked on whichever
 * screen rendered it directly.
 *
 * Renders nothing itself — Chatbase injects its own fixed-position UI
 * directly into <body>. The bubble is made draggable (see makeDraggable
 * above) so it floats and can be repositioned instead of sitting static
 * in one corner; its position is remembered across visits.
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

    // ── Step 2: wire up dragging on Chatbase's bubble button ──────
    // The script injects it asynchronously, and swaps in a fresh element once
    // its bot config finishes loading — so keep watching for a *new* node,
    // not just the first one, and re-wire whenever the identity changes.
    let wiredButton = null;
    let cleanupDrag = null;
    const wireIfNeeded = () => {
      const button = document.getElementById(BUBBLE_BUTTON_ID);
      if (button && button !== wiredButton) {
        cleanupDrag?.();
        wiredButton = button;
        cleanupDrag = makeDraggable(button);
      }
    };

    const observer = new MutationObserver(wireIfNeeded);
    observer.observe(document.body, { childList: true, subtree: true });
    wireIfNeeded(); // covers a fast remount where the button is already in the DOM

    // ── Step 3: inject the embed script once ─────────────────────
    // If the script tag is already in the DOM (e.g. the user navigated
    // away and back), skip injection entirely to avoid duplicates.
    if (!document.getElementById(SCRIPT_ID)) {
      const script = document.createElement('script');
      script.src    = 'https://www.chatbase.co/embed.min.js';
      script.id     = SCRIPT_ID;
      script.domain = 'www.chatbase.co';
      document.body.appendChild(script);
    }

    // ── Cleanup: runs when the user logs out / component unmounts ─
    // Removes the embed script and resets the global so the widget
    // re-initialises cleanly on the next authenticated session.
    return () => {
      observer.disconnect();
      cleanupDrag?.();
      document.getElementById(SCRIPT_ID)?.remove();
      delete window.chatbase;
    };
  }, []); // empty dep array — runs once on mount, cleanup on unmount

  return null;
}
