"use client";
import type { CartItem } from "@/lib/types";
import React, { createContext, useContext, useEffect, useState } from "react";

type CartCtxType = {
  items: CartItem[];
  add: (item: Omit<CartItem, "qty" | "discount">, qty?: number) => void;
  remove: (product_id: string) => void;
  setQty: (product_id: string, qty: number) => void;
  clear: () => void;
  count: number;
};

const CartCtx = createContext<CartCtxType>({
  items: [], add: () => {}, remove: () => {}, setQty: () => {}, clear: () => {}, count: 0,
});

export function useCart() {
  return useContext(CartCtx);
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("storefront_cart");
      if (raw) setItems(JSON.parse(raw));
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem("storefront_cart", JSON.stringify(items));
  }, [items, loaded]);

  const add: CartCtxType["add"] = (item, qty = 1) => {
    setItems((prev) => {
      const found = prev.find((p) => p.product_id === item.product_id);
      if (found) {
        return prev.map((p) =>
          p.product_id === item.product_id ? { ...p, qty: Math.min(p.qty + qty, p.stock) } : p
        );
      }
      return [...prev, { ...item, qty: Math.min(qty, item.stock), discount: 0 }];
    });
  };

  const remove = (product_id: string) =>
    setItems((prev) => prev.filter((p) => p.product_id !== product_id));

  const setQty = (product_id: string, qty: number) =>
    setItems((prev) =>
      prev.map((p) => (p.product_id === product_id ? { ...p, qty: Math.max(1, Math.min(qty, p.stock)) } : p))
    );

  const clear = () => setItems([]);

  return (
    <CartCtx.Provider
      value={{ items, add, remove, setQty, clear, count: items.reduce((a, b) => a + b.qty, 0) }}
    >
      {children}
    </CartCtx.Provider>
  );
}
