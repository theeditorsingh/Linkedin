"use client";

import { useState, useRef } from "react";
import { Post } from "@/types";
import { Drawer } from "vaul";
import { Button } from "@/components/ui/button";
import { Copy, Check, Upload, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface PostSheetProps {
  post: Post;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function PostSheet({ post, open, onClose, onUpdate }: PostSheetProps) {
  const [copied, setCopied] = useState(false);
  const [uploading, setUploading] = useState(false);
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

  async function handleApprove() {
    await fetch(`/api/posts/${post.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "APPROVED" }),
    });
    toast.success("Post approved!");
    onUpdate();
  }

  async function handleReject() {
    await fetch(`/api/posts/${post.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "REJECTED" }),
    });
    toast.success("Post rejected.");
    onUpdate();
  }

  async function handleDelete() {
    await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
    toast.success("Post deleted.");
    onUpdate();
  }

  return (
    <Drawer.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/60 z-40" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-950 border-t border-zinc-800 rounded-t-3xl max-h-[90vh] flex flex-col">
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-zinc-700" />
          </div>

          <div className="overflow-y-auto flex-1 px-5 pb-8 space-y-5">
            {/* Status badge */}
            <p className="text-xs text-zinc-500 uppercase tracking-widest pt-1">
              {post.status.replace("_", " ")}
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
                className="w-full rounded-2xl object-cover max-h-48"
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
              {post.status === "IN_REVIEW" && (
                <>
                  <Button
                    onClick={handleApprove}
                    className="w-full h-14 bg-[#0A66C2] hover:bg-blue-600 text-white font-semibold rounded-xl text-base"
                  >
                    ✅ Approve & Schedule
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
