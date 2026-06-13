"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";

const USER_ID = "demo-user";

export default function NewPostPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");

  async function handleSubmit(type: "url" | "text") {
    const value = type === "url" ? url.trim() : text.trim();
    if (!value) {
      toast.error(type === "url" ? "Paste a URL first" : "Write some text first");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          ...(type === "url" ? { url: value } : { text: value }),
          userId: USER_ID,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Something went wrong");
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
    <div className="min-h-full px-5 pt-14 pb-8">
      <div className="mb-6">
        <h1 className="text-lg font-bold text-white">New Post</h1>
        <p className="text-xs text-zinc-500 mt-1">
          Paste a URL or text — AI will draft a post in your style
        </p>
      </div>

      <Tabs defaultValue="url">
        <TabsList className="w-full bg-zinc-900 rounded-xl mb-5 h-11">
          <TabsTrigger value="url" className="flex-1 rounded-lg text-sm">
            URL
          </TabsTrigger>
          <TabsTrigger value="text" className="flex-1 rounded-lg text-sm">
            Paste Text
          </TabsTrigger>
        </TabsList>

        <TabsContent value="url" className="space-y-4">
          <Input
            type="url"
            placeholder="https://example.com/article"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="h-14 bg-zinc-900 border-zinc-700 text-white rounded-xl text-base px-4"
          />
          <p className="text-xs text-zinc-600">
            Works with blog posts, news articles, newsletters
          </p>
          <div className="fixed bottom-20 left-5 right-5">
            <Button
              onClick={() => handleSubmit("url")}
              disabled={loading || !url.trim()}
              className="w-full h-14 bg-[#0A66C2] hover:bg-blue-600 text-white font-semibold rounded-xl text-base"
            >
              {loading ? (
                <><Loader2 size={18} className="mr-2 animate-spin" /> Generating…</>
              ) : (
                <><Sparkles size={18} className="mr-2" /> Generate Post</>
              )}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="text" className="space-y-4">
          <Textarea
            placeholder="Paste an article, newsletter, or your own thoughts here…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="min-h-48 bg-zinc-900 border-zinc-700 text-white rounded-xl text-base p-4 leading-relaxed resize-none"
          />
          <p className="text-xs text-zinc-600">{text.length} characters</p>
          <div className="fixed bottom-20 left-5 right-5">
            <Button
              onClick={() => handleSubmit("text")}
              disabled={loading || !text.trim()}
              className="w-full h-14 bg-[#0A66C2] hover:bg-blue-600 text-white font-semibold rounded-xl text-base"
            >
              {loading ? (
                <><Loader2 size={18} className="mr-2 animate-spin" /> Generating…</>
              ) : (
                <><Sparkles size={18} className="mr-2" /> Generate Post</>
              )}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
