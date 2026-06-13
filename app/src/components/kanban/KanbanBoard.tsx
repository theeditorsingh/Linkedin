"use client";

import { useState } from "react";
import { Post, KANBAN_COLUMNS } from "@/types";
import { PostCard } from "./PostCard";
import { PostSheet } from "../post/PostSheet";

interface KanbanBoardProps {
  posts: Post[];
  onUpdate: () => void;
}

export function KanbanBoard({ posts, onUpdate }: KanbanBoardProps) {
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  return (
    <>
      {/* Horizontal scroll container — snaps to each column */}
      <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory h-full px-4 pt-4 scrollbar-hide">
        {KANBAN_COLUMNS.map((col) => {
          const colPosts = posts.filter((p) => p.status === col.id);
          return (
            <div
              key={col.id}
              className="snap-center shrink-0 w-[85vw] max-w-sm flex flex-col gap-3"
            >
              {/* Column header */}
              <div className="flex items-center gap-2 px-1">
                <span className="text-base">{col.emoji}</span>
                <span className="text-sm font-semibold text-zinc-300">{col.label}</span>
                <span className="ml-auto text-xs text-zinc-600 bg-zinc-900 px-2 py-0.5 rounded-full">
                  {colPosts.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex flex-col gap-3 overflow-y-auto max-h-[calc(100vh-180px)] pb-4 scrollbar-hide">
                {colPosts.length === 0 ? (
                  <div className="text-xs text-zinc-700 text-center py-8 border border-dashed border-zinc-800 rounded-2xl">
                    No posts
                  </div>
                ) : (
                  colPosts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      onClick={() => setSelectedPost(post)}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Post detail bottom sheet */}
      {selectedPost && (
        <PostSheet
          post={selectedPost}
          open={!!selectedPost}
          onClose={() => setSelectedPost(null)}
          onUpdate={() => { onUpdate(); setSelectedPost(null); }}
        />
      )}
    </>
  );
}
