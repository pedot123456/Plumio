/**
 * ChatWindow.jsx — Reusable real-time chat component powered by Supabase Realtime.
 *
 * How it works:
 *  1. On mount, fetches existing messages from the `messages` table via a normal SELECT.
 *  2. Opens a Supabase Realtime channel filtered to this conversation_id.
 *  3. The channel listens for postgres_changes (INSERT) on the `messages` table.
 *     Supabase streams these changes over a WebSocket it manages — no custom
 *     backend or Vercel serverless WebSocket needed.
 *  4. When the user sends a message an optimistic row is added immediately,
 *     then replaced with the confirmed DB row once the INSERT resolves.
 *  5. The channel is torn down on unmount via supabase.removeChannel().
 *
 * Props:
 *   conversationId  string  — UUID of the current conversation row
 *   currentUserId   string  — UUID of the signed-in user (used to align bubbles)
 *   otherUserName   string  — Display name shown while the thread is empty
 *   className       string  — Extra classes for the outer wrapper (e.g. "flex-1")
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabase';

// ── Time formatter ────────────────────────────────────────────────
function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('en-MY', {
    hour: '2-digit', minute: '2-digit',
  });
}

// ── Single message bubble ─────────────────────────────────────────
function MessageBubble({ msg, isMine }) {
  return (
    <div className={`flex w-full ${isMine ? 'justify-end pl-12' : 'justify-start pr-12'}`}>
      <div
        className={`px-md py-sm rounded-2xl shadow-level-1 max-w-[80%] ${
          isMine
            ? `bg-secondary-container text-on-secondary-container rounded-tr-sm ${
                msg._pending ? 'opacity-60' : ''
              }`
            : 'bg-surface-container-high text-on-surface rounded-tl-sm'
        }`}
      >
        <p className="font-body-md text-body-md whitespace-pre-wrap break-words">
          {msg.content}
        </p>
        <div className="flex justify-end items-center gap-1 mt-1">
          <span
            className={`font-label-sm text-label-sm ${
              isMine ? 'text-on-secondary-container/60' : 'text-outline'
            }`}
          >
            {fmtTime(msg.created_at)}
          </span>
          {isMine && !msg._pending && (
            <span className="material-symbols-outlined text-[14px] text-on-secondary-container/60">
              done_all
            </span>
          )}
          {isMine && msg._pending && (
            <span className="material-symbols-outlined text-[14px] text-on-secondary-container/40">
              schedule
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Loading skeletons ─────────────────────────────────────────────
function MessageSkeleton({ align = 'left' }) {
  return (
    <div className={`flex w-full ${align === 'right' ? 'justify-end' : 'justify-start'} animate-pulse`}>
      <div
        className={`h-10 rounded-2xl bg-surface-container-high ${
          align === 'right' ? 'w-40' : 'w-52'
        }`}
      />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────
export default function ChatWindow({
  conversationId,
  currentUserId,
  otherUserName = 'the other person',
  className = '',
}) {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]     = useState('');
  const [text, setText]       = useState('');
  const [sending, setSending] = useState(false);

  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);

  // ── 1. Fetch history on mount ─────────────────────────────────
  useEffect(() => {
    if (!conversationId) { setIsLoading(false); return; }

    let active = true;

    async function load() {
      setIsLoading(true);
      setError('');
      const { data, error: err } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (!active) return;
      if (err) setError(err.message);
      else      setMessages(data ?? []);
      setIsLoading(false);
    }

    load();
    return () => { active = false; };
  }, [conversationId]);

  // ── 2. Supabase Realtime subscription ────────────────────────
  //
  //  supabase.channel() opens a single multiplexed WebSocket to Supabase.
  //  .on('postgres_changes', ...) tells Supabase to forward DB change events
  //  for this specific table + filter through that socket.
  //  No custom server, no Vercel function, no long-lived process needed.
  //
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages:${conversationId}`)   // unique channel name per conversation
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) => {
            // Replace the optimistic placeholder from the sender's own client
            const optimisticIdx = prev.findIndex(
              (m) => m._pending && m.sender_id === payload.new.sender_id
            );
            if (optimisticIdx !== -1) {
              const next = [...prev];
              next[optimisticIdx] = payload.new;
              return next;
            }
            // Guard against duplicate events (Supabase can occasionally re-deliver)
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
        }
      )
      .subscribe((status) => {
        // 'SUBSCRIBED' means the channel is live and receiving changes.
        // Any other terminal status (CHANNEL_ERROR, TIMED_OUT) means a problem.
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setError('Real-time connection lost. Reload to reconnect.');
        }
      });

    // Tear down the subscription when this conversation unmounts or changes
    return () => { supabase.removeChannel(channel); };
  }, [conversationId]);

  // ── 3. Auto-scroll on new messages ───────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── 4. Send a message ─────────────────────────────────────────
  const sendMessage = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || !currentUserId || !conversationId || sending) return;

    // Optimistic update — user sees the bubble immediately
    const tempId      = `pending-${Date.now()}`;
    const optimistic  = {
      id:              tempId,
      _pending:        true,
      conversation_id: conversationId,
      sender_id:       currentUserId,
      content:         trimmed,
      type:            'text',
      created_at:      new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setText('');
    setSending(true);

    // Persist to Supabase — this INSERT triggers the Realtime event on the
    // other party's client. Our own client swaps the optimistic row out when
    // the INSERT payload arrives via the channel (handled above).
    const { data, error: insertErr } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id:       currentUserId,
        content:         trimmed,
        type:            'text',
      })
      .select()
      .single();

    setSending(false);

    if (insertErr) {
      // Roll back the optimistic row and surface the error
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setError(insertErr.message);
    } else if (data) {
      // Swap optimistic → confirmed (in case the Realtime event beats us here)
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? data : m))
      );
    }
  }, [text, currentUserId, conversationId, sending]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className={`flex flex-col overflow-hidden ${className}`}>

      {/* ── Message list ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">

        {isLoading && (
          <>
            <MessageSkeleton align="left"  />
            <MessageSkeleton align="right" />
            <MessageSkeleton align="left"  />
            <MessageSkeleton align="right" />
          </>
        )}

        {!isLoading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center flex-1 gap-3 text-on-surface-variant py-16">
            <span className="material-symbols-outlined text-[52px]">chat_bubble_outline</span>
            <p className="font-body-md text-center">
              Say hello to {otherUserName} to start the conversation!
            </p>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 bg-error/10 border border-error/20 rounded-xl px-4 py-3">
            <span className="material-symbols-outlined text-error text-[18px] mt-px shrink-0">
              error_outline
            </span>
            <p className="font-body-sm text-error flex-1">{error}</p>
            <button onClick={() => setError('')} className="text-error shrink-0">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            isMine={msg.sender_id === currentUserId}
          />
        ))}

        {/* Invisible anchor — scrollIntoView targets this to keep the list pinned to bottom */}
        <div ref={bottomRef} />
      </div>

      {/* ── Input bar ── */}
      <div className="border-t border-outline-variant/20 bg-surface px-4 py-3 flex items-end gap-3">
        <textarea
          ref={inputRef}
          rows={1}
          className="flex-1 resize-none bg-surface-container-lowest border border-outline-variant/40 focus:border-secondary focus:ring-1 focus:ring-secondary rounded-2xl py-2.5 px-4 font-body-md text-on-surface placeholder:text-on-surface-variant/50 outline-none transition-all max-h-32 leading-relaxed"
          placeholder="Type a message…"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            // Auto-grow: reset height then set to scrollHeight
            e.target.style.height = 'auto';
            e.target.style.height = `${e.target.scrollHeight}px`;
          }}
          onKeyDown={handleKeyDown}
        />
        <button
          onClick={sendMessage}
          disabled={!text.trim() || sending}
          aria-label="Send message"
          className="bg-secondary-container text-on-secondary-container hover:bg-secondary hover:text-on-secondary transition-colors p-3 rounded-full shadow-level-1 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 flex items-center justify-center"
        >
          {sending ? (
            <span className="w-5 h-5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
          ) : (
            <span className="material-symbols-outlined">send</span>
          )}
        </button>
      </div>

    </div>
  );
}
