import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") ?? "";
    const status = searchParams.get("status");

    const posts = await prisma.post.findMany({
      where: {
        userId,
        ...(status ? { status: status as never } : {}),
      },
      include: { source: true },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(posts);
  } catch (err) {
    console.error("[GET /api/posts]", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
