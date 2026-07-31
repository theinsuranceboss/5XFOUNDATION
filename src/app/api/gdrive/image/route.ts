import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new Response("Missing image id", { status: 400 });
  }

  const candidateUrls = [
    `https://lh3.googleusercontent.com/d/${id}=w1600`,
    `https://lh3.googleusercontent.com/d/${id}=s0`,
    `https://drive.google.com/uc?export=view&id=${id}`,
  ];

  for (const googleUrl of candidateUrls) {
    try {
      const res = await fetch(googleUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        },
        cache: 'no-store',
        redirect: 'follow',
      });

      if (res.ok) {
        const contentType = res.headers.get("content-type") || "image/png";

        if (!contentType.includes("text/html")) {
          const buffer = await res.arrayBuffer();

          if (buffer.byteLength > 500) {
            return new Response(buffer, {
              headers: {
                "Content-Type": contentType,
                "Cache-Control": "public, max-age=31536000, immutable",
                "Access-Control-Allow-Origin": "*",
              },
            });
          }
        }
      }
    } catch (err: any) {
      console.warn(`[GDrive Image Proxy] Error fetching ${googleUrl}:`, err?.message || err);
    }
  }

  return new Response("Failed to fetch image from Google Drive.", { status: 404 });
}
