import { createClient } from "@supabase/supabase-js";
import { cleanKey } from "@/lib/env";

const supabase = createClient(
  cleanKey(process.env.SUPABASE_URL),
  cleanKey(process.env.SUPABASE_SERVICE_ROLE_KEY)
);

const BUCKET = "post-images";

export async function ensureBucketExists() {
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === BUCKET);
  if (!exists) {
    await supabase.storage.createBucket(BUCKET, { public: true });
  }
}

function extFor(contentType: string): string {
  if (contentType.includes("pdf")) return "pdf";
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  return "jpg";
}

// Upload one file (image or pdf) under the post's folder, indexed so multiple coexist.
export async function uploadFile(
  postId: string,
  index: number,
  file: Buffer,
  contentType: string
): Promise<string> {
  const path = `${postId}/media-${index}.${extFor(contentType)}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType, upsert: true });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

// Remove every file previously uploaded for a post (best-effort).
export async function clearMedia(postId: string) {
  const { data } = await supabase.storage.from(BUCKET).list(postId);
  if (data?.length) {
    await supabase.storage.from(BUCKET).remove(data.map((f) => `${postId}/${f.name}`));
  }
}
