const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || 'https://secret-mongoose-212.convex.cloud';

async function convexQuery(functionPath: string, args: Record<string, unknown> = {}) {
  const res = await fetch(`${CONVEX_URL}/api/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: functionPath, args }),
  });
  const data = await res.json();
  if (data.status !== 'success') {
    console.error(`[convex] Query ${functionPath} failed:`, data.error?.message);
    return null;
  }
  return data.value;
}

async function convexMutation(functionPath: string, args: Record<string, unknown> = {}) {
  const res = await fetch(`${CONVEX_URL}/api/mutation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: functionPath, args }),
  });
  const data = await res.json();
  if (data.status !== 'success') {
    console.error(`[convex] Mutation ${functionPath} failed:`, data.error?.message);
    return null;
  }
  return data.value;
}

export async function getSiteContent(key: string): Promise<string | null> {
  const result = await convexQuery('siteContent:get', { key });
  return result ?? null;
}

export async function updateSiteContent(key: string, content: string): Promise<{ success: boolean }> {
  try {
    await convexMutation('siteContent:upsert', { key, content });
    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function getActiveAds(location: 'footer' | 'sidebar') {
  const data = await convexQuery('adBanners:getActive', { location });
  return { data: data ?? [], error: null };
}

export async function recordAdClick(adId: string) {
  await convexMutation('adBanners:recordClick', { adId });
}

export async function getReservations() {
  return await convexQuery('reservations:list', {}) ?? [];
}

export async function addReservation(data: {
  name: string; email: string; phone: string; eventId: string; eventTitle: string;
}) {
  return await convexMutation('reservations:add', data);
}

export async function deleteReservation(id: string) {
  return await convexMutation('reservations:remove', { id });
}
