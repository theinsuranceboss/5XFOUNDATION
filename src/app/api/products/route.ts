import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { Product, ProductVariant, ProductImage, Category } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');

    const products = await db.product.findMany({
      where: category && category !== 'all' ? {
        category: { slug: category }
      } : undefined,
      include: {
        category: true,
        images: { orderBy: { order: 'asc' } },
        variants: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Add product price to each variant for frontend compatibility
    const productsWithVariantPrices: Product[] = (products as (Product & { variants: any[] })[]).map((product) => ({
      ...product,
      variants: product.variants.map((variant) => ({
        ...variant,
        price: product.price
      })) as ProductVariant[]
    }));

    return NextResponse.json(productsWithVariantPrices);
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}
