import React from "react";
import { renderMarkdown } from "@/lib/markdown";

interface Props {
  markdown: string;
  className?: string;
}

export function MarkdownBody({ markdown, className = "prose-rbe" }: Props) {
  const html = renderMarkdown(markdown || "");

  if (!html) return null;

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
