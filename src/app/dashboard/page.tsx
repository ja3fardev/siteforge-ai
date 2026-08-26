"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Sparkles, Plus, FolderOpen, LogOut, Settings, Trash2,
  ExternalLink, Loader2, Search, Code2, Clock
} from "lucide-react";

interface Project {
  id: string;
  name: string;
  description?: string;
  files: { name: string; path: string; content: string; language: string }[];
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/projects")
        .then((r) => r.json())
        .then((d) => { setProjects(d.projects || []); setLoading(false); })
        .catch(() => setLoading(false));
    }
  }, [status]);

  const createProject = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, description: newDesc }),
      });
      const data = await res.json();
      if (data.project) {
        setProjects((prev) => [data.project, ...prev]);
        setShowNewModal(false);
        setNewName("");
        setNewDesc("");
        router.push(`/builder/${data.project.id}`);
      }
    } catch {}
    setCreating(false);
  };

  const deleteProject = async (id: string) => {
    if (!confirm("Delete this project?")) return;
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    setProjects((prev) => prev.filter((p) => p.id !== id));
  };

  const filtered = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
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
      {/* Navbar */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-foreground">SiteForge</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/settings"
              className="p-2 rounded-lg hover:bg-background text-muted hover:text-foreground transition-colors"
            >
              <Settings className="w-4 h-4" />
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="p-2 rounded-lg hover:bg-background text-muted hover:text-foreground transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Your Projects</h1>
            <p className="text-sm text-muted mt-1">
              Welcome back, {session?.user?.name || "Builder"}
            </p>
          </div>
          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Project
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects..."
            className="w-full sm:w-80 pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border text-foreground placeholder:text-muted focus:outline-none focus:border-accent/50 text-sm"
          />
        </div>

        {/* Projects grid */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-card border border-border flex items-center justify-center mb-4">
              <FolderOpen className="w-8 h-8 text-muted" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              {projects.length === 0 ? "No projects yet" : "No matching projects"}
            </h3>
            <p className="text-sm text-muted mb-6 max-w-sm">
              {projects.length === 0
                ? "Create your first project and start building with AI"
                : "Try a different search term"}
            </p>
            {projects.length === 0 && (
              <button
                onClick={() => setShowNewModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Project
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((project) => (
              <div
                key={project.id}
                className="group rounded-xl border border-border bg-card hover:border-accent/30 transition-all"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <Link
                      href={`/builder/${project.id}`}
                      className="text-lg font-semibold text-foreground hover:text-accent transition-colors"
                    >
                      {project.name}
                    </Link>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => deleteProject(project.id)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {project.description && (
                    <p className="text-sm text-muted mb-3 line-clamp-2">{project.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted">
                    <div className="flex items-center gap-1.5">
                      <Code2 className="w-3 h-3" />
                      {project.files.length} files
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      {formatDate(project.updatedAt)}
                    </div>
                    {project.published && (
                      <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 text-xs">
                        Published
                      </span>
                    )}
                  </div>
                </div>
                <div className="px-5 py-3 border-t border-border flex items-center justify-between">
                  <Link
                    href={`/builder/${project.id}`}
                    className="text-sm text-accent hover:text-accent-hover transition-colors flex items-center gap-1"
                  >
                    Open Builder
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Project Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md mx-4 rounded-2xl border border-border bg-card p-6 animate-fade-in">
            <h2 className="text-lg font-semibold text-foreground mb-4">New Project</h2>
            <div className="space-y-4">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Project name"
                autoFocus
                className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground placeholder:text-muted focus:outline-none focus:border-accent/50 text-sm"
              />
              <textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Description (optional)"
                rows={2}
                className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground placeholder:text-muted focus:outline-none focus:border-accent/50 text-sm resize-none"
              />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setShowNewModal(false); setNewName(""); setNewDesc(""); }}
                className="px-4 py-2 rounded-xl text-sm text-muted hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createProject}
                disabled={!newName.trim() || creating}
                className="px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-medium transition-colors"
              >
                {creating ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
