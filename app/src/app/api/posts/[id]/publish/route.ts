import { NextRequest, NextResponse } from "next/server";
import { publishScheduledPost } from "@/lib/publisher";

// Publish a post to LinkedIn immediately ("Post now").
// Behind session auth via proxy.ts (only the logged-in owner can call it).
export const maxDuration = 60;

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const result = await publishScheduledPost(id);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, postUrn: result.postUrn });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[POST /api/posts/:id/publish]", message, err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
