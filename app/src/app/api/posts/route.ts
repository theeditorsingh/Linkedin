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
    const message = err instanceof Error ? err.message : String(err);
    const code = (err as { code?: string })?.code;
    console.error("[GET /api/posts]", { message, code, err });
    return NextResponse.json({ error: message, code }, { status: 500 });
  }
}
