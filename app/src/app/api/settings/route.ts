import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { OWNER_ID } from "@/lib/user";

export async function GET() {
  const user = await prisma.user.findUnique({
    where: { id: OWNER_ID },
    include: { oauthTokens: true },
  });

  const linkedinToken = user?.oauthTokens.find((t) => t.provider === "linkedin");

  return NextResponse.json({
    linkedinConnected: !!user?.linkedinMemberUrn,
    linkedinExpiresAt: linkedinToken?.expiresAt ?? null,
    memberUrn: user?.linkedinMemberUrn ?? null,
  });
}
