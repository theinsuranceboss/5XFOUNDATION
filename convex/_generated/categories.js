import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
export const list = query({
    handler: async (ctx) => {
        const categories = await ctx.db.query("categories").order("asc").collect();
        return Promise.all(categories.map(async (cat) => {
            const products = await ctx.db
                .query("products")
                .withIndex("by_category", (q) => q.eq("categoryId", cat._id))
                .collect();
            return {
                id: cat._id,
                name: cat.name,
                slug: cat.slug,
                order: cat.order,
                _count: { products: products.length },
            };
        }));
    },
});
export const create = mutation({
    args: {
        name: v.string(),
        slug: v.string(),
        order: v.number(),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("categories")
            .withIndex("by_slug", (q) => q.eq("slug", args.slug))
            .first();
        if (existing)
            return existing._id;
        return await ctx.db.insert("categories", {
            name: args.name,
            slug: args.slug,
            order: args.order,
        });
    },
});
export const update = mutation({
    args: {
        id: v.id("categories"),
        name: v.optional(v.string()),
        slug: v.optional(v.string()),
        order: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const { id, ...fields } = args;
        await ctx.db.patch(id, fields);
    },
});
export const remove = mutation({
    args: { id: v.id("categories") },
    handler: async (ctx, args) => {
        const products = await ctx.db
            .query("products")
            .withIndex("by_category", (q) => q.eq("categoryId", args.id))
            .collect();
        for (const p of products) {
            await ctx.db.delete(p._id);
        }
        await ctx.db.delete(args.id);
    },
});
