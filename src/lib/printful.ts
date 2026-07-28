export const PRINTFUL_API_URL = 'https://api.printful.com';

const getHeaders = () => {
  const token = process.env.PRINTFUL_API_TOKEN;
  const storeId = process.env.PRINTFUL_STORE_ID;
  if (!token) throw new Error('Missing PRINTFUL_API_TOKEN');
  return {
    'Authorization': `Bearer ${token}`,
    'X-PF-Store-Id': storeId || '',
    'Content-Type': 'application/json'
  };
};

export async function fetchSyncProducts() {
  // Printful's GET /sync/products paginates via ?limit= (max 100) and ?offset=.
  // Loop through every page so the entire store is synced, not just the first page.
  const limit = 100;
  let offset = 0;
  const all: any[] = [];
  let page: any[] = [];
  do {
    const res = await fetch(`${PRINTFUL_API_URL}/sync/products?limit=${limit}&offset=${offset}`, {
      headers: getHeaders(),
      cache: 'no-store'
    });
    if (!res.ok) throw new Error(`Printful API Error: ${res.statusText}`);
    const data = await res.json();
    // The endpoint returns an array of sync products (or { items: [...] } in some responses).
    page = Array.isArray(data.result) ? data.result : (data.result?.items ?? []);
    all.push(...page);
    offset += limit;
  } while (page.length === limit); // a full page means there may be more
  return all;
}

export async function fetchProductDetails(id: number) {
  const res = await fetch(`${PRINTFUL_API_URL}/sync/products/${id}`, {
    headers: getHeaders(),
    cache: 'no-store'
  });
  if (!res.ok) throw new Error(`Printful API Error: ${res.statusText}`);
  const data = await res.json();
  return data.result;
}

export async function createPrintfulOrder(orderData: any) {
  // Foundation for future fulfillment
  const res = await fetch(`${PRINTFUL_API_URL}/orders`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(orderData)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Failed to create Printful order: ${err.error?.message || res.statusText}`);
  }
  const data = await res.json();
  return data.result;
}
