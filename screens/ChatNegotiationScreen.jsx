import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { notify } from '../utils/notify';

export default function ChatNegotiationScreen() {
  const navigate          = useNavigate();
  const location          = useLocation();
  const { id: convId }    = useParams();
  const { session }       = useAuth();

  // ── Context passed from product page ──────────────────────────
  const {
    prefill      = '',
    listingTitle = 'Item',
    listingImage = null,
    sellerName   = 'Seller',
  } = location.state ?? {};

  // ── State ──────────────────────────────────────────────────────
  const [messages,       setMessages]       = useState([]);
  const [isLoading,      setIsLoading]      = useState(true);
  const [chatError,      setChatError]      = useState('');
  const [msgText,        setMsgText]        = useState(prefill ?? '');
  const [sending,        setSending]        = useState(false);
  const [menuOpen,       setMenuOpen]       = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerAmount,    setOfferAmount]    = useState('');
  const [offerSending,   setOfferSending]   = useState(false);
  const [offerError,     setOfferError]     = useState('');
  const [uploadingMedia, setUploadingMedia] = useState(false);

  // ── Refs ───────────────────────────────────────────────────────
  const inputRef     = useRef(null);
  const bottomRef    = useRef(null);
  const menuRef      = useRef(null);
  const fileInputRef = useRef(null);

  // ── Kebab menu: close on outside click ────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Fetch messages + realtime subscription ────────────────────
  useEffect(() => {
    if (!convId) { setIsLoading(false); return; }
    fetchMessages();

    const channel = supabase
      .channel(`chat-${convId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${convId}`,
      }, (payload) => {
        setMessages(prev => {
          // Replace matching optimistic message
          const idx = prev.findIndex(m => m._pending && m.sender_id === payload.new.sender_id);
          if (idx !== -1) {
            const next = [...prev];
            next[idx] = payload.new;
            return next;
          }
          // Avoid duplicates
          if (prev.some(m => m.id === payload.new.id)) return prev;
          return [...prev, payload.new];
        });
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${convId}`,
      }, (payload) => {
        setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new : m));
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [convId]);

  // ── Auto scroll to bottom ─────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Focus + prefill ───────────────────────────────────────────
  useEffect(() => {
    if (prefill) {
      inputRef.current?.focus();
      const len = prefill.length;
      inputRef.current?.setSelectionRange(len, len);
    }
  }, []);

  // ── Get the other participant's ID (for notifications) ───────
  async function getOtherUserId() {
    const { data } = await supabase
      .from('conversations')
      .select('buyer_id, seller_id')
      .eq('id', convId)
      .maybeSingle();
    if (!data) return null;
    return data.buyer_id === session?.user?.id ? data.seller_id : data.buyer_id;
  }

  // ── Fetch all messages ────────────────────────────────────────
  async function fetchMessages() {
    setIsLoading(true);
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });
    setMessages(data ?? []);
    setIsLoading(false);
  }

  // ── Send text (optimistic UI) ─────────────────────────────────
  async function sendMessage() {
    const text = msgText.trim();
    if (!text || !session || !convId) return;

    const tempId = `pending-${Date.now()}`;
    const optimistic = {
      id: tempId, _pending: true,
      conversation_id: convId,
      sender_id: session.user.id,
      content: text, type: 'text',
      created_at: new Date().toISOString(),
    };
    // Add instantly — no loading state visible to user
    setMessages(prev => [...prev, optimistic]);
    setMsgText('');
    setSending(true);

    const { data, error } = await supabase
      .from('messages')
      .insert({ conversation_id: convId, sender_id: session.user.id, content: text, type: 'text' })
      .select().single();

    setSending(false);
    if (error) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setChatError(error.message);
    } else if (data) {
      setMessages(prev => prev.map(m => m.id === tempId ? data : m));
      // Notify other party
      const otherId = await getOtherUserId();
      if (otherId) {
        notify(otherId, {
          type:  'new_message',
          title: `New message from ${session.user.user_metadata?.full_name ?? 'someone'}`,
          body:  text.length > 80 ? text.slice(0, 80) + '…' : text,
          data:  { chat_id: convId },
        });
      }
    }
  }

  // ── Send offer ────────────────────────────────────────────────
  async function sendOffer() {
    const amount = Number(offerAmount);
    if (!amount || amount <= 0 || !session || !convId) return;
    setOfferSending(true);
    setOfferError('');

    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: convId,
        sender_id: session.user.id,
        type: 'offer',
        content: `Offer: RM ${amount.toFixed(2)}`,
        offer_amount: amount,
        offer_status: 'pending',
      })
      .select().single();

    setOfferSending(false);
    if (error) {
      setOfferError(error.message);
    } else if (data) {
      setMessages(prev => [...prev, data]);
      setShowOfferModal(false);
      setOfferAmount('');
      // Notify other party of the new offer
      const otherId = await getOtherUserId();
      if (otherId) {
        notify(otherId, {
          type:  'new_offer',
          title: 'New offer received',
          body:  `RM ${amount.toFixed(2)} offer on "${listingTitle}"`,
          data:  { chat_id: convId },
        });
      }
    }
  }

  // ── Accept / Decline offer ────────────────────────────────────
  async function handleOfferResponse(messageId, status) {
    const { error } = await supabase
      .from('messages')
      .update({ offer_status: status })
      .eq('id', messageId);

    if (!error) {
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, offer_status: status } : m));
    }
  }

  // ── Upload photo / video ──────────────────────────────────────
  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file || !session || !convId) return;
    setUploadingMedia(true);
    setChatError('');

    const ext     = file.name.split('.').pop();
    const isVideo = file.type.startsWith('video/');
    const path    = `${convId}/${Date.now()}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from('chat-media').upload(path, file);

    if (upErr) {
      setChatError('Photo upload failed: ' + upErr.message);
      setUploadingMedia(false);
      e.target.value = '';
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('chat-media').getPublicUrl(path);

    const { data, error: msgErr } = await supabase
      .from('messages')
      .insert({
        conversation_id: convId,
        sender_id: session.user.id,
        type: isVideo ? 'video' : 'image',
        content: publicUrl,
      })
      .select().single();

    if (msgErr) {
      setChatError('Failed to send media: ' + msgErr.message);
    } else if (data) {
      setMessages(prev => [...prev, data]);
    }
    setUploadingMedia(false);
    e.target.value = '';
  }

  // ── Helpers ───────────────────────────────────────────────────
  const isMine = (msg) => msg.sender_id === session?.user?.id;
  const fmtTime = (iso) =>
    new Date(iso).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' });

  const OFFER_STATUS_STYLE = {
    pending:  { label: 'Pending',  cls: 'text-on-surface-variant' },
    accepted: { label: 'Accepted', cls: 'text-secondary' },
    declined: { label: 'Declined', cls: 'text-error' },
  };

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="bg-background text-on-background h-screen flex flex-col font-body-md">

      {/* Hidden file input — accepts photos AND videos */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* ── Top App Bar ──────────────────────────────────────── */}
      <header className="fixed top-0 w-full z-50 shadow-sm bg-surface">
        <div className="flex justify-between items-center px-4 h-16">
          <div className="flex items-center gap-3">
            <button
              className="text-primary hover:bg-surface-container transition-colors active:scale-95 p-2 rounded-full"
              onClick={() => navigate(-1)}
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            {listingImage && (
              <img
                className="w-10 h-10 rounded-lg object-cover shadow-level-1 border border-outline-variant/30 shrink-0"
                src={listingImage}
                alt={listingTitle}
              />
            )}
            <div className="flex flex-col min-w-0">
              <h1 className="font-headline-sm text-headline-sm text-primary truncate max-w-[150px]">
                {sellerName}
              </h1>
              <span className="font-label-sm text-label-sm text-on-surface-variant truncate max-w-[160px]">
                {listingTitle}
              </span>
            </div>
          </div>

          {/* Kebab menu */}
          <div className="relative" ref={menuRef}>
            <button
              className="text-on-surface-variant hover:bg-surface-container transition-colors p-2 rounded-full"
              onClick={() => setMenuOpen(v => !v)}
            >
              <span className="material-symbols-outlined">more_vert</span>
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-surface rounded-xl shadow-level-2 border border-outline-variant/20 overflow-hidden z-50">
                <button
                  className="w-full flex items-center gap-3 px-md py-sm font-body-md text-body-md text-on-surface hover:bg-surface-container transition-colors text-left"
                  onClick={() => { setMenuOpen(false); navigate('/report'); }}
                >
                  <span className="material-symbols-outlined text-[20px] text-error">flag</span>
                  Report User
                </button>
                <button
                  className="w-full flex items-center gap-3 px-md py-sm font-body-md text-body-md text-on-surface hover:bg-surface-container transition-colors text-left"
                  onClick={() => { setMenuOpen(false); alert('Block feature coming soon.'); }}
                >
                  <span className="material-symbols-outlined text-[20px] text-on-surface-variant">block</span>
                  Block User
                </button>
                <div className="border-t border-outline-variant/20" />
                <button
                  className="w-full flex items-center gap-3 px-md py-sm font-body-md text-body-md text-error hover:bg-error/5 transition-colors text-left"
                  onClick={async () => {
                    setMenuOpen(false);
                    if (!window.confirm('Delete this conversation? This cannot be undone.')) return;
                    await supabase.from('messages').delete().eq('conversation_id', convId);
                    await supabase.from('conversations').delete().eq('id', convId);
                    navigate(-1);
                  }}
                >
                  <span className="material-symbols-outlined text-[20px]">delete</span>
                  Delete Chat
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Chat Canvas ──────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto px-margin-mobile pt-24 pb-48 flex flex-col gap-4">

        {isLoading && (
          <div className="flex justify-center items-center py-xl">
            <span className="w-6 h-6 border-2 border-secondary/30 border-t-secondary rounded-full animate-spin" />
          </div>
        )}

        {chatError && (
          <div className="sticky top-0 z-10 flex items-center gap-sm bg-error/10 border border-error/20 rounded-lg px-md py-sm mx-0">
            <span className="material-symbols-outlined text-error text-[18px] shrink-0">error_outline</span>
            <span className="font-body-sm text-body-sm text-error flex-1">{chatError}</span>
            <button onClick={() => setChatError('')} className="text-error shrink-0">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        )}

        {!isLoading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-xxl gap-sm text-on-surface-variant">
            <span className="material-symbols-outlined text-[48px]">chat_bubble_outline</span>
            <p className="font-body-md">Say hello to start the conversation!</p>
          </div>
        )}

        {messages.map((msg) => {
          const mine = isMine(msg);

          // ── Offer card ──
          if (msg.type === 'offer') {
            const status = OFFER_STATUS_STYLE[msg.offer_status] ?? OFFER_STATUS_STYLE.pending;
            return (
              <div key={msg.id} className={`flex w-full ${mine ? 'justify-end pl-8' : 'justify-start pr-8'}`}>
                <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl shadow-level-1 w-full overflow-hidden">
                  <div className="bg-surface-container px-md py-sm border-b border-outline-variant/30 flex justify-between items-center">
                    <span className="font-headline-sm text-headline-sm text-primary">
                      {mine ? 'Offer Sent' : 'Offer Received'}
                    </span>
                    <span className={`font-label-md text-label-md ${status.cls}`}>{status.label}</span>
                  </div>
                  <div className="p-md flex flex-col gap-sm">
                    {listingImage && (
                      <div className="flex items-center gap-md">
                        <img
                          className="w-14 h-14 rounded-lg object-cover border border-outline-variant/30"
                          src={listingImage}
                          alt={listingTitle}
                        />
                        <div>
                          <p className="font-body-md text-body-md text-on-surface font-semibold">{listingTitle}</p>
                          <p className="font-headline-md text-headline-md text-primary mt-xs">
                            RM {Number(msg.offer_amount).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    )}
                    {!listingImage && (
                      <p className="font-headline-md text-headline-md text-primary">
                        RM {Number(msg.offer_amount).toFixed(2)}
                      </p>
                    )}
                    {msg.offer_status === 'pending' && !mine && (
                      <div className="flex gap-sm mt-xs">
                        <button
                          className="flex-1 bg-primary-container text-on-primary py-sm rounded-lg font-label-md text-label-md hover:bg-primary transition-colors"
                          onClick={() => handleOfferResponse(msg.id, 'accepted')}
                        >
                          Accept
                        </button>
                        <button
                          className="flex-1 border border-outline text-on-surface py-sm rounded-lg font-label-md text-label-md hover:bg-surface-container transition-colors"
                          onClick={() => handleOfferResponse(msg.id, 'declined')}
                        >
                          Decline
                        </button>
                      </div>
                    )}
                    {msg.offer_status === 'accepted' && (
                      <div className="flex items-center gap-xs text-secondary font-label-md text-label-md">
                        <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                        Offer accepted — proceed to checkout
                      </div>
                    )}
                    {msg.offer_status === 'declined' && (
                      <div className="flex items-center gap-xs text-error font-label-md text-label-md">
                        <span className="material-symbols-outlined text-[18px]">cancel</span>
                        Offer declined
                      </div>
                    )}
                  </div>
                  <div className="px-md pb-sm flex justify-end">
                    <span className="font-label-sm text-label-sm text-outline">{fmtTime(msg.created_at)}</span>
                  </div>
                </div>
              </div>
            );
          }

          // ── Image ──
          if (msg.type === 'image') {
            return (
              <div key={msg.id} className={`flex w-full ${mine ? 'justify-end pl-12' : 'justify-start pr-12'}`}>
                <div className={`rounded-xl overflow-hidden shadow-level-1 max-w-[240px] ${msg._pending ? 'opacity-60' : ''}`}>
                  <img src={msg.content} alt="Shared" className="w-full object-cover" />
                  <div className={`px-sm py-xs flex justify-end ${mine ? 'bg-secondary-container' : 'bg-surface-container-high'}`}>
                    <span className="font-label-sm text-label-sm text-outline">{fmtTime(msg.created_at)}</span>
                  </div>
                </div>
              </div>
            );
          }

          // ── Video ──
          if (msg.type === 'video') {
            return (
              <div key={msg.id} className={`flex w-full ${mine ? 'justify-end pl-12' : 'justify-start pr-12'}`}>
                <div className="rounded-xl overflow-hidden shadow-level-1 max-w-[240px]">
                  <video src={msg.content} controls className="w-full" />
                  <div className={`px-sm py-xs flex justify-end ${mine ? 'bg-secondary-container' : 'bg-surface-container-high'}`}>
                    <span className="font-label-sm text-label-sm text-outline">{fmtTime(msg.created_at)}</span>
                  </div>
                </div>
              </div>
            );
          }

          // ── Text message ──
          return (
            <div key={msg.id} className={`flex w-full ${mine ? 'justify-end pl-12' : 'justify-start pr-12'}`}>
              <div className={`p-sm rounded-xl shadow-level-1 max-w-[80%] ${
                mine
                  ? `bg-secondary-container text-on-secondary-container rounded-tr-sm ${msg._pending ? 'opacity-60' : ''}`
                  : 'bg-surface-container-high text-on-surface rounded-tl-sm'
              }`}>
                <p className="font-body-md text-body-md">{msg.content}</p>
                <div className="flex justify-end items-center gap-1 mt-1">
                  <span className={`font-label-sm text-label-sm ${mine ? 'text-on-secondary-container/70' : 'text-outline'}`}>
                    {fmtTime(msg.created_at)}
                  </span>
                  {mine && !msg._pending && (
                    <span className="material-symbols-outlined text-[15px] text-on-secondary-container/70">done_all</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </main>

      {/* ── Bottom Action Area ───────────────────────────────── */}
      <div className="fixed bottom-0 w-full bg-surface shadow-[0_-4px_24px_rgba(0,0,0,0.1)] z-40">
        <div className="px-margin-mobile pt-sm pb-xs">
          <button
            className="w-full bg-primary-container text-on-primary hover:bg-primary transition-colors py-sm rounded-lg font-label-md text-label-md flex justify-center items-center gap-sm shadow-level-1"
            onClick={() => setShowOfferModal(true)}
          >
            <span className="material-symbols-outlined text-[20px]">local_offer</span>
            Make New Offer
          </button>
        </div>
        <div className="px-margin-mobile pb-safe pt-xs flex items-center gap-sm">
          {/* Camera / media button */}
          <button
            className="text-on-surface-variant hover:text-primary transition-colors p-2 rounded-full flex items-center justify-center disabled:opacity-40"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingMedia}
          >
            {uploadingMedia
              ? <span className="w-5 h-5 border-2 border-secondary/30 border-t-secondary rounded-full animate-spin" />
              : <span className="material-symbols-outlined">photo_camera</span>
            }
          </button>

          {/* Text input */}
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              className="w-full bg-surface-container-lowest border border-outline-variant/50 focus:border-secondary focus:ring-1 focus:ring-secondary rounded-full py-sm px-md font-body-md text-body-md text-on-surface placeholder:text-outline shadow-level-1 outline-none transition-all"
              placeholder="Type a message…"
              type="text"
              value={msgText}
              onChange={e => setMsgText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && msgText.trim()) sendMessage(); }}
            />
          </div>

          {/* Send button */}
          <button
            className="bg-secondary-container text-on-secondary-container hover:bg-secondary hover:text-on-secondary transition-colors p-3 rounded-full flex items-center justify-center shadow-level-1 active:scale-95 disabled:opacity-40"
            disabled={!msgText.trim() || sending}
            onClick={sendMessage}
          >
            {sending
              ? <span className="w-5 h-5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
              : <span className="material-symbols-outlined">send</span>
            }
          </button>
        </div>
      </div>

      {/* ── Offer Modal ───────────────────────────────────────── */}
      {showOfferModal && (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setShowOfferModal(false); setOfferError(''); }} />
          <div className="relative bg-surface rounded-t-2xl md:rounded-2xl w-full max-w-md p-lg shadow-level-2 z-10">
            <h2 className="font-headline-md text-headline-md text-primary mb-xs">Make an Offer</h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-lg">
              Enter your offer price for <span className="font-semibold text-primary">{listingTitle}</span>
            </p>
            <div className="relative flex items-center mb-lg">
              <span className="absolute left-md font-headline-sm text-headline-sm text-primary-container font-semibold pointer-events-none">RM</span>
              <input
                autoFocus
                type="number"
                min="0"
                step="0.01"
                value={offerAmount}
                onChange={e => setOfferAmount(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') sendOffer(); }}
                placeholder="0.00"
                className="w-full bg-surface-container-lowest border border-tertiary/20 rounded-lg pl-[3.5rem] pr-md py-sm font-headline-sm text-headline-sm text-primary-container focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent placeholder:text-outline/50 shadow-level-1"
              />
            </div>
            {offerError && (
              <div className="flex items-center gap-sm bg-error/10 border border-error/20 rounded-lg px-md py-sm mb-md">
                <span className="material-symbols-outlined text-error text-[18px] shrink-0">error_outline</span>
                <span className="font-body-sm text-body-sm text-error flex-1">{offerError}</span>
                <button onClick={() => setOfferError('')} className="text-error shrink-0">
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
            )}
            <div className="flex gap-sm">
              <button
                className="flex-1 border border-outline-variant text-on-surface-variant py-sm rounded-lg font-label-md text-label-md hover:bg-surface-container transition-colors"
                onClick={() => { setShowOfferModal(false); setOfferError(''); }}
              >
                Cancel
              </button>
              <button
                disabled={!offerAmount || Number(offerAmount) <= 0 || offerSending}
                className="flex-1 bg-primary-container text-on-primary py-sm rounded-lg font-label-md text-label-md hover:bg-primary transition-colors disabled:opacity-50 flex items-center justify-center gap-xs"
                onClick={sendOffer}
              >
                {offerSending
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : 'Send Offer'
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
