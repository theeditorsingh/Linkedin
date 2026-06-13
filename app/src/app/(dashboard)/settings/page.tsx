"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { CheckCircle2, XCircle, ExternalLink, Copy, Check, ChevronRight, LogOut } from "lucide-react";
import { toast } from "sonner";

interface SettingsData {
  linkedinConnected: boolean;
  linkedinExpiresAt: string | null;
  memberUrn: string | null;
}

function LinkedInAuthToast() {
  const searchParams = useSearchParams();
  useEffect(() => {
    const linkedin = searchParams.get("linkedin");
    const error = searchParams.get("error");
    if (linkedin === "connected") toast.success("LinkedIn connected!");
    if (error === "auth_failed") toast.error("LinkedIn auth failed — check required products below.");
    if (error === "no_code") toast.error("LinkedIn didn't return an auth code.");
  }, [searchParams]);
  return null;
}

export default function SettingsPage() {
  const router = useRouter();
  const [data, setData] = useState<SettingsData | null>(null);
  const [copied, setCopied] = useState(false);
  const appUrl = typeof window !== "undefined" ? window.location.origin : "";

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then(setData).catch(console.error);
  }, []);

  async function copySlackUrl() {
    await navigator.clipboard.writeText(`${appUrl}/api/slack`);
    setCopied(true);
    toast.success("Copied!");
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleLogout() {
    await fetch("/api/auth/login", { method: "DELETE" });
    window.location.href = "/login";
  }

  return (
    <div className="px-5 pt-12 pb-28 space-y-4">
      <Suspense fallback={null}>
        <LinkedInAuthToast />
      </Suspense>

      <h1 className="text-[22px] font-medium text-[#1f1f1f] tracking-tight mb-2">Settings</h1>

      {/* LinkedIn */}
      <section className="bg-white rounded-3xl p-5 elevation-1 space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#0A66C2] rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-[13px]">in</span>
          </div>
          <h2 className="text-[15px] font-medium text-[#1f1f1f]">LinkedIn account</h2>
        </div>

        {data === null ? (
          <p className="text-[14px] text-[#5f6368]">Loading…</p>
        ) : data.linkedinConnected ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="text-[#1e8e3e]" />
              <span className="text-[14px] text-[#1e8e3e] font-medium">Connected</span>
            </div>
            {data.linkedinExpiresAt && (
              <p className="text-[12px] text-[#9aa0a6]">
                Token valid until {format(new Date(data.linkedinExpiresAt), "MMM d, yyyy")}
              </p>
            )}
            <div className="bg-[#f1f3f4] rounded-2xl p-3">
              <p className="text-[12px] text-[#5f6368] leading-relaxed">
                To remove a published post, <span className="font-medium">delete it from the app</span> — that
                deletes it on LinkedIn too.
              </p>
            </div>
            <a href="/api/auth/linkedin">
              <button className="w-full h-11 bg-white border border-[#dadce0] text-[#3c4043] rounded-full text-[14px] font-medium">
                Reconnect
              </button>
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <XCircle size={18} className="text-[#c5221f]" />
              <span className="text-[14px] text-[#c5221f]">Not connected</span>
            </div>
            <div className="bg-[#fef7e0] rounded-2xl p-3 space-y-1">
              <p className="text-[12px] text-[#b06000] font-medium">Your LinkedIn app needs 2 products:</p>
              <p className="text-[12px] text-[#b06000]">1. Sign In with LinkedIn using OpenID Connect</p>
              <p className="text-[12px] text-[#b06000]">2. Share on LinkedIn</p>
            </div>
            <a href="/api/auth/linkedin">
              <button className="w-full h-12 bg-[#1a73e8] text-white rounded-full font-medium text-[14px] flex items-center justify-center gap-2">
                <ExternalLink size={16} />
                Connect LinkedIn
              </button>
            </a>
          </div>
        )}
      </section>

      {/* Writing style — navigates */}
      <button
        onClick={() => router.push("/style-profile")}
        className="w-full bg-white rounded-3xl p-5 elevation-1 flex items-center justify-between active:scale-[0.99] transition-transform"
      >
        <div className="text-left">
          <h2 className="text-[15px] font-medium text-[#1f1f1f]">Writing style</h2>
          <p className="text-[13px] text-[#5f6368] mt-0.5">Train the AI on your example posts</p>
        </div>
        <ChevronRight size={20} className="text-[#bdc1c6]" />
      </button>

      {/* Slack */}
      <section className="bg-white rounded-3xl p-5 elevation-1 space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#4A154B] rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-[15px]">#</span>
          </div>
          <h2 className="text-[15px] font-medium text-[#1f1f1f]">Slack (optional)</h2>
        </div>
        <p className="text-[13px] text-[#5f6368] leading-relaxed">
          Add this as the Interactivity Request URL in your Slack app to approve posts from Slack.
        </p>
        <div className="bg-[#f1f3f4] rounded-2xl px-4 py-3 flex items-center justify-between gap-2">
          <p className="text-[12px] text-[#3c4043] font-mono truncate">{appUrl}/api/slack</p>
          <button onClick={copySlackUrl} className="flex-shrink-0 text-[#5f6368]">
            {copied ? <Check size={16} className="text-[#1e8e3e]" /> : <Copy size={16} />}
          </button>
        </div>
      </section>

      {/* App */}
      <section className="bg-white rounded-3xl p-5 elevation-1 space-y-3">
        <h2 className="text-[15px] font-medium text-[#1f1f1f]">App</h2>
        <p className="text-[12px] text-[#9aa0a6] font-mono break-all">{appUrl}</p>
        <button
          onClick={handleLogout}
          className="w-full h-11 bg-white border border-[#f4c7c3] text-[#c5221f] rounded-full text-[14px] font-medium flex items-center justify-center gap-2"
        >
          <LogOut size={16} />
          Log out
        </button>
      </section>
    </div>
  );
}
