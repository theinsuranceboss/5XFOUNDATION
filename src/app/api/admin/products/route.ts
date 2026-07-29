import { NextRequest, NextResponse } from 'next/server';
import { convexClient } from '@/lib/convex';
import { api } from '@convex/_generated/api';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, description, price, compareAt, categoryId, images, variants } = body;
    if (!title || !description || !price || !categoryId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const productId = await convexClient.mutation(api.products.create, {
      title,
      description,
      price: parseFloat(price),
      compareAt: compareAt ? parseFloat(compareAt) : undefined,
      categoryId: categoryId as any,
    });

    for (const img of (images || [])) {
      await convexClient.mutation(api.products.addImage, {
        productId: productId as any,
        url: img.url,
        type: img.type,
        order: img.order,
      });
    }
    for (const v of (variants || [])) {
      await convexClient.mutation(api.products.addVariant, {
        productId: productId as any,
        color: v.color,
        size: v.size,
        stock: parseInt(String(v.stock)) || 0,
        sku: v.sku || undefined,
      });
    }

    return NextResponse.json({ id: productId, success: true });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, title, description, price, compareAt, categoryId, images, variants } = body;
    if (!id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    await convexClient.mutation(api.products.update, {
      id: id as any,
      title,
      description,
      price: parseFloat(price),
      compareAt: compareAt ? parseFloat(compareAt) : undefined,
      categoryId: categoryId as any,
    });

    await convexClient.mutation(api.products.removeAllImages, { productId: id as any });
    await convexClient.mutation(api.products.removeAllVariants, { productId: id as any });

    for (const img of (images || [])) {
      await convexClient.mutation(api.products.addImage, {
        productId: id as any,
        url: img.url,
        type: img.type,
        order: img.order,
      });
    }
    for (const v of (variants || [])) {
      await convexClient.mutation(api.products.addVariant, {
        productId: id as any,
        color: v.color,
        size: v.size,
        stock: parseInt(String(v.stock)) || 0,
        sku: v.sku || undefined,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }
    await convexClient.mutation(api.products.remove, { id: id as any });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
