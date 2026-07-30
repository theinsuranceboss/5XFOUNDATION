import { NextRequest, NextResponse } from 'next/server';
import { convexQuery, convexMutation } from '@/lib/convex';

export const dynamic = 'force-dynamic';

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
    const body = await req.json();
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
    const body = await req.json();
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
