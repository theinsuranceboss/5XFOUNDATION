import { NextResponse } from 'next/server';
import { convexQuery } from '@/lib/convexClient';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const categories = await convexQuery('categories:list');
    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}
