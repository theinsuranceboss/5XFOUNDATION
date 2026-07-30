import { NextResponse } from 'next/server';
import { db, batchUploadStorage, ensureDb } from '@/lib/db';
import { fetchSyncProducts, fetchProductDetails } from '@/lib/printful';

// Color hex helper for Printful imports
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
    // 1. Force ensure the database file is locally downloaded/updated
    await ensureDb();

    // 2. Perform all syncing writes inside batch context (skips intermediate Supabase uploads)
    const successCount = await batchUploadStorage.run(true, async () => {
      const products = await fetchSyncProducts();
      let count = 0;

      for (const p of products) {
        const details = await fetchProductDetails(p.id);

        const title = details.sync_product.name;
        const images: { url: string, type: string }[] = [];
        const variants: any[] = [];
        let basePrice = 0.01;

        // Determine category based on first variant main_category_id
        const firstVariant = details.sync_variants[0] || {};
        const categoryIdVal = firstVariant.main_category_id;

        let catName = 'Apparel';
        let catSlug = 'apparel';

        if (categoryIdVal === 41) {
          catName = 'Hats';
          catSlug = 'hats';
        } else if (categoryIdVal === 30 || categoryIdVal === 23) {
          catName = 'Tank Tops';
          catSlug = 'tanks';
        } else if (categoryIdVal === 12) {
          catName = 'Kids';
          catSlug = 'kids';
        } else if (categoryIdVal === 28) {
          catName = 'Hoodies';
          catSlug = 'hoodies';
        } else if (categoryIdVal === 6 || categoryIdVal === 24) {
          catName = 'T-Shirts';
          catSlug = 't-shirts';
        }

        let productCategory = await db.category.findUnique({ where: { slug: catSlug } });
        if (!productCategory) {
          productCategory = await db.category.create({
            data: {
              name: catName,
              slug: catSlug,
              order: catSlug === 't-shirts' ? 1 : catSlug === 'hoodies' ? 2 : catSlug === 'tanks' ? 3 : catSlug === 'hats' ? 4 : 5
            }
          });
        }

        // Extract variants and images
        details.sync_variants.forEach((v: any) => {
          // Find price
          const price = parseFloat(v.retail_price);
          if (!isNaN(price) && price > 0) basePrice = price;

          // Use direct color and size fields from Printful
          const color = (v.color || 'Default').trim();
          const size = (v.size || 'One Size').trim();

          // Format color field with hex name (colorName|hexValue)
          const formattedColor = `${color}|${getColorHex(color)}`;

          variants.push({
            color: formattedColor,
            size,
            sku: v.sku,
            stock: 999 // Printful is made-to-order
          });

          // Extract mockups and back designs
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

        // Insert or Update DB
        let existingProduct = await db.product.findFirst({
          where: {
            OR: [
              { syncId: String(p.id) },
              { syncId: null, title }
            ]
          }
        });

        if (existingProduct) {
          // Update product price, title, categoryId & set syncId
          await db.product.update({
            where: { id: existingProduct.id },
            data: {
              title,
              price: basePrice,
              syncId: String(p.id),
              categoryId: productCategory.id
            }
          });

          // ALSO SYNC IMAGES: delete old images and insert fresh from Printful
          await db.productImage.deleteMany({ where: { productId: existingProduct.id } });
          for (let i = 0; i < images.length; i++) {
            await db.productImage.create({
              data: {
                productId: existingProduct.id,
                url: images[i].url,
                type: images[i].type,
                order: i
              }
            });
          }

          // ALSO SYNC VARIANTS: delete old variants and insert fresh from Printful
          await db.productVariant.deleteMany({ where: { productId: existingProduct.id } });
          for (const variant of variants) {
            await db.productVariant.create({
              data: {
                productId: existingProduct.id,
                color: variant.color,
                size: variant.size,
                sku: variant.sku,
                stock: variant.stock
              }
            });
          }
        } else {
          // Create new
          existingProduct = await db.product.create({
            data: {
              title,
              description: 'Automatically imported from Printful.',
              price: basePrice,
              syncId: String(p.id),
              categoryId: productCategory.id
            }
          });

          // Insert fresh images (only for brand new products)
          for (let i = 0; i < images.length; i++) {
            await db.productImage.create({
              data: {
                productId: existingProduct.id,
                url: images[i].url,
                type: images[i].type,
                order: i
              }
            });
          }

          // Insert fresh variants sequentially (only for brand new products)
          for (const variant of variants) {
            await db.productVariant.create({
              data: {
                productId: existingProduct.id,
                color: variant.color,
                size: variant.size,
                sku: variant.sku,
                stock: variant.stock
              }
            });
          }
        }

        count++;
      }
      return count;
    });

    return NextResponse.json({ success: true, synced: successCount });
  } catch (error: any) {
    console.error('Printful sync error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}