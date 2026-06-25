import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function SecureHandoffScreen() {
  const navigate = useNavigate();

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col font-body-md">
      {/* Top App Bar */}
      <header className="bg-surface fixed md:absolute top-0 w-full flex items-center px-margin-mobile h-16 z-50 shadow-sm">
        <button
          className="w-10 h-10 flex items-center justify-center text-primary-container active:scale-95 transition-transform duration-200"
          onClick={() => navigate(-1)}
        >
          <span className="material-symbols-outlined text-headline-sm">arrow_back</span>
        </button>
        <h1 className="flex-1 text-center font-headline-sm text-headline-sm font-bold text-primary-container">
          Local Handoff
        </h1>
        <div className="w-10 h-10" />
      </header>

      {/* Content */}
      <main className="flex-1 pt-16 pb-margin-mobile flex flex-col overflow-y-auto">
        {/* Status Banner */}
        <div className="w-full bg-[#A855F7] text-white py-sm px-margin-mobile flex items-center justify-center gap-base">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
          <span className="font-label-md text-label-md">Escrow Locked: Funds are secure</span>
        </div>

        <div className="flex-1 px-margin-mobile flex flex-col items-center justify-center py-xl space-y-lg">
          {/* QR Code */}
          <div className="bg-white rounded-xl shadow-level-1 p-lg w-full max-w-[280px] flex flex-col items-center gap-md">
            <img
              className="w-full aspect-square object-contain"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCM1D9JF5zAIVvZ2OhcdUYVh_BoWFCaQOJrWF9_tkygafk8jccxccyodZxx1bQdg_YbYdX80AjMBIdCvuJmExvL89Rcy_xwKYRP6lzsM5uYqJD-l75QCg_URsfSNM7PNwkRTcKm-eFlz0GN8030Z0qm9DtyXcusxZpcEXvkYRKX6IQhjXf8GjUyTS3yJgzG7P6RXEJskghswNbK3FIVZT-EkVcemFUf5LVTcEhhT9xhnjpEAhWfFt8HXTPyyZMT_QOv84C70M8EGeM"
              alt="QR Code"
            />
          </div>

          <p className="text-center font-body-md text-body-md text-primary-container max-w-[280px]">
            Have the buyer scan this code to verify inspection and release payment.
          </p>

          {/* Transaction Summary */}
          <div className="w-full bg-white rounded-lg shadow-level-1 p-sm flex items-center gap-md border border-surface-variant/50">
            <img
              className="w-16 h-16 rounded-md object-cover bg-surface-container"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDwccBanOZOAnKQQq08Tm4L_m4gZ90afZhT1lxVMRih_M3XZ6hJPOfw5FL31eVAFWvXt07A4MJASjzvTcukW74STHZ_jJZ7Fi7p1WFEFDrU6XZkTG-QRWvHvsKaXAp3AORp_iBqc-k8AUxc4mUll_fXJLv4Ky8FTBRaO_dQd7Em0JTBLrY6t7QnUwaEHBEw81ZobLF3VaCniYR_qtP_GXHP6K89Cu97BGMAshBQwKTWSNzBaBwevt1cwgfXvYUL0Hj2s0lOTiojDbo"
              alt="Item"
            />
            <div className="flex-1">
              <p className="font-label-sm text-label-sm text-tertiary-container/60 mb-xs">Total Held</p>
              <p className="font-headline-sm text-headline-sm text-primary-container font-bold">RM 85.50</p>
            </div>
          </div>
        </div>

        {/* Support */}
        <div className="px-margin-mobile mt-auto pt-md">
          <button
            className="w-full py-sm rounded-lg border border-tertiary-container text-tertiary-container font-label-md text-label-md bg-transparent hover:bg-surface-container-low transition-colors active:scale-95 flex items-center justify-center gap-base"
            onClick={() => navigate('/report')}
          >
            <span className="material-symbols-outlined text-[20px]">report</span>
            Report Issue / Dispute
          </button>
        </div>
      </main>
    </div>
  );
}
