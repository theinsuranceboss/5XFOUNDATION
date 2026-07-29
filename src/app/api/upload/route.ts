import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import sharp from 'sharp';

export const dynamic = 'force-dynamic';

// Helper to extract Google Drive file or folder ID
function extractGDriveInfo(input: string): { fileId?: string; folderId?: string } {
  if (!input) return {};
  const str = input.trim();

  // Folder URL pattern
  const folderMatch = str.match(/\/folders\/([a-zA-Z0-9_-]{19,80})/);
  if (folderMatch) return { folderId: folderMatch[1] };

  // File /file/d/ID pattern
  const fileDMatch = str.match(/\/file\/d\/([a-zA-Z0-9_-]{19,80})/);
  if (fileDMatch) return { fileId: fileDMatch[1] };

  // id=ID parameter pattern
  const idParamMatch = str.match(/[?&]id=([a-zA-Z0-9_-]{19,80})/);
  if (idParamMatch) return { fileId: idParamMatch[1] };

  // googleusercontent /d/ID pattern
  const gUserContentMatch = str.match(/\/d\/([a-zA-Z0-9_-]{19,80})/);
  if (gUserContentMatch) return { fileId: gUserContentMatch[1] };

  // Raw ID if 25+ chars
  if (/^[a-zA-Z0-9_-]{25,80}$/.test(str)) return { fileId: str };

  return {};
}

// Helper to optimize image buffer with sharp
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

// Helper to upload buffer to Supabase Storage bucket '5x_assets'
async function uploadToSupabaseStorage(fileName: string, buffer: Buffer, contentType: string = 'image/webp'): Promise<string | null> {
  try {
    const { data, error: uploadError } = await supabase.storage
      .from('5x_assets')
      .upload(fileName, buffer, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      console.warn('[upload/route.ts] Supabase upload failed, creating bucket 5x_assets:', uploadError.message);
      await supabase.storage.createBucket('5x_assets', { public: true });
      
      const { error: retryError } = await supabase.storage
        .from('5x_assets')
        .upload(fileName, buffer, {
          contentType,
          upsert: true,
        });

      if (retryError) {
        console.warn('[upload/route.ts] Retry upload failed:', retryError.message);
        return null;
      }
    }

    const { data: { publicUrl } } = supabase.storage
      .from('5x_assets')
      .getPublicUrl(fileName);

    if (publicUrl && !publicUrl.includes('placeholder')) {
      return publicUrl;
    }
    return null;
  } catch (err: any) {
    console.warn('[upload/route.ts] Supabase Storage exception:', err?.message || err);
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
      const body = await req.json();
      gdriveUrl = body.gdriveUrl || body.url || null;
      name = body.name || null;
    } else {
      const formData = await req.formData();
      file = formData.get('file') as File | null;
      name = formData.get('name') as string | null;
      gdriveUrl = formData.get('gdriveUrl') as string | null;
    }

    // 1. Handle Google Drive Link or URL
    if (gdriveUrl) {
      const info = extractGDriveInfo(gdriveUrl);

      if (info.folderId) {
        // Scrape folder or return API folder route
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
        const fileName = `gdrive-${info.fileId}-${Date.now()}.webp`;

        // Try downloading image bytes to save to Supabase Storage
        try {
          const gRes = await fetch(directGUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
          });
          if (gRes.ok) {
            const rawBuf = Buffer.from(await gRes.arrayBuffer());
            const optBuf = await optimizeImage(rawBuf);

            const supabaseUrl = await uploadToSupabaseStorage(fileName, optBuf, 'image/webp');
            if (supabaseUrl) {
              console.log('[upload] GDrive image uploaded to Supabase Storage:', supabaseUrl);
              return NextResponse.json({ success: true, url: supabaseUrl });
            }
          }
        } catch (e) {
          console.warn('[upload] Could not fetch GDrive image for Supabase upload, returning proxy link:', e);
        }

        // Fallback to proxy route
        const proxyUrl = `/api/gdrive/image?id=${info.fileId}`;
        return NextResponse.json({ success: true, url: proxyUrl });
      }

      // Standard HTTP URL (non-Google Drive)
      return NextResponse.json({ success: true, url: gdriveUrl });
    }

    // 2. Handle File Upload
    if (file) {
      const bytes = await file.arrayBuffer();
      const rawBuffer = Buffer.from(bytes);

      // Optimize image using Sharp
      const optBuffer = await optimizeImage(rawBuffer);

      const baseName = name || file.name || 'image.webp';
      const sanitizedName = baseName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_.-]/g, '');
      const uniqueFileName = `${Date.now()}-${sanitizedName.endsWith('.webp') ? sanitizedName : sanitizedName + '.webp'}`;

      // A) Attempt Supabase Storage Upload
      const publicSupabaseUrl = await uploadToSupabaseStorage(uniqueFileName, optBuffer, 'image/webp');
      if (publicSupabaseUrl) {
        console.log('[upload] File successfully uploaded to Supabase Storage:', publicSupabaseUrl);
        return NextResponse.json({ success: true, url: publicSupabaseUrl });
      }

      // B) Serverless Resilient Fallback: Convert to Base64 Data URI
      // This ensures 100% success on Netlify even when Supabase is unreachable/offline!
      console.log('[upload] Supabase Storage unavailable. Using WebP Base64 Data URI fallback.');
      const base64Str = optBuffer.toString('base64');
      const dataUri = `data:image/webp;base64,${base64Str}`;

      return NextResponse.json({
        success: true,
        url: dataUri
      });
    }

    return NextResponse.json({ error: 'No file or URL provided' }, { status: 400 });
  } catch (error: any) {
    console.error('[upload/route.ts] Unexpected failure:', error);
    return NextResponse.json({ error: 'Upload failed: ' + (error?.message || 'Server error') }, { status: 500 });
  }
}
