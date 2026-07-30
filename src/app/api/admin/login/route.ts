import { NextRequest, NextResponse } from 'next/server';
import { convexQuery } from '@/lib/convexClient';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    if (!username || !password) {
      return NextResponse.json({ success: false, error: 'Missing credentials' }, { status: 400 });
    }
    const user = await convexQuery('admin:login', { username, password });
    if (!user) {
      return NextResponse.json({ success: false, error: 'Invalid credentials' });
    }
    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
