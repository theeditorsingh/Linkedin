"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Post } from "@/types";
import { FILTER_GROUPS, statusRank } from "@/lib/status";
import { PostListItem } from "@/components/board/PostListItem";
import { PostSheet } from "@/components/post/PostSheet";
import { Plus, Inbox } from "lucide-react";

const USER_ID = "owner";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-3xl p-4 elevation-1">
      <div className="skeleton h-5 w-24 rounded-full mb-3" />
      <div className="skeleton h-3.5 w-full rounded mb-2" />
      <div className="skeleton h-3.5 w-3/4 rounded" />
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<Post | null>(null);

  const fetchPosts = useCallback(async () => {
    const res = await fetch(`/api/posts?userId=${USER_ID}`);
    const data = await res.json();
    setPosts(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Keep the open sheet's data fresh after a background refetch
  useEffect(() => {
    if (selected) {
      const fresh = posts.find((p) => p.id === selected.id);
      if (fresh && fresh !== selected) setSelected(fresh);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts]);

  const actionCount = useMemo(
    () => posts.filter((p) => p.status === "IMAGE_NEEDED" || p.status === "IN_REVIEW").length,
    [posts]
  );

  const visible = useMemo(() => {
    const group = FILTER_GROUPS.find((g) => g.id === filter);
    const filtered = group?.statuses
      ? posts.filter((p) => group.statuses!.includes(p.status))
      : posts;
    return [...filtered].sort((a, b) => {
      const r = statusRank(a.status) - statusRank(b.status);
      if (r !== 0) return r;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [posts, filter]);

  return (
    <div className="min-h-full">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#f8f9fa]/95 backdrop-blur px-5 pt-12 pb-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[13px] text-[#5f6368]">{greeting()} 👋</p>
            <h1 className="text-[26px] font-medium text-[#1f1f1f] tracking-tight leading-tight">
              Your content
            </h1>
            <p className="text-[13px] text-[#5f6368] mt-0.5">
              {posts.length} post{posts.length !== 1 ? "s" : ""}
              {actionCount > 0 && (
                <span className="text-[#c5221f] font-medium">
                  {" · "}
                  {actionCount} need{actionCount === 1 ? "s" : ""} action
                </span>
              )}
            </p>
          </div>
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#1a73e8] to-[#1557b0] text-white flex items-center justify-center text-[17px] font-medium elevation-1">
            H
          </div>
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide mt-4 -mx-5 px-5">
          {FILTER_GROUPS.map((g) => {
            const active = filter === g.id;
            const badge = g.id === "action" && actionCount > 0 ? actionCount : null;
            return (
              <button
                key={g.id}
                onClick={() => setFilter(g.id)}
                className={`shrink-0 inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-[13px] font-medium border transition-all active:scale-95 ${
                  active
                    ? "bg-[#1a73e8] text-white border-[#1a73e8] elevation-1"
                    : "bg-white text-[#3c4043] border-[#dadce0]"
                }`}
              >
                {g.label}
                {badge && (
                  <span
                    className={`text-[11px] px-1.5 rounded-full ${
                      active ? "bg-white/25 text-white" : "bg-[#fce8e6] text-[#c5221f]"
                    }`}
                  >
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* List */}
      <div className="px-4 pt-3 space-y-3">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-up">
            <div className="w-16 h-16 rounded-full bg-[#e8f0fe] flex items-center justify-center mb-4">
              <Inbox size={28} className="text-[#1a73e8]" />
            </div>
            <p className="text-[15px] font-medium text-[#3c4043]">Nothing here yet</p>
            <p className="text-[13px] text-[#5f6368] mt-1 max-w-[240px]">
              {filter === "all"
                ? "Tap the + button to turn a link or text into a LinkedIn post."
                : "No posts in this view."}
            </p>
          </div>
        ) : (
          visible.map((post, i) => (
            <div
              key={post.id}
              className="animate-fade-up"
              style={{ animationDelay: `${Math.min(i * 45, 360)}ms` }}
            >
              <PostListItem post={post} onClick={() => setSelected(post)} />
            </div>
          ))
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => router.push("/new-post")}
        className="fixed bottom-24 right-5 z-20 h-14 pl-4 pr-5 rounded-2xl bg-[#1a73e8] text-white elevation-3 flex items-center gap-2 active:scale-95 transition-transform"
      >
        <Plus size={22} />
        <span className="text-[15px] font-medium">New</span>
      </button>

      {selected && (
        <PostSheet
          post={selected}
          open={!!selected}
          onClose={() => setSelected(null)}
          onUpdate={fetchPosts}
        />
      )}
    </div>
  );
}
