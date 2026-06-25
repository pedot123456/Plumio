import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

export default function ProfileScreen() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [myListings, setMyListings] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    setUser(authUser);
    if (!authUser) { setLoading(false); return; }

    const [{ data: profileData }, { data: listingsData }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', authUser.id).single(),
      supabase.from('listings').select('*').eq('user_id', authUser.id).order('created_at', { ascending: false }),
    ]);

    setProfile(profileData);
    setMyListings(listingsData ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSignOut = () => {
    if (window.confirm('Are you sure you want to sign out?')) {
      supabase.auth.signOut();
    }
  };

  if (loading) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  const soldCount = myListings.filter((l) => l.is_sold).length;
  const activeCount = myListings.length - soldCount;

  return (
    <div style={{ height: '100%', overflowY: 'auto', backgroundColor: '#f5f5f5', padding: 16, paddingBottom: 32 }}>

      {/* Profile Card */}
      <div style={{
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        marginBottom: 20,
        boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
      }}>
        <div style={{
          width: 90,
          height: 90,
          borderRadius: 45,
          border: '3px solid #E02020',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 14,
        }}>
          <div style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: '#1a1a1a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <span style={{ fontSize: 32, fontWeight: 800, color: '#fff' }}>
              {(profile?.username ?? user?.email ?? '?')[0].toUpperCase()}
            </span>
          </div>
        </div>

        <p style={{ fontSize: 20, fontWeight: 800, color: '#1a1a1a', marginBottom: 4 }}>
          {profile?.username ?? 'Student'}
        </p>
        <p style={{ fontSize: 13, color: '#999', marginBottom: 18 }}>{user?.email}</p>

        {/* Stats */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: '#f8f8f8',
          borderRadius: 16,
          padding: '16px 12px',
          width: '100%',
          marginBottom: 18,
        }}>
          {[
            { num: activeCount, label: 'Active' },
            { num: soldCount, label: 'Sold' },
            { num: myListings.length, label: 'Total' },
          ].map((stat, idx, arr) => (
            <React.Fragment key={stat.label}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: 22, fontWeight: 800, color: '#1a1a1a' }}>{stat.num}</span>
                <span style={{ fontSize: 11, color: '#999', marginTop: 3, fontWeight: 500 }}>{stat.label}</span>
              </div>
              {idx < arr.length - 1 && (
                <div style={{ width: 1, height: 32, backgroundColor: '#e5e5e5' }} />
              )}
            </React.Fragment>
          ))}
        </div>

        <button
          onClick={handleSignOut}
          style={{
            width: '100%',
            border: '1.5px solid #ebebeb',
            borderRadius: 14,
            padding: '12px 40px',
            backgroundColor: 'transparent',
            color: '#E02020',
            fontWeight: 700,
            fontSize: 15,
            cursor: 'pointer',
          }}
        >Sign Out</button>
      </div>

      {/* My Listings */}
      <h2 style={{ fontSize: 17, fontWeight: 800, color: '#1a1a1a', marginBottom: 14 }}>
        My Listings ({myListings.length})
      </h2>

      {myListings.length === 0 ? (
        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🛍️</div>
          <p style={{ fontSize: 17, fontWeight: 700, color: '#555', marginBottom: 6 }}>No listings yet</p>
          <p style={{ fontSize: 14, color: '#aaa' }}>Tap Sell to post your first item!</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {myListings.map((item) => (
            <div
              key={item.id}
              onClick={() => navigate(`/item/${item.id}`, { state: { listing: item } })}
              style={{
                backgroundColor: '#fff',
                borderRadius: 14,
                overflow: 'hidden',
                boxShadow: '0 2px 6px rgba(0,0,0,0.07)',
                cursor: 'pointer',
                position: 'relative',
              }}
            >
              {item.image_url ? (
                <img
                  src={item.image_url}
                  alt={item.title}
                  style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', display: 'block' }}
                />
              ) : (
                <div style={{
                  width: '100%',
                  aspectRatio: '1/1',
                  backgroundColor: '#f8f8f8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 28,
                }}>📦</div>
              )}
              {item.is_sold && (
                <span style={{
                  position: 'absolute',
                  top: 8,
                  left: 8,
                  backgroundColor: 'rgba(0,0,0,0.65)',
                  color: '#fff',
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: 0.5,
                  padding: '3px 8px',
                  borderRadius: 6,
                }}>SOLD</span>
              )}
              <div style={{ padding: 10 }}>
                <p className="line-clamp-2" style={{ fontSize: 13, color: '#1a1a1a', fontWeight: 500, marginBottom: 6, lineHeight: '18px' }}>
                  {item.title}
                </p>
                <p style={{ fontSize: 15, fontWeight: 800, color: '#1a1a1a' }}>
                  RM {parseFloat(item.price).toFixed(2)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
