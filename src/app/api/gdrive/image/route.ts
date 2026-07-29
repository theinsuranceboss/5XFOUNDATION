import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new Response("Missing image id", { status: 400 });
  }

  // Candidate Google Drive image fetch URLs
  const candidateUrls = [
    `https://lh3.googleusercontent.com/d/${id}=w1600`,
    `https://drive.google.com/thumbnail?id=${id}&sz=w1600`,
    `https://drive.google.com/uc?export=view&id=${id}`,
    `https://drive.google.com/uc?export=download&id=${id}`
  ];

  for (const googleUrl of candidateUrls) {
    try {
      console.log(`[GDrive Image Proxy] Trying Google Drive fetch for ID ${id}: ${googleUrl}`);

      const res = await fetch(googleUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        },
        cache: 'no-store'
      });

      if (res.ok) {
        const contentType = res.headers.get("content-type") || "image/png";

        // Ignore HTML login pages returned by Google Drive when restricted
        if (!contentType.includes("text/html")) {
          const buffer = await res.arrayBuffer();

          if (buffer.byteLength > 500) {
            console.log(`[GDrive Image Proxy] Successfully fetched ${buffer.byteLength} bytes for ID ${id}`);
            return new Response(buffer, {
              headers: {
                "Content-Type": contentType,
                "Cache-Control": "public, max-age=31536000, immutable",
                "Access-Control-Allow-Origin": "*",
              },
            });
          }
        } else {
          console.warn(`[GDrive Image Proxy] URL ${googleUrl} returned HTML (access restricted). Trying fallback...`);
        }
      }
    } catch (err: any) {
      console.warn(`[GDrive Image Proxy] Error fetching ${googleUrl}:`, err?.message || err);
    }
  }

  console.error(`[GDrive Image Proxy] All candidate URLs failed for Google Drive ID ${id}. File may be private or restricted.`);
  return new Response("Failed to fetch image from Google Drive. Please ensure sharing is set to 'Anyone with the link can view'.", { status: 404 });
}
