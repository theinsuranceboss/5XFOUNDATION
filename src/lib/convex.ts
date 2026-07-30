import { ConvexHttpClient } from "convex/browser";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "https://secret-mongoose-212.convex.cloud";

export const convexClient = new ConvexHttpClient(convexUrl);

export async function convexQuery(functionPath: string, args: Record<string, unknown> = {}) {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL || convexUrl;
  const res = await fetch(`${url}/api/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: functionPath, args }),
  });
  const data = await res.json();
  if (data.status !== 'success') {
    throw new Error(data.error?.message || `Convex query ${functionPath} failed`);
  }
  return data.value;
}

export async function convexMutation(functionPath: string, args: Record<string, unknown> = {}) {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL || convexUrl;
  const res = await fetch(`${url}/api/mutation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: functionPath, args }),
  });
  const data = await res.json();
  if (data.status !== 'success') {
    throw new Error(data.error?.message || `Convex mutation ${functionPath} failed`);
  }
  return data.value;
}
