"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Save, Loader2, ArrowLeft } from "lucide-react";

export default function StyleProfilePage() {
  const router = useRouter();
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
      <div className="flex items-center justify-center pt-24">
        <Loader2 size={24} className="animate-spin text-[#5f6368]" />
      </div>
    );
  }

  const filledCount = examples.filter((e) => e.trim()).length;

  return (
    <div className="px-5 pt-12 pb-36">
      <button
        onClick={() => router.push("/settings")}
        className="inline-flex items-center gap-1 text-[14px] text-[#1a73e8] mb-3"
      >
        <ArrowLeft size={18} /> Settings
      </button>

      <h1 className="text-[22px] font-medium text-[#1f1f1f] tracking-tight">Writing style</h1>
      <p className="text-[13px] text-[#5f6368] mt-1 mb-6">
        Paste your best LinkedIn posts — the AI will write in your exact voice.
      </p>

      <div className="space-y-3">
        {examples.map((ex, i) => (
          <div key={i} className="bg-white rounded-3xl p-4 elevation-1 relative">
            <textarea
              placeholder={`Paste one of your LinkedIn posts here…  (example ${i + 1})`}
              value={ex}
              onChange={(e) => updateExample(i, e.target.value)}
              rows={5}
              className="w-full bg-transparent text-[#3c4043] text-[14px] leading-relaxed resize-none focus:outline-none pr-8"
            />
            {examples.length > 1 && (
              <button
                onClick={() => removeExample(i)}
                className="absolute top-3 right-3 text-[#9aa0a6] active:text-[#c5221f]"
              >
                <Trash2 size={16} />
              </button>
            )}
            <p className="text-[11px] text-[#9aa0a6] text-right mt-1">{ex.length} chars</p>
          </div>
        ))}
      </div>

      <button
        onClick={addExample}
        className="flex items-center gap-2 text-[14px] font-medium text-[#1a73e8] mt-4"
      >
        <Plus size={18} />
        Add another post · {filledCount} added
      </button>

      <div className="fixed bottom-24 left-5 right-5">
        <button
          onClick={save}
          disabled={saving}
          className="w-full h-14 bg-[#1a73e8] text-white font-medium rounded-full text-[15px] flex items-center justify-center gap-2 elevation-2 disabled:opacity-60 active:scale-[0.99] transition-transform"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          {saving ? "Saving…" : "Save style profile"}
        </button>
      </div>
    </div>
  );
}
