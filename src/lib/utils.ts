import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Transforms any raw Google Drive web page link or URL into a working direct/proxy image URL.
 */
export function getDisplayUrl(url: string | null | undefined): string {
  if (!url) return '';
  const str = url.trim();

  // If raw Google Drive file link is passed (e.g., https://drive.google.com/file/d/1CFjX.../view)
  if (str.includes('drive.google.com') || str.includes('googleusercontent.com')) {
    const match = str.match(/\/file\/d\/([a-zA-Z0-9_-]{19,80})/) 
               || str.match(/[?&]id=([a-zA-Z0-9_-]{19,80})/)
               || str.match(/\/d\/([a-zA-Z0-9_-]{19,80})/);
    if (match && match[1]) {
      return `/api/gdrive/image?id=${match[1]}`;
    }
  }
  return str;
}
