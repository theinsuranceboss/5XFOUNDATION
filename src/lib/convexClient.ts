const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "https://secret-mongoose-212.convex.cloud";

export async function convexQuery(functionPath: string, args: Record<string, unknown> = {}) {
  const res = await fetch(`${CONVEX_URL}/api/query`, {
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
  const res = await fetch(`${CONVEX_URL}/api/mutation`, {
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
