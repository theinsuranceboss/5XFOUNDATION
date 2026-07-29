import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const login = query({
  args: { username: v.string(), password: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("adminUsers")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();
    if (!user) return null;
    if (user.password !== args.password) return null;
    return { id: user._id, username: user.username, role: user.role };
  },
});

export const changePassword = mutation({
  args: {
    username: v.string(),
    oldPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("adminUsers")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();
    if (!user) throw new Error("User not found");
    if (user.password !== args.oldPassword) throw new Error("Old password is incorrect");
    await ctx.db.patch(user._id, { password: args.newPassword });
    return { success: true };
  },
});

export const createAdmin = mutation({
  args: {
    username: v.string(),
    password: v.string(),
    role: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("adminUsers")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();
    if (existing) throw new Error("User already exists");
    return await ctx.db.insert("adminUsers", {
      username: args.username,
      password: args.password,
      role: args.role,
    });
  },
});

export const listAdmins = query({
  handler: async (ctx) => {
    const users = await ctx.db.query("adminUsers").collect();
    return users.map((u) => ({
      id: u._id,
      username: u.username,
      role: u.role,
    }));
  },
});
