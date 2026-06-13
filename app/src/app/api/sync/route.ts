import { NextResponse } from "next/server";
import { syncOwnerPublishedPosts } from "@/lib/sync";

export const maxDuration = 60;

// Manual "Sync now" — behind session auth via proxy.ts
export async function POST() {
  try {
    const result = await syncOwnerPublishedPosts();
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[POST /api/sync]", message, err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
