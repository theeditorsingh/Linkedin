"use client";

import { useState, useRef } from "react";
import { Post, PostFormat } from "@/types";
import { toast } from "sonner";
import {
  Copy,
  Check,
  Upload,
  FileText,
  Sparkles,
  Type,
  Image as ImageIcon,
  Images,
  GalleryHorizontal,
} from "lucide-react";

const FORMATS: { id: PostFormat; label: string; icon: typeof Type }[] = [
  { id: "text", label: "Text", icon: Type },
  { id: "single_image", label: "1 image", icon: ImageIcon },
  { id: "multi_image", label: "Multiple", icon: Images },
  { id: "carousel", label: "Carousel", icon: GalleryHorizontal },
];

const FORMAT_LABEL: Record<PostFormat, string> = {
  text: "Text only",
  single_image: "Single image",
  multi_image: "Multiple images",
  carousel: "Carousel (PDF)",
};

interface Props {
  post: Post;
  onChange: () => void; // refetch board (sheet stays open)
}

export function MediaSection({ post, onChange }: Props) {
  const [chosen, setChosen] = useState<PostFormat>(post.format);
  const [uploading, setUploading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const editable = ["IDEA", "DRAFTING", "IMAGE_NEEDED", "IN_REVIEW"].includes(post.status);
  const hasMedia = post.mediaUrls.length > 0 || !!post.imageAssetUrl;
  const isDoc = post.mediaType === "document";
  const prompts = post.slidePrompts.length ? post.slidePrompts : post.imagePrompt ? [post.imagePrompt] : [];

  async function copy(text: string, idx: number) {
    await navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    toast.success("Prompt copied");
    setTimeout(() => setCopiedIdx(null), 2000);
  }

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("postId", post.id);
      Array.from(files).forEach((f) => form.append("files", f));
      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Uploaded — ready for review");
      onChange();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function markTextReady() {
    setBusy(true);
    try {
      await fetch(`/api/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: "text", mediaType: "image", status: "IN_REVIEW" }),
      });
      toast.success("Marked ready for review");
      onChange();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // Published / scheduled / rejected → read-only media preview
  if (!editable) {
    if (!hasMedia) return null;
    return isDoc ? (
      <a
        href={post.mediaUrls[0]}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 bg-white rounded-3xl p-4 elevation-1"
      >
        <div className="w-11 h-11 rounded-xl bg-[#fce8e6] flex items-center justify-center">
          <FileText size={20} className="text-[#c5221f]" />
        </div>
        <div>
          <p className="text-[14px] font-medium text-[#1f1f1f]">Carousel PDF</p>
          <p className="text-[12px] text-[#5f6368]">Tap to view</p>
        </div>
      </a>
    ) : (
      <div className="grid grid-cols-2 gap-2">
        {(post.mediaUrls.length ? post.mediaUrls : [post.imageAssetUrl!]).map((u, i) => (
          <img key={i} src={u} alt={`Media ${i + 1}`} className="w-full rounded-2xl object-cover aspect-square" />
        ))}
      </div>
    );
  }

  const acceptMulti = chosen === "multi_image";
  const acceptPdf = chosen === "carousel";
  const accept = acceptPdf ? "application/pdf" : "image/jpeg,image/png,image/webp";

  return (
    <div className="space-y-3">
      {/* AI recommendation */}
      {post.formatReason && (
        <div className="flex items-start gap-2 bg-[#e8f0fe] rounded-2xl px-3.5 py-2.5">
          <Sparkles size={15} className="text-[#1a73e8] mt-0.5 shrink-0" />
          <p className="text-[12px] text-[#1967d2] leading-snug">
            <span className="font-medium">Suggested: {FORMAT_LABEL[post.format]}.</span> {post.formatReason}
          </p>
        </div>
      )}

      {/* Format selector */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
        {FORMATS.map(({ id, label, icon: Icon }) => {
          const active = chosen === id;
          const recommended = post.format === id;
          return (
            <button
              key={id}
              onClick={() => setChosen(id)}
              className={`shrink-0 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-[13px] font-medium border transition-all active:scale-95 ${
                active ? "bg-[#1a73e8] text-white border-[#1a73e8]" : "bg-white text-[#3c4043] border-[#dadce0]"
              }`}
            >
              <Icon size={15} />
              {label}
              {recommended && <Sparkles size={11} className={active ? "text-white" : "text-[#1a73e8]"} />}
            </button>
          );
        })}
      </div>

      {/* Uploaded media preview */}
      {hasMedia && (
        <div className="bg-white rounded-3xl p-3 elevation-1">
          {isDoc ? (
            <a
              href={post.mediaUrls[0]}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3"
            >
              <div className="w-11 h-11 rounded-xl bg-[#fce8e6] flex items-center justify-center">
                <FileText size={20} className="text-[#c5221f]" />
              </div>
              <div>
                <p className="text-[14px] font-medium text-[#1f1f1f]">Carousel PDF uploaded</p>
                <p className="text-[12px] text-[#5f6368]">Tap to preview</p>
              </div>
            </a>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {(post.mediaUrls.length ? post.mediaUrls : [post.imageAssetUrl!]).map((u, i) => (
                <img key={i} src={u} alt={`Media ${i + 1}`} className="w-full rounded-xl object-cover aspect-square" />
              ))}
            </div>
          )}
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full mt-3 h-10 text-[#1a73e8] text-[13px] font-medium"
          >
            {uploading ? "Uploading…" : "Replace media"}
          </button>
        </div>
      )}

      {/* TEXT format */}
      {chosen === "text" && !hasMedia && (
        <div className="bg-white rounded-3xl p-4 elevation-1 space-y-3">
          <p className="text-[13px] text-[#5f6368]">Text-only post — no image needed.</p>
          {post.status !== "IN_REVIEW" && (
            <button
              onClick={markTextReady}
              disabled={busy}
              className="w-full h-12 bg-[#1a73e8] text-white rounded-full font-medium text-[14px] disabled:opacity-60"
            >
              {busy ? "Saving…" : "Mark ready for review"}
            </button>
          )}
        </div>
      )}

      {/* IMAGE / CAROUSEL prompts + upload */}
      {chosen !== "text" && !hasMedia && (
        <div className="bg-[#fef7e0] rounded-3xl p-4 space-y-3">
          <p className="text-[12px] text-[#b06000] font-medium">
            {chosen === "carousel"
              ? "Generate each slide in ChatGPT, combine into one PDF, then upload."
              : chosen === "multi_image"
              ? "Generate each image in ChatGPT, then upload them together."
              : "Paste this prompt into ChatGPT, then upload the image."}
          </p>

          {prompts.length > 0 ? (
            <div className="space-y-2">
              {prompts.map((p, i) => (
                <div key={i} className="bg-white rounded-2xl p-3">
                  {(chosen === "carousel" || chosen === "multi_image") && (
                    <p className="text-[11px] font-medium text-[#5f6368] mb-1">
                      {chosen === "carousel" ? `Slide ${i + 1}` : `Image ${i + 1}`}
                    </p>
                  )}
                  <p className="text-[12px] text-[#3c4043] leading-relaxed">{p}</p>
                  <button
                    onClick={() => copy(p, i)}
                    className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-medium text-[#1a73e8]"
                  >
                    {copiedIdx === i ? <Check size={14} /> : <Copy size={14} />}
                    {copiedIdx === i ? "Copied" : "Copy prompt"}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[12px] text-[#5f6368]">
              Create your {chosen === "carousel" ? "slides" : "image(s)"} and upload below.
            </p>
          )}

          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full h-12 bg-[#1a73e8] text-white rounded-full font-medium text-[14px] flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <Upload size={18} />
            {uploading
              ? "Uploading…"
              : acceptPdf
              ? "Upload PDF"
              : acceptMulti
              ? "Upload images"
              : "Upload image"}
          </button>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept={accept}
        multiple={acceptMulti}
        className="hidden"
        onChange={(e) => upload(e.target.files)}
      />
    </div>
  );
}
