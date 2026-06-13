import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { regeneratePost } from "@/lib/llm/generate";
import { sendApprovalRequest } from "@/lib/slack/notify";
import { Client } from "@upstash/qstash";
import { cleanKey } from "@/lib/env";
import { decrypt } from "@/lib/encrypt";
import { deletePost as deleteLinkedInPost } from "@/lib/linkedin/publish";

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
  try {
    return await handlePatch(id, await req.json());
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[PATCH /api/posts/:id]", message, err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handlePatch(id: string, body: any) {
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
  const { action: _action, rejectReason, ...updateData } = body;

  const updated = await prisma.post.update({ where: { id }, data: updateData });

  // Record a rejection with its optional reason
  if (body.status === "REJECTED") {
    await prisma.approval.create({
      data: {
        postId: id,
        actor: "app",
        action: "reject",
        channel: "app",
        note: typeof rejectReason === "string" && rejectReason.trim() ? rejectReason.trim() : null,
      },
    });
  }

  // Record an approval action
  if (body.status === "APPROVED" || body.status === "SCHEDULED") {
    await prisma.approval.create({
      data: { postId: id, actor: "app", action: "approve", channel: "app" },
    });
  }

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

  // If scheduling, enqueue an exact-time QStash job.
  // Non-fatal: the DB row is already SCHEDULED and the daily cron is the safety net,
  // so a QStash hiccup must not fail the request (that caused the empty-500 JSON error).
  if (body.status === "SCHEDULED" && body.scheduledAt && process.env.QSTASH_TOKEN && process.env.APP_URL) {
    try {
      const scheduledAt = new Date(body.scheduledAt);
      const delaySeconds = Math.max(0, Math.floor((scheduledAt.getTime() - Date.now()) / 1000));

      const qstash = new Client({ token: cleanKey(process.env.QSTASH_TOKEN) });
      await qstash.publishJSON({
        url: `${cleanKey(process.env.APP_URL)}/api/publish/${id}`,
        delay: delaySeconds,
        body: { postId: id },
      });
    } catch (err) {
      console.warn("[qstash] enqueue failed (cron will still publish):", err);
    }
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // If this post is live on LinkedIn, delete it there too (best-effort, non-fatal)
  const post = await prisma.post.findUnique({
    where: { id },
    include: { user: { include: { oauthTokens: true } } },
  });
  if (post?.status === "PUBLISHED" && post.linkedinPostUrn) {
    const token = post.user.oauthTokens.find((t) => t.provider === "linkedin");
    if (token) {
      try {
        await deleteLinkedInPost(decrypt(token.accessToken), post.linkedinPostUrn);
      } catch (err) {
        console.warn("[delete] LinkedIn delete failed (removing locally anyway):", err);
      }
    }
  }

  // Remove dependent rows first — no DB-level cascade is configured
  await prisma.$transaction([
    prisma.approval.deleteMany({ where: { postId: id } }),
    prisma.postVersion.deleteMany({ where: { postId: id } }),
    prisma.post.delete({ where: { id } }),
  ]);
  return NextResponse.json({ ok: true });
}
