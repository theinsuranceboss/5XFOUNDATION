import { NextRequest, NextResponse } from 'next/server';
import { convexQuery } from '@/lib/convexClient';

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    let sessionId = url.searchParams.get('sessionId');

    if (!sessionId) {
      const bodyHeader = req.headers.get('x-parsed-body');
      if (bodyHeader) {
        try {
          const parsed = JSON.parse(bodyHeader);
          sessionId = parsed.sessionId;
        } catch (e) {}
      }
    }

    if (!sessionId) {
      try {
        const parsed = await req.json();
        sessionId = parsed.sessionId;
      } catch (e) {}
    }

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    const cartItems: any = await convexQuery('cart:getCart', { sessionId });
    if (!cartItems || cartItems.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const secretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder';

    const formParams = new URLSearchParams();
    formParams.append('payment_method_types[0]', 'card');
    formParams.append('shipping_address_collection[allowed_countries][0]', 'US');
    formParams.append('shipping_address_collection[allowed_countries][1]', 'CA');
    formParams.append('mode', 'payment');
    formParams.append('success_url', `${appUrl}/success?session_id={CHECKOUT_SESSION_ID}`);
    formParams.append('cancel_url', `${appUrl}/merch`);
    formParams.append('metadata[cart_session_id]', sessionId);

    cartItems.forEach((item: any, i: number) => {
      const colorLower = item.color.toLowerCase();
      const img = item.product?.images?.find((img: any) => img.url.toLowerCase().includes(colorLower)) || item.product?.images?.[0];
      formParams.append(`line_items[${i}][price_data][currency]`, 'usd');
      formParams.append(`line_items[${i}][price_data][product_data][name]`, `${item.product?.title || 'Product'} - ${item.color} / ${item.size}`);
      if (img?.url) {
        formParams.append(`line_items[${i}][price_data][product_data][images][0]`, img.url);
      }
      formParams.append(`line_items[${i}][price_data][unit_amount]`, Math.round((item.product?.price || 0) * 100).toString());
      formParams.append(`line_items[${i}][quantity]`, item.quantity.toString());
    });

    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formParams.toString()
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || 'Failed to create session');
    }

    return NextResponse.json({ url: data.url });
  } catch (error: any) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
