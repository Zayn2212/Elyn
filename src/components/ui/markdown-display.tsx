import React from "react";
import { cn } from "@/lib/utils";

interface MarkdownDisplayProps {
  content: string;
  className?: string;
}

export function MarkdownDisplay({ content, className }: MarkdownDisplayProps) {
  const processInline = (text: string) => {
    if (!text) return null;

    // A regex to match **bold**, *italic*, and [links](url)
    const regex = /(\*\*.*?\*\*|\*.*?\*|__.*?__|_.*?_|\[.*?\]\(.*?\))/g;
    const parts = text.split(regex);

    return parts.map((part, i) => {
      if (
        (part.startsWith("**") && part.endsWith("**")) ||
        (part.startsWith("__") && part.endsWith("__"))
      ) {
        return (
          <strong key={i} className="font-semibold">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (
        (part.startsWith("*") && part.endsWith("*")) ||
        (part.startsWith("_") && part.endsWith("_"))
      ) {
        return (
          <em key={i} className="italic">
            {part.slice(1, -1)}
          </em>
        );
      }
      if (part.startsWith("[") && part.includes("](") && part.endsWith(")")) {
        const titleMatch = part.match(/\[(.*?)\]/);
        const urlMatch = part.match(/\((.*?)\)/);
        if (titleMatch && urlMatch) {
          return (
            <a
              key={i}
              href={urlMatch[1]}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {titleMatch[1]}
            </a>
          );
        }
      }
      return <React.Fragment key={i}>{part}</React.Fragment>;
    });
  };

  const parseMarkdown = (text: string) => {
    const lines = text.split(/\r?\n/);
    const elements: React.ReactNode[] = [];

    let inList = false;
    let listType = ""; // 'ul' or 'ol'
    let listItems: React.ReactNode[] = [];

    const flushList = () => {
      if (inList && listItems.length > 0) {
        if (listType === "ul") {
          elements.push(
            <ul key={elements.length} className="list-disc pl-5 mb-3 space-y-1">
              {listItems}
            </ul>,
          );
        } else {
          elements.push(
            <ol
              key={elements.length}
              className="list-decimal pl-5 mb-3 space-y-1"
            >
              {listItems}
            </ol>,
          );
        }
        listItems = [];
        inList = false;
        listType = "";
      }
    };

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      // Empty line
      if (!trimmed) {
        flushList();
        // Add a small spacing for empty lines, except if it's the very first or last line
        if (
          index > 0 &&
          index < lines.length - 1 &&
          elements.length > 0 &&
          elements[elements.length - 1] !== null
        ) {
          elements.push(<div key={`br-${index}`} className="h-1" />);
        }
        return;
      }

      // Headings
      const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)/);
      if (headingMatch) {
        flushList();
        const level = headingMatch[1].length;
        const text = headingMatch[2];
        const Tag = `h${level}` as keyof JSX.IntrinsicElements;
        const sizes: Record<number, string> = {
          1: "text-2xl font-bold mt-4 mb-2",
          2: "text-xl font-bold mt-3 mb-2",
          3: "text-lg font-bold mt-3 mb-2",
          4: "text-base font-bold mt-2 mb-1",
          5: "text-sm font-bold mt-2 mb-1",
          6: "text-xs font-bold mt-2 mb-1",
        };
        elements.push(
          React.createElement(
            Tag,
            { key: index, className: sizes[level] },
            processInline(text),
          ),
        );
        return;
      }

      // Unordered lists
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        if (!inList || listType !== "ul") {
          flushList();
          inList = true;
          listType = "ul";
        }
        listItems.push(
          <li key={index} className="leading-relaxed">
            {processInline(trimmed.substring(2))}
          </li>,
        );
        return;
      }

      // Ordered lists
      const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
      if (numberedMatch) {
        if (!inList || listType !== "ol") {
          flushList();
          inList = true;
          listType = "ol";
        }
        listItems.push(
          <li key={index} className="leading-relaxed">
            {processInline(numberedMatch[2])}
          </li>,
        );
        return;
      }

      // Regular paragraph
      flushList();
      elements.push(
        <p key={index} className="mb-2 leading-relaxed">
          {processInline(trimmed)}
        </p>,
      );
    });

    flushList(); // Flush any remaining list

    return elements;
  };

  return (
    <div className={cn("markdown-content text-foreground m-2", className)}>
      {parseMarkdown(content)}
    </div>
  );
}
