import React, { Component, ErrorInfo, ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import { cn } from "@/lib/utils";
import "highlight.js/styles/github-dark.css";

interface MarkdownContentProps {
  content: string;
  className?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

// Error Boundary Component
class MarkdownErrorBoundary extends Component<
  { children: ReactNode; fallback: (error?: Error) => ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode; fallback: (error?: Error) => ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Markdown rendering error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <>{this.props.fallback(this.state.error)}</>;
    }
    return <>{this.props.children}</>;
  }
}

// Configure rehype-highlight to handle errors gracefully
const highlightOptions = {
  ignoreMissing: true, // Don't throw errors for unknown languages
  detect: false, // Disable auto-detect to avoid loading issues
  subset: ['javascript', 'typescript', 'python', 'java', 'c', 'cpp', 'css', 'html', 'json', 'markdown', 'bash', 'shell', 'sql', 'yaml', 'xml'], // Only load common languages
};

function MarkdownContentInner({ content, className }: MarkdownContentProps) {
  // Sanitize content to prevent invalid characters
  let sanitizedContent = typeof content === "string" ? content : String(content || "");
  
  // Remove or replace invalid characters that might cause issues
  try {
    // Remove null bytes and other control characters except newlines and tabs
    sanitizedContent = sanitizedContent.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
  } catch (e) {
    // If sanitization fails, use empty string
    console.warn("Content sanitization failed:", e);
    sanitizedContent = "";
  }

  return (
    <div className={cn("markdown-content", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeHighlight, highlightOptions], rehypeRaw]}
          components={{
            // Prevent images from breaking layout
            img: ({ node, ...props }) => (
              <img
                {...props}
                className="max-w-full h-auto rounded-lg my-2"
                style={{ maxWidth: "100%", height: "auto" }}
                loading="lazy"
                alt={props.alt || ""}
              />
            ),
            // Prevent tables from breaking layout
            table: ({ node, ...props }) => (
              <table
                {...props}
                className="min-w-full border-collapse border border-border my-2"
                style={{ maxWidth: "100%", tableLayout: "auto" }}
              />
            ),
            // Style code blocks
            code: ({ node, className: codeClassName, children, ...props }) => {
              const match = /language-(\w+)/.exec(codeClassName || "");
              const isInline = !match;
              
              // Ensure children is a valid React node
              const codeChildren = Array.isArray(children) 
                ? children.filter(Boolean)
                : children;
              
              return isInline ? (
                <code
                  {...props}
                  className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono break-all"
                >
                  {codeChildren}
                </code>
              ) : (
                <code {...props} className={codeClassName}>
                  {codeChildren}
                </code>
              );
            },
            // Style pre blocks (code blocks)
            pre: ({ node, children, ...props }) => (
              <pre
                {...props}
                className="p-4 rounded-lg bg-muted overflow-x-auto text-sm my-2"
                style={{ maxWidth: "100%", wordBreak: "break-word", whiteSpace: "pre-wrap" }}
              >
                {children}
              </pre>
            ),
            // Style blockquotes
            blockquote: ({ node, children, ...props }) => (
              <blockquote
                {...props}
                className="border-l-4 border-primary pl-4 my-2 italic text-muted-foreground"
              >
                {children}
              </blockquote>
            ),
            // Style links
            a: ({ node, children, ...props }) => (
              <a
                {...props}
                className="text-primary underline hover:text-primary/80 break-all"
                target="_blank"
                rel="noopener noreferrer"
              >
                {children}
              </a>
            ),
            // Style headings
            h1: ({ node, children, ...props }) => (
              <h1 {...props} className="text-2xl font-bold mt-4 mb-2">
                {children}
              </h1>
            ),
            h2: ({ node, children, ...props }) => (
              <h2 {...props} className="text-xl font-bold mt-3 mb-2">
                {children}
              </h2>
            ),
            h3: ({ node, children, ...props }) => (
              <h3 {...props} className="text-lg font-semibold mt-2 mb-1">
                {children}
              </h3>
            ),
            // Style lists
            ul: ({ node, children, ...props }) => (
              <ul {...props} className="list-disc list-inside my-2 space-y-1">
                {children}
              </ul>
            ),
            ol: ({ node, children, ...props }) => (
              <ol {...props} className="list-decimal list-inside my-2 space-y-1">
                {children}
              </ol>
            ),
            // Style list items
            li: ({ node, children, ...props }) => (
              <li {...props} className="break-words">
                {children}
              </li>
            ),
            // Style paragraphs
            p: ({ node, children, ...props }) => (
              <p {...props} className="my-2 break-words">
                {children}
              </p>
            ),
            // Style horizontal rules
            hr: ({ node, ...props }) => (
              <hr {...props} className="my-4 border-border" />
            ),
            // Handle definition lists (dl, dt, dd)
            dl: ({ node, children, ...props }) => (
              <dl {...props} className="my-2">
                {children}
              </dl>
            ),
            dt: ({ node, children, ...props }) => (
              <dt {...props} className="font-semibold mt-2">
                {children}
              </dt>
            ),
            dd: ({ node, children, ...props }) => (
              <dd {...props} className="ml-4 mb-2 break-words">
                {children}
              </dd>
            ),
          }}
        >
          {sanitizedContent}
        </ReactMarkdown>
      </div>
    );
}

// Main exported component with error boundary
export function MarkdownContent({ content, className }: MarkdownContentProps) {
  const sanitizedContent = typeof content === "string" ? content : String(content || "");

  return (
    <MarkdownErrorBoundary
      fallback={(error) => (
        <div className={cn("markdown-content", className)}>
          <div className="whitespace-pre-wrap break-words text-sm text-muted-foreground">
            {sanitizedContent}
          </div>
          {error && (
            <div className="mt-2 text-xs text-destructive">
              Lỗi hiển thị markdown: {error.message}
            </div>
          )}
        </div>
      )}
    >
      <MarkdownContentInner content={content} className={className} />
    </MarkdownErrorBoundary>
  );
}

