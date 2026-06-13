import { PostStatus } from "@/types";

export interface StatusMeta {
  label: string;
  // Tonal chip colors (Material You light)
  chipBg: string;
  chipText: string;
  // Accent dot
  dot: string;
}

export const STATUS_META: Record<PostStatus, StatusMeta> = {
  IDEA: { label: "Idea", chipBg: "bg-[#f1f3f4]", chipText: "text-[#5f6368]", dot: "bg-[#9aa0a6]" },
  DRAFTING: { label: "Drafting", chipBg: "bg-[#e8f0fe]", chipText: "text-[#1967d2]", dot: "bg-[#1a73e8]" },
  IMAGE_NEEDED: { label: "Image needed", chipBg: "bg-[#fef7e0]", chipText: "text-[#b06000]", dot: "bg-[#f9ab00]" },
  IN_REVIEW: { label: "In review", chipBg: "bg-[#f3e8fd]", chipText: "text-[#8430ce]", dot: "bg-[#a142f4]" },
  APPROVED: { label: "Approved", chipBg: "bg-[#e6f4ea]", chipText: "text-[#1e8e3e]", dot: "bg-[#34a853]" },
  SCHEDULED: { label: "Scheduled", chipBg: "bg-[#e8f0fe]", chipText: "text-[#1967d2]", dot: "bg-[#1a73e8]" },
  PUBLISHED: { label: "Published", chipBg: "bg-[#e6f4ea]", chipText: "text-[#188038]", dot: "bg-[#34a853]" },
  REJECTED: { label: "Rejected", chipBg: "bg-[#fce8e6]", chipText: "text-[#c5221f]", dot: "bg-[#ea4335]" },
  FAILED: { label: "Failed", chipBg: "bg-[#fce8e6]", chipText: "text-[#c5221f]", dot: "bg-[#ea4335]" },
};

// Friendly filter groups for the board chips
export interface FilterGroup {
  id: string;
  label: string;
  statuses: PostStatus[] | null; // null = all
}

export const FILTER_GROUPS: FilterGroup[] = [
  { id: "all", label: "All", statuses: null },
  { id: "action", label: "Needs action", statuses: ["IMAGE_NEEDED", "IN_REVIEW"] },
  { id: "scheduled", label: "Scheduled", statuses: ["APPROVED", "SCHEDULED"] },
  { id: "published", label: "Published", statuses: ["PUBLISHED"] },
  { id: "ideas", label: "Ideas", statuses: ["IDEA", "DRAFTING"] },
  { id: "rejected", label: "Rejected", statuses: ["REJECTED", "FAILED"] },
];

// Sort priority — most actionable first so they surface at the top of "All"
const PRIORITY: PostStatus[] = [
  "IN_REVIEW",
  "IMAGE_NEEDED",
  "APPROVED",
  "SCHEDULED",
  "DRAFTING",
  "IDEA",
  "PUBLISHED",
  "REJECTED",
  "FAILED",
];

export function statusRank(status: PostStatus): number {
  const i = PRIORITY.indexOf(status);
  return i === -1 ? 999 : i;
}
