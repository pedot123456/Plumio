import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useAuth } from './AuthContext';

const CartContext = createContext({ cartCount: 0, addToCart: () => {}, setCartCount: () => {} });

export function CartProvider({ children }) {
  const { session } = useAuth();
  const [cartCount, setCartCount] = useState(0);

  // Sync count from DB whenever the session changes
  useEffect(() => {
    if (!session) { setCartCount(0); return; }
    supabase
      .from('cart_items')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', session.user.id)
      .then(({ count }) => setCartCount(count ?? 0));
  }, [session]);

  const addToCart = () => setCartCount(c => c + 1);

  return (
    <CartContext.Provider value={{ cartCount, addToCart, setCartCount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
