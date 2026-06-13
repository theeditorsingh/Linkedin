import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { extractFromUrl, extractFromText } from "@/lib/extract/source";
import { generatePost } from "@/lib/gemini/generate";
import { sendImageNeededAlert } from "@/lib/slack/notify";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, url, text, userId } = body as {
      type: "url" | "text";
      url?: string;
      text?: string;
      userId: string;
    };

    // 1. Extract source content
    const extracted =
      type === "url" && url
        ? await extractFromUrl(url)
        : extractFromText(text ?? "");

    // 2. Save source to DB
    const source = await prisma.source.create({
      data: {
        url: extracted.url || null,
        type,
        title: extracted.title,
        extractedText: extracted.text,
        ogImageUrl: extracted.ogImageUrl,
      },
    });

    // 3. Get style profile for this user
    const styleProfile = await prisma.styleProfile.findUnique({
      where: { userId },
    });

    const guideJson = styleProfile?.guideJson as Record<string, string> | null;
    const styleGuide = guideJson
      ? Object.entries(guideJson)
          .map(([k, v]) => `${k}: ${v}`)
          .join("\n")
      : "Professional, concise, insightful. Use short paragraphs.";

    const examplePosts = styleProfile?.examplePosts ?? [];

    // 4. Generate post with Gemini
    const generated = await generatePost(
      extracted.text,
      extracted.title,
      styleGuide,
      examplePosts
    );

    // 5. Save draft post
    const post = await prisma.post.create({
      data: {
        userId,
        sourceId: source.id,
        body: generated.body,
        firstComment: generated.firstComment,
        hashtags: generated.hashtags,
        imagePrompt: generated.imagePrompt,
        status: "IMAGE_NEEDED",
      },
    });

    // 6. Save version history
    await prisma.postVersion.create({
      data: { postId: post.id, body: generated.body, createdBy: "ai" },
    });

    // 7. Send Slack alert (non-blocking — don't fail if Slack isn't configured yet)
    if (process.env.SLACK_BOT_TOKEN && process.env.SLACK_CHANNEL_ID) {
      await sendImageNeededAlert(post.id, post.body, post.imagePrompt ?? "");
    }

    return NextResponse.json({ post, source }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/sources]", err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
