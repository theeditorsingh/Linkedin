import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { regeneratePost } from "@/lib/llm/generate";
import { sendApprovalRequest } from "@/lib/slack/notify";
import { Client } from "@upstash/qstash";

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

    const styleProfile = await prisma.styleProfile.findUnique({ where: { userId: post.userId } });
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

    await prisma.postVersion.create({ data: { postId: id, body: regenerated.body, createdBy: "ai" } });
    return NextResponse.json(updated);
  }

  // Prepare update data — exclude non-prisma fields
  const { action: _action, ...updateData } = body;

  const updated = await prisma.post.update({ where: { id }, data: updateData });

  // If moving to IN_REVIEW with image, send Slack approval request
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

  // If scheduling, enqueue QStash job
  if (body.status === "SCHEDULED" && body.scheduledAt && process.env.QSTASH_TOKEN && process.env.APP_URL) {
    const scheduledAt = new Date(body.scheduledAt);
    const delaySeconds = Math.max(0, Math.floor((scheduledAt.getTime() - Date.now()) / 1000));

    const qstash = new Client({ token: process.env.QSTASH_TOKEN });
    await qstash.publishJSON({
      url: `${process.env.APP_URL}/api/publish/${id}`,
      delay: delaySeconds,
      body: { postId: id },
    });
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
