export async function publishPost(
  accessToken: string,
  memberUrn: string,
  body: string,
  imageUrl?: string
): Promise<string> {
  let media: object[] | undefined;

  // Upload image if provided
  if (imageUrl) {
    const assetUrn = await uploadImage(accessToken, memberUrn, imageUrl);
    media = [{ status: "READY", media: { urn: assetUrn } }];
  }

  const payload = {
    author: `urn:li:person:${memberUrn}`,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text: body },
        shareMediaCategory: media ? "IMAGE" : "NONE",
        ...(media && { media }),
      },
    },
    visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
  };

  const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error(`LinkedIn publish failed: ${await res.text()}`);
  const data = await res.json();
  return data.id as string; // LinkedIn post URN
}

export async function postComment(
  accessToken: string,
  postUrn: string,
  text: string
) {
  const res = await fetch("https://api.linkedin.com/v2/socialActions/" +
    encodeURIComponent(postUrn) + "/comments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify({ actor: postUrn.split(":")[3], message: { text } }),
  });
  if (!res.ok) console.error("Failed to post comment:", await res.text());
}

async function uploadImage(
  accessToken: string,
  memberUrn: string,
  imageUrl: string
): Promise<string> {
  // Step 1: Register upload
  const registerRes = await fetch("https://api.linkedin.com/v2/assets?action=registerUpload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      registerUploadRequest: {
        recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
        owner: `urn:li:person:${memberUrn}`,
        serviceRelationships: [{
          relationshipType: "OWNER",
          identifier: "urn:li:userGeneratedContent",
        }],
      },
    }),
  });

  const registerData = await registerRes.json();
  const uploadUrl = registerData.value.uploadMechanism[
    "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
  ].uploadUrl;
  const assetUrn = registerData.value.asset;

  // Step 2: Fetch image bytes
  const imgRes = await fetch(imageUrl);
  const imgBuffer = await imgRes.arrayBuffer();

  // Step 3: Upload image bytes
  await fetch(uploadUrl, {
    method: "PUT",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: imgBuffer,
  });

  return assetUrn;
}
