import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { regeneratePost } from "@/lib/gemini/generate";
import { sendApprovalRequest } from "@/lib/slack/notify";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const post = await prisma.post.findUnique({
    where: { id },
    include: { source: true, versions: { orderBy: { createdAt: "desc" } } },
  });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(post);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  // Handle regenerate action
  if (body.action === "regenerate") {
    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const styleProfile = await prisma.styleProfile.findUnique({
      where: { userId: post.userId },
    });
    const guideJson = styleProfile?.guideJson as Record<string, string> | null;
    const styleGuide = guideJson
      ? Object.entries(guideJson).map(([k, v]) => `${k}: ${v}`).join("\n")
      : "Professional, concise, insightful.";

    const regenerated = await regeneratePost(
      post.body,
      body.instruction ?? "Make it more engaging",
      styleGuide
    );

    const updated = await prisma.post.update({
      where: { id },
      data: { body: regenerated.body, imagePrompt: regenerated.imagePrompt, status: "IMAGE_NEEDED" },
    });

    await prisma.postVersion.create({
      data: { postId: id, body: regenerated.body, createdBy: "ai" },
    });

    return NextResponse.json(updated);
  }

  // Generic field update (status, scheduledAt, body, etc.)
  const updated = await prisma.post.update({
    where: { id },
    data: body,
  });

  // If approving and image exists, send Slack approval request
  if (body.status === "IN_REVIEW" && updated.imageAssetUrl) {
    if (process.env.SLACK_BOT_TOKEN && process.env.SLACK_CHANNEL_ID) {
      await sendApprovalRequest(
        id,
        updated.body,
        updated.imageAssetUrl,
        updated.scheduledAt?.toISOString() ?? "Not scheduled"
      );
    }
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.post.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
