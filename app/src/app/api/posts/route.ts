import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { PostStatus } from "@/types";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId") ?? "";
  const status = searchParams.get("status") as PostStatus | null;

  const posts = await prisma.post.findMany({
    where: { userId, ...(status ? { status } : {}) },
    include: { source: true },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(posts);
}
