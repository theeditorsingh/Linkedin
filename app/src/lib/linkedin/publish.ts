// LinkedIn publishing.
//  - text / single image / multiple images  -> legacy ugcPosts API (w_member_social)
//  - carousel (PDF document)                -> REST documents + posts API
const LINKEDIN_VERSION = "202406";

export type PublishMedia = {
  type: "none" | "image" | "document";
  urls: string[];
};

export async function publishPost(
  accessToken: string,
  memberUrn: string,
  body: string,
  media: PublishMedia
): Promise<string> {
  if (media.type === "document" && media.urls[0]) {
    return publishDocument(accessToken, memberUrn, body, media.urls[0]);
  }

  // text or image(s) via ugcPosts
  let mediaArray: object[] | undefined;
  if (media.type === "image" && media.urls.length > 0) {
    const assets: string[] = [];
    for (const url of media.urls) {
      assets.push(await uploadImageAsset(accessToken, memberUrn, url));
    }
    mediaArray = assets.map((urn) => ({ status: "READY", media: urn }));
  }

  const payload = {
    author: `urn:li:person:${memberUrn}`,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text: body },
        shareMediaCategory: mediaArray ? "IMAGE" : "NONE",
        ...(mediaArray && { media: mediaArray }),
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
  return data.id as string;
}

export async function postComment(accessToken: string, postUrn: string, text: string) {
  const res = await fetch(
    "https://api.linkedin.com/v2/socialActions/" + encodeURIComponent(postUrn) + "/comments",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify({ actor: postUrn.split(":")[3], message: { text } }),
    }
  );
  if (!res.ok) console.error("Failed to post comment:", await res.text());
}

// ---- image asset upload (legacy assets API) ----
async function uploadImageAsset(
  accessToken: string,
  memberUrn: string,
  imageUrl: string
): Promise<string> {
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
        serviceRelationships: [
          { relationshipType: "OWNER", identifier: "urn:li:userGeneratedContent" },
        ],
      },
    }),
  });
  if (!registerRes.ok) throw new Error(`registerUpload failed: ${await registerRes.text()}`);

  const registerData = await registerRes.json();
  const uploadUrl =
    registerData.value.uploadMechanism[
      "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
    ].uploadUrl;
  const assetUrn = registerData.value.asset;

  const imgRes = await fetch(imageUrl);
  const imgBuffer = await imgRes.arrayBuffer();

  await fetch(uploadUrl, {
    method: "PUT",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: imgBuffer,
  });

  return assetUrn;
}

// ---- document (carousel PDF) via REST documents + posts API ----
async function publishDocument(
  accessToken: string,
  memberUrn: string,
  body: string,
  pdfUrl: string
): Promise<string> {
  const author = `urn:li:person:${memberUrn}`;
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "X-Restli-Protocol-Version": "2.0.0",
    "LinkedIn-Version": LINKEDIN_VERSION,
  };

  // 1. Initialize upload
  const initRes = await fetch("https://api.linkedin.com/rest/documents?action=initializeUpload", {
    method: "POST",
    headers,
    body: JSON.stringify({ initializeUploadRequest: { owner: author } }),
  });
  if (!initRes.ok) throw new Error(`Document init failed: ${await initRes.text()}`);
  const initData = await initRes.json();
  const uploadUrl: string = initData.value.uploadUrl;
  const documentUrn: string = initData.value.document;

  // 2. Upload the PDF bytes
  const pdfRes = await fetch(pdfUrl);
  const pdfBuffer = await pdfRes.arrayBuffer();
  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/octet-stream" },
    body: pdfBuffer,
  });
  if (!putRes.ok) throw new Error(`Document upload failed: ${await putRes.text()}`);

  // 3. Create the post referencing the document
  const postRes = await fetch("https://api.linkedin.com/rest/posts", {
    method: "POST",
    headers,
    body: JSON.stringify({
      author,
      commentary: body,
      visibility: "PUBLIC",
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      content: { media: { id: documentUrn, title: "Carousel" } },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    }),
  });
  if (!postRes.ok) throw new Error(`Document post failed: ${await postRes.text()}`);

  // The post URN comes back in a header
  return postRes.headers.get("x-restli-id") ?? postRes.headers.get("x-linkedin-id") ?? documentUrn;
}
