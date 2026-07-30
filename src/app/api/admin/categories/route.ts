import { NextRequest, NextResponse } from 'next/server';
import { convexClient } from '@/lib/convex';
import { api } from '@convex/_generated/api';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, slug, order } = body;
    if (!name || !slug) {
      return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 });
    }
    const id = await convexClient.mutation(api.categories.create, { name, slug, order: order || 0 });
    return NextResponse.json({ id, success: true });
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, slug, order } = body;
    if (!id) {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });
    }
    await convexClient.mutation(api.categories.update, {
      id: id as any,
      name,
      slug,
      order: order ?? undefined,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating category:', error);
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });
    }
    await convexClient.mutation(api.categories.remove, { id: id as any });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
  }
}
