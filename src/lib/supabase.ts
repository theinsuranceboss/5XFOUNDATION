import { convexClient } from "./convex";
import { api } from "@convex/_generated/api";

// CMS Helper functions using Convex
export async function getSiteContent(key: string) {
  try {
    const content = await convexClient.query(api.siteContent.get, { key });
    return content;
  } catch (err) {
    console.error("Failed to get site content from Convex:", err);
    return null;
  }
}

export async function updateSiteContent(key: string, content: string) {
  try {
    await convexClient.mutation(api.siteContent.upsert, { key, content });
    return { success: true, error: null };
  } catch (err: any) {
    console.error("Failed to update site content in Convex:", err);
    return { success: false, error: err };
  }
}

export async function getActiveAds(location: "footer" | "sidebar") {
  try {
    const data = await convexClient.query(api.ads.getActive, { location });
    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: err };
  }
}

export async function recordAdClick(adId: string) {
  try {
    await convexClient.mutation(api.ads.recordClick, { adId: adId as any });
    return { error: null };
  } catch (err: any) {
    return { error: err };
  }
}
