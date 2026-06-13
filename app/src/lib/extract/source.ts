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
    headers: { "User-Agent": "Mozilla/5.0 (compatible; LinkedInAutopilot/1.0)" },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) throw new Error(`Failed to fetch URL: ${res.status}`);

  const html = await res.text();
  const dom = new JSDOM(html, { url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  if (!article) throw new Error("Could not extract article content from URL");

  const ogImage =
    dom.window.document
      .querySelector('meta[property="og:image"]')
      ?.getAttribute("content") ?? null;

  return {
    title: article.title ?? "",
    text: article.textContent?.trim() ?? "",
    ogImageUrl: ogImage,
    url,
  };
}

export function extractFromText(text: string): ExtractedSource {
  return {
    title: text.slice(0, 80).replace(/\n/g, " ").trim(),
    text: text.trim(),
    ogImageUrl: null,
    url: "",
  };
}
