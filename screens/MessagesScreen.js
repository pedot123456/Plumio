import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

function timeAgo(dateString) {
  if (!dateString) return '';
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now - date) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export default function MessagesScreen() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  const fetchConversations = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
    if (!user) { setLoading(false); return; }

    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        listings(id, title, image_url, price),
        messages(id, content, created_at, type, offer_amount, sender_id)
      `)
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (!error && data) {
      const enriched = await Promise.all(data.map(async (conv) => {
        const otherId = conv.buyer_id === user.id ? conv.seller_id : conv.buyer_id;
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', otherId)
          .single();
        return { ...conv, otherPartyUsername: profile?.username ?? 'Unknown' };
      }));

      const sorted = enriched.sort((a, b) => {
        const aLatest = a.messages?.sort((x, y) => new Date(y.created_at) - new Date(x.created_at))[0];
        const bLatest = b.messages?.sort((x, y) => new Date(y.created_at) - new Date(x.created_at))[0];
        const aTime = aLatest ? new Date(aLatest.created_at) : new Date(a.created_at);
        const bTime = bLatest ? new Date(bLatest.created_at) : new Date(b.created_at);
        return bTime - aTime;
      });

      setConversations(sorted);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  if (loading) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#fff' }}>
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #f0f0f0',
        flexShrink: 0,
      }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1a1a1a', letterSpacing: -0.5 }}>Messages</h1>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {conversations.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: 80, padding: '0 40px' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>💬</div>
            <p style={{ fontSize: 17, fontWeight: 700, color: '#555', marginBottom: 8 }}>No messages yet</p>
            <p style={{ fontSize: 14, color: '#aaa', lineHeight: '22px' }}>
              Tap "Chat with Seller" on any listing to start a conversation.
            </p>
          </div>
        ) : (
          conversations.map((item, idx) => {
            const latest = item.messages?.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
            const latestText = latest
              ? latest.type === 'offer'
                ? `💰 Offer: RM${parseFloat(latest.offer_amount).toFixed(2)}`
                : latest.content
              : 'No messages yet';

            return (
              <div key={item.id}>
                <div
                  onClick={() => navigate(`/chat/${item.id}`, { state: { conversation: item, currentUserId: currentUser?.id } })}
                  style={{
                    display: 'flex',
                    padding: 16,
                    alignItems: 'center',
                    cursor: 'pointer',
                  }}
                >
                  {item.listings?.image_url ? (
                    <img
                      src={item.listings.image_url}
                      alt="listing"
                      style={{ width: 58, height: 58, borderRadius: 12, marginRight: 14, objectFit: 'cover', flexShrink: 0 }}
                    />
                  ) : (
                    <div style={{
                      width: 58,
                      height: 58,
                      borderRadius: 12,
                      marginRight: 14,
                      backgroundColor: '#f5f5f5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 20,
                      flexShrink: 0,
                    }}>📦</div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                      <p className="line-clamp-1" style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', flex: 1, marginRight: 8 }}>
                        {item.listings?.title ?? 'Listing'}
                      </p>
                      <span style={{ fontSize: 11, color: '#bbb', flexShrink: 0 }}>{timeAgo(latest?.created_at)}</span>
                    </div>
                    <p style={{ fontSize: 12, color: '#999', marginBottom: 3 }}>{item.otherPartyUsername}</p>
                    <p className="line-clamp-1" style={{ fontSize: 13, color: '#bbb' }}>{latestText}</p>
                  </div>
                </div>
                {idx < conversations.length - 1 && (
                  <div style={{ height: 1, backgroundColor: '#f8f8f8', marginLeft: 88 }} />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
