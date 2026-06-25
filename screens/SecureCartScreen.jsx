import React from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';

const CART_ITEMS = [
  {
    id: '1',
    title: 'Premium Wireless Headphones',
    price: 'RM 199.00',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA8qdT3A9SF8PFjWIGqeZ94fxfl-gzPuq6C1lVSFt9BhlGpyXbQOcret5FpdKbOTkaGMSHL5pmfZC74JwR8FyQi-9-5VbsEufrb-13GF96K4cWnjGRTOPJF1tmxb2wdu6qTSqmqywYMeeYfcSFgq2x2J_rsdEUepkkK416HOP0m2Ij6PESO4WbKSMnDbksIPoyvrlTcE1tuyUQhUXH4tR0TjdmpKMu_3Oh9hzOfuORmYvi2CaaSpkRPBktq8md9sLpf-MOX1VP8pu4',
  },
  {
    id: '2',
    title: 'Calculus Textbook - 9th Edition',
    price: 'RM 45.00',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDN62wkjuRMUZAf4ArRtHGMCzvJXTiXnl79I0eQKFaKSZSVQsa_MbJghpN6Tpqew0XMDbhepCL39IOIxmeNmYdLB2wONhFr0yVStx0EL_X1WDECO0dSko8AB_FL-RqBiDK-4PkuHhDqId5GClGf6MZ9xhxsHYmtwVMWh1UcnEQJ92Bzbsc3WNXr1ZlQUdTLz_MgiWA9XjxiDudA5oV3rupDupDrIsydR3oj2N4mr3OV9F2BGDroaR2VTDGejy-qKA9vw14u8hFIT98',
  },
];

export default function SecureCartScreen() {
  const navigate = useNavigate();

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col font-body-md pb-[144px] md:pb-[72px]">
      {/* Top App Bar */}
      <header className="bg-surface shadow-sm fixed top-0 w-full z-40 transition-all duration-300">
        <div className="flex justify-between items-center w-full px-lg py-md max-w-container-max mx-auto">
          <button
            className="text-primary hover:bg-surface-container-high transition-colors p-2 rounded-full"
            onClick={() => navigate(-1)}
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="font-headline-md text-headline-md font-bold text-primary text-center flex-1">Secure Cart</h1>
          <div className="w-10" />
        </div>
      </header>

      <main className="flex-grow pt-[72px] px-margin-mobile md:px-lg max-w-container-max mx-auto w-full flex flex-col gap-lg py-lg">
        {/* Cart Items */}
        <section className="flex flex-col gap-md">
          {CART_ITEMS.map(item => (
            <div key={item.id} className="bg-white rounded-lg p-sm flex items-center gap-md shadow-level-1">
              <div className="w-20 h-20 rounded-md overflow-hidden bg-surface-container-high shrink-0">
                <img className="w-full h-full object-cover" src={item.image} alt={item.title} />
              </div>
              <div className="flex-grow flex flex-col justify-center">
                <h3 className="font-body-md text-body-md text-primary line-clamp-2 leading-tight mb-xs">{item.title}</h3>
                <p className="font-headline-sm text-headline-sm text-primary">{item.price}</p>
              </div>
              <button className="text-tertiary-container hover:text-error transition-colors p-2 rounded-full shrink-0">
                <span className="material-symbols-outlined">delete_outline</span>
              </button>
            </div>
          ))}
        </section>

        {/* Fulfillment */}
        <section className="bg-white rounded-lg p-md shadow-level-1 border border-outline-variant/30">
          <h2 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider mb-sm">Fulfillment</h2>
          <div className="flex items-start gap-sm">
            <span className="material-symbols-outlined text-secondary mt-1">location_on</span>
            <div>
              <p className="font-body-md text-body-md font-semibold text-primary">Handoff Location</p>
              <p className="font-body-sm text-body-sm text-on-surface-variant">UTP Information Resource Centre (IRC)</p>
            </div>
          </div>
        </section>

        {/* Order Summary */}
        <section className="bg-surface-container-low rounded-lg p-md shadow-level-1 mt-auto">
          <h2 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider mb-sm">Order Summary</h2>
          <div className="flex flex-col gap-xs">
            <div className="flex justify-between items-center text-on-surface-variant font-body-sm text-body-sm">
              <span>Subtotal</span><span>RM 244.00</span>
            </div>
            <div className="flex justify-between items-center text-on-surface-variant font-body-sm text-body-sm">
              <span>Escrow Fee</span><span>RM 1.00</span>
            </div>
            <div className="h-px bg-outline-variant opacity-50 my-sm w-full" />
            <div className="flex justify-between items-center text-primary font-headline-sm text-headline-sm font-bold">
              <span>Total</span><span>RM 245.00</span>
            </div>
          </div>
        </section>
      </main>

      {/* Pinned Action */}
      <div className="fixed bottom-[72px] md:bottom-0 left-0 w-full px-margin-mobile md:px-lg pb-md md:pb-lg pt-sm bg-gradient-to-t from-surface via-surface to-transparent z-40">
        <div className="max-w-container-max mx-auto">
          <button className="w-full bg-primary-container text-white font-headline-md text-headline-md py-sm px-lg rounded-lg shadow-md hover:bg-primary transition-colors flex justify-center items-center gap-sm active:scale-95">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
            Lock Escrow Payment
          </button>
        </div>
      </div>

      <BottomNav activeTab="Cart" />
    </div>
  );
}
