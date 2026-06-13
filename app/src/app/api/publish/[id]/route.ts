import { NextRequest, NextResponse } from "next/server";
import { Receiver } from "@upstash/qstash";
import { publishScheduledPost } from "@/lib/publisher";

const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!,
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const rawBody = await req.text();

  try {
    await receiver.verify({
      signature: req.headers.get("upstash-signature") ?? "",
      body: rawBody,
      clockTolerance: 5,
    });
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const result = await publishScheduledPost(id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ postUrn: result.postUrn });
}
