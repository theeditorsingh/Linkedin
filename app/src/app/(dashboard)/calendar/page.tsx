"use client";

import { useEffect, useState } from "react";
import { Post } from "@/types";
import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from "date-fns";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";

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
        setPosts(data.filter((p) => p.status === "SCHEDULED" || p.status === "PUBLISHED"));
        setLoading(false);
      });
  }, []);

  const grouped = groupByDate(posts);
  const monthStart = startOfMonth(viewDate);
  const days = eachDayOfInterval({ start: monthStart, end: endOfMonth(viewDate) });
  const startPad = getDay(monthStart);
  const today = new Date();

  const shiftMonth = (delta: number) =>
    setViewDate((d) => {
      const n = new Date(d);
      n.setMonth(n.getMonth() + delta);
      return n;
    });

  const sorted = [...posts].sort((a, b) => {
    const da = new Date(a.scheduledAt ?? a.publishedAt ?? 0).getTime();
    const db = new Date(b.scheduledAt ?? b.publishedAt ?? 0).getTime();
    return da - db;
  });

  return (
    <div className="px-4 pt-12 pb-28">
      <h1 className="text-[22px] font-medium text-[#1f1f1f] tracking-tight px-1 mb-4">Calendar</h1>

      {/* Month card */}
      <div className="bg-white rounded-3xl p-4 elevation-1">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => shiftMonth(-1)} className="w-9 h-9 rounded-full active:bg-[#f1f3f4] flex items-center justify-center text-[#5f6368]">
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-[15px] font-medium text-[#1f1f1f]">{format(viewDate, "MMMM yyyy")}</h2>
          <button onClick={() => shiftMonth(1)} className="w-9 h-9 rounded-full active:bg-[#f1f3f4] flex items-center justify-center text-[#5f6368]">
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="grid grid-cols-7 mb-1">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <div key={i} className="text-center text-[11px] text-[#9aa0a6] py-1">{d}</div>
          ))}
        </div>

        {loading ? (
          <p className="text-center text-[#9aa0a6] text-[13px] py-8">Loading…</p>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: startPad }).map((_, i) => (
              <div key={`pad-${i}`} className="aspect-square" />
            ))}
            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const dayPosts = grouped.get(key) ?? [];
              const isToday = isSameDay(day, today);
              const has = dayPosts.length > 0;
              return (
                <div key={key} className="aspect-square flex flex-col items-center justify-center">
                  <div
                    className={`w-9 h-9 flex items-center justify-center rounded-full text-[13px] ${
                      isToday
                        ? "bg-[#1a73e8] text-white font-medium"
                        : has
                        ? "bg-[#e8f0fe] text-[#1967d2] font-medium"
                        : "text-[#3c4043]"
                    }`}
                  >
                    {format(day, "d")}
                  </div>
                  {has && !isToday && <div className="w-1 h-1 rounded-full bg-[#1a73e8] mt-0.5" />}
                  {has && isToday && <div className="w-1 h-1 rounded-full bg-[#1a73e8] mt-0.5" />}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* List */}
      <h2 className="text-[13px] font-medium text-[#5f6368] uppercase tracking-wide mt-7 mb-3 px-1">
        Upcoming & published
      </h2>

      {!loading && sorted.length === 0 && (
        <div className="flex flex-col items-center py-14 text-center">
          <div className="w-14 h-14 rounded-full bg-[#e8f0fe] flex items-center justify-center mb-3">
            <CalendarDays size={24} className="text-[#1a73e8]" />
          </div>
          <p className="text-[14px] text-[#5f6368]">No scheduled or published posts yet.</p>
        </div>
      )}

      <div className="space-y-3">
        {sorted.map((p) => {
          const date = p.scheduledAt ?? p.publishedAt;
          const published = p.status === "PUBLISHED";
          return (
            <div key={p.id} className="bg-white rounded-3xl p-4 elevation-1 flex gap-3">
              <div className="flex-shrink-0 w-12 text-center">
                {date && (
                  <>
                    <p className="text-[11px] text-[#9aa0a6] uppercase">{format(new Date(date), "MMM")}</p>
                    <p className="text-[22px] font-medium text-[#1f1f1f] leading-tight">{format(new Date(date), "d")}</p>
                    <p className="text-[11px] text-[#5f6368]">{format(new Date(date), "h:mm a")}</p>
                  </>
                )}
              </div>
              <div className="flex-1 min-w-0 border-l border-[#e8eaed] pl-3">
                <span
                  className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full mb-1 ${
                    published ? "bg-[#e6f4ea] text-[#188038]" : "bg-[#e8f0fe] text-[#1967d2]"
                  }`}
                >
                  {published ? "Published" : "Scheduled"}
                </span>
                <p className="text-[14px] text-[#3c4043] line-clamp-2 leading-snug">{p.body}</p>
                {p.linkedinPostUrn && (
                  <a
                    href={`https://www.linkedin.com/feed/update/${p.linkedinPostUrn}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[12px] text-[#1a73e8] mt-1 inline-block"
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
