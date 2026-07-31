'use client';

import { useStore, CartItemWithProduct, getSessionId } from '@/lib/store';
import { getDisplayUrl } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Minus, Plus, Trash2, CreditCard, ShoppingBag, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import Script from 'next/script';

declare global {
  interface Window {
    paypal?: any;
  }
}

function CartPayPalButton({ subtotal, setCart, setIsCartOpen, isSdkLoaded }: any) {
  useEffect(() => {
    if (!isSdkLoaded || !window.paypal || subtotal <= 0) return;
    
    const container = document.getElementById("cart-paypal-button-container");
    if (!container) return;
    
    container.innerHTML = ''; 
    
    window.paypal.Buttons({
      style: { layout: "vertical", shape: "rect", color: "gold", label: "paypal", height: 44 },
      fundingSource: window.paypal.FUNDING.PAYPAL,
      createOrder: (data: any, actions: any) => {
        return actions.order.create({
          intent: "CAPTURE",
          purchase_units: [{
            amount: { currency_code: "USD", value: subtotal.toFixed(2) },
            description: `5xFoundation Merch Store`
          }],
        });
      },
      onApprove: async (data: any, actions: any) => {
        if (actions.order) {
          const details = await actions.order.capture();
          toast.success(`Payment successful, ${details.payer?.name?.given_name}!`);
          setCart([]);
          setIsCartOpen(false);
        }
      }
    }).render("#cart-paypal-button-container");
    
  }, [isSdkLoaded, subtotal, setCart, setIsCartOpen]);

  return (
    <div id="cart-paypal-button-container" className="min-h-[44px] w-full relative z-0 mt-3">
      {!isSdkLoaded && (
        <div className="animate-pulse h-11 bg-gray-100 rounded text-center leading-[44px] text-gray-400 font-bold text-sm">
          Loading PayPal...
        </div>
      )}
    </div>
  );
}

export function CartSidebar() {
  const { cart, isCartOpen, setIsCartOpen, setCart, paymentConfigs } = useStore();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isSdkLoaded, setIsSdkLoaded] = useState(false);

  const subtotal = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  const stripeConfig = paymentConfigs.find((c) => c.provider === 'stripe');
  // Removed paypalConfig usage since we will use the dynamic Smart Buttons with the provided client ID
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "AVrTrX38Se2i3orog_E2JzqkaqouA68T2MkcshUPBLJe_F-woWnUMvwRGJEFWjnylukTSUus1hIFNK2a";

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      await removeItem(itemId);
      return;
    }
    try {
      const res = await fetch('/api/cart', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: itemId, quantity: newQuantity }),
      });
      if (res.ok) {
        const sessionId = getSessionId();
        const cartRes = await fetch(`/api/cart?sessionId=${sessionId}`);
        if (cartRes.ok) {
          const items = await cartRes.json();
          setCart(items);
        }
      }
    } catch {
      toast.error('Failed to update cart');
    }
  };

  const removeItem = async (itemId: string) => {
    try {
      const res = await fetch(`/api/cart?id=${itemId}`, { method: 'DELETE' });
      if (res.ok) {
        const sessionId = getSessionId();
        const cartRes = await fetch(`/api/cart?sessionId=${sessionId}`);
        if (cartRes.ok) {
          const items = await cartRes.json();
          setCart(items);
        }
        toast.success('Item removed from cart');
      }
    } catch {
      toast.error('Failed to remove item');
    }
  };

  const handleCheckout = async (provider: 'stripe' | 'paypal') => {
    if (provider === 'stripe') {
      setIsCheckingOut(true);
      try {
        const sessionId = getSessionId();
        const res = await fetch('/api/checkout/stripe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        } else {
          toast.error(data.error || 'Failed to initialize Stripe checkout');
        }
      } catch (e: any) {
        toast.error('Checkout failed: ' + e.message);
      } finally {
        setIsCheckingOut(false);
      }
      return;
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (window.paypal) {
        setIsSdkLoaded(true);
        return;
      }

      // Check if script is already in document
      const script = document.querySelector('script[src*="paypal.com/sdk/js"]');
      if (script) {
        const handleLoad = () => setIsSdkLoaded(true);
        script.addEventListener("load", handleLoad);

        const interval = setInterval(() => {
          if (window.paypal) {
            setIsSdkLoaded(true);
            clearInterval(interval);
          }
        }, 100);

        return () => {
          script.removeEventListener("load", handleLoad);
          clearInterval(interval);
        };
      }
    }
  }, []);

  return (
    <>
    <Script 
      src={`https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD&components=buttons&disable-funding=card,credit,venmo,paylater`}
      strategy="afterInteractive"
      onLoad={() => setIsSdkLoaded(true)}
      onReady={() => setIsSdkLoaded(true)}
    />
    <Dialog open={isCartOpen} onOpenChange={setIsCartOpen}>
      <DialogContent className="max-w-2xl w-[95vw] h-[85vh] sm:h-[auto] max-h-[90vh] flex flex-col bg-white rounded-3xl p-6 sm:p-8">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl font-black uppercase italic tracking-tight">
            <ShoppingBag className="h-6 w-6 text-blue-600" />
            Shopping Cart ({cart.length})
          </DialogTitle>
        </DialogHeader>

        {cart.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center text-gray-400">
            <ShoppingBag className="h-16 w-16 mb-4" />
            <p className="text-lg font-medium">Your cart is empty</p>
            <p className="text-sm">Add some products to get started</p>
          </div>
        ) : (
          <>
            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {cart.map((item: CartItemWithProduct) => {
                const frontImage = item.product.images.find((img) => img.type === 'front')?.url || item.product.images[0]?.url;
                return (
                  <div key={item.id} className="flex gap-3 rounded-lg border border-gray-100 bg-gray-50/50 p-3">
                    <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg">
                        <img
                          src={getDisplayUrl(frontImage)}
                          alt={item.product.title}
                          className="h-full w-full object-cover"
                        />
                    </div>
                    <div className="flex flex-1 flex-col">
                      <div className="flex items-start justify-between">
                        <h4 className="text-sm font-semibold text-gray-900 line-clamp-1">{item.product.title}</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(item.id)}
                          className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500">
                        {item.color} / {item.size}
                      </p>
                      <div className="mt-auto flex items-center justify-between">
                        <div className="flex items-center gap-1 rounded-md border border-gray-200 bg-white">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="h-7 w-7 p-0"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-6 text-center text-xs font-semibold">{item.quantity}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="h-7 w-7 p-0"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <span className="text-sm font-bold text-gray-900">
                          ${(item.product.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Subtotal & Checkout */}
            <div className="border-t pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Subtotal</span>
                <span className="text-lg font-bold text-gray-900">${subtotal.toFixed(2)} USD</span>
              </div>
              <p className="text-xs text-gray-400">Shipping and taxes calculated at checkout</p>

              <Separator />

              {/* Checkout Buttons */}
              <div className="space-y-3">
                <Button
                  onClick={() => handleCheckout('stripe')}
                  disabled={isCheckingOut}
                  className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                  size="lg"
                >
                  {isCheckingOut ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                  {isCheckingOut ? 'Processing...' : 'Pay with Stripe'}
                </Button>
                
                <CartPayPalButton 
                  subtotal={subtotal} 
                  setCart={setCart} 
                  setIsCartOpen={setIsCartOpen} 
                  isSdkLoaded={isSdkLoaded} 
                />
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
}
