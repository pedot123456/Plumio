import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import BottomNav from '../components/BottomNav';
import {
  ChevronRight, User, Lock, Bell, ShieldCheck,
  LogOut, X, CheckCircle, Trash2,
} from 'lucide-react';

// ── Toggle switch ───────────────────────────────────────────────
function Toggle({ value, onChange }) {
  return (
    <button
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${value ? 'bg-[#A855F7]' : 'bg-gray-200'}`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`}
      />
    </button>
  );
}

// ── Menu row ────────────────────────────────────────────────────
function Row({ icon, label, sub, onClick, last, rightEl, danger }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left ${!last ? 'border-b border-gray-50' : ''}`}
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${danger ? 'bg-red-50' : 'bg-gray-100'}`}>
        <span className={`material-symbols-outlined text-[20px] ${danger ? 'text-red-500' : 'text-gray-500'}`}>
          {icon}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${danger ? 'text-red-500' : 'text-gray-800'}`}>{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      {rightEl ?? <ChevronRight size={16} className="text-gray-300 shrink-0" />}
    </button>
  );
}

function Card({ children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {children}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1 mb-2">
      {children}
    </p>
  );
}

// ── Password reset modal ────────────────────────────────────────
function PasswordModal({ email, onClose }) {
  const [sent,    setSent]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState('');

  async function handleSend() {
    setLoading(true);
    setErr('');
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    setLoading(false);
    if (error) { setErr(error.message); }
    else        { setSent(true); }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative bg-white rounded-t-3xl w-full max-w-lg p-6 z-10 flex flex-col gap-5"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-gray-900 text-lg">Change Password</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <X size={16} className="text-gray-600" />
          </button>
        </div>

        {sent ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle size={30} className="text-green-500" />
            </div>
            <p className="font-bold text-gray-900">Email sent!</p>
            <p className="text-gray-500 text-sm leading-relaxed max-w-[260px]">
              Check <span className="font-semibold text-gray-700">{email}</span> for a link to reset your password.
            </p>
            <button
              onClick={onClose}
              className="mt-2 w-full bg-[#A855F7] text-white font-bold py-3 rounded-2xl"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="bg-gray-50 rounded-xl px-4 py-3 flex flex-col gap-0.5">
              <p className="text-xs text-gray-400">Sending reset link to</p>
              <p className="text-sm font-semibold text-gray-800">{email}</p>
            </div>
            {err && <p className="text-xs text-red-500">{err}</p>}
            <button
              onClick={handleSend}
              disabled={loading}
              className="w-full bg-[#A855F7] hover:bg-[#9333EA] disabled:opacity-60 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-colors"
            >
              {loading
                ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <Lock size={18} />
              }
              {loading ? 'Sending…' : 'Send Reset Email'}
            </button>
            <p className="text-center text-xs text-gray-400">
              You will be redirected to a secure Supabase page to set your new password.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main screen ─────────────────────────────────────────────────
export default function SettingsScreen() {
  const navigate      = useNavigate();
  const { session, signOut } = useAuth();

  const [showPwModal, setShowPwModal] = useState(false);
  const [notifPrefs,  setNotifPrefs]  = useState({
    orderUpdates: true,
    newMessages:  true,
    offers:       false,
  });
  const [signingOut,  setSigningOut]  = useState(false);

  const email = session?.user?.email ?? '';

  function toggleNotif(key) {
    setNotifPrefs(prev => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24" style={{ fontFamily: "'Inter', sans-serif" }}>

      <div className="max-w-lg mx-auto px-4 py-5 flex flex-col gap-5">

        {/* ── Account ── */}
        <div>
          <SectionLabel>Account</SectionLabel>
          <Card>
            <Row
              icon="manage_accounts"
              label="Edit Profile"
              sub="Name, photo, and bio"
              onClick={() => navigate('/profile')}
            />
            <Row
              icon="lock"
              label="Change Password"
              sub="Send a reset link to your email"
              onClick={() => setShowPwModal(true)}
              last
            />
          </Card>
        </div>

        {/* ── Notifications ── */}
        <div>
          <SectionLabel>Notifications</SectionLabel>
          <Card>
            <Row
              icon="notifications"
              label="Order Updates"
              sub="Shipping, delivery, and status changes"
              last={false}
              rightEl={
                <Toggle value={notifPrefs.orderUpdates} onChange={() => toggleNotif('orderUpdates')} />
              }
            />
            <Row
              icon="chat"
              label="New Messages"
              sub="When sellers or buyers message you"
              last={false}
              rightEl={
                <Toggle value={notifPrefs.newMessages} onChange={() => toggleNotif('newMessages')} />
              }
            />
            <Row
              icon="local_offer"
              label="Offers & Promotions"
              sub="Deals, discounts, and Plumio news"
              last
              rightEl={
                <Toggle value={notifPrefs.offers} onChange={() => toggleNotif('offers')} />
              }
            />
          </Card>
        </div>

        {/* ── Privacy & Security ── */}
        <div>
          <SectionLabel>Privacy & Security</SectionLabel>
          <Card>
            <Row
              icon="privacy_tip"
              label="Privacy Settings"
              sub="Control what others can see"
              onClick={() => {}}
            />
            <Row
              icon="verified_user"
              label="Trusted Devices"
              sub="Manage where you're signed in"
              onClick={() => {}}
              last
            />
          </Card>
        </div>

        {/* ── About ── */}
        <div>
          <SectionLabel>About</SectionLabel>
          <Card>
            <Row
              icon="info"
              label="About Plumio"
              sub="Version 1.0 · UTP Marketplace"
              onClick={() => {}}
            />
            <Row
              icon="description"
              label="Terms & Privacy Policy"
              onClick={() => {}}
              last
            />
          </Card>
        </div>

        {/* ── Sign out / danger ── */}
        <div>
          <SectionLabel>Account Actions</SectionLabel>
          <Card>
            <Row
              icon="logout"
              label={signingOut ? 'Signing out…' : 'Sign Out'}
              onClick={handleSignOut}
              danger
            />
            <Row
              icon="delete_forever"
              label="Delete Account"
              sub="Permanently remove your data"
              onClick={() => {}}
              danger
              last
            />
          </Card>
        </div>

        <p className="text-center text-[11px] text-gray-300 pb-2">Plumio v1.0 · Built at UTP</p>
      </div>

      <BottomNav activeTab="Account" />

      {showPwModal && (
        <PasswordModal email={email} onClose={() => setShowPwModal(false)} />
      )}
    </div>
  );
}
