import { ConvexHttpClient } from "convex/browser";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "http://127.0.0.1:3210";

export const convexClient = new ConvexHttpClient(convexUrl);

export async function convexQuery(functionPath: string, args: Record<string, unknown> = {}) {
  const res = await fetch(`${convexUrl}/api/query`, {
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
  const res = await fetch(`${convexUrl}/api/mutation`, {
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
