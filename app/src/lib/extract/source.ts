import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";

export interface ExtractedSource {
  title: string;
  text: string;
  ogImageUrl: string | null;
  url: string;
}

export async function extractFromUrl(url: string): Promise<ExtractedSource> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) throw new Error(`Failed to fetch URL (${res.status}). Try pasting the article text instead.`);

  const html = await res.text();

  let title = "";
  let text = "";
  let ogImage: string | null = null;

  try {
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    title = article?.title ?? "";
    text = article?.textContent?.trim() ?? "";

    ogImage =
      dom.window.document
        .querySelector('meta[property="og:image"]')
        ?.getAttribute("content") ?? null;
  } catch {
    // jsdom failed — strip tags manually as fallback
    title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? "";
    text = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 8000);
  }

  if (!text) throw new Error("Could not extract text from URL. Try pasting the article text instead.");

  return { title, text, ogImageUrl: ogImage, url };
}

export function extractFromText(text: string): ExtractedSource {
  return {
    title: text.slice(0, 80).replace(/\n/g, " ").trim(),
    text: text.trim(),
    ogImageUrl: null,
    url: "",
  };
}
