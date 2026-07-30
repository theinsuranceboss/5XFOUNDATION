import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";

export const migrateAll = action({
  args: {
    products: v.string(),
    categories: v.string(),
    siteContent: v.string(),
    adminUsers: v.string(),
    events: v.string(),
    stories: v.string(),
    paymentConfigs: v.string(),
  },
  handler: async (ctx, args) => {
    const categories = JSON.parse(args.categories);
    const products = JSON.parse(args.products);
    const siteContentEntries = JSON.parse(args.siteContent);
    const adminUsers = JSON.parse(args.adminUsers);
    const events = JSON.parse(args.events);
    const stories = JSON.parse(args.stories);
    const paymentConfigs = JSON.parse(args.paymentConfigs);

    let catIdMap: Record<string, string> = {};
    for (const cat of categories) {
      const existing = await ctx.runQuery(api.categories.list);
      const match = existing.find((c: any) => c.slug === cat.slug);
      if (match) {
        catIdMap[cat.id] = match.id;
      } else {
        const newId = await ctx.runMutation(api.categories.create, {
          name: cat.name,
          slug: cat.slug,
          order: cat.order,
        });
        catIdMap[cat.id] = newId;
      }
    }

    for (const p of products) {
      const newCatId = catIdMap[p.categoryId];
      if (!newCatId) continue;
      const productId = await ctx.runMutation(api.products.create, {
        title: p.title,
        description: p.description,
        price: p.price,
        compareAt: p.compareAt ?? undefined,
        categoryId: newCatId as any,
        syncId: p.syncId ?? undefined,
      });
      if (p.images) {
        for (const img of p.images) {
          await ctx.runMutation(api.products.addImage, {
            productId: productId as any,
            url: img.url,
            type: img.type,
            order: img.order,
          });
        }
      }
      if (p.variants) {
        for (const v of p.variants) {
          await ctx.runMutation(api.products.addVariant, {
            productId: productId as any,
            color: v.color,
            size: v.size,
            stock: v.stock,
            sku: v.sku ?? undefined,
          });
        }
      }
    }

    for (const entry of siteContentEntries) {
      await ctx.runMutation(api.siteContent.upsert, {
        key: entry.section_key,
        content: entry.content,
      });
    }

    for (const user of adminUsers) {
      try {
        await ctx.runMutation(api.admin.createAdmin, {
          username: user.username,
          password: user.password,
          role: user.role || "admin",
        });
      } catch (e) {
        console.error("Failed to create admin:", user.username, e);
      }
    }

    for (const ev of events) {
      await ctx.runMutation(api.events.create, {
        title: ev.title,
        date: ev.date,
        location: ev.location,
        description: ev.description,
        imageUrl: ev.imageUrl ?? undefined,
      });
    }

    for (const st of stories) {
      await ctx.runMutation(api.stories.create, {
        name: st.name,
        tag: st.tag,
        journey: st.journey,
        help: st.help,
        img: st.img ?? undefined,
      });
    }

    for (const pc of paymentConfigs) {
      await ctx.runMutation(api.paymentConfigs.upsert, {
        provider: pc.provider,
        apiKey: pc.apiKey ?? undefined,
        link: pc.link ?? undefined,
        isActive: pc.isActive,
      });
    }

    return { success: true };
  },
});
