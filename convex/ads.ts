import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getActive = query({
  args: { location: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("adBanners")
      .withIndex("by_location_active", (q) =>
        q.eq("location", args.location).eq("active", true)
      )
      .collect();
  },
});

export const recordClick = mutation({
  args: { adId: v.id("adBanners") },
  handler: async (ctx, args) => {
    const ad = await ctx.db.get(args.adId);
    if (ad) {
      await ctx.db.patch(args.adId, { clicks: ad.clicks + 1 });
    }
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    location: v.string(),
    imageUrl: v.optional(v.string()),
    linkUrl: v.optional(v.string()),
    active: v.boolean(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("adBanners", {
      ...args,
      clicks: 0,
    });
  },
});
