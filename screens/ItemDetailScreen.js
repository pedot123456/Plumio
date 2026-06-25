import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { supabase } from '../supabase';

const CONDITION_COLORS = {
  'Brand New': '#16a34a',
  'Like New': '#2563eb',
  'Good': '#d97706',
  'Fair': '#6b7280',
};

export default function ItemDetailScreen() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const listing = state?.listing;
  const [currentUser, setCurrentUser] = useState(null);
  const [markingAsSold, setMarkingAsSold] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setCurrentUser(user));
  }, []);

  if (!listing) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#999' }}>Listing not found.</p>
      </div>
    );
  }

  const isOwner = currentUser?.id === listing.user_id;
  const condColor = CONDITION_COLORS[listing.condition] ?? '#6b7280';

  const handleContact = async () => {
    if (!currentUser) return;
    setContactLoading(true);
    try {
      let { data: existing } = await supabase
        .from('conversations')
        .select('*, listings(id, title, image_url, price)')
        .eq('listing_id', listing.id)
        .eq('buyer_id', currentUser.id)
        .maybeSingle();

      if (!existing) {
        const { data: created, error } = await supabase
          .from('conversations')
          .insert({
            listing_id: listing.id,
            buyer_id: currentUser.id,
            seller_id: listing.user_id,
          })
          .select('*, listings(id, title, image_url, price)')
          .single();
        if (error) throw error;
        existing = created;
      }

      navigate(`/chat/${existing.id}`, { state: { conversation: existing, currentUserId: currentUser.id } });
    } catch (e) {
      alert(e.message);
    } finally {
      setContactLoading(false);
    }
  };

  const handleMarkAsSold = async () => {
    if (!window.confirm('Mark this listing as sold? It will be removed from the feed.')) return;
    setMarkingAsSold(true);
    const { error } = await supabase.from('listings').update({ is_sold: true }).eq('id', listing.id);
    setMarkingAsSold(false);
    if (error) { alert(error.message); return; }
    alert('Listing marked as sold.');
    navigate(-1);
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this listing? This cannot be undone.')) return;
    const { error } = await supabase.from('listings').delete().eq('id', listing.id);
    if (error) { alert(error.message); return; }
    navigate(-1);
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#fff' }}>
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
          style={{
            background: 'none',
            border: 'none',
            fontSize: 15,
            color: '#E02020',
            fontWeight: 600,
            cursor: 'pointer',
            padding: 0,
          }}
        >← Back</button>
        <span style={{ fontSize: 17, fontWeight: 700, color: '#1a1a1a' }}>Listing Details</span>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 90 }}>
        {listing.image_url ? (
          <img
            src={listing.image_url}
            alt={listing.title}
            style={{ width: '100%', aspectRatio: '1/0.85', objectFit: 'cover', display: 'block', backgroundColor: '#f0f0f0' }}
          />
        ) : (
          <div style={{
            width: '100%',
            aspectRatio: '1/0.85',
            backgroundColor: '#f5f5f5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 80,
          }}>📦</div>
        )}

        <div style={{ padding: 20 }}>
          {/* Tags */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <span style={{
              backgroundColor: '#f0f0f0',
              borderRadius: 8,
              padding: '5px 12px',
              fontSize: 12,
              color: '#555',
              fontWeight: 600,
            }}>{listing.category}</span>
            {listing.condition && (
              <span style={{
                backgroundColor: condColor,
                borderRadius: 8,
                padding: '5px 12px',
                fontSize: 12,
                color: '#fff',
                fontWeight: 700,
              }}>{listing.condition}</span>
            )}
          </div>

          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1a1a1a', lineHeight: '30px', marginBottom: 10 }}>
            {listing.title}
          </h2>
          <p style={{ fontSize: 28, fontWeight: 800, color: '#E02020', marginBottom: 4 }}>
            RM {parseFloat(listing.price).toFixed(2)}
          </p>

          <div style={{ height: 1, backgroundColor: '#f0f0f0', margin: '18px 0' }} />

          <p style={{ fontSize: 11, fontWeight: 700, color: '#bbb', letterSpacing: 0.6, marginBottom: 10 }}>DESCRIPTION</p>
          <p style={{ fontSize: 15, color: '#444', lineHeight: '24px' }}>
            {listing.description || 'No description provided.'}
          </p>

          <div style={{ height: 1, backgroundColor: '#f0f0f0', margin: '18px 0' }} />

          <p style={{ fontSize: 11, fontWeight: 700, color: '#bbb', letterSpacing: 0.6, marginBottom: 10 }}>SELLER</p>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#f8f8f8',
            borderRadius: 16,
            padding: 16,
          }}>
            <div style={{
              width: 50,
              height: 50,
              borderRadius: 25,
              backgroundColor: '#1a1a1a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 14,
              flexShrink: 0,
            }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>
                {(listing.profiles?.username ?? 'A')[0].toUpperCase()}
              </span>
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a' }}>
                {listing.profiles?.username ?? 'Anonymous'}
              </p>
              <p style={{ fontSize: 13, color: '#999', marginTop: 2 }}>UTP Student</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky bottom bar */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderTop: '1px solid #f0f0f0',
        padding: 16,
      }}>
        {isOwner ? (
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={handleMarkAsSold}
              disabled={markingAsSold}
              style={{
                flex: 1,
                backgroundColor: '#f0f0f0',
                border: 'none',
                borderRadius: 14,
                padding: '15px',
                fontWeight: 700,
                color: '#333',
                fontSize: 15,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {markingAsSold
                ? <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
                : 'Mark as Sold'}
            </button>
            <button
              onClick={handleDelete}
              style={{
                flex: 1,
                backgroundColor: '#fff0f0',
                border: '1.5px solid #ffd5d5',
                borderRadius: 14,
                padding: '15px',
                fontWeight: 700,
                color: '#E02020',
                fontSize: 15,
                cursor: 'pointer',
              }}
            >Delete</button>
          </div>
        ) : (
          <button
            onClick={handleContact}
            disabled={contactLoading}
            style={{
              width: '100%',
              backgroundColor: '#E02020',
              color: '#fff',
              border: 'none',
              borderRadius: 16,
              padding: '17px',
              fontSize: 17,
              fontWeight: 800,
              cursor: contactLoading ? 'not-allowed' : 'pointer',
              opacity: contactLoading ? 0.7 : 1,
              boxShadow: '0 4px 16px rgba(224,32,32,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {contactLoading
              ? <div className="spinner" style={{ width: 22, height: 22, borderWidth: 2, borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} />
              : '💬  Chat with Seller'}
          </button>
        )}
      </div>
    </div>
  );
}
