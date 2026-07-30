import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getCart = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("cartItems")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .order("desc")
      .collect();

    return Promise.all(
      items.map(async (item) => {
        const product = await ctx.db.get(item.productId);
        if (!product) return null;
        const images = await ctx.db
          .query("productImages")
          .withIndex("by_product_order", (q) => q.eq("productId", product._id))
          .collect();
        return {
          id: item._id,
          sessionId: item.sessionId,
          productId: item.productId,
          variantId: item.variantId,
          color: item.color,
          size: item.size,
          quantity: item.quantity,
          product: {
            ...product,
            images: images.map((img) => ({
              id: img._id,
              url: img.url,
              type: img.type,
              order: img.order,
            })),
          },
        };
      })
    ).then((results) => results.filter(Boolean));
  },
});

export const addToCart = mutation({
  args: {
    sessionId: v.string(),
    productId: v.id("products"),
    color: v.string(),
    size: v.string(),
    quantity: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const quantity = args.quantity ?? 1;
    const existing = await ctx.db
      .query("cartItems")
      .withIndex("by_session_product", (q) =>
        q
          .eq("sessionId", args.sessionId)
          .eq("productId", args.productId)
          .eq("color", args.color)
          .eq("size", args.size)
      )
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        quantity: existing.quantity + quantity,
      });
      const updated = await ctx.db.get(existing._id);
      return updated;
    }
    return await ctx.db.insert("cartItems", {
      sessionId: args.sessionId,
      productId: args.productId,
      variantId: undefined,
      color: args.color,
      size: args.size,
      quantity,
    });
  },
});

export const updateCartItem = mutation({
  args: {
    id: v.id("cartItems"),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    if (args.quantity <= 0) {
      await ctx.db.delete(args.id);
      return { deleted: true };
    }
    await ctx.db.patch(args.id, { quantity: args.quantity });
    return { deleted: false };
  },
});

export const removeCartItem = mutation({
  args: { id: v.id("cartItems") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const clearCart = mutation({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("cartItems")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
    for (const item of items) {
      await ctx.db.delete(item._id);
    }
  },
});
