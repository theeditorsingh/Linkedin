"use client";

import { useState, useRef } from "react";
import { Post } from "@/types";
import { Drawer } from "vaul";
import { STATUS_META } from "@/lib/status";
import {
  Copy,
  Check,
  Upload,
  Trash2,
  CalendarClock,
  Zap,
  X,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface PostSheetProps {
  post: Post;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

type Mode = "view" | "scheduling" | "rejecting" | "deleting";

function defaultScheduleTime(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T09:00`;
}

function nowISOMin(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function PostSheet({ post, open, onClose, onUpdate }: PostSheetProps) {
  const [copied, setCopied] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<Mode>("view");
  const [scheduledAt, setScheduledAt] = useState(defaultScheduleTime);
  const [reason, setReason] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const meta = STATUS_META[post.status];
  const canSchedule = post.status === "IN_REVIEW" || post.status === "APPROVED";

  function reset() {
    setMode("view");
    setReason("");
  }

  async function copyPrompt() {
    await navigator.clipboard.writeText(post.imagePrompt ?? "");
    setCopied(true);
    toast.success("Image prompt copied");
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("postId", post.id);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Image uploaded — moved to In review");
      onUpdate();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function handleSchedule(publishNow: boolean) {
    setBusy(true);
    try {
      const at = publishNow ? new Date().toISOString() : new Date(scheduledAt).toISOString();
      const res = await fetch(`/api/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "SCHEDULED", scheduledAt: at }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to schedule");
      toast.success(
        publishNow ? "Queued for publishing now" : `Scheduled for ${format(new Date(at), "MMM d, h:mm a")}`
      );
      onUpdate();
      onClose();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleReject() {
    setBusy(true);
    try {
      await fetch(`/api/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "REJECTED", rejectReason: reason }),
      });
      toast.success("Post rejected");
      onUpdate();
      onClose();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    setBusy(true);
    try {
      await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
      toast.success("Post deleted");
      onUpdate();
      onClose();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Drawer.Root
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          reset();
          onClose();
        }
      }}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 bg-[#f8f9fa] rounded-t-[28px] max-h-[92vh] flex flex-col outline-none">
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-9 h-1 rounded-full bg-[#dadce0]" />
          </div>

          <div className="overflow-y-auto flex-1 px-5 pb-10 space-y-4 scrollbar-hide">
            {/* Status + close */}
            <div className="flex items-center justify-between pt-1">
              <span className={`inline-flex items-center gap-1.5 text-[12px] font-medium px-3 py-1 rounded-full ${meta.chipBg} ${meta.chipText}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                {meta.label}
                {post.scheduledAt && post.status === "SCHEDULED" && (
                  <> · {format(new Date(post.scheduledAt), "MMM d, h:mm a")}</>
                )}
              </span>
              <button
                onClick={() => {
                  reset();
                  onClose();
                }}
                className="w-9 h-9 rounded-full bg-white elevation-1 flex items-center justify-center text-[#5f6368]"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="bg-white rounded-3xl p-4 elevation-1">
              <p className="text-[14px] text-[#3c4043] leading-relaxed whitespace-pre-wrap">{post.body}</p>
            </div>

            {/* Hashtags */}
            {post.hashtags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {post.hashtags.map((tag) => (
                  <span key={tag} className="text-[12px] text-[#1a73e8] bg-[#e8f0fe] px-2.5 py-1 rounded-full">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Image */}
            {post.imageAssetUrl ? (
              <img src={post.imageAssetUrl} alt="Post" className="w-full rounded-3xl object-cover max-h-60" />
            ) : post.imagePrompt ? (
              <div className="bg-[#fef7e0] rounded-3xl p-4 space-y-3">
                <p className="text-[12px] text-[#b06000] font-medium">Image prompt — paste into ChatGPT</p>
                <p className="text-[13px] text-[#5f6368] leading-relaxed">{post.imagePrompt}</p>
                <button
                  onClick={copyPrompt}
                  className="w-full h-12 bg-[#1a73e8] text-white rounded-full font-medium text-[14px] flex items-center justify-center gap-2 active:scale-[0.99] transition-transform"
                >
                  {copied ? <Check size={18} /> : <Copy size={18} />}
                  {copied ? "Copied!" : "Copy image prompt"}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleUpload}
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="w-full h-12 bg-white border border-[#dadce0] text-[#1a73e8] rounded-full font-medium text-[14px] flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <Upload size={18} />
                  {uploading ? "Uploading…" : "Upload generated image"}
                </button>
              </div>
            ) : null}

            {/* ---- Action area ---- */}
            {mode === "view" && (
              <div className="flex flex-col gap-2.5 pt-1">
                {canSchedule && (
                  <>
                    <button
                      onClick={() => setMode("scheduling")}
                      className="w-full h-14 bg-[#1a73e8] text-white rounded-full font-medium text-[15px] flex items-center justify-center gap-2 active:scale-[0.99] transition-transform"
                    >
                      <CalendarClock size={20} />
                      Approve & schedule
                    </button>
                    <button
                      onClick={() => setMode("rejecting")}
                      className="w-full h-12 bg-white border border-[#f4c7c3] text-[#c5221f] rounded-full font-medium text-[14px]"
                    >
                      Reject
                    </button>
                  </>
                )}
                <button
                  onClick={() => setMode("deleting")}
                  className="w-full h-11 text-[#5f6368] rounded-full text-[13px] flex items-center justify-center gap-1.5"
                >
                  <Trash2 size={15} />
                  Delete post
                </button>
              </div>
            )}

            {/* Schedule picker */}
            {mode === "scheduling" && (
              <div className="bg-white rounded-3xl p-4 elevation-1 space-y-4">
                <p className="text-[14px] font-medium text-[#1f1f1f]">Pick date & time</p>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  min={nowISOMin()}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full bg-[#f1f3f4] text-[#1f1f1f] rounded-xl px-4 py-3 text-[14px] border border-[#dadce0] focus:outline-none focus:border-[#1a73e8]"
                />
                <button
                  onClick={() => handleSchedule(false)}
                  disabled={busy || !scheduledAt}
                  className="w-full h-14 bg-[#1a73e8] text-white rounded-full font-medium text-[15px] flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <CalendarClock size={20} />
                  {busy ? "Scheduling…" : "Confirm schedule"}
                </button>
                <button
                  onClick={() => handleSchedule(true)}
                  disabled={busy}
                  className="w-full h-12 bg-white border border-[#dadce0] text-[#1a73e8] rounded-full font-medium text-[14px] flex items-center justify-center gap-2"
                >
                  <Zap size={18} />
                  Publish now
                </button>
                <button onClick={() => setMode("view")} className="w-full h-10 text-[#5f6368] text-[13px]">
                  Cancel
                </button>
              </div>
            )}

            {/* Reject with reason */}
            {mode === "rejecting" && (
              <div className="bg-white rounded-3xl p-4 elevation-1 space-y-3">
                <p className="text-[14px] font-medium text-[#1f1f1f]">Why are you rejecting this?</p>
                <p className="text-[12px] text-[#5f6368]">
                  Optional — note what was off so you remember later.
                </p>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. tone too salesy, wrong angle, needs a real example…"
                  rows={3}
                  className="w-full bg-[#f1f3f4] text-[#1f1f1f] rounded-xl px-4 py-3 text-[14px] border border-[#dadce0] focus:outline-none focus:border-[#1a73e8] resize-none"
                />
                <button
                  onClick={handleReject}
                  disabled={busy}
                  className="w-full h-13 min-h-[52px] bg-[#c5221f] text-white rounded-full font-medium text-[14px] disabled:opacity-60"
                >
                  {busy ? "Rejecting…" : "Confirm reject"}
                </button>
                <button onClick={() => setMode("view")} className="w-full h-10 text-[#5f6368] text-[13px]">
                  Cancel
                </button>
              </div>
            )}

            {/* Delete confirmation */}
            {mode === "deleting" && (
              <div className="bg-white rounded-3xl p-5 elevation-1 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-[#fce8e6] flex items-center justify-center">
                    <AlertTriangle size={20} className="text-[#c5221f]" />
                  </div>
                  <p className="text-[15px] font-medium text-[#1f1f1f]">Delete this post?</p>
                </div>
                <p className="text-[13px] text-[#5f6368] leading-relaxed">
                  This permanently removes the post, its versions, and any uploaded image.
                  <span className="text-[#c5221f] font-medium"> This can&apos;t be undone.</span>
                </p>
                <button
                  onClick={handleDelete}
                  disabled={busy}
                  className="w-full h-12 bg-[#c5221f] text-white rounded-full font-medium text-[14px] disabled:opacity-60"
                >
                  {busy ? "Deleting…" : "Delete permanently"}
                </button>
                <button onClick={() => setMode("view")} className="w-full h-10 text-[#5f6368] text-[13px]">
                  Keep it
                </button>
              </div>
            )}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
