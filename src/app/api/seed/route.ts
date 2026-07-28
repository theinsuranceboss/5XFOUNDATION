import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Create categories if they don't exist
    const categories = [
      { slug: 'all', name: 'All Products', order: 0 },
      { slug: 't-shirts', name: 'T-Shirts', order: 1 },
      { slug: 'hoodies', name: 'Hoodies', order: 2 },
      { slug: 'tanks', name: 'Tank Tops', order: 3 },
      { slug: 'hats', name: 'Hats', order: 4 },
      { slug: 'kids', name: 'Kids', order: 5 },
      { slug: 'donations', name: 'Donations', order: 6 },
    ];

    const results: string[] = [];

    for (const cat of categories) {
      const existing = await db.category.findUnique({ where: { slug: cat.slug } });
      if (!existing) {
        await db.category.create({ data: cat });
        results.push(`Created category: ${cat.name}`);
      } else {
        results.push(`Category exists: ${cat.name}`);
      }
    }

    // Create payment configs
    await db.paymentConfig.upsert({
      where: { provider: 'stripe' },
      update: {},
      create: { provider: 'stripe', apiKey: '', link: '', isActive: false },
    });
    await db.paymentConfig.upsert({
      where: { provider: 'paypal' },
      update: {},
      create: { provider: 'paypal', apiKey: '', link: '', isActive: false },
    });
    results.push('Payment configs ensured');

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({ error: 'Seed failed' }, { status: 500 });
  }
}
