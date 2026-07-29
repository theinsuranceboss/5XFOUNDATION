import { NextResponse } from 'next/server';
import { convexClient } from '@/lib/convex';
import { api } from '@convex/_generated/api';
import { PrismaClient } from '@/generated/client';
import * as path from 'path';

const prisma = new PrismaClient({
  datasources: { db: { url: `file:${path.join(process.cwd(), 'prisma', 'dev.db')}` } },
});

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const categories = await prisma.category.findMany({ orderBy: { order: 'asc' } });
    const products = await prisma.product.findMany({
      include: { images: { orderBy: { order: 'asc' } }, variants: true, category: true },
    });
    const siteContentEntries = await prisma.$queryRawUnsafe<Array<{ section_key: string; content: string }>>(
      'SELECT section_key, content FROM site_content'
    ).catch(() => []);
    const allSiteContent = siteContentEntries.length > 0 ? siteContentEntries : [];

    const adminUsers = [{ username: 'admin', password: 'cancer', role: 'admin' }];
    const events: any[] = [];
    const stories: any[] = [];
    const paymentConfigs = await prisma.paymentConfig.findMany().catch(() => []);

    const result = await convexClient.action(api.migrate.migrateAll, {
      categories: JSON.stringify(categories),
      products: JSON.stringify(products),
      siteContent: JSON.stringify(allSiteContent),
      adminUsers: JSON.stringify(adminUsers),
      events: JSON.stringify(events),
      stories: JSON.stringify(stories),
      paymentConfigs: JSON.stringify(paymentConfigs),
    });

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
