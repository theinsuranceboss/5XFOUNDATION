import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || 'https://secret-mongoose-212.convex.cloud';

async function convexQuery(functionPath: string, args: Record<string, unknown> = {}) {
  const res = await fetch(`${CONVEX_URL}/api/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: functionPath, args }),
  });
  const data = await res.json();
  if (data.status !== 'success') {
    throw new Error(`Convex query ${functionPath} failed: ${data.error?.message}`);
  }
  return data.value;
}

async function convexMutation(functionPath: string, args: Record<string, unknown> = {}) {
  const res = await fetch(`${CONVEX_URL}/api/mutation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: functionPath, args }),
  });
  const data = await res.json();
  if (data.status !== 'success') {
    throw new Error(`Convex mutation ${functionPath} failed: ${data.error?.message}`);
  }
  return data.value;
}

async function uploadToConvex(buffer: Buffer, contentType: string): Promise<string> {
  const uploadUrl = await convexMutation('files:generateUploadUrl');

  const uploadRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: { 'Content-Type': contentType },
    body: new Uint8Array(buffer),
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(`Convex storage upload failed: ${uploadRes.status} ${errText}`);
  }

  const { storageId } = await uploadRes.json();
  const publicUrl = await convexQuery('files:getFileUrl', { storageId });
  return publicUrl;
}

export const dynamic = 'force-dynamic';

function extractGDriveInfo(input: string): { fileId?: string; folderId?: string } {
  if (!input) return {};
  const str = input.trim();

  const folderMatch = str.match(/\/folders\/([a-zA-Z0-9_-]{19,80})/);
  if (folderMatch) return { folderId: folderMatch[1] };

  const fileDMatch = str.match(/\/file\/d\/([a-zA-Z0-9_-]{19,80})/);
  if (fileDMatch) return { fileId: fileDMatch[1] };

  const idParamMatch = str.match(/[?&]id=([a-zA-Z0-9_-]{19,80})/);
  if (idParamMatch) return { fileId: idParamMatch[1] };

  const gUserContentMatch = str.match(/\/d\/([a-zA-Z0-9_-]{19,80})/);
  if (gUserContentMatch) return { fileId: gUserContentMatch[1] };

  if (/^[a-zA-Z0-9_-]{25,80}$/.test(str)) return { fileId: str };

  return {};
}

async function optimizeImage(buffer: Buffer): Promise<Buffer> {
  try {
    return await sharp(buffer)
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
  } catch (e) {
    console.warn('[upload/route.ts] Sharp optimization warning, returning original buffer:', e);
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
      const info = extractGDriveInfo(gdriveUrl);

      if (info.folderId) {
        const folderUrl = `https://drive.google.com/embeddedfolderview?id=${info.folderId}`;
        try {
          const res = await fetch(folderUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
          });
          if (res.ok) {
            const html = await res.text();
            const matches = Array.from(html.matchAll(/id="entry-([a-zA-Z0-9_-]{19,80})"/g)).map(m => m[1]);
            const uniqueIds = Array.from(new Set(matches));
            if (uniqueIds.length > 0) {
              const images = uniqueIds.map(id => `/api/gdrive/image?id=${id}&v=3`);
              return NextResponse.json({ success: true, images });
            }
          }
        } catch (e) {}
        return NextResponse.json({ success: true, url: `/api/gdrive/image?id=${info.folderId}` });
      }

      if (info.fileId) {
        const directGUrl = `https://lh3.googleusercontent.com/d/${info.fileId}=w1600`;

        try {
          const gRes = await fetch(directGUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
          });
          if (gRes.ok) {
            const rawBuf = Buffer.from(await gRes.arrayBuffer());
            const optBuf = await optimizeImage(rawBuf);
            const base64Str = optBuf.toString('base64');
            const dataUri = `data:image/webp;base64,${base64Str}`;
            return NextResponse.json({ success: true, url: dataUri });
          }
        } catch (e) {
          console.warn('[upload] Could not fetch GDrive image:', e);
        }

        const proxyUrl = `/api/gdrive/image?id=${info.fileId}`;
        return NextResponse.json({ success: true, url: proxyUrl });
      }

      return NextResponse.json({ success: true, url: gdriveUrl });
    }

    if (file) {
      const bytes = await file.arrayBuffer();
      const rawBuffer = Buffer.from(bytes);
      const optBuffer = await optimizeImage(rawBuffer);

      const url = await uploadToConvex(optBuffer, file.type || 'image/webp');

      return NextResponse.json({
        success: true,
        url
      });
    }

    return NextResponse.json({ error: 'No file or URL provided' }, { status: 400 });
  } catch (error: any) {
    console.error('[upload/route.ts] Unexpected failure:', error);
    return NextResponse.json({ error: 'Upload failed: ' + (error?.message || 'Server error') }, { status: 500 });
  }
}
