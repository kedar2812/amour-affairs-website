import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * The PHP API stores text HTML-encoded (htmlspecialchars with
 * ENT_QUOTES | ENT_HTML5, so apostrophes arrive as &apos;).
 * Decode once when data is loaded — otherwise text displays encoded
 * AND every edit-save cycle re-encodes it (& → &amp; → &amp;amp;).
 * &amp; is decoded last so e.g. &amp;quot; doesn't double-decode.
 */
export function decodeEntities(value: string | null | undefined): string {
  if (!value) return "";
  return String(value)
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}
