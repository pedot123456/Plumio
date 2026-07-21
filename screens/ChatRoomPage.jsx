/*
  ── Supabase SQL (run once in your SQL Editor) ──────────────────────────────

  CREATE TABLE IF NOT EXISTS public.conversations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    seller_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    item_id         UUID REFERENCES public.listings(id) ON DELETE SET NULL,
    last_message    TEXT,
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (buyer_id, seller_id, item_id)
  );

  CREATE TABLE IF NOT EXISTS public.messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content         TEXT,       -- null for image-only messages
    image_url       TEXT,       -- null for text-only messages
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    CHECK (content IS NOT NULL OR image_url IS NOT NULL)
  );

  -- RLS
  ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.messages      ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "participants can view conversations"
    ON public.conversations FOR SELECT
    USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

  CREATE POLICY "participants can view messages"
    ON public.messages FOR SELECT
    USING (EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
    ));

  CREATE POLICY "participants can insert messages"
    ON public.messages FOR INSERT
    WITH CHECK (
      auth.uid() = sender_id AND
      EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE c.id = conversation_id
          AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
      )
    );

  -- Enable realtime for new message delivery
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

  -- Storage: create a public bucket named 'chat-images' in Supabase Dashboard > Storage
*/

import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Package, ImagePlus, Loader2, ShoppingCart, Check, X } from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

// ── Helpers ──────────────────────────────────────────────────────────────────

const AVATAR_HEX = ['#6366F1', '#EC4899', '#10B981', '#F97316', '#3B82F6', '#8B5CF6'];
function getAvatarColor(str = '') {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_HEX[Math.abs(h) % AVATAR_HEX.length];
}
function formatMsgTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ChatRoomPage() {
  const { chatId }    = useParams();
  const navigate      = useNavigate();
  const { session }   = useAuth();
  const currentUserId = session?.user?.id;

  const bottomRef    = useRef(null);
  const inputRef     = useRef(null);
  const fileInputRef = useRef(null);

  const { addToCart } = useCart();

  const [convo,       setConvo]       = useState(null);
  const [messages,    setMessages]    = useState([]);
  const [inputText,   setInputText]   = useState('');
  const [isLoading,   setIsLoading]   = useState(true);
  const [isSending,   setIsSending]   = useState(false);
  const [cartAdding,  setCartAdding]  = useState(false);
  const [error,       setError]       = useState('');

  // ── 1. Fetch conversation metadata (other user + item) ────────────────────
  useEffect(() => {
    if (!chatId || !currentUserId) return;
    async function fetchConvo() {
      // Step 1 — flat conversation row
      const { data: row } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', chatId)
        .maybeSingle();

      if (!row) { setConvo(null); return; }

      const listingId = row.listing_id ?? row.item_id ?? null;

      // Step 2 — fetch profiles and listing in parallel
      const userIds = [row.buyer_id, row.seller_id].filter(Boolean);
      const [{ data: profiles }, { data: listing }] = await Promise.all([
        supabase.from('profiles').select('id, full_name, avatar_url').in('id', userIds),
        listingId
          ? supabase.from('listings').select('id, title, price').eq('id', listingId).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      const profilesById = new Map((profiles ?? []).map(p => [p.id, p]));
      setConvo({
        ...row,
        buyer:   profilesById.get(row.buyer_id)  ?? null,
        seller:  profilesById.get(row.seller_id) ?? null,
        listing: listing ?? null,
      });
    }
    fetchConvo();
  }, [chatId, currentUserId]);

  // ── 2. Fetch messages + real-time subscription ────────────────────────────
  useEffect(() => {
    if (!chatId) return;

    async function markRead() {
      if (!currentUserId) return;
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', chatId)
        .eq('receiver_id', currentUserId)
        .eq('is_read', false);
    }

    async function fetchMessages() {
      setIsLoading(true);
      const { data, error: err } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', chatId)
        .order('created_at', { ascending: true });
      if (!err) {
        setMessages(data ?? []);
        markRead();
      }
      setIsLoading(false);
    }
    fetchMessages();

    const channel = supabase
      .channel(`room:${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${chatId}`,
        },
        (payload) => {
          setMessages(prev => {
            // Swap out the matching optimistic placeholder
            const tempIdx = prev.findIndex(
              m => m._tempId && m.sender_id === payload.new.sender_id
            );
            if (tempIdx !== -1) {
              const next = [...prev];
              next[tempIdx] = payload.new;
              return next;
            }
            if (prev.some(m => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
          // Mark incoming messages as read immediately while the room is open
          if (payload.new.receiver_id === currentUserId) {
            markRead();
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [chatId]);

  // ── 3. Auto-scroll to bottom on new messages ──────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── 4. Send text message ──────────────────────────────────────────────────
  async function sendMessage() {
    const text = inputText.trim();
    if (!text || !currentUserId || isSending) return;

    const tempId = `temp-${Date.now()}`;
    setMessages(prev => [
      ...prev,
      {
        id: tempId, _tempId: true,
        conversation_id: chatId,
        sender_id: currentUserId,
        content: text,
        type: 'text',
        created_at: new Date().toISOString(),
      },
    ]);
    setInputText('');
    setIsSending(true);

    const { error: err } = await supabase.from('messages').insert({
      conversation_id: chatId,
      sender_id: currentUserId,
      receiver_id: otherUser?.id,
      content: text,
      type: 'text',
    });

    if (err) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setInputText(text);
      setError('Failed to send. Please try again.');
    } else {
      supabase.from('conversations')
        .update({ last_message: text, last_message_at: new Date().toISOString() })
        .eq('id', chatId);
    }
    setIsSending(false);
  }

  // ── 5. Send image message ─────────────────────────────────────────────────
  async function handleImageSelect(e) {
    const file = e.target.files?.[0];
    if (!file || !currentUserId) return;

    const localUrl = URL.createObjectURL(file);
    const tempId   = `temp-img-${Date.now()}`;
    setMessages(prev => [
      ...prev,
      {
        id: tempId, _tempId: true,
        conversation_id: chatId,
        sender_id: currentUserId,
        content: localUrl,
        type: 'image',
        created_at: new Date().toISOString(),
      },
    ]);
    e.target.value = '';

    const ext  = file.name.split('.').pop() ?? 'jpg';
    const path = `${chatId}/${Date.now()}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from('chat-images')
      .upload(path, file);

    if (upErr) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      URL.revokeObjectURL(localUrl);
      setError('Image upload failed. Please try again.');
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('chat-images')
      .getPublicUrl(path);

    await supabase.from('messages').insert({
      conversation_id: chatId,
      sender_id: currentUserId,
      receiver_id: otherUser?.id,
      content: publicUrl,
      type: 'image',
    });

    await supabase.from('conversations')
      .update({ last_message: '📷 Photo', last_message_at: new Date().toISOString() })
      .eq('id', chatId);

    URL.revokeObjectURL(localUrl);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  // ── Offer helpers ─────────────────────────────────────────────────────────

  // Detects offer messages regardless of how they were sent (typed or programmatic)
  function isOfferMsg(msg) {
    return msg.type === 'offer' ||
      (msg.type === 'text' && /^Offer:\s*RM\s*[\d.]+/i.test(msg.content ?? ''));
  }

  // Extracts the numeric offer price from any offer message content
  function parseOfferPrice(content = '') {
    try { const p = JSON.parse(content); if (p?.price != null) return Number(p.price); } catch {}
    const m = (content || '').match(/Offer:\s*RM\s*([\d.]+)/i);
    return m ? parseFloat(m[1]) : null;
  }

  // Seller taps Accept — inserts an offer_accepted message the buyer sees in real-time
  async function acceptOffer(offerPrice) {
    const listingId = listing?.id ?? convo?.item_id ?? convo?.listing_id ?? null;
    await supabase.from('messages').insert({
      conversation_id: chatId,
      sender_id:       currentUserId,
      receiver_id:     convo?.buyer_id,
      content:         JSON.stringify({ price: offerPrice, listing_id: listingId, title: listing?.title }),
      type:            'offer_accepted',
    });
    await supabase.from('conversations')
      .update({ last_message: `✅ Offer accepted · RM ${Number(offerPrice).toFixed(2)}`, last_message_at: new Date().toISOString() })
      .eq('id', chatId);
  }

  // Seller taps Decline — inserts an offer_declined notice
  async function declineOffer() {
    await supabase.from('messages').insert({
      conversation_id: chatId,
      sender_id:       currentUserId,
      receiver_id:     convo?.buyer_id,
      content:         JSON.stringify({ declined: true }),
      type:            'offer_declined',
    });
    await supabase.from('conversations')
      .update({ last_message: 'Offer declined', last_message_at: new Date().toISOString() })
      .eq('id', chatId);
  }

  // Buyer taps Add to Cart on an accepted offer card — stores the negotiated price
  async function addOfferToCart(listingId, offerPrice) {
    if (!currentUserId || !listingId || cartAdding) return;
    setCartAdding(true);

    // Try a plain INSERT first
    const { error: insertErr } = await supabase.from('cart_items').insert({
      user_id:     currentUserId,
      listing_id:  listingId,
      quantity:    1,
      offer_price: offerPrice,
    });

    if (insertErr) {
      if (insertErr.code === '23505') {
        // Row already exists — just update the offer_price on the existing row
        const { error: updateErr } = await supabase
          .from('cart_items')
          .update({ offer_price: offerPrice, quantity: 1 })
          .eq('user_id', currentUserId)
          .eq('listing_id', listingId);

        if (updateErr) {
          setError('Could not add to cart. Please try again.');
          setCartAdding(false);
          return;
        }
      } else {
        setError('Could not add to cart. Please try again.');
        setCartAdding(false);
        return;
      }
    } else {
      addToCart(); // bump cart badge count only for new rows
    }

    navigate('/cart');
    setCartAdding(false);
  }

  // ── Derived values ────────────────────────────────────────────────────────
  const isBuyer   = convo?.buyer_id  === currentUserId;
  const isSeller  = convo?.seller_id === currentUserId;
  const otherUser = convo
    ? (isBuyer ? convo.seller : convo.buyer)
    : null;
  const otherName = otherUser?.full_name ?? (isLoading ? '…' : 'Unknown User');
  const listing   = convo?.listing ?? null;

  // ── Not-found fallback ────────────────────────────────────────────────────
  if (!isLoading && !convo) {
    return (
      <div
        className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 px-4 text-center"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        <p className="text-4xl">💬</p>
        <h2 className="text-lg font-bold text-gray-900">Conversation not found</h2>
        <p className="text-sm text-gray-400 max-w-xs">
          This chat may have been removed or you may not have access to it.
        </p>
        <button
          onClick={() => navigate('/messages')}
          className="px-5 py-2.5 bg-[#A855F7] text-white text-sm font-semibold rounded-xl hover:bg-[#9333EA] transition-colors"
        >
          Back to Messages
        </button>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-screen bg-gray-50"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >

      {/* ── HEADER ── */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm shrink-0">
        <div className="max-w-lg mx-auto px-4 h-16 flex items-center gap-3">

          <button
            onClick={() => navigate('/messages')}
            className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors shrink-0"
          >
            <ArrowLeft size={18} className="text-gray-600" />
          </button>

          {/* Avatar */}
          <div
            className="w-9 h-9 rounded-full shrink-0 overflow-hidden flex items-center justify-center text-white font-bold text-sm"
            style={{ backgroundColor: getAvatarColor(otherName) }}
          >
            {otherUser?.avatar_url
              ? <img src={otherUser.avatar_url} alt={otherName} className="w-full h-full object-cover" />
              : otherName.charAt(0).toUpperCase()
            }
          </div>

          {/* Name + item */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate leading-tight">
              {otherName}
            </p>
            {listing && (
              <p className="text-xs text-[#A855F7] font-medium truncate flex items-center gap-1 leading-tight">
                <Package size={11} />
                {listing.title}
              </p>
            )}
          </div>

          <a href="/" className="hover:opacity-75 transition-opacity shrink-0">
            <img src="/Plumio.png" alt="Plumio" className="h-8 w-auto object-contain" />
          </a>

        </div>
      </header>

      {/* ── ERROR BANNER ── */}
      {error && (
        <div className="bg-red-50 border-b border-red-100 px-4 py-2 flex items-center justify-between text-xs text-red-600 font-medium shrink-0">
          <span>{error}</span>
          <button onClick={() => setError('')} className="underline ml-3">Dismiss</button>
        </div>
      )}

      {/* ── MESSAGE AREA ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-lg mx-auto flex flex-col gap-2">

          <div className="flex items-center gap-3 my-2">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium">Today</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                  <div className="h-10 rounded-2xl bg-gray-200 animate-pulse" style={{ width: `${110 + i * 22}px` }} />
                </div>
              ))
            : messages.map(msg => {
                const isMe = msg.sender_id === currentUserId;

                /* ── Offer card ─────────────────────────────────────────── */
                if (isOfferMsg(msg)) {
                  const price = parseOfferPrice(msg.content);
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`w-64 rounded-2xl overflow-hidden border shadow-sm ${isMe ? 'rounded-br-sm border-purple-200' : 'rounded-bl-sm border-gray-200'}`}>
                        <div className={`px-4 py-3 ${isMe ? 'bg-purple-50' : 'bg-white'}`}>
                          <p className="text-[11px] font-semibold text-purple-500 uppercase tracking-wide mb-1">💰 Price Offer</p>
                          <p className="text-2xl font-bold text-gray-900">RM {price != null ? Number(price).toFixed(2) : '—'}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{formatMsgTime(msg.created_at)}</p>
                        </div>
                        {/* Seller sees Accept/Decline — only on messages the buyer sent */}
                        {isSeller && !isMe && price != null && (
                          <div className="flex border-t border-gray-100">
                            <button
                              onClick={() => acceptOffer(price)}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold text-green-600 hover:bg-green-50 active:bg-green-100 transition-colors"
                            >
                              <Check size={14} /> Accept
                            </button>
                            <div className="w-px bg-gray-100" />
                            <button
                              onClick={declineOffer}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold text-gray-400 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                            >
                              <X size={14} /> Decline
                            </button>
                          </div>
                        )}
                        {/* Buyer sees pending status on their own offer */}
                        {isBuyer && isMe && (
                          <div className="px-4 pb-3 bg-purple-50">
                            <p className="text-[11px] text-purple-400 italic">Awaiting seller response…</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                /* ── Offer accepted card ────────────────────────────────── */
                if (msg.type === 'offer_accepted') {
                  let meta = {};
                  try { meta = JSON.parse(msg.content); } catch {}
                  const price      = meta.price != null ? Number(meta.price).toFixed(2) : '—';
                  const listingId  = meta.listing_id ?? listing?.id ?? null;
                  const itemTitle  = meta.title ?? listing?.title ?? 'Item';
                  return (
                    <div key={msg.id} className="flex justify-center my-2">
                      <div className="w-72 rounded-2xl overflow-hidden border border-green-200 shadow-md">
                        <div className="bg-green-50 px-4 pt-4 pb-3">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                              <Check size={14} className="text-white" strokeWidth={3} />
                            </div>
                            <p className="text-sm font-bold text-green-700">Offer Accepted!</p>
                          </div>
                          <p className="text-2xl font-bold text-gray-900">RM {price}</p>
                          <p className="text-xs text-gray-500 mt-0.5 truncate">{itemTitle}</p>
                          <p className="text-[10px] text-gray-400 mt-1">{formatMsgTime(msg.created_at)}</p>
                        </div>
                        {/* Buyer: Add to Cart button */}
                        {isBuyer && listingId && (
                          <div className="bg-white px-4 py-3 border-t border-green-100">
                            <button
                              onClick={() => addOfferToCart(listingId, parseFloat(price))}
                              disabled={cartAdding}
                              className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#A855F7] hover:bg-[#9333EA] active:bg-[#7E22CE] text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60"
                            >
                              {cartAdding
                                ? <Loader2 size={15} className="animate-spin" />
                                : <ShoppingCart size={15} />
                              }
                              {cartAdding ? 'Adding…' : 'Add to Cart'}
                            </button>
                          </div>
                        )}
                        {/* Seller: confirmation label */}
                        {isSeller && (
                          <div className="bg-white px-4 py-3 border-t border-green-100">
                            <p className="text-xs text-gray-500 text-center">The buyer can now add this item to their cart.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                /* ── Offer declined card ────────────────────────────────── */
                if (msg.type === 'offer_declined') {
                  return (
                    <div key={msg.id} className="flex justify-center my-2">
                      <div className="flex items-center gap-2 bg-gray-100 text-gray-500 text-xs font-medium px-4 py-2 rounded-full">
                        <X size={12} /> Offer was declined
                      </div>
                    </div>
                  );
                }

                /* ── Image bubble ─────────────────────────────────────── */
                if (msg.type === 'image') {
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[72%] overflow-hidden rounded-2xl shadow-sm ${isMe ? 'rounded-br-sm ring-2 ring-[#A855F7]/30' : 'rounded-bl-sm border border-gray-100'}`}>
                        <img src={msg.content} alt="Shared image" className="block w-full object-cover max-h-64" />
                        <div className={`px-3 py-1.5 text-[10px] text-right flex items-center justify-end gap-1.5 ${isMe ? 'bg-[#A855F7] text-purple-200' : 'bg-white text-gray-400'}`}>
                          {msg._tempId && <span className="opacity-70">Uploading…</span>}
                          {formatMsgTime(msg.created_at)}
                        </div>
                      </div>
                    </div>
                  );
                }

                /* ── Plain text bubble (default) ──────────────────────── */
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[72%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${isMe ? 'bg-[#A855F7] text-white rounded-br-sm' : 'bg-white text-gray-800 border border-gray-100 shadow-sm rounded-bl-sm'}`}>
                      <p>{msg.content}</p>
                      <p className={`text-[10px] mt-1 text-right flex items-center justify-end gap-1.5 ${isMe ? 'text-purple-200' : 'text-gray-400'}`}>
                        {msg._tempId && <span className="opacity-70">Sending…</span>}
                        {formatMsgTime(msg.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })
          }

          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── INPUT BAR ── */}
      <div className="bg-white border-t border-gray-100 px-4 py-3 shrink-0 shadow-[0_-1px_4px_rgba(0,0,0,0.06)]">
        <div className="max-w-lg mx-auto flex items-center gap-2">

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageSelect}
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-purple-50 hover:text-[#A855F7] transition-colors shrink-0"
            aria-label="Attach image"
          >
            <ImagePlus size={18} />
          </button>

          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message…"
            className="flex-1 bg-gray-100 rounded-full px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#A855F7]/30 transition-all"
          />

          <button
            onClick={sendMessage}
            disabled={!inputText.trim() || isSending}
            className="w-10 h-10 rounded-full bg-[#A855F7] flex items-center justify-center text-white hover:bg-[#9333EA] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            {isSending
              ? <Loader2 size={16} className="animate-spin" />
              : <Send size={16} />
            }
          </button>

        </div>
      </div>

    </div>
  );
}
