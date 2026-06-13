"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Loader2,
  Sparkles,
  Link2,
  FileText,
  PenLine,
  ArrowLeft,
  Upload,
  X,
  CalendarClock,
  Zap,
} from "lucide-react";
import { defaultScheduleTime, nowISOMin } from "@/lib/datetime";

const USER_ID = "owner";
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const PDF_TYPE = "application/pdf";

type Tab = "url" | "text" | "write";

async function errMessage(res: Response, fallback: string): Promise<string> {
  try {
    return (await res.json())?.error ?? fallback;
  } catch {
    return `${fallback} (${res.status})`;
  }
}

export default function NewPostPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("url");

  // AI tabs
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");

  // Compose tab
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [comment, setComment] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [scheduledAt, setScheduledAt] = useState(defaultScheduleTime);
  const [posting, setPosting] = useState(false);

  const previews = useMemo(
    () =>
      files.map((f) => ({
        name: f.name,
        isPdf: f.type === PDF_TYPE,
        url: f.type === PDF_TYPE ? null : URL.createObjectURL(f),
      })),
    [files]
  );
  useEffect(
    () => () => previews.forEach((p) => p.url && URL.revokeObjectURL(p.url)),
    [previews]
  );

  async function handleAI() {
    const value = tab === "url" ? url.trim() : text.trim();
    if (!value) {
      toast.error(tab === "url" ? "Paste a URL first" : "Write some text first");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: tab,
          ...(tab === "url" ? { url: value } : { text: value }),
          userId: USER_ID,
        }),
      });
      if (!res.ok) throw new Error(await errMessage(res, "Something went wrong"));
      toast.success("Post generated! Check your board.");
      router.push("/");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function pickFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    const arr = Array.from(list);
    const hasPdf = arr.some((f) => f.type === PDF_TYPE);
    if (hasPdf && arr.length > 1) {
      toast.error("Upload a single PDF for a carousel");
      return;
    }
    for (const f of arr) {
      if (![...IMAGE_TYPES, PDF_TYPE].includes(f.type)) {
        toast.error("Only JPG, PNG, WebP or PDF");
        return;
      }
      if (f.size > 15 * 1024 * 1024) {
        toast.error("File too large (max 15MB)");
        return;
      }
    }
    setFiles(arr);
  }

  async function compose(publishNow: boolean) {
    if (!body.trim()) {
      toast.error("Write your post text first");
      return;
    }
    setPosting(true);
    try {
      const hashtags = tags
        .split(/[,\s]+/)
        .map((t) => t.trim().replace(/^#/, ""))
        .filter(Boolean);
      const hasPdf = files.some((f) => f.type === PDF_TYPE);
      const format = hasPdf ? "carousel" : files.length > 1 ? "multi_image" : files.length === 1 ? "single_image" : "text";

      // 1. Create the post
      const createRes = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, hashtags, firstComment: comment, format }),
      });
      if (!createRes.ok) throw new Error(await errMessage(createRes, "Failed to create post"));
      const post = await createRes.json();

      // 2. Upload media (if any)
      if (files.length > 0) {
        const form = new FormData();
        form.append("postId", post.id);
        files.forEach((f) => form.append("files", f));
        const upRes = await fetch("/api/upload", { method: "POST", body: form });
        if (!upRes.ok) throw new Error(await errMessage(upRes, "Failed to upload media"));
      }

      if (publishNow) {
        // 3a. Publish immediately to LinkedIn
        const pubRes = await fetch(`/api/posts/${post.id}/publish`, { method: "POST" });
        if (!pubRes.ok) throw new Error(await errMessage(pubRes, "Failed to publish"));
        toast.success("Published to LinkedIn! 🎉");
      } else {
        // 3b. Schedule for later
        const at = new Date(scheduledAt).toISOString();
        const schedRes = await fetch(`/api/posts/${post.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "SCHEDULED", scheduledAt: at }),
        });
        if (!schedRes.ok) throw new Error(await errMessage(schedRes, "Failed to schedule"));
        toast.success("Scheduled!");
      }
      router.push("/");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPosting(false);
    }
  }

  const fieldCls =
    "w-full bg-[#f1f3f4] border border-[#dadce0] text-[#1f1f1f] rounded-2xl px-4 text-[15px] focus:outline-none focus:border-[#1a73e8] focus:bg-white transition-colors";

  return (
    <div className="min-h-full px-5 pt-12 pb-28">
      <button onClick={() => router.push("/")} className="inline-flex items-center gap-1 text-[14px] text-[#1a73e8] mb-3">
        <ArrowLeft size={18} /> Board
      </button>

      <h1 className="text-[22px] font-medium text-[#1f1f1f] tracking-tight">New post</h1>
      <p className="text-[13px] text-[#5f6368] mt-1 mb-5">
        Let AI draft from a link or text, or write your own.
      </p>

      {/* Segmented control */}
      <div className="flex bg-[#e8eaed] rounded-full p-1 mb-5">
        {([
          { id: "url", label: "Link", icon: Link2 },
          { id: "text", label: "Text", icon: FileText },
          { id: "write", label: "Write", icon: PenLine },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 h-10 rounded-full text-[14px] font-medium flex items-center justify-center gap-1.5 transition-colors ${
              tab === id ? "bg-white text-[#1a73e8] elevation-1" : "text-[#5f6368]"
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* ---- AI: URL ---- */}
      {tab === "url" && (
        <>
          <div className="bg-white rounded-3xl p-4 elevation-1">
            <input
              type="url"
              inputMode="url"
              placeholder="https://example.com/article"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className={`${fieldCls} h-12`}
            />
            <p className="text-[12px] text-[#5f6368] mt-2">
              Works with blog posts, news & newsletters. If a site blocks fetching, use the Text tab.
            </p>
          </div>
          <SubmitBar
            label="Generate post"
            icon={loading ? null : <Sparkles size={18} />}
            loading={loading}
            disabled={!url.trim()}
            onClick={handleAI}
          />
        </>
      )}

      {/* ---- AI: Text ---- */}
      {tab === "text" && (
        <>
          <div className="bg-white rounded-3xl p-4 elevation-1">
            <textarea
              placeholder="Paste an article, newsletter, or your own raw thoughts…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={9}
              className={`${fieldCls} py-4 leading-relaxed resize-none`}
            />
            <p className="text-[12px] text-[#9aa0a6] mt-2 text-right">{text.length} characters</p>
          </div>
          <SubmitBar
            label="Generate post"
            icon={loading ? null : <Sparkles size={18} />}
            loading={loading}
            disabled={!text.trim()}
            onClick={handleAI}
          />
        </>
      )}

      {/* ---- Write your own (all-in-one composer) ---- */}
      {tab === "write" && (
        <div className="space-y-3">
          <div className="bg-white rounded-3xl p-4 elevation-1">
            <textarea
              placeholder="Write your LinkedIn post…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={7}
              className={`${fieldCls} py-4 leading-relaxed resize-none`}
            />
            <p className="text-[12px] text-[#9aa0a6] mt-2 text-right">{body.length} chars</p>
          </div>

          <div className="bg-white rounded-3xl p-4 elevation-1 space-y-3">
            <input
              placeholder="Hashtags — e.g. marketing, ai, growth"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className={`${fieldCls} h-12`}
            />
            <textarea
              placeholder="First comment (optional) — great for a link"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              className={`${fieldCls} py-3 resize-none`}
            />
          </div>

          {/* Media */}
          <div className="bg-white rounded-3xl p-4 elevation-1 space-y-3">
            {previews.length > 0 && (
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-medium text-[#5f6368]">
                  {previews[0].isPdf ? "PDF carousel" : `${previews.length} image${previews.length > 1 ? "s" : ""}`}
                </p>
                <button onClick={() => setFiles([])} className="text-[12px] text-[#c5221f] inline-flex items-center gap-1">
                  <X size={13} /> Clear
                </button>
              </div>
            )}

            {previews.length > 0 ? (
              previews[0].isPdf ? (
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#fce8e6] flex items-center justify-center">
                    <FileText size={20} className="text-[#c5221f]" />
                  </div>
                  <p className="text-[13px] text-[#3c4043] truncate">{previews[0].name}</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {previews.map((p, i) => (
                    <img key={i} src={p.url!} alt={`Image ${i + 1}`} className="w-full rounded-xl object-cover aspect-square" />
                  ))}
                </div>
              )
            ) : null}

            <label className="w-full h-12 bg-white border border-[#dadce0] text-[#1a73e8] rounded-full font-medium text-[14px] flex items-center justify-center gap-2 cursor-pointer">
              <Upload size={18} />
              {previews.length > 0 ? "Replace media" : "Add images / PDF"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                multiple
                className="hidden"
                onChange={(e) => pickFiles(e.target.files)}
              />
            </label>
            <p className="text-[11px] text-[#9aa0a6]">Multiple images, or one PDF for a carousel. Optional.</p>
          </div>

          {/* Schedule */}
          <div className="bg-white rounded-3xl p-4 elevation-1 space-y-3">
            <p className="text-[13px] font-medium text-[#1f1f1f]">When to post</p>
            <input
              type="datetime-local"
              value={scheduledAt}
              min={nowISOMin()}
              onChange={(e) => setScheduledAt(e.target.value)}
              className={`${fieldCls} h-12`}
            />
            <button
              onClick={() => compose(false)}
              disabled={posting || !body.trim()}
              className="w-full h-14 bg-[#1a73e8] text-white rounded-full font-medium text-[15px] flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.99] transition-transform"
            >
              {posting ? <Loader2 size={18} className="animate-spin" /> : <CalendarClock size={18} />}
              {posting ? "Working…" : "Schedule post"}
            </button>
            <button
              onClick={() => compose(true)}
              disabled={posting || !body.trim()}
              className="w-full h-12 bg-white border border-[#dadce0] text-[#1a73e8] rounded-full font-medium text-[14px] flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Zap size={18} />
              Post now
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SubmitBar({
  label,
  icon,
  loading,
  disabled,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <div className="fixed bottom-24 left-5 right-5">
      <button
        onClick={onClick}
        disabled={loading || disabled}
        className="w-full h-14 bg-[#1a73e8] text-white font-medium rounded-full text-[15px] flex items-center justify-center gap-2 elevation-2 disabled:opacity-50 active:scale-[0.99] transition-transform"
      >
        {loading ? <Loader2 size={18} className="animate-spin" /> : icon}
        {loading ? "Generating…" : label}
      </button>
    </div>
  );
}
