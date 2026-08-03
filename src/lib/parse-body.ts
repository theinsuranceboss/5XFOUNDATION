import { NextRequest } from 'next/server';

/**
 * Parses a JSON request body, checking the `x-parsed-body` header first.
 * The middleware in src/middleware.ts consumes the raw body and passes it
 * through this header, so calling req.json() directly throws
 * "Unexpected end of JSON input" on deployed (Netlify) environments.
 */
export async function parseJsonBody(req: NextRequest): Promise<any> {
  const headerBody = req.headers.get('x-parsed-body');
  if (headerBody) {
    try {
      return JSON.parse(headerBody);
    } catch {
      // fall through to req.json()
    }
  }
  return await req.json();
}
