import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabase';

export default function ChatScreen() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { conversation, currentUserId } = state ?? {};

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [otherUsername, setOtherUsername] = useState('');
  const messagesEndRef = useRef(null);

  if (!conversation) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#999' }}>Conversation not found.</p>
      </div>
    );
  }

  const isBuyer = conversation.buyer_id === currentUserId;
  const listing = conversation.listings;
  const otherId = isBuyer ? conversation.seller_id : conversation.buyer_id;

  useEffect(() => {
    supabase.from('profiles').select('username').eq('id', otherId).single()
      .then(({ data }) => setOtherUsername(data?.username ?? 'User'));
  }, [otherId]);

  const fetchMessages = useCallback(async () => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true });
    setMessages(data ?? []);
    setLoading(false);
  }, [conversation.id]);

  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel(`chat-${conversation.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversation.id}`,
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new]);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversation.id}`,
      }, (payload) => {
        setMessages((prev) => prev.map((m) => m.id === payload.new.id ? payload.new : m));
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [fetchMessages, conversation.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [messages.length]);

  const sendMessage = async () => {
    const text = inputText.trim();
    if (!text) return;
    setInputText('');
    setSending(true);
    await supabase.from('messages').insert({
      conversation_id: conversation.id,
      sender_id: currentUserId,
      content: text,
      type: 'text',
    });
    setSending(false);
  };

  const sendOffer = async () => {
    const amount = parseFloat(offerAmount);
    if (!amount || amount <= 0) { alert('Please enter a valid amount.'); return; }
    setShowOfferModal(false);
    setOfferAmount('');
    await supabase.from('messages').insert({
      conversation_id: conversation.id,
      sender_id: currentUserId,
      content: `Offered RM${amount.toFixed(2)}`,
      type: 'offer',
      offer_amount: amount,
      offer_status: 'pending',
    });
  };

  const handleOfferResponse = async (messageId, status) => {
    const { error } = await supabase
      .from('messages')
      .update({ offer_status: status })
      .eq('id', messageId);
    if (error) alert(error.message);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (loading) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#f5f5f5' }}>
      {/* Back header */}
      <div style={{
        backgroundColor: '#fff',
        padding: '14px 16px',
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexShrink: 0,
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', fontSize: 15, color: '#E02020', fontWeight: 600, cursor: 'pointer', padding: 0 }}
        >← Back</button>
        <span style={{ fontSize: 17, fontWeight: 700, color: '#1a1a1a' }}>Chat</span>
      </div>

      {/* Listing info bar */}
      <div style={{
        backgroundColor: '#fff',
        padding: '12px 16px',
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0,
      }}>
        <div style={{ flex: 1, marginRight: 12, minWidth: 0 }}>
          <p className="line-clamp-1" style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a' }}>{listing?.title}</p>
          <p style={{ fontSize: 12, color: '#999', marginTop: 2 }}>{otherUsername}</p>
        </div>
        <p style={{ fontSize: 15, fontWeight: 800, color: '#E02020', flexShrink: 0 }}>
          RM {parseFloat(listing?.price ?? 0).toFixed(2)}
        </p>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, paddingBottom: 8 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', marginTop: 60 }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>👋</div>
            <p style={{ color: '#bbb', fontSize: 14 }}>Say hello to start the conversation!</p>
          </div>
        )}
        {messages.map((item) => {
          const isMe = item.sender_id === currentUserId;

          if (item.type === 'offer') {
            return (
              <div key={item.id} style={{
                borderRadius: 16,
                padding: 16,
                marginBottom: 6,
                maxWidth: '80%',
                backgroundColor: '#fff',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                alignSelf: isMe ? 'flex-end' : 'flex-start',
                marginLeft: isMe ? 'auto' : 0,
                marginRight: isMe ? 0 : 'auto',
                border: isMe ? '1.5px solid #E02020' : 'none',
              }}>
                <p style={{ fontSize: 11, color: '#aaa', fontWeight: 700, letterSpacing: 0.3, marginBottom: 4 }}>💰 Make Offer</p>
                <p style={{ fontSize: 24, fontWeight: 800, color: '#1a1a1a', marginBottom: 12 }}>
                  RM {parseFloat(item.offer_amount).toFixed(2)}
                </p>
                {item.offer_status === 'pending' && !isMe && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => handleOfferResponse(item.id, 'accepted')}
                      style={{
                        flex: 1,
                        backgroundColor: '#E02020',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 10,
                        padding: '10px',
                        fontWeight: 700,
                        fontSize: 14,
                        cursor: 'pointer',
                      }}
                    >Accept</button>
                    <button
                      onClick={() => handleOfferResponse(item.id, 'declined')}
                      style={{
                        flex: 1,
                        backgroundColor: '#f0f0f0',
                        color: '#555',
                        border: 'none',
                        borderRadius: 10,
                        padding: '10px',
                        fontWeight: 700,
                        fontSize: 14,
                        cursor: 'pointer',
                      }}
                    >Decline</button>
                  </div>
                )}
                {item.offer_status === 'pending' && isMe && (
                  <p style={{ fontSize: 13, color: '#bbb', fontStyle: 'italic' }}>Waiting for response...</p>
                )}
                {item.offer_status === 'accepted' && (
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#16a34a', textAlign: 'center', padding: '6px 0' }}>✓ Accepted</p>
                )}
                {item.offer_status === 'declined' && (
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#E02020', textAlign: 'center', padding: '6px 0' }}>✗ Declined</p>
                )}
              </div>
            );
          }

          return (
            <div key={item.id} style={{
              maxWidth: '75%',
              borderRadius: 18,
              padding: '10px 14px',
              marginBottom: 6,
              backgroundColor: isMe ? '#E02020' : '#fff',
              marginLeft: isMe ? 'auto' : 0,
              marginRight: isMe ? 0 : 'auto',
              borderBottomRightRadius: isMe ? 4 : 18,
              borderBottomLeftRadius: isMe ? 18 : 4,
              boxShadow: isMe ? 'none' : '0 1px 3px rgba(0,0,0,0.05)',
            }}>
              <p style={{ fontSize: 15, lineHeight: '20px', color: isMe ? '#fff' : '#1a1a1a' }}>
                {item.content}
              </p>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        backgroundColor: '#fff',
        padding: '10px 12px',
        borderTop: '1px solid #f0f0f0',
        gap: 8,
        flexShrink: 0,
      }}>
        {isBuyer && (
          <button
            onClick={() => setShowOfferModal(true)}
            style={{
              backgroundColor: '#fff0f0',
              borderRadius: 20,
              padding: '10px 12px',
              border: '1.5px solid #E02020',
              color: '#E02020',
              fontWeight: 700,
              fontSize: 12,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >💰 Offer</button>
        )}
        <textarea
          style={{
            flex: 1,
            backgroundColor: '#f5f5f5',
            borderRadius: 22,
            padding: '10px 16px',
            fontSize: 15,
            color: '#1a1a1a',
            border: 'none',
            outline: 'none',
            resize: 'none',
            maxHeight: 100,
            lineHeight: '20px',
            overflowY: 'auto',
          }}
          rows={1}
          placeholder="Type a message..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          onClick={sendMessage}
          disabled={!inputText.trim() || sending}
          style={{
            width: 42,
            height: 42,
            backgroundColor: !inputText.trim() || sending ? '#f5b0b0' : '#E02020',
            border: 'none',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: !inputText.trim() || sending ? 'not-allowed' : 'pointer',
            flexShrink: 0,
          }}
        >
          {sending
            ? <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2, borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} />
            : <span style={{ color: '#fff', fontSize: 18, fontWeight: 800, lineHeight: 1 }}>↑</span>
          }
        </button>
      </div>

      {/* Offer modal */}
      {showOfferModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          zIndex: 999,
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 24,
            width: '100%',
            maxWidth: 600,
          }}>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#1a1a1a', marginBottom: 4 }}>Make an Offer</h3>
            <p style={{ fontSize: 14, color: '#999', marginBottom: 20 }}>
              Asking price: RM {parseFloat(listing?.price ?? 0).toFixed(2)}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#333' }}>RM</span>
              <input
                style={{
                  flex: 1,
                  border: '1.5px solid #ebebeb',
                  borderRadius: 12,
                  padding: 14,
                  fontSize: 18,
                  fontWeight: 700,
                  color: '#1a1a1a',
                  backgroundColor: '#fafafa',
                  outline: 'none',
                }}
                placeholder="Your offer amount"
                value={offerAmount}
                onChange={(e) => setOfferAmount(e.target.value)}
                type="number"
                min="0"
                step="0.01"
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => { setShowOfferModal(false); setOfferAmount(''); }}
                style={{
                  flex: 1,
                  backgroundColor: '#f0f0f0',
                  border: 'none',
                  borderRadius: 14,
                  padding: '15px',
                  fontWeight: 700,
                  color: '#555',
                  fontSize: 15,
                  cursor: 'pointer',
                }}
              >Cancel</button>
              <button
                onClick={sendOffer}
                style={{
                  flex: 2,
                  backgroundColor: '#E02020',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 14,
                  padding: '15px',
                  fontWeight: 800,
                  fontSize: 15,
                  cursor: 'pointer',
                }}
              >Send Offer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
