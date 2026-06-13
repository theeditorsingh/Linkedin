import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import crypto from "crypto";
import { cleanKey } from "@/lib/env";

function verifySlackSignature(req: NextRequest, body: string): boolean {
  const secret = cleanKey(process.env.SLACK_SIGNING_SECRET);
  const timestamp = req.headers.get("x-slack-request-timestamp") ?? "";
  const signature = req.headers.get("x-slack-signature") ?? "";
  const baseString = `v0:${timestamp}:${body}`;
  const hmac = crypto.createHmac("sha256", secret).update(baseString).digest("hex");
  return `v0=${hmac}` === signature;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  if (!verifySlackSignature(req, rawBody)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(new URLSearchParams(rawBody).get("payload") ?? "{}");
  const action = payload.actions?.[0];
  if (!action) return NextResponse.json({ ok: true });

  const postId = action.value as string;
  const actionId = action.action_id as string;

  if (actionId === "approve_post") {
    await prisma.post.update({
      where: { id: postId },
      data: { status: "APPROVED" },
    });
    await prisma.approval.create({
      data: { postId, actor: "slack", action: "approve", channel: "slack" },
    });
    return NextResponse.json({ text: "✅ Post approved and scheduled!" });
  }

  if (actionId === "reject_post") {
    await prisma.post.update({
      where: { id: postId },
      data: { status: "REJECTED" },
    });
    await prisma.approval.create({
      data: { postId, actor: "slack", action: "reject", channel: "slack" },
    });
    return NextResponse.json({ text: "❌ Post rejected." });
  }

  if (actionId === "regenerate_post") {
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (post) {
      await prisma.post.update({
        where: { id: postId },
        data: { status: "IMAGE_NEEDED" },
      });
      await prisma.approval.create({
        data: { postId, actor: "slack", action: "regenerate", channel: "slack" },
      });
    }
    return NextResponse.json({ text: "🔄 Post sent back for regeneration." });
  }

  return NextResponse.json({ ok: true });
}
