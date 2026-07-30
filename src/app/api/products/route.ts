import { NextRequest, NextResponse } from 'next/server';
import { convexQuery } from '@/lib/convex';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const products = await convexQuery('products:list', { category: category || undefined }) as any[];
    return NextResponse.json(products);
  } catch (error: any) {
    console.error('Error fetching products:', error?.message || error);
    return NextResponse.json({ error: 'Failed to fetch products', details: error?.message }, { status: 500 });
  }
}
