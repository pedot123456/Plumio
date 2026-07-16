import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import Header from '../components/Header';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';

// ── Helpers ──────────────────────────────────────────────────────────────────

const AVATAR_HEX = ['#6366F1', '#EC4899', '#10B981', '#F97316', '#3B82F6', '#8B5CF6'];
function getAvatarColor(str = '') {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_HEX[Math.abs(h) % AVATAR_HEX.length];
}

function formatTime(iso) {
  if (!iso) return '';
  const d    = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 60_000)      return 'Now';
  if (diff < 3_600_000)   return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000)  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diff < 604_800_000) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function getPreview(msg, myId) {
  if (!msg) return 'Start the conversation';
  const body = msg.type === 'image' ? '📷 Photo' : (msg.content ?? '');
  return msg.sender_id === myId ? `You: ${body}` : body;
}

function ConvoSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-4 animate-pulse">
      <div className="w-12 h-12 rounded-full bg-gray-200 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex justify-between">
          <div className="h-3.5 bg-gray-200 rounded w-1/3" />
          <div className="h-3 bg-gray-200 rounded w-10" />
        </div>
        <div className="h-3 bg-gray-200 rounded w-1/2" />
        <div className="h-3 bg-gray-200 rounded w-2/3" />
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ChatInboxPage() {
  const navigate   = useNavigate();
  const { session } = useAuth();
  const userId     = session?.user?.id;

  const [conversations, setConversations] = useState([]);
  const [isLoading,     setIsLoading]     = useState(true);
  const [error,         setError]         = useState('');

  // ── Fetch all conversations for the logged-in user ────────────────────────
  useEffect(() => {
    if (!userId) { setIsLoading(false); return; }

    async function fetchConversations() {
      setIsLoading(true);

      // Step 1 — flat conversation rows (no embedded joins)
      const { data: convos, error: err } = await supabase
        .from('conversations')
        .select('*')
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (err || !convos) {
        setError('Could not load conversations. Please try again.');
        setIsLoading(false);
        return;
      }

      console.log('Raw Conversations Data:', convos);
      console.log('currentUserId:', userId, '| type:', typeof userId);

      // Step 2 — collect IDs we need to look up
      const convoIds     = convos.map(c => c.id);
      const otherUserIds = [...new Set(
        convos.map(c => c.buyer_id === userId ? c.seller_id : c.buyer_id).filter(Boolean)
      )];
      const listingIds = [...new Set(convos.map(c => c.listing_id ?? c.item_id).filter(Boolean))];

      console.log('otherUserIds to look up:', otherUserIds);

      // Step 3 — fetch profiles, listings, and latest messages in parallel
      const [{ data: profiles, error: profileErr }, { data: listings }, { data: recentMsgs }] = await Promise.all([
        otherUserIds.length
          ? supabase.from('profiles').select('id, full_name, avatar_url').in('id', otherUserIds)
          : Promise.resolve({ data: [] }),
        listingIds.length
          ? supabase.from('listings').select('id, title').in('id', listingIds)
          : Promise.resolve({ data: [] }),
        convoIds.length
          ? supabase
              .from('messages')
              .select('conversation_id, sender_id, receiver_id, content, type, is_read, created_at')
              .in('conversation_id', convoIds)
              .order('created_at', { ascending: false })
              .limit(500)
          : Promise.resolve({ data: [] }),
      ]);

      console.log('Profiles fetch result:', profiles, '| error:', profileErr);

      // Step 4 — build lookup Maps
      const profilesById = new Map((profiles ?? []).map(p => [p.id, p]));

      // Supabase may return embedded profiles as an object or a single-element array
      function normProfile(p) {
        if (!p) return null;
        return Array.isArray(p) ? (p[0] ?? null) : p;
      }
      const listingsById = new Map((listings ?? []).map(l => [l.id, l]));

      // latest message per conversation (recentMsgs is newest-first, so first hit wins)
      const latestMsgByConvo = new Map();
      const unreadByConvo    = new Map();
      for (const msg of (recentMsgs ?? [])) {
        if (!latestMsgByConvo.has(msg.conversation_id)) {
          latestMsgByConvo.set(msg.conversation_id, msg);
        }
        if (msg.receiver_id === userId && !msg.is_read) {
          unreadByConvo.set(msg.conversation_id, (unreadByConvo.get(msg.conversation_id) ?? 0) + 1);
        }
      }

      // Step 5 — merge and sort by latest message time
      // buyer/seller: normalise embedded join (object or array) then fall back to profiles Map
      const enriched = convos.map(c => {
        const buyer  = normProfile(c.buyer)  ?? profilesById.get(c.buyer_id)  ?? null;
        const seller = normProfile(c.seller) ?? profilesById.get(c.seller_id) ?? null;
        const otherId = c.buyer_id === userId ? c.seller_id : c.buyer_id;
        return {
          ...c,
          buyer,
          seller,
          otherUser:   profilesById.get(otherId) ?? null,
          listing:     listingsById.get(c.listing_id ?? c.item_id) ?? null,
          lastMsg:     latestMsgByConvo.get(c.id) ?? null,
          unreadCount: unreadByConvo.get(c.id) ?? 0,
        };
      });

      enriched.sort((a, b) => {
        const aTime = a.lastMsg?.created_at ?? a.created_at;
        const bTime = b.lastMsg?.created_at ?? b.created_at;
        return new Date(bTime) - new Date(aTime);
      });

      setConversations(enriched);
      setIsLoading(false);
    }

    fetchConversations();
  }, [userId]);


  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'Inter', sans-serif" }}>
      <Header title="Messages" />

      <div className="max-w-lg mx-auto">

        {/* Error */}
        {error && (
          <div className="mx-4 mt-4 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 text-center">
            {error}
          </div>
        )}

        {/* Loading skeletons */}
        {isLoading && (
          <div className="bg-white divide-y divide-gray-100">
            {Array.from({ length: 4 }).map((_, i) => <ConvoSkeleton key={i} />)}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && conversations.length === 0 && (
          <div className="flex flex-col items-center justify-center py-32 gap-4 text-center px-6">
            <div className="w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center">
              <MessageCircle size={28} className="text-[#A855F7]" />
            </div>
            <h2 className="font-bold text-gray-900 text-base">No messages yet</h2>
            <p className="text-sm text-gray-400 leading-relaxed">
              When you start a conversation with a seller, it will appear here.
            </p>
          </div>
        )}

        {/* Conversation list */}
        {!isLoading && conversations.length > 0 && (
          <ul className="divide-y divide-gray-100 bg-white">
            {conversations.map(convo => {
              const isBuyer = convo.buyer_id === userId;
              const other   = (isBuyer ? convo.seller : convo.buyer) ?? convo.otherUser;
              const name    = other?.full_name || 'Unknown User';
              console.log(`convo ${convo.id} | isBuyer=${isBuyer} | buyer=`, convo.buyer, '| seller=', convo.seller, '| otherUser=', convo.otherUser, '| resolved name=', name);
              return (
                <li key={convo.id}>
                  <button
                    onClick={() => navigate(`/messages/${convo.id}`)}
                    className="w-full flex items-center gap-3 px-4 py-4 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
                  >
                    {/* Avatar */}
                    <div
                      className="w-12 h-12 rounded-full shrink-0 overflow-hidden flex items-center justify-center text-white font-bold text-base"
                      style={{ backgroundColor: getAvatarColor(name) }}
                    >
                      {other?.avatar_url
                        ? <img src={other.avatar_url} alt={name} className="w-full h-full object-cover" />
                        : name.charAt(0).toUpperCase()
                      }
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5 gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className={`text-sm truncate ${convo.unreadCount > 0 ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'}`}>
                            {name}
                          </span>
                          {convo.unreadCount > 0 && (
                            <span className="shrink-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#A855F7] px-1 text-[10px] font-bold text-white leading-none">
                              {convo.unreadCount > 9 ? '9+' : convo.unreadCount}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-400 shrink-0">
                          {formatTime(convo.lastMsg?.created_at ?? convo.created_at)}
                        </span>
                      </div>

                      {convo.listing && (
                        <p className="text-xs text-[#A855F7] font-medium truncate mb-0.5">
                          {convo.listing.title}
                        </p>
                      )}

                      <p className={`text-xs truncate ${convo.unreadCount > 0 ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
                        {getPreview(convo.lastMsg, userId)}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

      </div>
    </div>
  );
}
