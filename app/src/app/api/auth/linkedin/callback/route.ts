import { NextRequest, NextResponse } from "next/server";
import { exchangeCode, getProfile } from "@/lib/linkedin/oauth";
import { encrypt } from "@/lib/encrypt";
import { prisma } from "@/lib/db/prisma";
import { getOrCreateOwner } from "@/lib/user";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(new URL("/settings?error=no_code", req.url));
  }

  try {
    const tokens = await exchangeCode(code);
    const profile = await getProfile(tokens.access_token);
    const owner = await getOrCreateOwner();

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    await prisma.oAuthToken.upsert({
      where: { userId_provider: { userId: owner.id, provider: "linkedin" } },
      create: {
        userId: owner.id,
        provider: "linkedin",
        accessToken: encrypt(tokens.access_token),
        expiresAt,
        refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
      },
      update: {
        accessToken: encrypt(tokens.access_token),
        expiresAt,
        refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
      },
    });

    // Save LinkedIn member URN on user
    await prisma.user.update({
      where: { id: owner.id },
      data: { linkedinMemberUrn: profile.sub },
    });

    return NextResponse.redirect(new URL("/settings?linkedin=connected", req.url));
  } catch (err) {
    console.error("LinkedIn callback error:", err);
    return NextResponse.redirect(new URL("/settings?error=auth_failed", req.url));
  }
}
