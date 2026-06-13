export type PostStatus =
  | "IDEA"
  | "DRAFTING"
  | "IMAGE_NEEDED"
  | "IN_REVIEW"
  | "APPROVED"
  | "SCHEDULED"
  | "PUBLISHED"
  | "REJECTED"
  | "FAILED"
  | "REMOVED";

export type PostFormat = "text" | "single_image" | "multi_image" | "carousel";

export interface Post {
  id: string;
  userId: string;
  sourceId?: string;
  body: string;
  firstComment?: string;
  hashtags: string[];
  imagePrompt?: string;
  imageAssetUrl?: string;
  format: PostFormat;
  formatReason?: string;
  mediaType: "image" | "document";
  mediaUrls: string[];
  slidePrompts: string[];
  status: PostStatus;
  scheduledAt?: string;
  publishedAt?: string;
  linkedinPostUrn?: string;
  createdAt: string;
  updatedAt: string;
  source?: Source;
}

export interface Source {
  id: string;
  url?: string;
  type: "url" | "text" | "rss";
  title?: string;
  extractedText?: string;
  ogImageUrl?: string;
}

export interface StyleProfile {
  id: string;
  userId: string;
  guideJson: {
    tone: string;
    hooks: string;
    sentenceLength: string;
    emojiHabits: string;
    hashtagHabits: string;
    ctaPatterns: string;
  };
  examplePosts: string[];
}

export const KANBAN_COLUMNS: { id: PostStatus; label: string; emoji: string }[] = [
  { id: "IDEA", label: "Ideas", emoji: "💡" },
  { id: "DRAFTING", label: "Drafting", emoji: "✏️" },
  { id: "IMAGE_NEEDED", label: "Image Needed", emoji: "📸" },
  { id: "IN_REVIEW", label: "In Review", emoji: "👀" },
  { id: "APPROVED", label: "Approved", emoji: "✅" },
  { id: "SCHEDULED", label: "Scheduled", emoji: "🗓️" },
  { id: "PUBLISHED", label: "Published", emoji: "🚀" },
  { id: "REJECTED", label: "Rejected", emoji: "❌" },
];
