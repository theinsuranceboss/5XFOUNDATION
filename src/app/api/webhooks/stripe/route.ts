import { NextRequest, NextResponse } from 'next/server';
import { convexClient } from '@/lib/convex';
import { api } from '@convex/_generated/api';
import { createPrintfulOrder } from '@/lib/printful';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const bodyText = await req.text();
    const signature = req.headers.get('stripe-signature') as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event: any;

    if (webhookSecret && webhookSecret !== 'whsec_placeholder' && signature) {
      try {
        const sigParts = signature.split(',').reduce((acc, part) => {
          const [key, value] = part.split('=');
          acc[key] = value;
          return acc;
        }, {} as Record<string, string>);
        const signedPayload = `${sigParts.t}.${bodyText}`;
        const expectedSignature = crypto.createHmac('sha256', webhookSecret).update(signedPayload).digest('hex');
        if (expectedSignature !== sigParts.v1) {
          throw new Error('Signatures do not match');
        }
        event = JSON.parse(bodyText);
      } catch (err: any) {
        console.error(`Webhook signature verification failed.`, err.message);
        return NextResponse.json({ error: 'Webhook signature verification failed.' }, { status: 400 });
      }
    } else {
      event = JSON.parse(bodyText);
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const cartSessionId = session.metadata?.cart_session_id;

      if (cartSessionId) {
        const cartItems: any = await convexClient.query(api.cart.getCart, { sessionId: cartSessionId });

        if (cartItems && cartItems.length > 0) {
          const printfulOrder = {
            recipient: {
              name: session.shipping_details?.name || session.customer_details?.name || 'Unknown',
              address1: session.shipping_details?.address?.line1 || '',
              address2: session.shipping_details?.address?.line2 || undefined,
              city: session.shipping_details?.address?.city || '',
              state_code: session.shipping_details?.address?.state || '',
              country_code: session.shipping_details?.address?.country || '',
              zip: session.shipping_details?.address?.postal_code || '',
            },
            items: cartItems.map((item: any) => ({
              external_variant_id: item.product?.syncId || undefined,
              quantity: item.quantity,
            }))
          };

          try {
            await createPrintfulOrder(printfulOrder);
            console.log('PRINTFUL ORDER CREATED:', JSON.stringify(printfulOrder, null, 2));

            const email = session.customer_details?.email || null;
            const name = session.shipping_details?.name || session.customer_details?.name || 'Unknown';
            const total = session.amount_total ? session.amount_total / 100 : cartItems.reduce((sum: number, item: any) => sum + (item.product?.price || 0) * item.quantity, 0);

            await convexClient.mutation(api.orders.create, {
              email,
              name,
              total,
              status: 'completed',
              items: cartItems.map((item: any) => ({
                productId: item.productId as any,
                variantId: undefined,
                color: item.color.split('|')[0] || 'Default',
                size: item.size,
                quantity: item.quantity,
                price: item.product?.price || 0,
              })),
            });

            await convexClient.mutation(api.cart.clearCart, { sessionId: cartSessionId });
          } catch (e) {
            console.error('Failed to create Printful order / DB order:', e);
          }
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
