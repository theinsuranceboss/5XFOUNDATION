import { NextResponse } from 'next/server';
import { convexQuery, convexMutation } from '@/lib/convexClient';

export async function GET() {
  try {
    // Test query without args (like products:list)
    const products = await convexQuery('products:list');
    // Test query with args (like admin:login)
    const admin = await convexQuery('admin:login', { username: 'admin', password: 'cancer' });
    // Test mutation
    const cat = await convexMutation('categories:create', { slug: 'test', name: 'Test', order: 99 });
    
    return NextResponse.json({ 
      productsCount: Array.isArray(products) ? products.length : 0,
      admin,
      cat
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}