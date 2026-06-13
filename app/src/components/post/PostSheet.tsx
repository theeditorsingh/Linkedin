"use client";

import { useState, useRef } from "react";
import { Post } from "@/types";
import { Drawer } from "vaul";
import { Button } from "@/components/ui/button";
import { Copy, Check, Upload, Trash2, Calendar, Zap } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface PostSheetProps {
  post: Post;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

function getDefaultScheduleTime(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  // Format as "YYYY-MM-DDTHH:MM" for datetime-local input
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T09:00`;
}

function getNowISOMin(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function PostSheet({ post, open, onClose, onUpdate }: PostSheetProps) {
  const [copied, setCopied] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [scheduledAt, setScheduledAt] = useState(getDefaultScheduleTime);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function copyPrompt() {
    await navigator.clipboard.writeText(post.imagePrompt ?? "");
    setCopied(true);
    toast.success("Image prompt copied!");
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
      toast.success("Image uploaded! Post moved to In Review.");
      onUpdate();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function handleSchedule(publishNow: boolean) {
    setSaving(true);
    try {
      const at = publishNow ? new Date().toISOString() : new Date(scheduledAt).toISOString();
      const res = await fetch(`/api/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "SCHEDULED", scheduledAt: at }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to schedule");
      toast.success(publishNow ? "Post queued for immediate publishing!" : `Post scheduled for ${format(new Date(at), "MMM d 'at' h:mm a")}`);
      setScheduling(false);
      onUpdate();
      onClose();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleReject() {
    await fetch(`/api/posts/${post.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "REJECTED" }),
    });
    toast.success("Post rejected.");
    onUpdate();
    onClose();
  }

  async function handleDelete() {
    await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
    toast.success("Post deleted.");
    onUpdate();
    onClose();
  }

  const canSchedule = post.status === "IN_REVIEW" || post.status === "APPROVED";

  return (
    <Drawer.Root open={open} onOpenChange={(o) => { if (!o) { setScheduling(false); onClose(); } }}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/60 z-40" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-950 border-t border-zinc-800 rounded-t-3xl max-h-[92vh] flex flex-col">
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-zinc-700" />
          </div>

          <div className="overflow-y-auto flex-1 px-5 pb-10 space-y-5">
            {/* Status badge */}
            <p className="text-xs text-zinc-500 uppercase tracking-widest pt-1">
              {post.status.replace(/_/g, " ")}
              {post.scheduledAt && post.status === "SCHEDULED" && (
                <span className="ml-2 text-[#0A66C2] normal-case">
                  · {format(new Date(post.scheduledAt), "MMM d 'at' h:mm a")}
                </span>
              )}
            </p>

            {/* Post body */}
            <div className="bg-zinc-900 rounded-2xl p-4">
              <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">{post.body}</p>
            </div>

            {/* Hashtags */}
            {post.hashtags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {post.hashtags.map((tag) => (
                  <span key={tag} className="text-xs text-[#0A66C2] bg-blue-950 px-2 py-1 rounded-full">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Image section */}
            {post.imageAssetUrl ? (
              <img
                src={post.imageAssetUrl}
                alt="Post image"
                className="w-full rounded-2xl object-cover max-h-56"
              />
            ) : post.imagePrompt ? (
              <div className="bg-zinc-900 rounded-2xl p-4 space-y-3">
                <p className="text-xs text-yellow-400 font-medium">Image prompt — copy to ChatGPT</p>
                <p className="text-xs text-zinc-400 leading-relaxed">{post.imagePrompt}</p>
                <Button
                  onClick={copyPrompt}
                  className="w-full h-12 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold rounded-xl"
                >
                  {copied ? <Check size={16} className="mr-2" /> : <Copy size={16} className="mr-2" />}
                  {copied ? "Copied!" : "Copy Image Prompt"}
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleUpload}
                />
                <Button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  variant="outline"
                  className="w-full h-12 border-zinc-700 text-zinc-300 rounded-xl"
                >
                  <Upload size={16} className="mr-2" />
                  {uploading ? "Uploading…" : "Upload Generated Image"}
                </Button>
              </div>
            ) : null}

            {/* Action buttons */}
            <div className="flex flex-col gap-3 pt-2">
              {canSchedule && !scheduling && (
                <>
                  <Button
                    onClick={() => setScheduling(true)}
                    className="w-full h-14 bg-[#0A66C2] hover:bg-blue-600 text-white font-semibold rounded-xl text-base"
                  >
                    <Calendar size={18} className="mr-2" />
                    Approve & Schedule
                  </Button>
                  <Button
                    onClick={handleReject}
                    variant="outline"
                    className="w-full h-12 border-red-800 text-red-400 rounded-xl"
                  >
                    ❌ Reject
                  </Button>
                </>
              )}

              {canSchedule && scheduling && (
                <div className="bg-zinc-900 rounded-2xl p-4 space-y-4">
                  <p className="text-sm font-medium text-zinc-200">Pick a date & time</p>
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    min={getNowISOMin()}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="w-full bg-zinc-800 text-white rounded-xl px-4 py-3 text-sm border border-zinc-700 focus:outline-none focus:border-[#0A66C2]"
                  />
                  <Button
                    onClick={() => handleSchedule(false)}
                    disabled={saving || !scheduledAt}
                    className="w-full h-14 bg-[#0A66C2] hover:bg-blue-600 text-white font-semibold rounded-xl text-base"
                  >
                    <Calendar size={18} className="mr-2" />
                    {saving ? "Scheduling…" : "Confirm Schedule"}
                  </Button>
                  <Button
                    onClick={() => handleSchedule(true)}
                    disabled={saving}
                    variant="outline"
                    className="w-full h-12 border-zinc-600 text-zinc-300 rounded-xl"
                  >
                    <Zap size={16} className="mr-2" />
                    Publish Now
                  </Button>
                  <Button
                    onClick={() => setScheduling(false)}
                    variant="ghost"
                    className="w-full h-10 text-zinc-600 rounded-xl text-sm"
                  >
                    Cancel
                  </Button>
                </div>
              )}

              <Button
                variant="ghost"
                className="w-full h-12 text-zinc-600 rounded-xl"
                onClick={handleDelete}
              >
                <Trash2 size={14} className="mr-2" />
                Delete post
              </Button>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
