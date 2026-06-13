// Post generation via Groq (free, OpenAI-compatible API). No SDK — plain fetch keeps
// the serverless bundle small and avoids ESM-interop crashes (see jsdom lesson).
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

// API keys ride in the Authorization header; a stray BOM/whitespace would throw a
// "ByteString" error. Keep only printable ASCII.
function cleanKey(key: string): string {
  let out = "";
  for (let i = 0; i < key.length; i++) {
    const code = key.charCodeAt(i);
    if (code >= 0x21 && code <= 0x7e) out += key[i];
  }
  return out;
}

export interface GeneratedPost {
  body: string;
  firstComment: string;
  hashtags: string[];
  imagePrompt: string;
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

  const text = await callGroq(prompt);
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("LLM returned invalid JSON");
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

  const text = await callGroq(prompt);
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("LLM returned invalid JSON");
  return JSON.parse(jsonMatch[0]);
}
