import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { publishScheduledPost } from "@/lib/publisher";
import { syncOwnerPublishedPosts } from "@/lib/sync";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const duePosts = await prisma.post.findMany({
    where: {
      status: "SCHEDULED",
      scheduledAt: { lte: new Date() },
    },
    select: { id: true },
  });

  const results = [];
  for (const { id } of duePosts) {
    const result = await publishScheduledPost(id);
    results.push({ id, ...result });
  }

  // Also reconcile published posts that were deleted on LinkedIn → mark REMOVED
  let sync = null;
  try {
    sync = await syncOwnerPublishedPosts();
  } catch (err) {
    console.warn("[cron] sync failed:", err);
  }

  return NextResponse.json({ count: results.length, results, sync });
}
