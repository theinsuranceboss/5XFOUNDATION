import { v } from "convex/values";
import { mutation } from "./_generated/server";
export const generateUploadUrl = mutation({
    handler: async (ctx) => {
        return await ctx.storage.generateUploadUrl();
    },
});
export const storeFile = mutation({
    args: {
        storageId: v.string(),
        name: v.string(),
    },
    handler: async (ctx, args) => {
        const url = await ctx.storage.getUrl(args.storageId);
        return { storageId: args.storageId, url };
    },
});
export const deleteFile = mutation({
    args: { storageId: v.id("_storage") },
    handler: async (ctx, args) => {
        await ctx.storage.delete(args.storageId);
    },
});
