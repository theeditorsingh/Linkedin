"use client";

import { Post } from "@/types";
import { STATUS_META } from "@/lib/status";
import { ImageIcon, CalendarClock, ChevronRight, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface Props {
  post: Post;
  onClick: () => void;
}

// Short hint of what the user should do next
function actionHint(post: Post): { text: string; tone: "action" | "muted" } | null {
  switch (post.status) {
    case "IMAGE_NEEDED":
      return { text: "Add image", tone: "action" };
    case "IN_REVIEW":
      return { text: "Review & approve", tone: "action" };
    case "APPROVED":
      return { text: "Schedule it", tone: "action" };
    default:
      return null;
  }
}

export function PostListItem({ post, onClick }: Props) {
  const meta = STATUS_META[post.status];
  const preview = post.body.slice(0, 140) + (post.body.length > 140 ? "…" : "");
  const hint = actionHint(post);
  const scheduled = post.scheduledAt
    ? format(new Date(post.scheduledAt), "MMM d, h:mm a")
    : null;

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-3xl p-4 elevation-1 active:scale-[0.99] transition-transform"
    >
      <div className="flex items-center gap-2 mb-2">
        <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full ${meta.chipBg} ${meta.chipText}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
          {meta.label}
        </span>
        {post.imageAssetUrl && (
          <ImageIcon size={14} className="text-[#9aa0a6] shrink-0" />
        )}
        {post.status === "FAILED" && (
          <AlertCircle size={14} className="text-[#ea4335] shrink-0" />
        )}
        <ChevronRight size={18} className="ml-auto text-[#bdc1c6] shrink-0" />
      </div>

      <p className="text-[14px] text-[#3c4043] leading-relaxed line-clamp-2">{preview}</p>

      <div className="flex items-center gap-3 mt-3 flex-wrap">
        {scheduled && (
          <span className="inline-flex items-center gap-1 text-[12px] text-[#5f6368]">
            <CalendarClock size={13} />
            {scheduled}
          </span>
        )}
        {post.hashtags.slice(0, 2).map((tag) => (
          <span key={tag} className="text-[12px] text-[#1a73e8]">#{tag}</span>
        ))}
        {hint && (
          <span
            className={`ml-auto text-[12px] font-medium ${
              hint.tone === "action" ? "text-[#1a73e8]" : "text-[#5f6368]"
            }`}
          >
            {hint.text} →
          </span>
        )}
      </div>
    </button>
  );
}
