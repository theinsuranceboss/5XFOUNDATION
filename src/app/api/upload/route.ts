import { NextRequest, NextResponse } from 'next/server';
import { convexQuery, convexMutation } from '@/lib/convexClient';
import { parseJsonBody } from '@/lib/parse-body';
import sharp from 'sharp';

export const dynamic = 'force-dynamic';

function extractGDriveFileId(input: string): string | undefined {
  if (!input) return undefined;
  const str = input.trim();

  const fileDMatch = str.match(/\/file\/d\/([a-zA-Z0-9_-]{19,80})/);
  if (fileDMatch) return fileDMatch[1];

  const idParamMatch = str.match(/[?&]id=([a-zA-Z0-9_-]{19,80})/);
  if (idParamMatch) return idParamMatch[1];

  const gUserContentMatch = str.match(/\/d\/([a-zA-Z0-9_-]{19,80})/);
  if (gUserContentMatch) return gUserContentMatch[1];

  if (/^[a-zA-Z0-9_-]{25,80}$/.test(str)) return str;

  return undefined;
}

function extractGDriveFolderId(input: string): string | undefined {
  if (!input) return undefined;
  const str = input.trim();
  const folderMatch = str.match(/\/folders\/([a-zA-Z0-9_-]{19,80})/);
  if (folderMatch) return folderMatch[1];
  return undefined;
}

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

async function uploadBufferToConvexStorage(optBuffer: Buffer, fileName: string): Promise<string | null> {
  try {
    const uploadUrl = await convexMutation('upload:generateUploadUrl');
    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'image/webp' },
      body: new Uint8Array(optBuffer),
    });
    const uploadResult = await uploadRes.json();

    if (uploadResult.storageId) {
      const { url } = await convexMutation('upload:storeFile', {
        storageId: uploadResult.storageId,
        name: fileName,
      });
      if (url) {
        console.log('[upload] Image uploaded to Convex Storage:', url);
        return url;
      }
    }

    return null;
  } catch (e: any) {
    console.warn('[upload] Convex storage upload failed:', e?.message || e);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const contentTypeHeader = req.headers.get('content-type') || '';

    let file: File | null = null;
    let name: string | null = null;
    let gdriveUrl: string | null = null;

    if (contentTypeHeader.includes('application/json')) {
      const body = await parseJsonBody(req);
      gdriveUrl = body.gdriveUrl || body.url || null;
      name = body.name || null;
    } else {
      const formData = await req.formData();
      file = formData.get('file') as File | null;
      name = formData.get('name') as string | null;
      gdriveUrl = formData.get('gdriveUrl') as string | null;
    }

    // 1. Handle Google Drive Link
    if (gdriveUrl) {
      const folderId = extractGDriveFolderId(gdriveUrl);
      if (folderId) {
        const folderViewUrl = `https://drive.google.com/embeddedfolderview?id=${folderId}`;
        try {
          const res = await fetch(folderViewUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
          });
          if (res.ok) {
            const html = await res.text();
            const matches = Array.from(html.matchAll(/id="entry-([a-zA-Z0-9_-]{19,80})"/g)).map(m => m[1]);
            const uniqueIds = Array.from(new Set(matches));
            if (uniqueIds.length > 0) {
              const convexImages: string[] = [];
              for (const id of uniqueIds) {
                const directGUrl = `https://lh3.googleusercontent.com/d/${id}=w1600`;
                try {
                  const gRes = await fetch(directGUrl, {
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
                  });
                  if (gRes.ok) {
                    const rawBuf = Buffer.from(await gRes.arrayBuffer());
                    const optBuf = await optimizeImage(rawBuf);
                    const convexUrl = await uploadBufferToConvexStorage(optBuf, `gdrive-${id}-${Date.now()}.webp`);
                    if (convexUrl) {
                      convexImages.push(convexUrl);
                      continue;
                    }
                  }
                } catch (e) {
                  console.warn(`[upload] Could not upload folder image ${id} to Convex:`, e);
                }
                convexImages.push(`/api/gdrive/image?id=${id}&v=3`);
              }
              return NextResponse.json({ success: true, images: convexImages });
            }
          }
        } catch (e) {}
        return NextResponse.json({ success: true, url: `/api/gdrive/image?id=${folderId}` });
      }

      const fileId = extractGDriveFileId(gdriveUrl);
      if (fileId) {
        const directGUrl = `https://lh3.googleusercontent.com/d/${fileId}=w1600`;
        const fileName = `gdrive-${fileId}-${Date.now()}.webp`;

        try {
          const gRes = await fetch(directGUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
          });
          if (gRes.ok) {
            const rawBuf = Buffer.from(await gRes.arrayBuffer());
            const optBuf = await optimizeImage(rawBuf);
            const convexUrl = await uploadBufferToConvexStorage(optBuf, fileName);
            if (convexUrl) {
              return NextResponse.json({ success: true, url: convexUrl });
            }
          }
        } catch (e) {
          console.warn('[upload] Could not fetch GDrive image for Convex upload, returning proxy link:', e);
        }

        const proxyUrl = `/api/gdrive/image?id=${fileId}`;
        return NextResponse.json({ success: true, url: proxyUrl });
      }

      return NextResponse.json({ success: true, url: gdriveUrl });
    }

    // 2. Handle File Upload
    if (file) {
      const bytes = await file.arrayBuffer();
      const rawBuffer = Buffer.from(bytes);
      const optBuffer = await optimizeImage(rawBuffer);

      const baseName = name || file.name || 'image.webp';
      const sanitizedName = baseName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_.-]/g, '');
      const uniqueFileName = `${Date.now()}-${sanitizedName.endsWith('.webp') ? sanitizedName : sanitizedName + '.webp'}`;

      const convexUrl = await uploadBufferToConvexStorage(optBuffer, uniqueFileName);
      if (convexUrl) {
        console.log('[upload] File successfully uploaded to Convex Storage:', convexUrl);
        return NextResponse.json({ success: true, url: convexUrl });
      }

      // B) Serverless Resilient Fallback: Convert to Base64 Data URI
      console.log('[upload] Convex Storage unavailable. Using WebP Base64 Data URI fallback.');
      const base64Str = optBuffer.toString('base64');
      const dataUri = `data:image/webp;base64,${base64Str}`;

      return NextResponse.json({
        success: true,
        url: dataUri,
      });
    }

    return NextResponse.json({ error: 'No file or URL provided' }, { status: 400 });
  } catch (error: any) {
    console.error('[upload/route.ts] Unexpected failure:', error);
    return NextResponse.json({ error: 'Upload failed: ' + (error?.message || 'Server error') }, { status: 500 });
  }
}
