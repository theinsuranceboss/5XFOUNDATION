import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createPrintfulOrder } from '@/lib/printful';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const bodyText = await req.text();
    const signature = req.headers.get('stripe-signature') as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event: any;

    // Use test signature validation if available, else parse directly for dev bypass
    if (webhookSecret && webhookSecret !== 'whsec_placeholder' && signature) {
      try {
        // Stripe Signature format: t=timestamp,v1=signature
        const sigParts = signature.split(',').reduce((acc, part) => {
          const [key, value] = part.split('=');
          acc[key] = value;
          return acc;
        }, {} as Record<string, string>);

        const signedPayload = `${sigParts.t}.${bodyText}`;
        const expectedSignature = crypto
          .createHmac('sha256', webhookSecret)
          .update(signedPayload)
          .digest('hex');

        if (expectedSignature !== sigParts.v1) {
          throw new Error('Signatures do not match');
        }
        event = JSON.parse(bodyText);
      } catch (err: any) {
        console.error(`Webhook signature verification failed.`, err.message);
        return NextResponse.json({ error: 'Webhook signature verification failed.' }, { status: 400 });
      }
    } else {
      // DEV BYPASS: If no webhook secret is configured, just parse the body
      event = JSON.parse(bodyText);
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      
      const cartSessionId = session.metadata?.cart_session_id;

      if (cartSessionId) {
        // Fetch cart items to fulfill
        const cartItems = await db.cartItem.findMany({
          where: { sessionId: cartSessionId },
          include: { product: true }
        });

        if (cartItems.length > 0) {
          // Fetch variants for SKUs
          const variants = await db.productVariant.findMany({
            where: {
              OR: cartItems.map((item: any) => ({
                productId: item.productId,
                color: item.color,
                size: item.size
              }))
            }
          });

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
            items: cartItems.map((item: any) => {
              const variant = variants.find((v: any) => v.productId === item.productId && v.color === item.color && v.size === item.size);
              return {
                external_variant_id: variant?.sku || undefined,
                quantity: item.quantity,
              };
            })
          };

          try {
            // Create the order in Printful for fulfillment
            await createPrintfulOrder(printfulOrder);
            console.log('PRINTFUL ORDER CREATED:', JSON.stringify(printfulOrder, null, 2));
            
            // Create Order and OrderItems in the SQLite database
            const email = session.customer_details?.email || null;
            const name = session.shipping_details?.name || session.customer_details?.name || 'Unknown';
            const total = session.amount_total ? session.amount_total / 100 : cartItems.reduce((sum: number, item: any) => sum + item.product.price * item.quantity, 0);

            await db.order.create({
              data: {
                email,
                name,
                total,
                status: 'completed',
                items: {
                  create: cartItems.map((item: any) => {
                    const variant = variants.find((v: any) => v.productId === item.productId && v.color === item.color && v.size === item.size);
                    return {
                      productId: item.productId,
                      variantId: variant?.id || null,
                      color: item.color.split('|')[0] || 'Default',
                      size: item.size,
                      quantity: item.quantity,
                      price: item.product.price
                    };
                  })
                }
              }
            });
            console.log('DB ORDER CREATED FOR STRIPE SESSION:', session.id);
            
            // Clear the cart
            await db.cartItem.deleteMany({ where: { sessionId: cartSessionId } });
          } catch (e) {
             console.error('Failed to create DB order / Printful order:', e);
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
