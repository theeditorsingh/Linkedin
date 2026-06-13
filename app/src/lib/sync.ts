import { prisma } from "@/lib/db/prisma";
import { decrypt } from "@/lib/encrypt";
import { checkPostExists } from "@/lib/linkedin/publish";
import { OWNER_ID } from "@/lib/user";

export interface SyncResult {
  checked: number;
  removed: number;
  // false when LinkedIn never allowed a read (token lacks permission) — auto-detect unavailable
  readAllowed: boolean;
}

// Check every published post against LinkedIn; mark REMOVED any that were deleted there.
export async function syncOwnerPublishedPosts(): Promise<SyncResult> {
  const user = await prisma.user.findUnique({
    where: { id: OWNER_ID },
    include: { oauthTokens: true },
  });

  const token = user?.oauthTokens.find((t) => t.provider === "linkedin");
  if (!token) return { checked: 0, removed: 0, readAllowed: false };

  const accessToken = decrypt(token.accessToken);

  const posts = await prisma.post.findMany({
    where: { userId: OWNER_ID, status: "PUBLISHED", NOT: { linkedinPostUrn: null } },
    select: { id: true, linkedinPostUrn: true },
  });

  let checked = 0;
  let removed = 0;
  let readAllowed = false;

  for (const p of posts) {
    const state = await checkPostExists(accessToken, p.linkedinPostUrn!);
    checked++;
    if (state !== "unknown") readAllowed = true;
    if (state === "deleted") {
      await prisma.post.update({ where: { id: p.id }, data: { status: "REMOVED" } });
      removed++;
    }
  }

  return { checked, removed, readAllowed };
}
