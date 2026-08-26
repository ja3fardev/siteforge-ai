"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, ArrowLeft, Save, Loader2, Globe, User as UserIcon } from "lucide-react";

export default function SettingsPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [username, setUsername] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/user")
        .then((r) => r.json())
        .then((d) => {
          if (d.user) {
            setName(d.user.name || "");
            setBio(d.user.bio || "");
            setUsername(d.user.username || "");
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [status]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await fetch("/api/user", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, bio }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 text-muted animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4 text-muted" />
            <span className="text-sm text-muted">Back to Dashboard</span>
          </Link>
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-foreground text-sm">SiteForge</span>
          </Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-foreground mb-8">Profile Settings</h1>

        <div className="space-y-6">
          {/* Profile */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 mb-5">
              <UserIcon className="w-4 h-4 text-accent" />
              <h2 className="text-base font-semibold text-foreground">Profile</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-muted mb-1.5">Display Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:border-accent/50 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-muted mb-1.5">Username</label>
                <div className="flex items-center">
                  <span className="text-sm text-muted mr-1">@</span>
                  <input
                    type="text"
                    value={username}
                    disabled
                    className="w-full px-4 py-2.5 rounded-xl bg-background/50 border border-border text-muted text-sm cursor-not-allowed"
                  />
                </div>
                <p className="text-xs text-muted mt-1">Username cannot be changed</p>
              </div>
              <div>
                <label className="block text-sm text-muted mb-1.5">Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about yourself..."
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground placeholder:text-muted focus:outline-none focus:border-accent/50 text-sm resize-none"
                />
              </div>
            </div>
          </div>

          {/* Subdomain */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 mb-5">
              <Globe className="w-4 h-4 text-accent" />
              <h2 className="text-base font-semibold text-foreground">Subdomain</h2>
            </div>
            <div>
              <label className="block text-sm text-muted mb-1.5">Your subdomain</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={subdomain}
                  onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  placeholder="my-site"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-background border border-border text-foreground placeholder:text-muted focus:outline-none focus:border-accent/50 text-sm"
                />
                <span className="text-sm text-muted">.siteforge.dev</span>
              </div>
              <p className="text-xs text-muted mt-1.5">
                Choose a unique subdomain for your published projects
              </p>
            </div>
          </div>

          {/* Save */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-medium transition-colors"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? "Saving..." : "Save Changes"}
            </button>
            {saved && (
              <span className="text-sm text-green-400 animate-fade-in">Saved!</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
