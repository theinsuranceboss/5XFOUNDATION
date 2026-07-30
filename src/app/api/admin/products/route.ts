import { db, batchUploadStorage } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, description, price, compareAt, categoryId, images, variants } = body;

    if (!title || !description || !price || !categoryId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const product = await db.product.create({
      data: {
        title,
        description,
        price: parseFloat(price),
        compareAt: compareAt ? parseFloat(compareAt) : null,
        categoryId,
        images: {
          create: (images || []).map((img: { url: string; type: string; order: number }) => ({
            url: img.url,
            type: img.type,
            order: img.order,
          })),
        },
        variants: {
          create: (variants || []).map((v: { color: string; size: string; stock: number; sku?: string }) => ({
            color: v.color,
            size: v.size,
            stock: parseInt(String(v.stock)) || 0,
            sku: v.sku || null,
          })),
        },
      },
      include: { category: true, images: true, variants: true },
    });

    return NextResponse.json(product);
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

    const product = await batchUploadStorage.run(true, async () => {
      // Delete existing images and variants, then recreate
      await db.productImage.deleteMany({ where: { productId: id } });
      await db.productVariant.deleteMany({ where: { productId: id } });

      return db.product.update({
        where: { id },
        data: {
          title,
          description,
          price: parseFloat(price),
          compareAt: compareAt ? parseFloat(compareAt) : null,
          categoryId,
          images: {
            create: (images || []).map((img: { url: string; type: string; order: number }) => ({
              url: img.url,
              type: img.type,
              order: img.order,
            })),
          },
          variants: {
            create: (variants || []).map((v: { color: string; size: string; stock: number; sku?: string }) => ({
              color: v.color,
              size: v.size,
              stock: parseInt(String(v.stock)) || 0,
              sku: v.sku || null,
            })),
          },
        },
        include: { category: true, images: true, variants: true },
      });
    });

    return NextResponse.json(product);
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

    await batchUploadStorage.run(true, async () => {
      await db.productImage.deleteMany({ where: { productId: id } });
      await db.productVariant.deleteMany({ where: { productId: id } });
      await db.product.delete({ where: { id } });
    });

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
