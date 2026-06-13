"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { CheckCircle, XCircle, ExternalLink, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface SettingsData {
  linkedinConnected: boolean;
  linkedinExpiresAt: string | null;
  memberUrn: string | null;
}

export default function SettingsPage() {
  const [data, setData] = useState<SettingsData | null>(null);
  const searchParams = useSearchParams();
  const [copiedSlack, setCopiedSlack] = useState(false);
  const appUrl = typeof window !== "undefined" ? window.location.origin : "";

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then(setData)
      .catch(console.error);
  }, []);

  useEffect(() => {
    const linkedin = searchParams.get("linkedin");
    const error = searchParams.get("error");
    if (linkedin === "connected") toast.success("LinkedIn connected!");
    if (error === "auth_failed") toast.error("LinkedIn auth failed — check app products (see below).");
    if (error === "no_code") toast.error("LinkedIn didn't return an auth code.");
  }, [searchParams]);

  async function copySlackUrl() {
    await navigator.clipboard.writeText(`${appUrl}/api/slack`);
    setCopiedSlack(true);
    toast.success("Copied!");
    setTimeout(() => setCopiedSlack(false), 2000);
  }

  async function handleLogout() {
    await fetch("/api/auth/login", { method: "DELETE" });
    window.location.href = "/login";
  }

  return (
    <div className="px-5 pt-14 pb-28 space-y-6">
      <h1 className="text-lg font-bold text-white">Settings</h1>

      {/* LinkedIn */}
      <section className="bg-zinc-900 rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-[#0A66C2] rounded-md flex items-center justify-center">
            <span className="text-white font-bold text-xs">in</span>
          </div>
          <h2 className="text-sm font-semibold text-white">LinkedIn Account</h2>
        </div>

        {data === null ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : data.linkedinConnected ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-emerald-400 flex-shrink-0" />
              <span className="text-sm text-emerald-400 font-medium">Connected</span>
            </div>
            {data.memberUrn && (
              <p className="text-xs text-zinc-500 font-mono">{data.memberUrn}</p>
            )}
            {data.linkedinExpiresAt && (
              <p className="text-xs text-zinc-600">
                Token expires: {format(new Date(data.linkedinExpiresAt), "MMM d, yyyy")}
              </p>
            )}
            <a href="/api/auth/linkedin">
              <Button variant="outline" className="w-full h-11 border-zinc-700 text-zinc-300 rounded-xl mt-1 text-sm">
                Reconnect LinkedIn
              </Button>
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <XCircle size={16} className="text-red-400 flex-shrink-0" />
              <span className="text-sm text-red-400">Not connected</span>
            </div>
            <p className="text-xs text-zinc-500">
              Connect your LinkedIn account to enable automatic publishing.
            </p>
            <div className="bg-amber-950 border border-amber-800 rounded-xl p-3 space-y-1">
              <p className="text-xs text-amber-400 font-medium">Required: 2 products on your LinkedIn App</p>
              <p className="text-xs text-amber-600">1. Sign In with LinkedIn using OpenID Connect</p>
              <p className="text-xs text-amber-600">2. Share on LinkedIn</p>
            </div>
            <a href="/api/auth/linkedin">
              <Button className="w-full h-12 bg-[#0A66C2] hover:bg-blue-600 text-white rounded-xl font-semibold text-sm">
                <ExternalLink size={16} className="mr-2" />
                Connect LinkedIn
              </Button>
            </a>
          </div>
        )}
      </section>

      {/* Slack */}
      <section className="bg-zinc-900 rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-[#4A154B] rounded-md flex items-center justify-center">
            <span className="text-white font-bold text-xs">#</span>
          </div>
          <h2 className="text-sm font-semibold text-white">Slack Integration</h2>
        </div>

        <p className="text-xs text-zinc-400 leading-relaxed">
          Add this URL as an Interactivity Request URL in your Slack App settings to enable Approve/Reject from Slack.
        </p>

        <div className="bg-zinc-800 rounded-xl px-4 py-3 flex items-center justify-between gap-2">
          <p className="text-xs text-zinc-300 font-mono truncate">{appUrl}/api/slack</p>
          <button onClick={copySlackUrl} className="flex-shrink-0 text-zinc-400 active:text-white">
            {copiedSlack ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
          </button>
        </div>

        <p className="text-xs text-zinc-500 leading-relaxed">
          Required env vars: <span className="font-mono text-zinc-400">SLACK_BOT_TOKEN</span>, {" "}
          <span className="font-mono text-zinc-400">SLACK_SIGNING_SECRET</span>, {" "}
          <span className="font-mono text-zinc-400">SLACK_CHANNEL_ID</span>
        </p>
      </section>

      {/* Schedule info */}
      <section className="bg-zinc-900 rounded-2xl p-5 space-y-2">
        <h2 className="text-sm font-semibold text-white">Auto-Scheduler</h2>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Posts are published via QStash at the exact scheduled time. A hourly cron runs as a safety net.
          Make sure <span className="font-mono text-zinc-300">QSTASH_TOKEN</span>, {" "}
          <span className="font-mono text-zinc-300">QSTASH_CURRENT_SIGNING_KEY</span>, and {" "}
          <span className="font-mono text-zinc-300">QSTASH_NEXT_SIGNING_KEY</span> are set in Vercel.
        </p>
      </section>

      {/* Style Profile */}
      <section className="bg-zinc-900 rounded-2xl p-5 space-y-3">
        <h2 className="text-sm font-semibold text-white">Writing Style</h2>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Add example posts to train the AI on your writing style and tone.
        </p>
        <a href="/style-profile">
          <Button variant="outline" className="w-full h-11 border-zinc-700 text-zinc-300 rounded-xl text-sm">
            Manage Style Profile →
          </Button>
        </a>
      </section>

      {/* App */}
      <section className="bg-zinc-900 rounded-2xl p-5 space-y-2">
        <h2 className="text-sm font-semibold text-white">App</h2>
        <p className="text-xs text-zinc-400 font-mono">{appUrl}</p>
        <Button
          onClick={handleLogout}
          variant="outline"
          className="w-full h-11 border-red-900 text-red-400 rounded-xl mt-2 text-sm"
        >
          Log out
        </Button>
      </section>
    </div>
  );
}
