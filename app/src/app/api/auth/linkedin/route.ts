import { NextRequest, NextResponse } from "next/server";
import { getAuthUrl } from "@/lib/linkedin/oauth";

export async function GET(_req: NextRequest) {
  return NextResponse.redirect(getAuthUrl());
}
