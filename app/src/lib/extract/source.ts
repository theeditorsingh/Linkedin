export interface ExtractedSource {
  title: string;
  text: string;
  ogImageUrl: string | null;
  url: string;
}

function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

function getMeta(html: string, property: string): string | null {
  // Match <meta property="og:image" content="..."> in either attribute order
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]*content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${property}["']`, "i"),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return decodeEntities(m[1].trim());
  }
  return null;
}

function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      // Block-level tags → newline so paragraphs survive
      .replace(/<\/(p|div|section|article|h[1-6]|li|br)>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^\s+|\s+$/gm, "")
    .trim();
}

export async function extractFromUrl(url: string): Promise<ExtractedSource> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    throw new Error(`Couldn't fetch that URL (${res.status}). Try the "Paste Text" tab instead.`);
  }

  const html = await res.text();

  // Title: prefer og:title, fall back to <title>
  const title =
    getMeta(html, "og:title") ??
    decodeEntities(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? "");

  const ogImageUrl = getMeta(html, "og:image");

  // Try to isolate the main article body, else use the whole document
  const articleMatch =
    html.match(/<article[\s\S]*?<\/article>/i)?.[0] ??
    html.match(/<main[\s\S]*?<\/main>/i)?.[0] ??
    html;

  let text = htmlToText(articleMatch);

  // If the article container was suspiciously short, fall back to full page text
  if (text.length < 200) {
    text = htmlToText(html);
  }

  // Cap to keep Gemini prompt reasonable
  text = text.slice(0, 12000);

  if (!text || text.length < 50) {
    throw new Error('Couldn\'t extract readable text from that URL. Try the "Paste Text" tab instead.');
  }

  return { title, text, ogImageUrl, url };
}

export function extractFromText(text: string): ExtractedSource {
  return {
    title: text.slice(0, 80).replace(/\n/g, " ").trim(),
    text: text.trim(),
    ogImageUrl: null,
    url: "",
  };
}
