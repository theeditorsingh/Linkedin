import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { uploadFile, ensureBucketExists, clearMedia } from "@/lib/r2/storage";
import { sendApprovalRequest } from "@/lib/slack/notify";

export const maxDuration = 60;

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const PDF_TYPE = "application/pdf";
const MAX_BYTES = 15 * 1024 * 1024; // 15MB (PDFs can be larger than images)

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const postId = formData.get("postId") as string;
    if (!postId) {
      return NextResponse.json({ error: "Missing postId" }, { status: 400 });
    }

    // Accept either a single "file" or multiple "files"
    const files = [
      ...formData.getAll("files"),
      ...(formData.get("file") ? [formData.get("file")] : []),
    ].filter((f): f is File => f instanceof File);

    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const hasPdf = files.some((f) => f.type === PDF_TYPE);
    if (hasPdf && files.length > 1) {
      return NextResponse.json({ error: "Upload a single PDF for a carousel" }, { status: 400 });
    }

    for (const f of files) {
      if (![...IMAGE_TYPES, PDF_TYPE].includes(f.type)) {
        return NextResponse.json({ error: "Only JPG, PNG, WebP or PDF allowed" }, { status: 400 });
      }
      if (f.size > MAX_BYTES) {
        return NextResponse.json({ error: "File too large (max 15MB)" }, { status: 400 });
      }
    }

    await ensureBucketExists();
    // Replace any previously uploaded media for this post
    await clearMedia(postId);

    const urls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const buffer = Buffer.from(await files[i].arrayBuffer());
      urls.push(await uploadFile(postId, i, buffer, files[i].type));
    }

    const mediaType = hasPdf ? "document" : "image";
    const format = hasPdf ? "carousel" : urls.length > 1 ? "multi_image" : "single_image";

    const post = await prisma.post.update({
      where: { id: postId },
      data: {
        mediaUrls: urls,
        mediaType,
        format,
        imageAssetUrl: mediaType === "image" ? urls[0] : null,
        status: "IN_REVIEW",
      },
    });

    if (process.env.SLACK_BOT_TOKEN && process.env.SLACK_CHANNEL_ID && mediaType === "image") {
      await sendApprovalRequest(
        postId,
        post.body,
        urls[0],
        post.scheduledAt?.toISOString() ?? "Not scheduled yet"
      );
    }

    return NextResponse.json({ mediaUrls: urls, post });
  } catch (err) {
    console.error("[POST /api/upload]", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
