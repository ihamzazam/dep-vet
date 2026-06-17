"use client";

import { useState, type CSSProperties, type ReactNode } from "react";

/**
 * Copies `text` to the clipboard and flashes confirmation. Stops propagation so
 * it can live inside a <summary> (the dependency rows) without toggling them.
 */
export function CopyButton({
  text,
  children,
  copiedLabel = "copied ✓",
  style,
  title,
}: {
  text: string;
  children: ReactNode;
  copiedLabel?: ReactNode;
  style?: CSSProperties;
  title?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // older browsers / insecure context
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {
        /* give up silently */
      }
      document.body.removeChild(ta);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <button type="button" onClick={onClick} title={title} style={style}>
      {copied ? copiedLabel : children}
    </button>
  );
}
