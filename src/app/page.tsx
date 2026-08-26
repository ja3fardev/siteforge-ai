"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Code2, Eye, Copy, Check, RotateCcw, Menu, X, ChevronDown } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const SUGGESTIONS = [
  "Build a landing page for a SaaS product with pricing section",
  "Create a dashboard with sidebar navigation and charts",
  "Make a portfolio website with animated hero section",
  "Design an e-commerce product page with image gallery",
  "Build a contact form with validation and dark theme",
  "Create a blog layout with markdown support",
];

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"code" | "preview">("code");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const generateId = () => Math.random().toString(36).substring(2, 11);

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
      const systemPrompt = `You are an expert web developer AI. When the user asks you to build a website or component, generate clean, modern, production-ready code. 

IMPORTANT RULES:
1. Always wrap code in markdown code blocks with the appropriate language tag (html, css, javascript, tsx, jsx, etc.)
2. For complete websites, provide a single HTML file with embedded CSS and JavaScript
3. Use modern design principles: clean typography, proper spacing, responsive layouts
4. Use Tailwind CSS classes when possible, or modern CSS
5. Make animations smooth and subtle
6. Always make designs mobile-responsive
7. Use a dark theme by default unless specified otherwise
8. After the code block, briefly explain what was built

User request: ${userMessage}`;

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: systemPrompt, chatId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to get response");
      }

      if (data.chatId) setChatId(data.chatId);

      const assistantMsg: Message = {
        id: generateId(),
        role: "assistant",
        content: data.reply,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
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

  const extractCodeBlocks = (content: string) => {
    const regex = /```(\w+)?\n([\s\S]*?)```/g;
    const blocks: { lang: string; code: string }[] = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
      blocks.push({ lang: match[1] || "text", code: match[2].trim() });
    }
    return blocks;
  };

  const renderMessage = (msg: Message, index: number) => {
    const codeBlocks = extractCodeBlocks(msg.content);

    let textContent = msg.content;
    codeBlocks.forEach((block) => {
      textContent = textContent.replace(
        new RegExp(`\`\`\`\\w*\\n[\\s\\S]*?${block.code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\n/g, "\\n")}[\\s\\S]*?\`\`\``, "g"),
        ""
      );
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
              msg.role === "user"
                ? "bg-accent text-white"
                : "bg-card border border-border"
            }`}
          >
            {msg.role === "assistant" && textContent && (
              <div className="text-sm text-foreground/90 whitespace-pre-wrap">
                {textContent}
              </div>
            )}
            {msg.role === "user" && (
              <p className="text-sm">{msg.content}</p>
            )}
            {codeBlocks.length > 0 && (
              <div className="mt-3 space-y-3">
                {codeBlocks.map((block, i) => (
                  <div key={i} className="code-block">
                    <div className="flex items-center justify-between px-3 py-2 bg-[#1a1a1a] border-b border-border">
                      <div className="flex items-center gap-2">
                        <Code2 className="w-3.5 h-3.5 text-muted" />
                        <span className="text-xs text-muted font-mono">{block.lang}</span>
                      </div>
                      <button
                        onClick={() => copyCode(block.code, index * 100 + i)}
                        className="flex items-center gap-1 text-xs text-muted hover:text-foreground transition-colors"
                      >
                        {copiedIndex === index * 100 + i ? (
                          <>
                            <Check className="w-3 h-3 text-green-400" />
                            <span className="text-green-400">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <SyntaxHighlighter
                      language={block.lang === "html" ? "html" : block.lang}
                      style={oneDark}
                      customStyle={{
                        margin: 0,
                        padding: "16px",
                        fontSize: "13px",
                        lineHeight: "1.6",
                        background: "#0d0d0d",
                        borderRadius: "0 0 8px 8px",
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

  const getPreviewContent = () => {
    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
    if (!lastAssistant) return null;
    const codeBlocks = extractCodeBlocks(lastAssistant.content);
    if (codeBlocks.length === 0) return null;
    return codeBlocks.map((b) => b.code).join("\n\n");
  };

  const previewContent = getPreviewContent();

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={`${sidebarOpen ? "w-72" : "w-0"} transition-all duration-300 overflow-hidden border-r border-border bg-card flex flex-col`}
      >
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-foreground">SiteForge</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 rounded-lg hover:bg-background text-muted hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <button
            onClick={() => {
              setMessages([]);
              setChatId(null);
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted hover:text-foreground hover:bg-background transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            New Chat
          </button>
          <div className="mt-4 px-3">
            <p className="text-xs font-medium text-muted uppercase tracking-wider mb-2">Recent</p>
            {messages.length > 0 && (
              <div className="space-y-1">
                {messages
                  .filter((m) => m.role === "user")
                  .slice(-5)
                  .reverse()
                  .map((msg) => (
                    <div
                      key={msg.id}
                      className="px-3 py-2 rounded-lg text-xs text-muted-light truncate hover:bg-background cursor-pointer transition-colors"
                    >
                      {msg.content.substring(0, 50)}...
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
        <div className="p-3 border-t border-border">
          <div className="px-3 py-2 rounded-xl bg-background/50 text-xs text-muted">
            Powered by Claude AI
          </div>
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
                <h1 className="text-5xl font-bold">
                  <span className="gradient-text">What do you want to build?</span>
                </h1>
                <p className="text-lg text-muted max-w-md mx-auto">
                  Describe your dream website and AI will bring it to life with clean, production-ready code.
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
                      activeTab === "preview"
                        ? "bg-accent/10 text-accent"
                        : "text-muted hover:text-foreground"
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Preview
                  </button>
                  <button
                    onClick={() => setActiveTab("code")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      activeTab === "code"
                        ? "bg-accent/10 text-accent"
                        : "text-muted hover:text-foreground"
                    }`}
                  >
                    <Code2 className="w-3.5 h-3.5" />
                    Code
                  </button>
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
                      {extractCodeBlocks(previewContent).map((block, i) => (
                        <div key={i} className="code-block m-2">
                          <SyntaxHighlighter
                            language={block.lang}
                            style={oneDark}
                            customStyle={{
                              margin: 0,
                              padding: "16px",
                              fontSize: "13px",
                              lineHeight: "1.6",
                              background: "#0d0d0d",
                              borderRadius: "8px",
                            }}
                            showLineNumbers
                          >
                            {block.code}
                          </SyntaxHighlighter>
                        </div>
                      ))}
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
