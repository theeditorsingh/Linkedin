"use client";

import { Post, PostStatus } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Image, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<PostStatus, string> = {
  IDEA: "bg-zinc-700 text-zinc-300",
  DRAFTING: "bg-blue-900 text-blue-300",
  IMAGE_NEEDED: "bg-yellow-900 text-yellow-300",
  IN_REVIEW: "bg-purple-900 text-purple-300",
  APPROVED: "bg-green-900 text-green-300",
  SCHEDULED: "bg-cyan-900 text-cyan-300",
  PUBLISHED: "bg-emerald-900 text-emerald-300",
  REJECTED: "bg-red-900 text-red-300",
  FAILED: "bg-red-950 text-red-400",
};

interface PostCardProps {
  post: Post;
  onClick: () => void;
}

export function PostCard({ post, onClick }: PostCardProps) {
  const preview = post.body.slice(0, 120) + (post.body.length > 120 ? "…" : "");
  const date = post.scheduledAt
    ? new Date(post.scheduledAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : null;

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-zinc-900 border border-zinc-800 rounded-2xl p-4 active:scale-[0.98] transition-transform"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <Badge className={cn("text-[10px] px-2 py-0.5 rounded-full", STATUS_COLORS[post.status])}>
          {post.status.replace("_", " ")}
        </Badge>
        {post.imageAssetUrl ? (
          <Image size={14} className="text-zinc-500 mt-0.5 shrink-0" />
        ) : post.status === "IMAGE_NEEDED" ? (
          <Image size={14} className="text-yellow-500 mt-0.5 shrink-0" />
        ) : null}
      </div>

      <p className="text-sm text-zinc-200 leading-relaxed line-clamp-3">{preview}</p>

      {(date || post.hashtags.length > 0) && (
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {date && (
            <span className="flex items-center gap-1 text-[10px] text-zinc-500">
              <Clock size={10} />
              {date}
            </span>
          )}
          {post.hashtags.slice(0, 2).map((tag) => (
            <span key={tag} className="text-[10px] text-[#0A66C2]">
              #{tag}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}
