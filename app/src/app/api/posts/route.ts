import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getOrCreateOwner } from "@/lib/user";

// Create a post manually (Buffer-style composer) — no AI generation.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const text = typeof body.body === "string" ? body.body.trim() : "";
    if (!text) {
      return NextResponse.json({ error: "Post text is required" }, { status: 400 });
    }

    const hashtags: string[] = Array.isArray(body.hashtags)
      ? body.hashtags.map((t: string) => String(t).trim().replace(/^#/, "")).filter(Boolean)
      : [];

    const allowedFormats = ["text", "single_image", "multi_image", "carousel"];
    const format = allowedFormats.includes(body.format) ? body.format : "text";

    const owner = await getOrCreateOwner();
    const post = await prisma.post.create({
      data: {
        userId: owner.id,
        body: text,
        hashtags,
        firstComment: typeof body.firstComment === "string" && body.firstComment.trim()
          ? body.firstComment.trim()
          : null,
        format,
        mediaType: format === "carousel" ? "document" : "image",
        slidePrompts: [],
        status: "DRAFTING",
      },
    });

    return NextResponse.json(post, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[POST /api/posts]", message, err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") ?? "";
    const status = searchParams.get("status");

    const posts = await prisma.post.findMany({
      where: {
        userId,
        ...(status ? { status: status as never } : {}),
      },
      include: { source: true },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(posts);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const code = (err as { code?: string })?.code;
    console.error("[GET /api/posts]", { message, code, err });
    return NextResponse.json({ error: message, code }, { status: 500 });
  }
}
