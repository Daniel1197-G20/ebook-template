import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { cartApi } from '../services/api';
import { useAuth } from './AuthContext';
import type { Cart } from '../types';

interface CartContextType {
  cart: Cart | null;
  cartCount: number;
  cartItemIds: string[];
  loading: boolean;
  addToCart: (bookId: string) => Promise<Cart>;
  removeFromCart: (bookId: string) => Promise<Cart>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const refreshCart = useCallback(async () => {
    if (!isAuthenticated) {
      setCart(null);
      return;
    }
    setLoading(true);
    try {
      const res = await cartApi.get();
      const cartData: Cart = res.data.data;
      setCart(cartData);
    } catch {
      setCart(null);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  const addToCart = async (bookId: string): Promise<Cart> => {
    const res = await cartApi.add(bookId);
    const updatedCart: Cart = res.data.data;
    setCart(updatedCart);
    return updatedCart;
  };

  const removeFromCart = async (bookId: string): Promise<Cart> => {
    const res = await cartApi.remove(bookId);
    const updatedCart: Cart = res.data.data;
    setCart(updatedCart);
    return updatedCart;
  };

  const items = cart?.items || [];
  const cartCount = items.filter((i) => !i.alreadyOwned).length;
  const cartItemIds = items.map((i) => i.bookId);

  return (
    <CartContext.Provider
      value={{
        cart,
        cartCount,
        cartItemIds,
        loading,
        addToCart,
        removeFromCart,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return ctx;
}
