import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  categories: defineTable({
    name: v.string(),
    slug: v.string(),
    order: v.number(),
  }).index("by_slug", ["slug"]),

  products: defineTable({
    title: v.string(),
    description: v.string(),
    price: v.number(),
    compareAt: v.optional(v.number()),
    categoryId: v.id("categories"),
    syncId: v.optional(v.string()),
  })
    .index("by_category", ["categoryId"])
    .index("by_syncId", ["syncId"]),

  productImages: defineTable({
    productId: v.id("products"),
    url: v.string(),
    type: v.string(),
    order: v.number(),
  })
    .index("by_product", ["productId"])
    .index("by_product_order", ["productId", "order"]),

  productVariants: defineTable({
    productId: v.id("products"),
    color: v.string(),
    size: v.string(),
    stock: v.number(),
    sku: v.optional(v.string()),
  }).index("by_product", ["productId"]),

  cartItems: defineTable({
    sessionId: v.string(),
    productId: v.id("products"),
    variantId: v.optional(v.string()),
    color: v.string(),
    size: v.string(),
    quantity: v.number(),
  })
    .index("by_session", ["sessionId"])
    .index("by_session_product", ["sessionId", "productId", "color", "size"]),

  paymentConfigs: defineTable({
    provider: v.string(),
    apiKey: v.optional(v.string()),
    link: v.optional(v.string()),
    isActive: v.boolean(),
  }).index("by_provider", ["provider"]),

  orders: defineTable({
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    total: v.number(),
    status: v.string(),
  }),

  orderItems: defineTable({
    orderId: v.id("orders"),
    productId: v.id("products"),
    variantId: v.optional(v.string()),
    color: v.string(),
    size: v.string(),
    quantity: v.number(),
    price: v.number(),
  })
    .index("by_order", ["orderId"])
    .index("by_product", ["productId"]),

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

  adminUsers: defineTable({
    username: v.string(),
    password: v.string(),
    role: v.string(),
  }).index("by_username", ["username"]),

  events: defineTable({
    title: v.string(),
    date: v.string(),
    location: v.string(),
    description: v.string(),
    imageUrl: v.optional(v.string()),
  }),

  stories: defineTable({
    name: v.string(),
    tag: v.string(),
    journey: v.string(),
    help: v.string(),
    img: v.optional(v.string()),
  }),

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
