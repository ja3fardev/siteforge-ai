"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function SubdomainPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [html, setHtml] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/subdomain/${slug}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error || !d.project) {
          setError("This site could not be found or is not published.");
          setLoading(false);
          return;
        }
        const project = d.project;
        const htmlFile = project.files?.find((f: any) => f.name === "index.html" || f.language === "html");
        if (htmlFile) {
          setHtml(htmlFile.content);
        } else {
          const cssFiles = project.files?.filter((f: any) => f.language === "css") || [];
          const jsFiles = project.files?.filter((f: any) => f.language === "javascript" || f.language === "typescript") || [];
          const parts = [`<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${project.name}</title>`];
          cssFiles.forEach((f: any) => parts.push(`<style>${f.content}</style>`));
          parts.push("</head><body>");
          jsFiles.forEach((f: any) => parts.push(`<script>${f.content}</script>`));
          parts.push("</body></html>");
          setHtml(parts.join("\n"));
        }
        setLoading(false);
      })
      .catch(() => {
        setError("This site could not be found or is not published.");
        setLoading(false);
      });
  }, [slug]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-foreground mb-2">404</h1>
          <p className="text-muted">{error}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <iframe srcDoc={html} className="w-full h-screen border-0" title="Site" />;
}
