import { NextResponse } from 'next/server';
import { convexQuery } from '@/lib/convexClient';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, password } = body;
    const user = await convexQuery('admin:login', { username, password });
    return NextResponse.json({ success: true, user, body });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Server error', stack: error?.stack }, { status: 500 });
  }
}