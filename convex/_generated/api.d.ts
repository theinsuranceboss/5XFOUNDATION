/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as ads from "../ads.js";
import type * as cart from "../cart.js";
import type * as categories from "../categories.js";
import type * as events from "../events.js";
import type * as migrate from "../migrate.js";
import type * as orders from "../orders.js";
import type * as paymentConfigs from "../paymentConfigs.js";
import type * as products from "../products.js";
import type * as siteContent from "../siteContent.js";
import type * as stories from "../stories.js";
import type * as upload from "../upload.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  ads: typeof ads;
  cart: typeof cart;
  categories: typeof categories;
  events: typeof events;
  migrate: typeof migrate;
  orders: typeof orders;
  paymentConfigs: typeof paymentConfigs;
  products: typeof products;
  siteContent: typeof siteContent;
  stories: typeof stories;
  upload: typeof upload;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
