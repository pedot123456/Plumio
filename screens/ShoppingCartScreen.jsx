import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import TopAppBar from '../components/TopAppBar';
import BottomNav from '../components/BottomNav';

function CartItemSkeleton() {
  return (
    <div className="animate-pulse bg-surface-container-lowest rounded-[16px] p-md flex flex-col sm:flex-row gap-lg border border-surface-container-highest">
      <div className="w-full sm:w-[140px] h-[140px] rounded-[12px] bg-surface-container-high shrink-0" />
      <div className="flex-1 space-y-sm py-xs">
        <div className="h-4 bg-surface-container-high rounded w-3/4" />
        <div className="h-3 bg-surface-container-high rounded w-1/2" />
        <div className="h-5 bg-surface-container-high rounded w-1/4 mt-sm" />
      </div>
    </div>
  );
}

export default function ShoppingCartScreen() {
  const navigate = useNavigate();
  const { session } = useAuth();

  const [cartItems, setCartItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!session) { setIsLoading(false); return; }
    fetchCart();
  }, [session]);

  async function fetchCart() {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('cart_items')
        .select(`
          id,
          quantity,
          variant_label,
          listing:listings (
            id,
            title,
            price,
            image_url
          )
        `)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setCartItems(data ?? []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function updateQty(itemId, newQty) {
    if (newQty < 1) return;
    const { error } = await supabase
      .from('cart_items')
      .update({ quantity: newQty })
      .eq('id', itemId);
    if (!error) {
      setCartItems(prev => prev.map(i => i.id === itemId ? { ...i, quantity: newQty } : i));
    }
  }

  async function removeItem(itemId) {
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', itemId);
    if (!error) {
      setCartItems(prev => prev.filter(i => i.id !== itemId));
    }
  }

  const subtotal = cartItems.reduce(
    (sum, item) => sum + Number(item.listing?.price ?? 0) * item.quantity,
    0
  );

  return (
    <div className="bg-background text-on-background pb-[80px] md:pb-0 min-h-screen">
      <TopAppBar variant="brand" />

      <main className="max-w-container-max mx-auto px-margin-mobile md:px-xxl py-xl grid grid-cols-1 md:grid-cols-12 gap-gutter">
        {/* Cart Items */}
        <div className="md:col-span-8 flex flex-col gap-lg">
          <div className="flex justify-between items-end mb-sm">
            <h2 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary">
              Shopping Cart
            </h2>
            {!isLoading && (
              <span className="font-body-md text-body-md text-on-surface-variant">
                {cartItems.length} {cartItems.length === 1 ? 'Item' : 'Items'}
              </span>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-sm text-error font-body-sm text-body-sm bg-error/10 rounded-lg px-md py-sm">
              <span className="material-symbols-outlined text-[18px]">error_outline</span>
              {error}
              <button onClick={fetchCart} className="ml-auto font-label-sm underline">Retry</button>
            </div>
          )}

          {isLoading ? (
            <>
              <CartItemSkeleton />
              <CartItemSkeleton />
            </>
          ) : cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-xxl gap-md text-on-surface-variant">
              <span className="material-symbols-outlined text-[56px]">shopping_cart</span>
              <p className="font-headline-sm text-headline-sm">Your cart is empty</p>
              <button
                onClick={() => navigate('/')}
                className="mt-sm bg-primary-container text-on-primary font-label-md text-label-md px-lg py-sm rounded-lg hover:bg-primary transition-colors active:scale-95"
              >
                Start Shopping
              </button>
            </div>
          ) : (
            cartItems.map(item => (
              <article
                key={item.id}
                className="bg-surface-container-lowest rounded-[16px] p-md flex flex-col sm:flex-row gap-lg shadow-sm hover:shadow-md transition-shadow border border-surface-container-highest"
              >
                <div
                  className="bg-cover bg-center w-full sm:w-[140px] h-[140px] rounded-[12px] shrink-0 bg-surface-container-high"
                  style={{ backgroundImage: `url('${item.listing?.image_url}')` }}
                />
                <div className="flex flex-col flex-grow justify-between py-xs">
                  <div className="flex justify-between items-start gap-md">
                    <div>
                      <h3 className="font-headline-sm text-headline-sm text-primary">{item.listing?.title}</h3>
                      {item.variant_label && (
                        <p className="font-body-sm text-body-sm text-on-surface-variant mt-xs">{item.variant_label}</p>
                      )}
                    </div>
                    <p className="font-headline-md text-headline-md text-primary whitespace-nowrap">
                      RM {Number(item.listing?.price ?? 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="flex justify-between items-end mt-lg">
                    <div className="flex items-center bg-surface-container rounded-full px-sm py-[6px] border border-outline-variant/50">
                      <button
                        className="material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors"
                        style={{ fontSize: 20 }}
                        onClick={() => updateQty(item.id, item.quantity - 1)}
                      >
                        remove
                      </button>
                      <span className="font-label-md text-label-md w-8 text-center text-primary">{item.quantity}</span>
                      <button
                        className="material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors"
                        style={{ fontSize: 20 }}
                        onClick={() => updateQty(item.id, item.quantity + 1)}
                      >
                        add
                      </button>
                    </div>
                    <button
                      className="text-on-surface-variant hover:text-error flex items-center gap-xs font-label-md text-label-md transition-colors"
                      onClick={() => removeItem(item.id)}
                    >
                      <span className="material-symbols-outlined text-[20px]">delete</span>
                      <span className="hidden sm:inline">Remove</span>
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>

        {/* Order Summary */}
        <aside className="md:col-span-4 mt-xl md:mt-0">
          <div className="bg-surface-container-lowest rounded-[16px] p-lg shadow-sm border border-surface-container-highest sticky top-[100px]">
            <h3 className="font-headline-md text-headline-md text-primary mb-lg">Order Summary</h3>
            <div className="flex flex-col gap-md mb-lg font-body-md text-body-md text-on-surface-variant">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="text-primary font-medium">RM {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Estimated Shipping</span>
                <span className="text-primary font-medium">Calculated at next step</span>
              </div>
              <div className="flex justify-between">
                <span>Estimated Tax</span>
                <span className="text-primary font-medium">RM 0.00</span>
              </div>
            </div>
            <div className="border-t border-surface-container-highest pt-md mb-xl flex justify-between items-center">
              <span className="font-headline-sm text-headline-sm text-primary">Total</span>
              <span className="font-headline-lg-mobile text-headline-lg-mobile text-primary">RM {subtotal.toFixed(2)}</span>
            </div>
            <button
              disabled={cartItems.length === 0}
              className="w-full bg-primary-container text-on-primary rounded-lg py-sm px-lg font-label-md text-label-md flex justify-center items-center gap-sm hover:bg-primary transition-colors h-[48px] shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => navigate('/cart/secure')}
            >
              Proceed to Checkout
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
            <div className="mt-md text-center">
              <button
                className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary underline transition-colors"
                onClick={() => navigate('/')}
              >
                Continue Shopping
              </button>
            </div>
          </div>
        </aside>
      </main>

      <BottomNav activeTab="Cart" />
    </div>
  );
}
