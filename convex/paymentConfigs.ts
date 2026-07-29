import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("paymentConfigs").collect();
  },
});

export const upsert = mutation({
  args: {
    provider: v.string(),
    apiKey: v.optional(v.string()),
    link: v.optional(v.string()),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("paymentConfigs")
      .withIndex("by_provider", (q) => q.eq("provider", args.provider))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        apiKey: args.apiKey,
        link: args.link,
        isActive: args.isActive,
      });
      return existing._id;
    }
    return await ctx.db.insert("paymentConfigs", args);
  },
});
