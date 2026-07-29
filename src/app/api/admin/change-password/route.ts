import { NextRequest, NextResponse } from 'next/server';
import { convexClient } from '@/lib/convex';
import { api } from '@convex/_generated/api';

export async function POST(req: NextRequest) {
  try {
    const { username, oldPassword, newPassword } = await req.json();
    if (!username || !oldPassword || !newPassword) {
      return NextResponse.json({ success: false, error: 'Missing fields' }, { status: 400 });
    }
    await convexClient.mutation(api.admin.changePassword, { username, oldPassword, newPassword });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Change password error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to change password' }, { status: 400 });
  }
}
