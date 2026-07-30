import { NextResponse } from 'next/server';

export const config = { runtime: 'nodejs' };

export async function POST(req: Request) {
  try {
    const text = await req.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch (e) {
      return NextResponse.json({ success: false, error: 'JSON parse failed', rawText: text.slice(0, 200) }, { status: 500 });
    }
    return NextResponse.json({ success: true, body, rawText: text });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message, stack: error.stack }, { status: 500 });
  }
}