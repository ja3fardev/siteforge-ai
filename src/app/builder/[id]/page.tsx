"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  Sparkles, Send, Code2, Eye, Copy, Check, RotateCcw, Menu, X,
  ChevronDown, ArrowLeft, Loader2, Save, FileCode, FolderOpen,
  Globe, EyeOff
} from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface FileEntry {
  name: string;
  path: string;
  content: string;
  language: string;
}

interface Project {
  id: string;
  name: string;
  description?: string;
  files: FileEntry[];
  published: boolean;
}

const SUGGESTIONS = [
  "Build a landing page for a SaaS product with pricing section",
  "Create a dashboard with sidebar navigation and charts",
  "Make a portfolio website with animated hero section",
  "Design an e-commerce product page with image gallery",
  "Build a React app with components, pages, and routing",
  "Create a full-stack project with API routes and database",
];

function getLangFromFile(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    tsx: "tsx", jsx: "jsx", ts: "typescript", js: "javascript",
    css: "css", html: "html", json: "json", md: "markdown",
    py: "python", rb: "ruby", go: "go", rs: "rust",
  };
  return map[ext || ""] || "text";
}

function getFileIcon(lang: string) {
  return <FileCode className="w-4 h-4" />;
}

export default function BuilderPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"code" | "preview">("preview");
  const [activeFile, setActiveFile] = useState<number>(0);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [saving, setSaving] = useState(false);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated" && projectId) {
      fetch(`/api/projects/${projectId}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.project) {
            setProject(d.project);
            setFiles(d.project.files || []);
            if (d.project.files?.length) setActiveFile(0);
          } else {
            router.push("/dashboard");
          }
        })
        .catch(() => router.push("/dashboard"));
    }
  }, [status, projectId, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const generateId = () => Math.random().toString(36).substring(2, 11);

  const extractCodeBlocks = (content: string) => {
    const regex = /```(\w+)?\n([\s\S]*?)```/g;
    const blocks: { lang: string; code: string; filename?: string }[] = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
      const lang = match[1] || "text";
      const code = match[2].trim();
      // Try to extract filename from comment like // filename: App.tsx
      const filenameMatch = code.match(/^(?:\/\/|#|\/\*|\*)\s*(?:filename|file|path)[:\s]+(.+?)(?:\*\/)?$/m);
      blocks.push({ lang, code, filename: filenameMatch?.[1]?.trim() });
    }
    return blocks;
  };

  const parseFilesFromResponse = (content: string): FileEntry[] => {
    const blocks = extractCodeBlocks(content);
    const newFiles: FileEntry[] = [];

    for (const block of blocks) {
      let filename = block.filename;
      if (!filename) {
        // Infer filename from lang
        const extMap: Record<string, string> = {
          html: "index.html", css: "styles.css", javascript: "script.js",
          typescript: "app.ts", tsx: "App.tsx", jsx: "App.jsx",
          json: "config.json", python: "app.py", markdown: "README.md",
        };
        filename = extMap[block.lang] || `file.${block.lang}`;
      }

      newFiles.push({
        name: filename,
        path: `/${filename}`,
        content: block.code,
        language: block.lang,
      });
    }

    // If only HTML blocks, combine into single file
    if (newFiles.length === 1 && newFiles[0].language === "html") {
      return [{
        name: "index.html",
        path: "/index.html",
        content: newFiles[0].content,
        language: "html",
      }];
    }

    return newFiles;
  };

  const handleSubmit = async (e?: React.FormEvent, suggestedMessage?: string) => {
    e?.preventDefault();
    const userMessage = suggestedMessage || input.trim();
    if (!userMessage || isLoading) return;

    const userMsg: Message = {
      id: generateId(),
      role: "user",
      content: userMessage,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const systemPrompt = `You are an expert web developer AI. When the user asks you to build a website, generate clean, modern, production-ready code.

IMPORTANT RULES:
1. Generate multiple files when appropriate (components, styles, scripts, configs, etc.)
2. Use separate code blocks for each file
3. At the TOP of each code block, add a comment with the filename: // filename: path/to/file.ext
4. Use modern frameworks: React/Next.js, Tailwind CSS, TypeScript
5. Create proper project structure with components/, pages/, styles/ directories
6. Use modern design principles: clean typography, proper spacing, responsive layouts
7. Make animations smooth and subtle
8. Always make designs mobile-responsive
9. Use a dark theme by default unless specified otherwise
10. After the code blocks, briefly explain the project structure

User request: ${userMessage}`;

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: systemPrompt, chatId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to get response");
      if (data.chatId) setChatId(data.chatId);

      const assistantMsg: Message = {
        id: generateId(),
        role: "assistant",
        content: data.reply,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // Parse multi-file response
      const newFiles = parseFilesFromResponse(data.reply);
      if (newFiles.length > 0) {
        setFiles((prev) => {
          const merged = [...prev];
          for (const f of newFiles) {
            const idx = merged.findIndex((m) => m.path === f.path);
            if (idx >= 0) {
              merged[idx] = f;
            } else {
              merged.push(f);
            }
          }
          return merged;
        });
        setActiveFile(files.length > 0 ? files.length - 1 : 0);
      }
    } catch (error) {
      const errorMsg: Message = {
        id: generateId(),
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const copyCode = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const saveProject = async () => {
    setSaving(true);
    try {
      await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files }),
      });
    } catch {}
    setSaving(false);
  };

  const getPreviewContent = () => {
    const htmlFile = files.find((f) => f.name === "index.html" || f.language === "html");
    if (htmlFile) return htmlFile.content;
    // Fallback: try to build preview from all files
    const cssFiles = files.filter((f) => f.language === "css");
    const jsFiles = files.filter((f) => f.language === "javascript" || f.language === "typescript");
    const htmlParts: string[] = ["<html><head>"];
    cssFiles.forEach((f) => htmlParts.push(`<style>${f.content}</style>`));
    htmlParts.push("</head><body>");
    jsFiles.forEach((f) => htmlParts.push(`<script>${f.content}</script>`));
    htmlParts.push("</body></html>");
    return htmlParts.join("\n");
  };

  const renderMessage = (msg: Message, index: number) => {
    const codeBlocks = extractCodeBlocks(msg.content);
    let textContent = msg.content;
    codeBlocks.forEach((block) => {
      const escaped = block.code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\n/g, "\\n");
      textContent = textContent.replace(new RegExp(`\`\`\`\\w*\\n[\\s\\S]*?${escaped}[\\s\\S]*?\`\`\``, "g"), "");
    });
    textContent = textContent.trim();

    return (
      <div key={msg.id} className="message-enter">
        <div className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
          {msg.role === "assistant" && (
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
          )}
          <div
            className={`max-w-[80%] rounded-2xl px-4 py-3 ${
              msg.role === "user" ? "bg-accent text-white" : "bg-card border border-border"
            }`}
          >
            {msg.role === "assistant" && textContent && (
              <div className="text-sm text-foreground/90 whitespace-pre-wrap">{textContent}</div>
            )}
            {msg.role === "user" && <p className="text-sm">{msg.content}</p>}
            {codeBlocks.length > 0 && (
              <div className="mt-3 space-y-3">
                {codeBlocks.map((block, i) => (
                  <div key={i} className="code-block">
                    <div className="flex items-center justify-between px-3 py-2 bg-[#1a1a1a] border-b border-border">
                      <div className="flex items-center gap-2">
                        <Code2 className="w-3.5 h-3.5 text-muted" />
                        <span className="text-xs text-muted font-mono">{block.filename || block.lang}</span>
                      </div>
                      <button
                        onClick={() => copyCode(block.code, index * 100 + i)}
                        className="flex items-center gap-1 text-xs text-muted hover:text-foreground transition-colors"
                      >
                        {copiedIndex === index * 100 + i ? (
                          <><Check className="w-3 h-3 text-green-400" /><span className="text-green-400">Copied!</span></>
                        ) : (
                          <><Copy className="w-3 h-3" /><span>Copy</span></>
                        )}
                      </button>
                    </div>
                    <SyntaxHighlighter
                      language={block.lang}
                      style={oneDark}
                      customStyle={{
                        margin: 0, padding: "16px", fontSize: "13px",
                        lineHeight: "1.6", background: "#0d0d0d", borderRadius: "0 0 8px 8px",
                      }}
                      showLineNumbers={false}
                    >
                      {block.code}
                    </SyntaxHighlighter>
                  </div>
                ))}
              </div>
            )}
          </div>
          {msg.role === "user" && (
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center">
              <span className="text-sm font-medium text-foreground">U</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (status === "loading" || !project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 text-muted animate-spin" />
      </div>
    );
  }

  const previewContent = files.length > 0 ? getPreviewContent() : null;

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={`${sidebarOpen ? "w-72" : "w-0"} transition-all duration-300 overflow-hidden border-r border-border bg-card flex flex-col`}
      >
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-foreground">SiteForge</span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 rounded-lg hover:bg-background text-muted hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Files list */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="flex items-center justify-between px-3 mb-2">
            <p className="text-xs font-medium text-muted uppercase tracking-wider">Files</p>
            <span className="text-xs text-muted">{files.length}</span>
          </div>
          <div className="space-y-0.5">
            {files.map((file, i) => (
              <button
                key={file.path}
                onClick={() => setActiveFile(i)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeFile === i
                    ? "bg-accent/10 text-accent"
                    : "text-muted hover:text-foreground hover:bg-background"
                }`}
              >
                {getFileIcon(file.language)}
                <span className="text-xs font-mono truncate">{file.name}</span>
              </button>
            ))}
          </div>
          {files.length === 0 && (
            <div className="px-3 py-6 text-center">
              <FolderOpen className="w-8 h-8 text-muted/50 mx-auto mb-2" />
              <p className="text-xs text-muted">No files yet</p>
              <p className="text-xs text-muted mt-1">Start chatting to generate files</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-3 border-t border-border space-y-2">
          <button
            onClick={saveProject}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-accent/10 hover:bg-accent/20 text-accent text-xs font-medium transition-colors"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {saving ? "Saving..." : "Save Project"}
          </button>
          <button
            onClick={() => { setMessages([]); setChatId(null); }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl hover:bg-background text-muted text-xs transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            New Chat
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 border-b border-border bg-card/50 backdrop-blur-sm flex items-center px-4 gap-3">
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-background text-muted hover:text-foreground transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          <Link href="/dashboard" className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
          <div className="w-px h-5 bg-border" />
          <span className="text-sm font-medium text-foreground truncate">{project.name}</span>
          <div className="flex-1" />
          <div className="flex items-center gap-2 text-xs text-muted">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span>Online</span>
          </div>
        </header>

        {messages.length === 0 ? (
          /* Welcome screen */
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="max-w-2xl w-full space-y-8">
              <div className="text-center space-y-4">
                <h1 className="text-4xl font-bold">
                  <span className="gradient-text">What do you want to build?</span>
                </h1>
                <p className="text-lg text-muted max-w-md mx-auto">
                  Describe your website and AI will generate production-ready code with multiple files.
                </p>
              </div>

              <form onSubmit={(e) => handleSubmit(e)} className="relative">
                <div className="relative rounded-2xl border border-border bg-card glow-hover transition-all duration-300 focus-within:border-accent/50 focus-within:glow">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Describe the website you want to build..."
                    rows={1}
                    className="w-full bg-transparent px-5 py-4 pr-14 text-foreground placeholder:text-muted resize-none focus:outline-none text-sm"
                    style={{ minHeight: "56px", maxHeight: "200px" }}
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className="absolute right-3 bottom-3 p-2.5 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-30 disabled:cursor-not-allowed text-white transition-all duration-200"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    onClick={(e) => handleSubmit(e, s)}
                    className="suggestion-card text-left"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Chat + Preview */
          <div className="flex-1 flex min-h-0">
            {/* Messages panel */}
            <div className={`${previewContent ? "w-1/2" : "w-full"} flex flex-col border-r ${previewContent ? "border-border" : "border-transparent"}`}>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, i) => renderMessage(msg, i))}
                {isLoading && (
                  <div className="message-enter flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-card border border-border rounded-2xl px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                          <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                          <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                        <span className="text-xs text-muted">Generating...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t border-border">
                <form onSubmit={(e) => handleSubmit(e)} className="relative">
                  <div className="relative rounded-2xl border border-border bg-card glow-hover transition-all duration-300 focus-within:border-accent/50 focus-within:glow">
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Follow up or ask for changes..."
                      rows={1}
                      className="w-full bg-transparent px-5 py-4 pr-14 text-foreground placeholder:text-muted resize-none focus:outline-none text-sm"
                      style={{ minHeight: "56px", maxHeight: "200px" }}
                      disabled={isLoading}
                    />
                    <button
                      type="submit"
                      disabled={!input.trim() || isLoading}
                      className="absolute right-3 bottom-3 p-2.5 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-30 disabled:cursor-not-allowed text-white transition-all duration-200"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Preview / Code panel */}
            {previewContent && (
              <div className="w-1/2 flex flex-col min-h-0">
                <div className="flex items-center gap-1 px-4 py-2 border-b border-border bg-card/50">
                  <button
                    onClick={() => setActiveTab("preview")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      activeTab === "preview" ? "bg-accent/10 text-accent" : "text-muted hover:text-foreground"
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Preview
                  </button>
                  <button
                    onClick={() => setActiveTab("code")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      activeTab === "code" ? "bg-accent/10 text-accent" : "text-muted hover:text-foreground"
                    }`}
                  >
                    <Code2 className="w-3.5 h-3.5" />
                    Code
                  </button>
                  <div className="flex-1" />
                  {files.length > 0 && (
                    <select
                      value={activeFile}
                      onChange={(e) => setActiveFile(Number(e.target.value))}
                      className="text-xs bg-background border border-border rounded-lg px-2 py-1 text-muted focus:outline-none"
                    >
                      {files.map((f, i) => (
                        <option key={f.path} value={i}>{f.name}</option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="flex-1 overflow-auto bg-white">
                  {activeTab === "preview" ? (
                    <iframe
                      srcDoc={previewContent}
                      className="w-full h-full border-0"
                      title="Preview"
                      sandbox="allow-scripts allow-same-origin"
                    />
                  ) : (
                    <div className="overflow-auto h-full">
                      {files[activeFile] ? (
                        <div className="code-block m-2">
                          <SyntaxHighlighter
                            language={files[activeFile].language}
                            style={oneDark}
                            customStyle={{
                              margin: 0, padding: "16px", fontSize: "13px",
                              lineHeight: "1.6", background: "#0d0d0d", borderRadius: "8px",
                            }}
                            showLineNumbers
                          >
                            {files[activeFile].content}
                          </SyntaxHighlighter>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full text-muted text-sm">
                          No files to display
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
