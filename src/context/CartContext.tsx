"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface CartItem {
  id: string; // unique combo of: productId + color + size
  productId: string;
  variantId?: string;
  name: string;
  price: number;
  color: string;
  size: string;
  quantity: number;
  img: string;
  stripeUrl?: string;
  paypalUrl?: string;
}

interface CartContextType {
  cartItems: CartItem[];
  isCartOpen: boolean;
  addToCart: (item: Omit<CartItem, "id">) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  setCartOpen: (open: boolean) => void;
  cartTotal: number;
  cartCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from sessionStorage on mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("shopping_cart");
      if (saved) {
        setCartItems(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load cart from sessionStorage", e);
    }
    setIsHydrated(true);
  }, []);

  // Save to sessionStorage whenever cart changes
  useEffect(() => {
    if (!isHydrated) return;
    try {
      sessionStorage.setItem("shopping_cart", JSON.stringify(cartItems));
    } catch (e) {
      console.error("Failed to save cart to sessionStorage", e);
    }
  }, [cartItems, isHydrated]);

  const addToCart = (item: Omit<CartItem, "id">) => {
    setCartItems((prev) => {
      const existingItemIndex = prev.findIndex(
        (i) =>
          i.productId === item.productId &&
          i.color.toLowerCase() === item.color.toLowerCase() &&
          i.size.toUpperCase() === item.size.toUpperCase()
      );

      if (existingItemIndex > -1) {
        const updated = [...prev];
        updated[existingItemIndex].quantity += item.quantity;
        return updated;
      }

      const uniqueId = `${item.productId}-${item.color}-${item.size}`;
      return [...prev, { ...item, id: uniqueId }];
    });
    
    // Automatically open the cart drawer for great UX
    setIsCartOpen(true);
  };

  const removeFromCart = (id: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }
    setCartItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity } : item))
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const toggleCart = () => {
    setIsCartOpen((prev) => !prev);
  };

  const cartTotal = cartItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  const cartCount = cartItems.reduce((count, item) => count + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        isCartOpen,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        toggleCart,
        setCartOpen: setIsCartOpen,
        cartTotal,
        cartCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
