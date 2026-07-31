import { NextRequest, NextResponse } from 'next/server';
import { convexQuery } from '@/lib/convexClient';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const products = await convexQuery('products:list', { category: category || undefined }) as any[];
    const mapped = products.map((p: any) => ({
      ...p,
      id: p._id || p.id,
    }));
    return NextResponse.json(mapped);
  } catch (error: any) {
    console.error('Error fetching products:', error?.message || error);
    return NextResponse.json({ error: 'Failed to fetch products', details: error?.message }, { status: 500 });
  }
}
