import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  siteContent: defineTable({
    section_key: v.string(),
    content: v.string(),
    updated_at: v.string(),
  }).index("by_section_key", ["section_key"]),

  adBanners: defineTable({
    name: v.string(),
    location: v.string(),
    image_url: v.string(),
    link_url: v.string(),
    active: v.boolean(),
    clicks: v.optional(v.number()),
    createdAt: v.string(),
    updatedAt: v.string(),
  }).index("by_location_active", ["location", "active"]),

  reservations: defineTable({
    name: v.string(),
    email: v.string(),
    phone: v.string(),
    eventId: v.string(),
    eventTitle: v.string(),
    createdAt: v.string(),
  }).index("by_eventId", ["eventId"])
    .index("by_createdAt", ["createdAt"]),
});
