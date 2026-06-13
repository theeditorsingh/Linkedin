// Post generation via Groq (free, OpenAI-compatible API). No SDK — plain fetch keeps
// the serverless bundle small and avoids ESM-interop crashes (see jsdom lesson).
import { cleanKey } from "@/lib/env";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

export type PostFormat = "text" | "single_image" | "multi_image" | "carousel";

export interface GeneratedPost {
  body: string;
  firstComment: string;
  hashtags: string[];
  format: PostFormat;
  formatReason: string;
  imagePrompt: string; // used when format = single_image
  slidePrompts: string[]; // used when format = multi_image | carousel (one prompt per image/slide)
}

async function callGroq(prompt: string): Promise<string> {
  const apiKey = cleanKey(process.env.GROQ_API_KEY ?? "");
  if (!apiKey) throw new Error("GROQ_API_KEY is not set");

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq API error (${res.status}): ${errText.slice(0, 300)}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("Groq returned an empty response");
  return String(content).trim();
}

export async function generatePost(
  sourceText: string,
  sourceTitle: string,
  styleGuide: string,
  examplePosts: string[]
): Promise<GeneratedPost> {
  const examples = examplePosts.slice(0, 5).join("\n\n---\n\n");

  const prompt = `You are a LinkedIn content strategist & writer. Write a post in the exact style of the examples, AND recommend the best media format for it.

## Owner's Style Guide
${styleGuide}

## Example Posts by Owner
${examples}

---

## Source to Repurpose
Title: ${sourceTitle}
Content: ${sourceText.slice(0, 3000)}

---

First write the post. Then decide the best format for maximum engagement:
- "text": a strong text-only post (best for personal stories, hot takes, short insights).
- "single_image": one striking visual (best when a single concept/metaphor carries it).
- "multi_image": 2-4 separate images (best for comparisons, before/after, multiple examples).
- "carousel": a swipeable PDF deck of 4-8 slides (best for step-by-step guides, frameworks, listicles, data breakdowns).

Pick the format that genuinely fits THIS content — don't default to one.

Respond with ONLY valid JSON in this exact format:
{
  "body": "the full post text (max 3000 chars, use real line breaks)",
  "firstComment": "a comment to post after publishing, containing the source link placeholder [SOURCE_URL]",
  "hashtags": ["hashtag1", "hashtag2", "hashtag3"],
  "format": "text | single_image | multi_image | carousel",
  "formatReason": "one short sentence on why this format fits this post",
  "imagePrompt": "if single_image: a detailed ChatGPT image prompt (professional LinkedIn aesthetic, no text overlay). Otherwise empty string.",
  "slidePrompts": ["if multi_image or carousel: one detailed prompt per image/slide describing the visual AND any short on-image heading. 4-8 items for carousel, 2-4 for multi_image. Otherwise empty array."]
}`;

  const text = await callGroq(prompt);
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("LLM returned invalid JSON");
  const parsed = JSON.parse(jsonMatch[0]) as Partial<GeneratedPost>;

  const allowed: PostFormat[] = ["text", "single_image", "multi_image", "carousel"];
  const format = allowed.includes(parsed.format as PostFormat)
    ? (parsed.format as PostFormat)
    : "single_image";

  return {
    body: parsed.body ?? "",
    firstComment: parsed.firstComment ?? "",
    hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : [],
    format,
    formatReason: parsed.formatReason ?? "",
    imagePrompt: parsed.imagePrompt ?? "",
    slidePrompts: Array.isArray(parsed.slidePrompts) ? parsed.slidePrompts.filter(Boolean) : [],
  };
}

export async function regeneratePost(
  currentBody: string,
  instruction: string,
  styleGuide: string
): Promise<Pick<GeneratedPost, "body" | "imagePrompt">> {
  const prompt = `You are a LinkedIn content writer. Rewrite the post below following this instruction: "${instruction}"

Style guide: ${styleGuide}

Current post:
${currentBody}

Respond with ONLY valid JSON:
{
  "body": "the rewritten post text",
  "imagePrompt": "updated image prompt for ChatGPT image model"
}`;

  const text = await callGroq(prompt);
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("LLM returned invalid JSON");
  return JSON.parse(jsonMatch[0]);
}
