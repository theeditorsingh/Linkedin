import { prisma } from "@/lib/db/prisma";
import { decrypt } from "@/lib/encrypt";
import { publishPost, postComment } from "@/lib/linkedin/publish";
import { sendPublishedNotification } from "@/lib/slack/notify";

export async function publishScheduledPost(postId: string): Promise<{ ok: true; postUrn: string } | { ok: false; error: string }> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { user: { include: { oauthTokens: true } } },
  });

  if (!post) return { ok: false, error: "Post not found" };
  if (post.status === "PUBLISHED") return { ok: false, error: "Already published" };

  const token = post.user.oauthTokens.find((t) => t.provider === "linkedin");
  const memberUrn = post.user.linkedinMemberUrn;

  if (!token || !memberUrn) {
    await prisma.post.update({ where: { id: postId }, data: { status: "FAILED" } });
    return { ok: false, error: "No LinkedIn token or member URN" };
  }

  const accessToken = decrypt(token.accessToken);

  const media =
    post.mediaType === "document" && post.mediaUrls.length
      ? { type: "document" as const, urls: post.mediaUrls }
      : post.mediaUrls.length
        ? { type: "image" as const, urls: post.mediaUrls }
        : post.imageAssetUrl
          ? { type: "image" as const, urls: [post.imageAssetUrl] }
          : { type: "none" as const, urls: [] };

  const postUrn = await publishPost(accessToken, memberUrn, post.body, media);

  if (post.firstComment) {
    await postComment(accessToken, postUrn, post.firstComment);
  }

  await prisma.post.update({
    where: { id: postId },
    data: { status: "PUBLISHED", publishedAt: new Date(), linkedinPostUrn: postUrn },
  });

  if (process.env.SLACK_BOT_TOKEN && process.env.SLACK_CHANNEL_ID) {
    await sendPublishedNotification(postId, `https://www.linkedin.com/feed/update/${postUrn}`);
  }

  return { ok: true, postUrn };
}
