import { NextResponse } from 'next/server';
import { convexClient } from '@/lib/convex';
import { api } from '@convex/_generated/api';
import { fetchSyncProducts, fetchProductDetails } from '@/lib/printful';

const getColorHex = (colorName: string): string => {
  const name = colorName.toLowerCase();
  if (name.includes('black')) return '#1a1a1a';
  if (name.includes('white')) return '#ffffff';
  if (name.includes('navy')) return '#1e3a5f';
  if (name.includes('heliconia')) return '#e4007c';
  if (name.includes('gold')) return '#f59e0b';
  if (name.includes('maroon')) return '#800000';
  if (name.includes('sport grey')) return '#d1d5db';
  if (name.includes('grey') || name.includes('gray') || name.includes('heather')) return '#6b7280';
  if (name.includes('forest green') || name.includes('military green')) return '#2d5a27';
  if (name.includes('green')) return '#10b981';
  if (name.includes('pink')) return '#db2777';
  if (name.includes('red')) return '#ef4444';
  if (name.includes('charcoal')) return '#36454f';
  if (name.includes('natural')) return '#f5f5dc';
  if (name.includes('sand')) return '#e5d3b3';
  if (name.includes('ash')) return '#e5e7eb';
  if (name.includes('blue')) return '#3b82f6';
  if (name.includes('yellow')) return '#eab308';
  if (name.includes('orange')) return '#f97316';
  if (name.includes('purple')) return '#a855f7';
  return '#9ca3af';
};

export async function POST() {
  try {
    const products = await fetchSyncProducts();
    let count = 0;

    for (const p of products) {
      const details = await fetchProductDetails(p.id);
      const title = details.sync_product.name;
      const images: { url: string; type: string }[] = [];
      const variants: any[] = [];
      let basePrice = 0.01;

      const firstVariant = details.sync_variants[0] || {};
      const categoryIdVal = firstVariant.main_category_id;

      let catSlug = 'apparel';
      if (categoryIdVal === 41) catSlug = 'hats';
      else if (categoryIdVal === 30 || categoryIdVal === 23) catSlug = 'tanks';
      else if (categoryIdVal === 12) catSlug = 'kids';
      else if (categoryIdVal === 28) catSlug = 'hoodies';
      else if (categoryIdVal === 6 || categoryIdVal === 24) catSlug = 't-shirts';

      const existingCategories: any = await convexClient.query(api.categories.list);
      let productCategory = existingCategories.find((c: any) => c.slug === catSlug);
      if (!productCategory) {
        const newCatId = await convexClient.mutation(api.categories.create, {
          name: catSlug.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
          slug: catSlug,
          order: catSlug === 't-shirts' ? 1 : catSlug === 'hoodies' ? 2 : catSlug === 'tanks' ? 3 : catSlug === 'hats' ? 4 : 5,
        });
        productCategory = { id: newCatId, slug: catSlug };
      }

      details.sync_variants.forEach((v: any) => {
        const price = parseFloat(v.retail_price);
        if (!isNaN(price) && price > 0) basePrice = price;
        const color = (v.color || 'Default').trim();
        const size = (v.size || 'One Size').trim();
        const formattedColor = `${color}|${getColorHex(color)}`;

        variants.push({
          color: formattedColor,
          size,
          sku: v.sku,
          stock: 999,
        });

        v.files.forEach((f: any) => {
          if ((f.type === 'preview' || f.type === 'mockup' || f.type === 'back') && f.preview_url) {
            const urlWithColor = `${f.preview_url}?color=${encodeURIComponent(color)}`;
            if (!images.find(img => img.url === urlWithColor)) {
              const type = (f.type === 'back' || f.filename?.toLowerCase().includes('back')) ? 'back' : 'front';
              images.push({ url: urlWithColor, type });
            }
          }
        });
      });

      const productId = await convexClient.mutation(api.products.create, {
        title,
        description: 'Automatically imported from Printful.',
        price: basePrice,
        categoryId: productCategory.id as any,
        syncId: String(p.id),
      });

      await convexClient.mutation(api.products.removeAllImages, { productId: productId as any });
      await convexClient.mutation(api.products.removeAllVariants, { productId: productId as any });

      for (let i = 0; i < images.length; i++) {
        await convexClient.mutation(api.products.addImage, {
          productId: productId as any,
          url: images[i].url,
          type: images[i].type,
          order: i,
        });
      }
      for (const variant of variants) {
        await convexClient.mutation(api.products.addVariant, {
          productId: productId as any,
          color: variant.color,
          size: variant.size,
          stock: variant.stock,
          sku: variant.sku,
        });
      }

      count++;
    }

    return NextResponse.json({ success: true, synced: count });
  } catch (error: any) {
    console.error('Printful sync error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
