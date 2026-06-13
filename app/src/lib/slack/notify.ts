import { WebClient } from "@slack/web-api";

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
const CHANNEL = process.env.SLACK_CHANNEL_ID!;
const APP_URL = process.env.APP_URL!;

export async function sendImageNeededAlert(
  postId: string,
  postBody: string,
  imagePrompt: string
) {
  await slack.chat.postMessage({
    channel: CHANNEL,
    text: `📸 Post ready — image needed`,
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: "📸 Post Ready — Image Needed" },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Post Preview:*\n${postBody.slice(0, 300)}${postBody.length > 300 ? "..." : ""}`,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Image Prompt (copy → paste into ChatGPT):*\n\`\`\`${imagePrompt}\`\`\``,
        },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "📤 Upload Image" },
            style: "primary",
            url: `${APP_URL}/post/${postId}/upload`,
            action_id: "upload_image",
          },
        ],
      },
    ],
  });
}

export async function sendApprovalRequest(
  postId: string,
  postBody: string,
  imageUrl: string,
  scheduledAt: string
) {
  await slack.chat.postMessage({
    channel: CHANNEL,
    text: `✅ Post ready for approval`,
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: "✅ Post Ready for Approval" },
      },
      {
        type: "section",
        text: { type: "mrkdwn", text: postBody },
      },
      {
        type: "image",
        image_url: imageUrl,
        alt_text: "Post image",
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Scheduled:*\n${scheduledAt}`,
          },
        ],
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "✅ Approve" },
            style: "primary",
            action_id: "approve_post",
            value: postId,
          },
          {
            type: "button",
            text: { type: "plain_text", text: "❌ Reject" },
            style: "danger",
            action_id: "reject_post",
            value: postId,
          },
          {
            type: "button",
            text: { type: "plain_text", text: "🔄 Regenerate" },
            action_id: "regenerate_post",
            value: postId,
          },
        ],
      },
    ],
  });
}

export async function sendPublishedNotification(
  postId: string,
  linkedinPostUrl: string
) {
  await slack.chat.postMessage({
    channel: CHANNEL,
    text: `🎉 Post published!`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `🎉 *Post published successfully!*\n<${linkedinPostUrl}|View on LinkedIn>`,
        },
      },
    ],
  });
}
