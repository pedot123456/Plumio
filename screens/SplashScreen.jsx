import React from 'react';

export default function SplashScreen() {
  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-8 bg-[#1E1B4B] overflow-hidden"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* Decorative background glows */}
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-purple-600/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-20 w-80 h-80 rounded-full bg-indigo-500/15 blur-2xl pointer-events-none" />
      <div className="absolute top-1/3 left-1/4 w-48 h-48 rounded-full bg-violet-400/10 blur-2xl pointer-events-none" />

      {/* Logo */}
      <div className="relative z-10 flex flex-col items-center gap-4 animate-pulse">
        <img
          src="/Plumio.png"
          alt="Plumio"
          className="h-40 w-40 object-contain drop-shadow-2xl"
        />
        <h1 className="text-white text-4xl font-extrabold tracking-tight">
          Plumio
        </h1>
        <p className="text-purple-300 text-base font-medium tracking-wide">
          Purple Picks, Better Deals
        </p>
      </div>

      {/* Spinner */}
      <div className="relative z-10 flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-[3px] border-white/20 border-t-white animate-spin" />
        <p className="text-white/40 text-xs tracking-widest uppercase">Loading…</p>
      </div>
    </div>
  );
}
