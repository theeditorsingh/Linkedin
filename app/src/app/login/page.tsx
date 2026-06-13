"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Lock } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) throw new Error("Wrong password");
      router.push("/");
      router.refresh();
    } catch {
      toast.error("Wrong password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-[#1a73e8] mb-4 elevation-2">
            <span className="text-white font-bold text-lg">in</span>
          </div>
          <h1 className="text-[24px] font-medium text-[#1f1f1f] tracking-tight">LinkedIn Autopilot</h1>
          <p className="text-[14px] text-[#5f6368] mt-1">Your personal content engine</p>
        </div>

        <form onSubmit={handleLogin} className="bg-white rounded-3xl p-5 elevation-1 space-y-4">
          <div className="relative">
            <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9aa0a6]" />
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-14 pl-11 pr-4 bg-[#f1f3f4] border border-[#dadce0] text-[#1f1f1f] rounded-2xl text-[15px] focus:outline-none focus:border-[#1a73e8]"
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full h-14 bg-[#1a73e8] text-white font-medium rounded-full text-[15px] flex items-center justify-center disabled:opacity-50 active:scale-[0.99] transition-transform"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
