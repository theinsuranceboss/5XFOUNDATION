import { NextRequest, NextResponse } from 'next/server';
import { convexMutation } from '@/lib/convexClient';
import { parseJsonBody } from '@/lib/parse-body';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await parseJsonBody(req);
    const { title, description, price, compareAt, categoryId, images, variants } = body;
    if (!title || !description || !price || !categoryId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const productId = await convexMutation('products:create', {
      title,
      description,
      price: parseFloat(price),
      compareAt: compareAt ? parseFloat(compareAt) : undefined,
      categoryId,
    });

    for (const img of (images || [])) {
      await convexMutation('products:addImage', {
        productId,
        url: img.url,
        type: img.type,
        order: img.order,
      });
    }
    for (const v of (variants || [])) {
      await convexMutation('products:addVariant', {
        productId,
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
    const body = await parseJsonBody(req);
    const { id, title, description, price, compareAt, categoryId, images, variants } = body;
    if (!id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    await convexMutation('products:update', {
      id,
      title,
      description,
      price: parseFloat(price),
      compareAt: compareAt ? parseFloat(compareAt) : undefined,
      categoryId,
    });

    await convexMutation('products:removeAllImages', { productId: id });
    await convexMutation('products:removeAllVariants', { productId: id });

    for (const img of (images || [])) {
      await convexMutation('products:addImage', {
        productId: id,
        url: img.url,
        type: img.type,
        order: img.order,
      });
    }
    for (const v of (variants || [])) {
      await convexMutation('products:addVariant', {
        productId: id,
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
    await convexMutation('products:remove', { id });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
