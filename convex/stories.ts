import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("stories").collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    tag: v.string(),
    journey: v.string(),
    help: v.string(),
    img: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("stories", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("stories"),
    name: v.optional(v.string()),
    tag: v.optional(v.string()),
    journey: v.optional(v.string()),
    help: v.optional(v.string()),
    img: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
  },
});

export const remove = mutation({
  args: { id: v.id("stories") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
