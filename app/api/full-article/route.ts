import type { NextRequest } from "next/server";

// Patterns that mark junk content in news article pages
const JUNK_PATTERNS = [
  /^(subscribe|sign up|log in|create account|newsletter|advertisement|sponsored|related articles?|read more|share this|follow us)/i,
  /^(cookies?|privacy policy|terms of (service|use)|all rights reserved)/i,
  /^[\s\W]*$/, // empty or punctuation-only
];

function isJunkLine(text: string): boolean {
  const t = text.trim();
  if (t.length < 30) return true; // too short to be article prose
  return JUNK_PATTERNS.some((re) => re.test(t));
}

/**
 * Strips HTML tags and decodes the most common HTML entities.
 */
function stripHtml(raw: string): string {
  return raw
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?(p|div|li|h[1-6]|blockquote|section|article)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&hellip;/g, "…")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .trim();
}

/**
 * Removes script, style, nav, header, footer, aside, form, figure (captions),
 * and ad-related elements from raw HTML before we extract text.
 */
function removeNoise(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<aside[\s\S]*?<\/aside>/gi, "")
    .replace(/<form[\s\S]*?<\/form>/gi, "")
    .replace(/<figure[\s\S]*?<\/figure>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");
}

/**
 * Tries to find the largest block of paragraph text that resembles article
 * prose. Returns a joined string of cleaned paragraphs.
 */
function extractArticleText(html: string): string {
  const clean = removeNoise(html);

  // Collect all <p> tag contents
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  const candidates: string[] = [];
  let m: RegExpExecArray | null;

  while ((m = pRegex.exec(clean)) !== null) {
    const text = stripHtml(m[1]).replace(/\s+/g, " ").trim();
    if (!isJunkLine(text)) {
      candidates.push(text);
    }
  }

  if (candidates.length >= 3) {
    return candidates.join("\n\n");
  }

  // Fallback: look for any div with dense text (likely article containers)
  const divRegex = /<div[^>]*>([\s\S]*?)<\/div>/gi;
  const divCandidates: { text: string; words: number }[] = [];

  while ((m = divRegex.exec(clean)) !== null) {
    const text = stripHtml(m[1]).replace(/\s+/g, " ").trim();
    const words = text.split(/\s+/).length;
    if (words > 80 && !isJunkLine(text)) {
      divCandidates.push({ text, words });
    }
  }

  if (divCandidates.length > 0) {
    // Pick the richest div
    divCandidates.sort((a, b) => b.words - a.words);
    return divCandidates[0].text;
  }

  return candidates.join("\n\n");
}

/** Validate that a URL is safe to proxy (public HTTP/HTTPS only). */
function isSafeUrl(url: URL): boolean {
  if (!["http:", "https:"].includes(url.protocol)) return false;
  const h = url.hostname.toLowerCase();
  // Block localhost and RFC-1918 ranges
  if (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h === "0.0.0.0" ||
    h === "[::1]" ||
    /^10\./.test(h) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(h) ||
    /^192\.168\./.test(h) ||
    /^169\.254\./.test(h)
  ) {
    return false;
  }
  return true;
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("url");
  if (!raw) {
    return Response.json({ error: "Missing url param" }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return Response.json({ error: "Invalid URL" }, { status: 400 });
  }

  if (!isSafeUrl(target)) {
    return Response.json({ error: "Forbidden URL" }, { status: 403 });
  }

  try {
    const res = await fetch(target.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Pretextski/1.0; +https://pretextski.vercel.app)",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(9000),
      // Do not follow redirects to internal network
      redirect: "follow",
    });

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      return Response.json({ error: "Not an HTML page" }, { status: 422 });
    }

    const html = await res.text();
    const text = extractArticleText(html);

    if (!text || text.length < 100) {
      return Response.json({ error: "Could not extract article text" }, { status: 422 });
    }

    return Response.json({ text });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Fetch failed";
    return Response.json({ error: msg }, { status: 502 });
  }
}
