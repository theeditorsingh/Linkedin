"use client";

import { useEffect, useState } from "react";
import { Post } from "@/types";
import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

const STATUS_COLOR: Record<string, string> = {
  SCHEDULED: "bg-[#0A66C2]",
  PUBLISHED: "bg-emerald-500",
};

function groupByDate(posts: Post[]): Map<string, Post[]> {
  const map = new Map<string, Post[]>();
  for (const p of posts) {
    const d = p.scheduledAt ?? p.publishedAt;
    if (!d) continue;
    const key = format(new Date(d), "yyyy-MM-dd");
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(p);
  }
  return map;
}

export default function CalendarPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewDate, setViewDate] = useState(new Date());

  useEffect(() => {
    fetch("/api/posts?userId=owner")
      .then((r) => r.json())
      .then((data: Post[]) => {
        const filtered = data.filter((p) => p.status === "SCHEDULED" || p.status === "PUBLISHED");
        setPosts(filtered);
        setLoading(false);
      });
  }, []);

  const grouped = groupByDate(posts);
  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPad = getDay(monthStart); // 0 = Sunday

  function prevMonth() {
    setViewDate((d) => {
      const n = new Date(d);
      n.setMonth(n.getMonth() - 1);
      return n;
    });
  }
  function nextMonth() {
    setViewDate((d) => {
      const n = new Date(d);
      n.setMonth(n.getMonth() + 1);
      return n;
    });
  }

  const today = new Date();

  return (
    <div className="px-4 pt-14 pb-24">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-5">
        <button onClick={prevMonth} className="p-2 text-zinc-400 active:text-white">
          <ChevronLeft size={22} />
        </button>
        <h1 className="text-base font-bold text-white">
          {format(viewDate, "MMMM yyyy")}
        </h1>
        <button onClick={nextMonth} className="p-2 text-zinc-400 active:text-white">
          <ChevronRight size={22} />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <div key={d} className="text-center text-xs text-zinc-600 py-1">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      {loading ? (
        <p className="text-center text-zinc-600 text-sm py-10">Loading…</p>
      ) : (
        <div className="grid grid-cols-7 gap-[2px]">
          {/* Padding cells */}
          {Array.from({ length: startPad }).map((_, i) => (
            <div key={`pad-${i}`} className="aspect-square" />
          ))}

          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const dayPosts = grouped.get(key) ?? [];
            const isToday = isSameDay(day, today);
            return (
              <div
                key={key}
                className={`aspect-square rounded-xl p-1 flex flex-col items-center ${
                  isToday ? "bg-zinc-800" : ""
                }`}
              >
                <span className={`text-xs mb-0.5 ${isToday ? "text-[#0A66C2] font-bold" : "text-zinc-400"}`}>
                  {format(day, "d")}
                </span>
                <div className="flex flex-col gap-0.5 w-full">
                  {dayPosts.slice(0, 2).map((p) => (
                    <div
                      key={p.id}
                      className={`h-1.5 rounded-full w-full ${STATUS_COLOR[p.status] ?? "bg-zinc-600"}`}
                    />
                  ))}
                  {dayPosts.length > 2 && (
                    <span className="text-[9px] text-zinc-600 text-center">+{dayPosts.length - 2}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Post list below calendar */}
      <div className="mt-8 space-y-3">
        <h2 className="text-xs text-zinc-500 uppercase tracking-widest">Upcoming & Published</h2>
        {posts.length === 0 && !loading && (
          <p className="text-sm text-zinc-600">No scheduled or published posts yet.</p>
        )}
        {posts
          .sort((a, b) => {
            const da = new Date(a.scheduledAt ?? a.publishedAt ?? 0).getTime();
            const db = new Date(b.scheduledAt ?? b.publishedAt ?? 0).getTime();
            return da - db;
          })
          .map((p) => {
            const date = p.scheduledAt ?? p.publishedAt;
            return (
              <div key={p.id} className="bg-zinc-900 rounded-2xl p-4 flex gap-3 items-start">
                <div className="flex-shrink-0 text-center min-w-[42px]">
                  {date && (
                    <>
                      <p className="text-xs text-zinc-500">{format(new Date(date), "MMM")}</p>
                      <p className="text-xl font-bold text-white leading-none">{format(new Date(date), "d")}</p>
                      <p className="text-xs text-zinc-500">{format(new Date(date), "h:mm a")}</p>
                    </>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      p.status === "PUBLISHED" ? "bg-emerald-900 text-emerald-400" : "bg-blue-950 text-[#0A66C2]"
                    }`}>
                      {p.status}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-300 line-clamp-2 leading-snug">{p.body}</p>
                  {p.linkedinPostUrn && (
                    <a
                      href={`https://www.linkedin.com/feed/update/${p.linkedinPostUrn}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#0A66C2] mt-1 inline-block"
                    >
                      View on LinkedIn ↗
                    </a>
                  )}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
