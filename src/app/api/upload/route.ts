import { NextRequest, NextResponse } from 'next/server';
import { convexQuery, convexMutation } from '@/lib/convex';
import sharp from 'sharp';

export const dynamic = 'force-dynamic';

async function optimizeImage(buffer: Buffer): Promise<Buffer> {
  try {
    return await sharp(buffer)
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
  } catch (e) {
    console.warn('[upload] Sharp optimization warning, returning original buffer:', e);
    return buffer;
  }
}

export async function POST(req: NextRequest) {
  try {
    const contentTypeHeader = req.headers.get('content-type') || '';
    let file: File | null = null;
    let name: string | null = null;
    let gdriveUrl: string | null = null;

    if (contentTypeHeader.includes('application/json')) {
      const body = await req.json();
      gdriveUrl = body.gdriveUrl || body.url || null;
      name = body.name || null;
    } else {
      const formData = await req.formData();
      file = formData.get('file') as File | null;
      name = formData.get('name') as string | null;
      gdriveUrl = formData.get('gdriveUrl') as string | null;
    }

    if (gdriveUrl) {
      return NextResponse.json({ success: true, url: gdriveUrl });
    }

    if (file) {
      const bytes = await file.arrayBuffer();
      const rawBuffer = Buffer.from(bytes);
      const optBuffer = await optimizeImage(rawBuffer);

      const uploadUrl = await convexMutation('upload:generateUploadUrl');
      const formData = new FormData();
      formData.append("file", new Blob([new Uint8Array(optBuffer)], { type: "image/webp" }));

      const uploadRes = await fetch(uploadUrl, { method: "POST", body: formData });
      const uploadResult = await uploadRes.json();

      if (uploadResult.storageId) {
        const { url } = await convexMutation('upload:storeFile', {
          storageId: uploadResult.storageId,
          name: name || file.name,
        });
        if (url) {
          return NextResponse.json({ success: true, url });
        }
      }

      const base64Str = optBuffer.toString('base64');
      return NextResponse.json({
        success: true,
        url: `data:image/webp;base64,${base64Str}`,
      });
    }

    return NextResponse.json({ error: 'No file or URL provided' }, { status: 400 });
  } catch (error: any) {
    console.error('[upload/route.ts] Unexpected failure:', error);
    return NextResponse.json({ error: 'Upload failed: ' + (error?.message || 'Server error') }, { status: 500 });
  }
}
