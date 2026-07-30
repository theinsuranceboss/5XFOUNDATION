import { NextRequest, NextResponse } from 'next/server';
import { convexQuery } from '@/lib/convexClient';

export const config = { runtime: 'nodejs' };

export async function POST(req: NextRequest) {
  try {
    // Read body from middleware header (workaround for Netlify body parsing issue)
    const bodyHeader = req.headers.get('x-parsed-body');
    let username, password;
    if (bodyHeader) {
      const body = JSON.parse(bodyHeader);
      username = body.username;
      password = body.password;
    } else {
      // Fallback to req.json()
      const body = await req.json();
      username = body.username;
      password = body.password;
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
