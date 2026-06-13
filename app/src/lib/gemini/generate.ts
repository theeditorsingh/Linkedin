import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// The Gemini SDK throws "Cannot convert argument to a ByteString" if the prompt contains
// a BOM (U+FEFF) or other zero-width / control chars. Strip them before every request.
const ZERO_WIDTH = new Set([0xfeff, 0x200b, 0x200c, 0x200d, 0x2060]);
function cleanPrompt(str: string): string {
  let out = "";
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (ZERO_WIDTH.has(code)) continue;
    const isControl =
      (code < 0x20 && code !== 0x09 && code !== 0x0a && code !== 0x0d) || code === 0x7f;
    if (isControl) continue;
    out += str[i];
  }
  return out;
}

async function generate(prompt: string) {
  const result = await model.generateContent(cleanPrompt(prompt));
  return result.response.text().trim();
}

export interface GeneratedPost {
  body: string;
  firstComment: string;
  hashtags: string[];
  imagePrompt: string;
}

export async function generatePost(
  sourceText: string,
  sourceTitle: string,
  styleGuide: string,
  examplePosts: string[]
): Promise<GeneratedPost> {
  const examples = examplePosts.slice(0, 5).join("\n\n---\n\n");

  const prompt = `You are a LinkedIn content writer. Your job is to write a post in the exact style of the examples below.

## Owner's Style Guide
${styleGuide}

## Example Posts by Owner
${examples}

---

## Source to Repurpose
Title: ${sourceTitle}
Content: ${sourceText.slice(0, 3000)}

---

Write a LinkedIn post repurposing this source. Follow the style guide and examples precisely.

Respond with ONLY valid JSON in this exact format:
{
  "body": "the full post text (max 3000 chars, use real line breaks)",
  "firstComment": "a comment to post after publishing, containing the source link placeholder [SOURCE_URL]",
  "hashtags": ["hashtag1", "hashtag2", "hashtag3"],
  "imagePrompt": "a detailed image generation prompt for ChatGPT image model — professional LinkedIn aesthetic, no text overlay, describes a visual scene relevant to the post topic"
}`;

  const text = await generate(prompt);

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Gemini returned invalid JSON");

  return JSON.parse(jsonMatch[0]) as GeneratedPost;
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

  const text = await generate(prompt);
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Gemini returned invalid JSON");
  return JSON.parse(jsonMatch[0]);
}
