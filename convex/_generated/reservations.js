import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
export const list = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query("reservations").order("desc").collect();
    },
});
export const add = mutation({
    args: {
        name: v.string(),
        email: v.string(),
        phone: v.string(),
        eventId: v.string(),
        eventTitle: v.string(),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("reservations", {
            name: args.name,
            email: args.email,
            phone: args.phone,
            eventId: args.eventId,
            eventTitle: args.eventTitle,
            createdAt: new Date().toISOString(),
        });
    },
});
export const remove = mutation({
    args: { id: v.id("reservations") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
    },
});
