import { create } from 'zustand';

export interface ProductImage {
  id: string;
  url: string;
  type: string;
  order: number;
}

export interface ProductVariant {
  id: string;
  color: string;
  size: string;
  stock: number;
  sku?: string;
  price?: number;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  compareAt: number | null;
  categoryId: string;
  category: { id: string; name: string; slug: string };
  images: ProductImage[];
  variants: ProductVariant[];
  createdAt: string;
  updatedAt: string;
}

export interface CartItemWithProduct {
  id: string;
  sessionId: string;
  productId: string;
  variantId: string | null;
  color: string;
  size: string;
  quantity: number;
  product: Product;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  order: number;
  _count?: { products: number };
}

export interface PaymentConfig {
  id: string;
  provider: string;
  apiKey: string | null;
  link: string | null;
  isActive: boolean;
}

type View = 'store' | 'admin';

interface StoreState {
  view: View;
  setView: (view: View) => void;

  products: Product[];
  setProducts: (products: Product[]) => void;

  categories: Category[];
  setCategories: (categories: Category[]) => void;

  selectedCategory: string;
  setSelectedCategory: (slug: string) => void;

  selectedProduct: Product | null;
  setSelectedProduct: (product: Product | null) => void;

  cart: CartItemWithProduct[];
  setCart: (items: CartItemWithProduct[]) => void;

  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;

  paymentConfigs: PaymentConfig[];
  setPaymentConfigs: (configs: PaymentConfig[]) => void;

  sessionId: string;
}

// Generate or retrieve a session ID
function getSessionId(): string {
  if (typeof window === 'undefined') return 'server';
  let sid = sessionStorage.getItem('cart-session-id');
  if (!sid) {
    sid = 'session-' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    sessionStorage.setItem('cart-session-id', sid);
  }
  return sid;
}

export const useStore = create<StoreState>((set) => ({
  view: 'store',
  setView: (view) => set({ view }),

  products: [],
  setProducts: (products) => set({ products }),

  categories: [],
  setCategories: (categories) => set({ categories }),

  selectedCategory: 'all',
  setSelectedCategory: (slug) => set({ selectedCategory: slug }),

  selectedProduct: null,
  setSelectedProduct: (product) => set({ selectedProduct: product }),

  cart: [],
  setCart: (items) => set({ cart: items }),

  isCartOpen: false,
  setIsCartOpen: (open) => set({ isCartOpen: open }),

  paymentConfigs: [],
  setPaymentConfigs: (configs) => set({ paymentConfigs: configs }),

  sessionId: typeof window !== 'undefined' ? getSessionId() : 'server',
}));

export { getSessionId };
