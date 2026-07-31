import { NextRequest, NextResponse } from 'next/server';
import { convexQuery } from '@/lib/convexClient';

export const config = { runtime: 'nodejs' };

export async function POST(req: NextRequest) {
  try {
    // Try multiple ways to get credentials (Netlify body parsing workaround)
    let username, password;

    // 1. Try query parameters (works on Netlify)
    const url = new URL(req.url);
    username = url.searchParams.get('username');
    password = url.searchParams.get('password');

    // 2. Try middleware header (body parsed by middleware)
    if (!username || !password) {
      const bodyHeader = req.headers.get('x-parsed-body');
      if (bodyHeader) {
        const body = JSON.parse(bodyHeader);
        username = body.username;
        password = body.password;
      }
    }

    // 3. Fallback to req.json()
    if (!username || !password) {
      try {
        const body = await req.json();
        username = body.username;
        password = body.password;
      } catch (e) {
        // Ignore JSON parse errors
      }
    }

    if (!username || !password) {
      return NextResponse.json({ success: false, error: 'Missing credentials' }, { status: 400 });
    }
    const user = await convexQuery('admin:login', { username, password });
    if (!user) {
      return NextResponse.json({ success: false, error: 'Invalid credentials' });
    }
    return NextResponse.json({ success: true, user });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Server error' }, { status: 500 });
  }
}
