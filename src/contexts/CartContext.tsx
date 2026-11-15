import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { CartItem, Uniform, School } from '@/types';
import { supabase } from '@/lib/supabase';

interface CartContextType {
  items: CartItem[];
  isOpen: boolean;
  addItem: (uniform: Uniform, size: string, school: School, quantity?: number, color?: string | null) => void;
  removeItem: (uniformId: string, size: string, color?: string | null) => void;
  updateQuantity: (uniformId: string, size: string, quantity: number, color?: string | null) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  totalItems: number;
  totalAmount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'elite_cart';

function loadCartFromStorage(): CartItem[] {
  try {
    const saved = localStorage.getItem(CART_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveCartToStorage(items: CartItem[]) {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch { }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadCartFromStorage);
  const [isOpen, setIsOpen] = useState(false);

  const setAndSave = (updater: (prev: CartItem[]) => CartItem[]) => {
    setItems(prev => {
      const next = updater(prev);
      saveCartToStorage(next);
      return next;
    });
  };

  useEffect(() => {
    async function syncPrices() {
      if (items.length === 0) return;
      try {
        const schoolIds = Array.from(new Set(items.map(i => i.school.id)));
        const { data: dbUniforms, error } = await supabase
          .from('uniforms')
          .select('*')
          .in('school_id', schoolIds);

        if (error) throw error;
        if (!dbUniforms || dbUniforms.length === 0) return;

        let changed = false;
        const updated = items.map(item => {
          const matches = dbUniforms.filter(u =>
            u.item_name.toLowerCase() === item.uniform.item_name.toLowerCase() &&
            (u.type || '').toLowerCase() === (item.uniform.type || '').toLowerCase() &&
            (u.category || '').toLowerCase() === (item.uniform.category || '').toLowerCase()
          );

          if (matches.length === 0) return item;

          // Find specific grade or fallback to 'All'
          const gradeMatch = matches.find(r => r.grade.toLowerCase() === item.uniform.grade.toLowerCase());
          const allMatch = matches.find(r => r.grade.toLowerCase() === 'all');
          const bestRow = gradeMatch || allMatch || matches[0];

          if (bestRow.price !== item.uniform.price || bestRow.id !== item.uniform.id) {
            changed = true;
            return {
              ...item,
              uniform: {
                ...item.uniform,
                id: bestRow.id,
                price: Number(bestRow.price),
                image_url: bestRow.image_url || item.uniform.image_url,
                image_urls: bestRow.image_urls || item.uniform.image_urls,
              }
            };
          }
          return item;
        });

        if (changed) {
          setItems(updated);
          saveCartToStorage(updated);
        }
      } catch (err) {
        console.error('Error syncing cart prices on mount:', err);
      }
    }

    syncPrices();
  }, []);


  const addItem = useCallback((uniform: Uniform, size: string, school: School, quantity = 1, color?: string | null) => {
    setAndSave(prev => {
      const existingIndex = prev.findIndex(
        item => item.uniform.id === uniform.id && item.size === size && (item.color ?? null) === (color ?? null)
      );
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex].quantity += quantity;
        return updated;
      }
      return [...prev, { uniform, size, quantity, school, color: color ?? null }];
    });
    setIsOpen(true);
  }, []);

  const removeItem = useCallback((uniformId: string, size: string, color?: string | null) => {
    setAndSave(prev => prev.filter(
      item => !(item.uniform.id === uniformId && item.size === size && (item.color ?? null) === (color ?? null))
    ));
  }, []);

  const updateQuantity = useCallback((uniformId: string, size: string, quantity: number, color?: string | null) => {
    if (quantity <= 0) {
      removeItem(uniformId, size, color);
      return;
    }
    setAndSave(prev => prev.map(item =>
      item.uniform.id === uniformId && item.size === size && (item.color ?? null) === (color ?? null)
        ? { ...item, quantity }
        : item
    ));
  }, [removeItem]);

  const clearCart = useCallback(() => {
    setItems([]);
    localStorage.removeItem(CART_STORAGE_KEY);
  }, []);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);
  const toggleCart = useCallback(() => setIsOpen(prev => !prev), []);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = items.reduce(
    (sum, item) => sum + item.uniform.price * item.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        items,
        isOpen,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        openCart,
        closeCart,
        toggleCart,
        totalItems,
        totalAmount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
