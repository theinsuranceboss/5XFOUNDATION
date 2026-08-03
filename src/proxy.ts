import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  // Parse body for POST/PUT/PATCH requests to API routes
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    const contentType = request.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      try {
        const body = await request.json();
        if (body) {
          const newHeaders = new Headers(request.headers);
          newHeaders.set('x-parsed-body', JSON.stringify(body));
          return NextResponse.next({
            request: {
              headers: newHeaders,
            },
          });
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
