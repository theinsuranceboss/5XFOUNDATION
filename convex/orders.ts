import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("orders").order("desc").collect();
  },
});

export const create = mutation({
  args: {
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    total: v.number(),
    status: v.string(),
    items: v.array(
      v.object({
        productId: v.id("products"),
        variantId: v.optional(v.string()),
        color: v.string(),
        size: v.string(),
        quantity: v.number(),
        price: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const orderId = await ctx.db.insert("orders", {
      email: args.email,
      name: args.name,
      total: args.total,
      status: args.status,
    });
    for (const item of args.items) {
      await ctx.db.insert("orderItems", {
        orderId,
        productId: item.productId,
        variantId: item.variantId,
        color: item.color,
        size: item.size,
        quantity: item.quantity,
        price: item.price,
      });
    }
    return orderId;
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("orders"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: args.status });
  },
});
