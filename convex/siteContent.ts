import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const get = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const entry = await ctx.db
      .query("siteContent")
      .withIndex("by_key", (q) => q.eq("section_key", args.key))
      .first();
    return entry?.content ?? null;
  },
});

export const upsert = mutation({
  args: {
    key: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("siteContent")
      .withIndex("by_key", (q) => q.eq("section_key", args.key))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { content: args.content });
      return existing._id;
    }
    return await ctx.db.insert("siteContent", {
      section_key: args.key,
      content: args.content,
    });
  },
});

export const getAll = query({
  handler: async (ctx) => {
    return await ctx.db.query("siteContent").collect();
  },
});
