import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    let amount = url.searchParams.get('amount');
    let frequency = url.searchParams.get('frequency');

    if (!amount) {
      const bodyHeader = req.headers.get('x-parsed-body');
      if (bodyHeader) {
        try {
          const parsed = JSON.parse(bodyHeader);
          amount = parsed.amount;
          frequency = parsed.frequency;
        } catch (e) {}
      }
    }

    if (!amount) {
      try {
        const parsed = await req.json();
        amount = parsed.amount;
        frequency = parsed.frequency;
      } catch (e) {}
    }

    if (!amount || isNaN(parseFloat(amount))) {
      return NextResponse.json({ error: 'Valid amount is required' }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const secretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder';

    // Build Form Data for Stripe REST API
    const formParams = new URLSearchParams();
    formParams.append('payment_method_types[0]', 'card');
    formParams.append('mode', 'payment'); // For simplicity, we use payment mode. If monthly is needed, we need billing mode and price IDs, but we can just do one-time or ignore frequency for now if they don't have recurring setup.
    formParams.append('success_url', `${appUrl}/success?donation=true`);
    formParams.append('cancel_url', `${appUrl}/donate`);

    formParams.append(`line_items[0][price_data][currency]`, 'usd');
    formParams.append(`line_items[0][price_data][product_data][name]`, `${frequency === 'monthly' ? 'Monthly ' : ''}Donation to Five Time Foundation`);
    formParams.append(`line_items[0][price_data][unit_amount]`, Math.round(parseFloat(amount) * 100).toString());
    formParams.append(`line_items[0][quantity]`, '1');

    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formParams.toString()
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error?.message || 'Failed to create session');
    }

    return NextResponse.json({ url: data.url });
  } catch (error: any) {
    console.error('Stripe donate error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
