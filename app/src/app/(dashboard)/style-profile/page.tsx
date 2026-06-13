"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Trash2, Save, Loader2 } from "lucide-react";

export default function StyleProfilePage() {
  const [examples, setExamples] = useState<string[]>([""]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/style-profile")
      .then((r) => r.json())
      .then((data) => {
        if (data?.examplePosts?.length) setExamples(data.examplePosts);
      })
      .finally(() => setLoading(false));
  }, []);

  function updateExample(i: number, val: string) {
    setExamples((prev) => prev.map((e, idx) => (idx === i ? val : e)));
  }

  function addExample() {
    setExamples((prev) => [...prev, ""]);
  }

  function removeExample(i: number) {
    setExamples((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function save() {
    const filled = examples.filter((e) => e.trim().length > 0);
    if (filled.length === 0) {
      toast.error("Add at least one example post");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/style-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examplePosts: filled }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success(`Saved ${filled.length} example posts`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full pt-20">
        <Loader2 size={24} className="animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="px-5 pt-14 pb-32">
      <div className="mb-6">
        <h1 className="text-lg font-bold text-white">Style Profile</h1>
        <p className="text-xs text-zinc-500 mt-1">
          Paste your best LinkedIn posts — AI will write in your exact style
        </p>
      </div>

      <div className="space-y-4">
        {examples.map((ex, i) => (
          <div key={i} className="relative">
            <Textarea
              placeholder={`Paste one of your LinkedIn posts here…\n\nExample post ${i + 1}`}
              value={ex}
              onChange={(e) => updateExample(i, e.target.value)}
              className="min-h-36 bg-zinc-900 border-zinc-700 text-white rounded-xl text-sm p-4 leading-relaxed resize-none pr-10"
            />
            {examples.length > 1 && (
              <button
                onClick={() => removeExample(i)}
                className="absolute top-3 right-3 text-zinc-600 active:text-red-400"
              >
                <Trash2 size={14} />
              </button>
            )}
            <p className="text-xs text-zinc-600 mt-1 text-right">
              {ex.length} chars
            </p>
          </div>
        ))}
      </div>

      <button
        onClick={addExample}
        className="flex items-center gap-2 text-sm text-[#0A66C2] mt-4 mb-6"
      >
        <Plus size={16} />
        Add another post ({examples.filter((e) => e.trim()).length}/20 added)
      </button>

      <div className="fixed bottom-20 left-5 right-5">
        <Button
          onClick={save}
          disabled={saving}
          className="w-full h-14 bg-[#0A66C2] hover:bg-blue-600 text-white font-semibold rounded-xl text-base"
        >
          {saving ? (
            <><Loader2 size={18} className="mr-2 animate-spin" /> Saving…</>
          ) : (
            <><Save size={18} className="mr-2" /> Save Style Profile</>
          )}
        </Button>
      </div>
    </div>
  );
}
