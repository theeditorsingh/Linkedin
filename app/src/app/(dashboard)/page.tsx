"use client";

import { useEffect, useState, useCallback } from "react";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { Post } from "@/types";

const USER_ID = "owner";

export default function DashboardPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = useCallback(async () => {
    const res = await fetch(`/api/posts?userId=${USER_ID}`);
    const data = await res.json();
    setPosts(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-14 pb-3 bg-black sticky top-0 z-10">
        <div>
          <h1 className="text-lg font-bold text-white">Content Board</h1>
          <p className="text-xs text-zinc-500">{posts.length} posts · swipe to see columns</p>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-zinc-600 text-sm">
          Loading…
        </div>
      ) : (
        <div className="flex-1 overflow-hidden">
          <KanbanBoard posts={posts} onUpdate={fetchPosts} />
        </div>
      )}
    </div>
  );
}
