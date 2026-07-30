import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
export const list = query({
    args: { category: v.optional(v.string()) },
    handler: async (ctx, args) => {
        let products;
        if (args.category && args.category !== "all") {
            const cat = await ctx.db
                .query("categories")
                .withIndex("by_slug", (q) => q.eq("slug", args.category))
                .first();
            if (!cat)
                return [];
            products = await ctx.db
                .query("products")
                .withIndex("by_category", (q) => q.eq("categoryId", cat._id))
                .order("desc")
                .collect();
        }
        else {
            products = await ctx.db.query("products").order("desc").collect();
        }
        return Promise.all(products.map(async (p) => {
            const [images, variants, category] = await Promise.all([
                ctx.db
                    .query("productImages")
                    .withIndex("by_product_order", (q) => q.eq("productId", p._id))
                    .collect(),
                ctx.db
                    .query("productVariants")
                    .withIndex("by_product", (q) => q.eq("productId", p._id))
                    .collect(),
                ctx.db.get(p.categoryId),
            ]);
            return {
                ...p,
                images: images.map((img) => ({
                    id: img._id,
                    url: img.url,
                    type: img.type,
                    order: img.order,
                })),
                variants: variants.map((v) => ({
                    id: v._id,
                    color: v.color,
                    size: v.size,
                    stock: v.stock,
                    sku: v.sku,
                    price: p.price,
                })),
                category: category
                    ? { id: category._id, name: category.name, slug: category.slug }
                    : { id: "", name: "", slug: "" },
            };
        }));
    },
});
export const getById = query({
    args: { id: v.id("products") },
    handler: async (ctx, args) => {
        const p = await ctx.db.get(args.id);
        if (!p)
            return null;
        const [images, variants, category] = await Promise.all([
            ctx.db
                .query("productImages")
                .withIndex("by_product_order", (q) => q.eq("productId", p._id))
                .collect(),
            ctx.db
                .query("productVariants")
                .withIndex("by_product", (q) => q.eq("productId", p._id))
                .collect(),
            ctx.db.get(p.categoryId),
        ]);
        return {
            ...p,
            images: images.map((img) => ({
                id: img._id,
                url: img.url,
                type: img.type,
                order: img.order,
            })),
            variants: variants.map((v) => ({
                id: v._id,
                color: v.color,
                size: v.size,
                stock: v.stock,
                sku: v.sku,
                price: p.price,
            })),
            category: category
                ? { id: category._id, name: category.name, slug: category.slug }
                : { id: "", name: "", slug: "" },
        };
    },
});
export const getBySlug = query({
    args: { slug: v.string() },
    handler: async (ctx, args) => {
        const slug = args.slug
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "");
        const products = await ctx.db.query("products").collect();
        for (const p of products) {
            const pSlug = p.title
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/(^-|-$)/g, "");
            if (pSlug === slug) {
                const [images, variants, category] = await Promise.all([
                    ctx.db
                        .query("productImages")
                        .withIndex("by_product_order", (q) => q.eq("productId", p._id))
                        .collect(),
                    ctx.db
                        .query("productVariants")
                        .withIndex("by_product", (q) => q.eq("productId", p._id))
                        .collect(),
                    ctx.db.get(p.categoryId),
                ]);
                return {
                    ...p,
                    images: images.map((img) => ({
                        id: img._id,
                        url: img.url,
                        type: img.type,
                        order: img.order,
                    })),
                    variants: variants.map((v) => ({
                        id: v._id,
                        color: v.color,
                        size: v.size,
                        stock: v.stock,
                        sku: v.sku,
                        price: p.price,
                    })),
                    category: category
                        ? { id: category._id, name: category.name, slug: category.slug }
                        : { id: "", name: "", slug: "" },
                };
            }
        }
        return null;
    },
});
export const create = mutation({
    args: {
        title: v.string(),
        description: v.string(),
        price: v.number(),
        compareAt: v.optional(v.number()),
        categoryId: v.id("categories"),
        syncId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("products", {
            title: args.title,
            description: args.description,
            price: args.price,
            compareAt: args.compareAt,
            categoryId: args.categoryId,
            syncId: args.syncId,
        });
    },
});
export const update = mutation({
    args: {
        id: v.id("products"),
        title: v.optional(v.string()),
        description: v.optional(v.string()),
        price: v.optional(v.number()),
        compareAt: v.optional(v.number()),
        categoryId: v.optional(v.id("categories")),
        syncId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { id, ...fields } = args;
        await ctx.db.patch(id, fields);
    },
});
export const remove = mutation({
    args: { id: v.id("products") },
    handler: async (ctx, args) => {
        const images = await ctx.db
            .query("productImages")
            .withIndex("by_product", (q) => q.eq("productId", args.id))
            .collect();
        const variants = await ctx.db
            .query("productVariants")
            .withIndex("by_product", (q) => q.eq("productId", args.id))
            .collect();
        for (const img of images)
            await ctx.db.delete(img._id);
        for (const v of variants)
            await ctx.db.delete(v._id);
        await ctx.db.delete(args.id);
    },
});
export const addImage = mutation({
    args: {
        productId: v.id("products"),
        url: v.string(),
        type: v.string(),
        order: v.number(),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("productImages", {
            productId: args.productId,
            url: args.url,
            type: args.type,
            order: args.order,
        });
    },
});
export const addVariant = mutation({
    args: {
        productId: v.id("products"),
        color: v.string(),
        size: v.string(),
        stock: v.number(),
        sku: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("productVariants", {
            productId: args.productId,
            color: args.color,
            size: args.size,
            stock: args.stock,
            sku: args.sku,
        });
    },
});
export const removeAllImages = mutation({
    args: { productId: v.id("products") },
    handler: async (ctx, args) => {
        const images = await ctx.db
            .query("productImages")
            .withIndex("by_product", (q) => q.eq("productId", args.productId))
            .collect();
        for (const img of images)
            await ctx.db.delete(img._id);
    },
});
export const removeAllVariants = mutation({
    args: { productId: v.id("products") },
    handler: async (ctx, args) => {
        const variants = await ctx.db
            .query("productVariants")
            .withIndex("by_product", (q) => q.eq("productId", args.productId))
            .collect();
        for (const v of variants)
            await ctx.db.delete(v._id);
    },
});
