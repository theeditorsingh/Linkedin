import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getOrCreateOwner } from "@/lib/user";

export async function GET() {
  try {
    const owner = await getOrCreateOwner();
    const profile = await prisma.styleProfile.findUnique({
      where: { userId: owner.id },
    });
    return NextResponse.json(profile ?? null);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const owner = await getOrCreateOwner();
    const { examplePosts, guideJson } = await req.json();

    const profile = await prisma.styleProfile.upsert({
      where: { userId: owner.id },
      create: {
        userId: owner.id,
        guideJson: guideJson ?? {
          tone: "Professional yet conversational",
          hooks: "Start with a bold statement or question",
          sentenceLength: "Short to medium sentences",
          emojiHabits: "Minimal emojis, only when relevant",
          hashtagHabits: "3-5 relevant hashtags at end",
          ctaPatterns: "End with a question to drive comments",
        },
        examplePosts: examplePosts ?? [],
      },
      update: {
        ...(guideJson && { guideJson }),
        ...(examplePosts && { examplePosts }),
      },
    });

    return NextResponse.json(profile);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
