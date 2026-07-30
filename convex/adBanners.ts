import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getActive = query({
  args: { location: v.string() },
  handler: async (ctx, args) => {
    const ads = await ctx.db
      .query("adBanners")
      .withIndex("by_location_active", (q) =>
        q.eq("location", args.location).eq("active", true)
      )
      .collect();
    return ads.map((ad) => ({
      id: ad._id,
      name: ad.name,
      image_url: ad.image_url,
      link_url: ad.link_url,
      location: ad.location,
      clicks: ad.clicks ?? 0,
      active: ad.active,
    }));
  },
});

export const recordClick = mutation({
  args: { adId: v.id("adBanners") },
  handler: async (ctx, args) => {
    const ad = await ctx.db.get(args.adId);
    if (ad) {
      await ctx.db.patch(args.adId, {
        clicks: (ad.clicks ?? 0) + 1,
      });
    }
  },
});
