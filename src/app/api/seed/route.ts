import { NextResponse } from 'next/server';
import { convexClient } from '@/lib/convex';
import { api } from '@convex/_generated/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
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
      await convexClient.mutation(api.categories.create, cat);
      results.push(`Created category: ${cat.name}`);
    }

    await convexClient.mutation(api.paymentConfigs.upsert, {
      provider: 'stripe', apiKey: '', link: '', isActive: false,
    });
    await convexClient.mutation(api.paymentConfigs.upsert, {
      provider: 'paypal', apiKey: '', link: '', isActive: false,
    });
    results.push('Payment configs ensured');

    try {
      const existing = await convexClient.query(api.admin.login, { username: 'admin', password: 'cancer' });
      if (!existing) {
        await convexClient.mutation(api.admin.createAdmin, {
          username: 'admin', password: 'cancer', role: 'admin',
        });
        results.push('Admin user created');
      }
    } catch (e) {
      results.push('Admin user may already exist');
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({ error: 'Seed failed' }, { status: 500 });
  }
}
