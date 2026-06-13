"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Sparkles, Link2, FileText, ArrowLeft } from "lucide-react";

const USER_ID = "owner";

export default function NewPostPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"url" | "text">("url");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");

  async function handleSubmit() {
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
      if (!res.ok) {
        let message = `Server error (${res.status})`;
        try {
          const err = await res.json();
          message = err.error ?? message;
        } catch {
          /* not JSON */
        }
        throw new Error(message);
      }
      toast.success("Post generated! Check your board.");
      router.push("/");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-full px-5 pt-12 pb-8">
      <button
        onClick={() => router.push("/")}
        className="inline-flex items-center gap-1 text-[14px] text-[#1a73e8] mb-3"
      >
        <ArrowLeft size={18} /> Board
      </button>

      <h1 className="text-[22px] font-medium text-[#1f1f1f] tracking-tight">New post</h1>
      <p className="text-[13px] text-[#5f6368] mt-1 mb-6">
        Drop in a link or some text — AI drafts a post in your style.
      </p>

      {/* Segmented control */}
      <div className="flex bg-[#e8eaed] rounded-full p-1 mb-5">
        {([
          { id: "url", label: "Link", icon: Link2 },
          { id: "text", label: "Text", icon: FileText },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 h-10 rounded-full text-[14px] font-medium flex items-center justify-center gap-2 transition-colors ${
              tab === id ? "bg-white text-[#1a73e8] elevation-1" : "text-[#5f6368]"
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {tab === "url" ? (
        <div className="bg-white rounded-3xl p-4 elevation-1">
          <input
            type="url"
            inputMode="url"
            placeholder="https://example.com/article"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full h-12 bg-[#f1f3f4] border border-[#dadce0] text-[#1f1f1f] rounded-2xl px-4 text-[15px] focus:outline-none focus:border-[#1a73e8]"
          />
          <p className="text-[12px] text-[#5f6368] mt-2">
            Works with blog posts, news articles & newsletters. If a site blocks fetching, use the Text tab.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-4 elevation-1">
          <textarea
            placeholder="Paste an article, newsletter, or your own raw thoughts…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={9}
            className="w-full bg-[#f1f3f4] border border-[#dadce0] text-[#1f1f1f] rounded-2xl p-4 text-[15px] leading-relaxed resize-none focus:outline-none focus:border-[#1a73e8]"
          />
          <p className="text-[12px] text-[#9aa0a6] mt-2 text-right">{text.length} characters</p>
        </div>
      )}

      <div className="fixed bottom-24 left-5 right-5">
        <button
          onClick={handleSubmit}
          disabled={loading || (tab === "url" ? !url.trim() : !text.trim())}
          className="w-full h-14 bg-[#1a73e8] text-white font-medium rounded-full text-[15px] flex items-center justify-center gap-2 elevation-2 disabled:opacity-50 active:scale-[0.99] transition-transform"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
          {loading ? "Generating…" : "Generate post"}
        </button>
      </div>
    </div>
  );
}
