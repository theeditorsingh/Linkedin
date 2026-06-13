import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { uploadImage, ensureBucketExists } from "@/lib/r2/storage";
import { sendApprovalRequest } from "@/lib/slack/notify";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const postId = formData.get("postId") as string;

    if (!file || !postId) {
      return NextResponse.json({ error: "Missing file or postId" }, { status: 400 });
    }

    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: "Only JPG, PNG, WebP allowed" }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
    }

    await ensureBucketExists();

    const buffer = Buffer.from(await file.arrayBuffer());
    const publicUrl = await uploadImage(postId, buffer, file.type);

    // Move post to IN_REVIEW and attach image
    const post = await prisma.post.update({
      where: { id: postId },
      data: { imageAssetUrl: publicUrl, status: "IN_REVIEW" },
    });

    // Send Slack approval request
    if (process.env.SLACK_BOT_TOKEN && process.env.SLACK_CHANNEL_ID) {
      await sendApprovalRequest(
        postId,
        post.body,
        publicUrl,
        post.scheduledAt?.toISOString() ?? "Not scheduled yet"
      );
    }

    return NextResponse.json({ imageUrl: publicUrl, post });
  } catch (err) {
    console.error("[POST /api/upload]", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
