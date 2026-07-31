import { NextRequest, NextResponse } from 'next/server';
import { convexQuery, convexMutation } from '@/lib/convexClient';

export const dynamic = 'force-dynamic';

async function parseBody(req: NextRequest) {
  const url = new URL(req.url);
  let body: any = {};
  
  // 1. Query params
  body.sessionId = url.searchParams.get('sessionId');
  body.productId = url.searchParams.get('productId');
  body.color = url.searchParams.get('color');
  body.size = url.searchParams.get('size');
  body.quantity = parseInt(url.searchParams.get('quantity') || '1');
  body.id = url.searchParams.get('id');
  
  // 2. Middleware header
  if (!body.sessionId) {
    const bodyHeader = req.headers.get('x-parsed-body');
    if (bodyHeader) {
      try {
        const parsed = JSON.parse(bodyHeader);
        Object.assign(body, parsed);
      } catch (e) {}
    }
  }
  
  // 3. req.json() fallback
  if (!body.sessionId && !body.id) {
    try {
      const parsed = await req.json();
      Object.assign(body, parsed);
    } catch (e) {}
  }
  
  return body;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }
    const items = await convexQuery('cart:getCart', { sessionId });
    return NextResponse.json(items);
  } catch (error) {
    console.error('Error fetching cart:', error);
    return NextResponse.json({ error: 'Failed to fetch cart' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await parseBody(req);
    const { sessionId, productId, color, size, quantity = 1 } = body;
    if (!sessionId || !productId || !color || !size) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const item = await convexMutation('cart:addToCart', {
      sessionId,
      productId,
      color,
      size,
      quantity,
    });
    return NextResponse.json(item);
  } catch (error) {
    console.error('Error adding to cart:', error);
    return NextResponse.json({ error: 'Failed to add to cart' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await parseBody(req);
    const { id, quantity } = body;
    if (!id || quantity === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const result = await convexMutation('cart:updateCartItem', { id, quantity });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating cart item:', error);
    return NextResponse.json({ error: 'Failed to update cart item' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const sessionId = searchParams.get('sessionId');
    if (id) {
      await convexMutation('cart:removeCartItem', { id });
      return NextResponse.json({ deleted: true });
    }
    if (sessionId) {
      await convexMutation('cart:clearCart', { sessionId });
      return NextResponse.json({ cleared: true });
    }
    return NextResponse.json({ error: 'Missing id or sessionId' }, { status: 400 });
  } catch (error) {
    console.error('Error deleting cart item:', error);
    return NextResponse.json({ error: 'Failed to delete cart item' }, { status: 500 });
  }
}