import { useEffect, useRef, useState } from "react";
import { renderMarkdownSafe } from "../../lib/utils/markdown";

interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

export function MarkdownPreview({
  content,
  className = "",
}: MarkdownPreviewProps) {
  const [html, setHtml] = useState("");
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Debounce rendering for performance
    const timeout = setTimeout(() => {
      setHtml(renderMarkdownSafe(content));
    }, 150);

    return () => clearTimeout(timeout);
  }, [content]);

  return (
    <div
      ref={previewRef}
      className={`prose prose-neutral max-w-none dark:prose-invert prose-sm max-h-[400px] overflow-y-auto rounded-md border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/40 ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  maxHeight?: string;
  label?: string;
  error?: string;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = "",
  minHeight = "160px",
  maxHeight = "400px",
  label,
  error,
}: MarkdownEditorProps) {
  const [showPreview, setShowPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // Sync scroll
  useEffect(() => {
    if (!showPreview) return;

    const textarea = textareaRef.current;
    const preview = previewRef.current;
    if (!textarea || !preview) return;

    const handleScroll = () => {
      const percentage =
        textarea.scrollTop / (textarea.scrollHeight - textarea.clientHeight);
      preview.scrollTop =
        percentage * (preview.scrollHeight - preview.clientHeight);
    };

    textarea.addEventListener("scroll", handleScroll);
    return () => textarea.removeEventListener("scroll", handleScroll);
  }, [showPreview]);

  return (
    <label className="block space-y-1">
      {label ? <div className="text-sm font-medium">{label}</div> : null}
      <div className="flex items-center justify-end border-b border-neutral-200 pb-2 dark:border-neutral-800">
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className="text-xs text-neutral-600 hover:text-brand-600 dark:text-neutral-400"
        >
          {showPreview ? "Edit" : "Preview"}
        </button>
      </div>
      <div className={showPreview ? "hidden" : ""}>
        <textarea
          ref={textareaRef}
          className={`w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-neutral-800 dark:bg-neutral-950 ${error ? "border-red-500" : ""}`}
          style={{ minHeight, maxHeight }}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      </div>
      <div className={showPreview ? "" : "hidden"}>
        <div
          ref={previewRef}
          className="prose prose-neutral max-w-none dark:prose-invert prose-sm max-h-[400px] overflow-y-auto rounded-md border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/40"
          dangerouslySetInnerHTML={{ __html: renderMarkdownSafe(value) }}
        />
      </div>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </label>
  );
}

interface SplitMarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
}

export function SplitMarkdownEditor({
  value,
  onChange,
  placeholder = "",
  label,
  error,
}: SplitMarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // Sync scroll
  useEffect(() => {
    const textarea = textareaRef.current;
    const preview = previewRef.current;
    if (!textarea || !preview) return;

    const handleScroll = () => {
      const percentage =
        textarea.scrollTop / (textarea.scrollHeight - textarea.clientHeight);
      preview.scrollTop =
        percentage * (preview.scrollHeight - preview.clientHeight);
    };

    textarea.addEventListener("scroll", handleScroll);
    return () => textarea.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <label className="block space-y-1">
      {label ? <div className="text-sm font-medium">{label}</div> : null}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <textarea
            ref={textareaRef}
            className={`w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-neutral-800 dark:bg-neutral-950 ${error ? "border-red-500" : ""}`}
            style={{ minHeight: "200px", maxHeight: "400px" }}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
          />
        </div>
        <div>
          <MarkdownPreview content={value} />
        </div>
      </div>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </label>
  );
}

export default MarkdownPreview;
