import { NextRequest, NextResponse } from 'next/server';
import { convexQuery, convexMutation } from '@/lib/convexClient';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const configs = await convexQuery('paymentConfigs:list');
    return NextResponse.json(configs);
  } catch (error) {
    console.error('Error fetching payment configs:', error);
    return NextResponse.json({ error: 'Failed to fetch payment configs' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { provider, apiKey, link, isActive } = body;
    if (!provider) {
      return NextResponse.json({ error: 'Provider is required' }, { status: 400 });
    }
    const config = await convexMutation('paymentConfigs:upsert', {
      provider,
      apiKey: apiKey || undefined,
      link: link || undefined,
      isActive: isActive ?? false,
    });
    return NextResponse.json(config);
  } catch (error) {
    console.error('Error updating payment config:', error);
    return NextResponse.json({ error: 'Failed to update payment config' }, { status: 500 });
  }
}
