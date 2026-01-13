import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { cn } from "../../lib/utils/cn";

export interface SearchResult {
  id: string;
  type: "plugin" | "showcase" | "doc";
  title: string;
  description: string;
  url: string;
  category?: string;
}

const SEARCH_HISTORY_KEY = "search-history";
const MAX_HISTORY_ITEMS = 5;

interface SearchDialogProps {
  open: boolean;
  onClose: () => void;
  plugins?: Plugin[];
  showcases?: Showcase[];
  docs?: DocEntry[];
}

interface Plugin {
  id: string;
  slug: string;
  name: string;
  description: string;
  category?: string;
}

interface Showcase {
  id: string;
  slug: string;
  title: string;
  description: string;
  category?: string;
}

interface DocEntry {
  id: string;
  slug: string;
  title: string;
  body: string;
}

type ToastAction = {
  label: string;
  onClick: () => void;
};

export interface ToastProps {
  id: string;
  type: "success" | "error" | "warning" | "info";
  message: string;
  duration?: number;
  action?: ToastAction;
}

export interface ToastState {
  toasts: ToastProps[];
}

let toastId = 0;

export function showToast(
  message: string,
  type: ToastProps["type"] = "info",
  options?: Partial<Omit<ToastProps, "id" | "message" | "type">>,
): string {
  const id = `toast-${++toastId}`;
  const event = new CustomEvent("toast-show", {
    detail: { id, message, type, ...options },
  });
  window.dispatchEvent(event);
  return id;
}

// Fuzzy match function for search
function fuzzyMatch(query: string, text: string): boolean {
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();
  let queryIndex = 0;
  let textIndex = 0;

  while (queryIndex < queryLower.length && textIndex < textLower.length) {
    if (queryLower[queryIndex] === textLower[textIndex]) {
      queryIndex++;
    }
    textIndex++;
  }

  return queryIndex === queryLower.length;
}

// Relevance scoring
function scoreResult(query: string, result: SearchResult): number {
  const queryLower = query.toLowerCase();
  const titleLower = result.title.toLowerCase();
  const descLower = result.description.toLowerCase();
  const catLower = (result.category || "").toLowerCase();

  let score = 0;

  // Exact match in title
  if (titleLower.includes(queryLower)) {
    score += 10;
    if (titleLower === queryLower) score += 20; // Exact title match
  }

  // Starts with query
  if (titleLower.startsWith(queryLower)) score += 5;

  // Fuzzy match
  if (fuzzyMatch(query, result.title)) score += 3;

  // Match in category
  if (catLower.includes(queryLower)) score += 4;

  // Match in description
  if (descLower.includes(queryLower)) score += 2;

  // Featured items get a slight boost
  if (result.category === "精选") score += 2;

  return score;
}

export function SearchDialog({
  open,
  onClose,
  plugins = [],
  showcases = [],
  docs = [],
}: SearchDialogProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [history, setHistory] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Load history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SEARCH_HISTORY_KEY);
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Save history when query is submitted
  const addToHistory = useCallback((term: string) => {
    if (!term.trim()) return;
    setHistory((prev) => {
      const filtered = prev.filter((h) => h !== term);
      const updated = [term, ...filtered].slice(0, MAX_HISTORY_ITEMS);
      try {
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
      } catch {
        // Ignore localStorage errors
      }
      return updated;
    });
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      setQuery("");
      setSelectedIndex(0);
    }
  }, [open]);

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  // Build search results
  const searchResults = useMemo(() => {
    if (!query.trim()) return [];

    const pluginResults: SearchResult[] = plugins.map((p) => ({
      id: `plugin-${p.id}`,
      type: "plugin" as const,
      title: p.name,
      description: p.description,
      url: `/plugins/${p.slug}`,
      category: p.category,
    }));

    const showcaseResults: SearchResult[] = showcases.map((s) => ({
      id: `showcase-${s.id}`,
      type: "showcase" as const,
      title: s.title,
      description: s.description,
      url: `/showcase/${s.slug}`,
      category: s.category,
    }));

    const docResults: SearchResult[] = docs.map((d) => ({
      id: `doc-${d.id}`,
      type: "doc" as const,
      title: d.title,
      description: d.body.slice(0, 150) + "...",
      url: `/docs/${d.slug}`,
    }));

    const allResults = [...pluginResults, ...showcaseResults, ...docResults];

    return allResults
      .map((result) => ({ result, score: scoreResult(query, result) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map(({ result }) => result);
  }, [query, plugins, showcases, docs]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchResults]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((i) => (i < searchResults.length - 1 ? i + 1 : i));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((i) => (i > 0 ? i - 1 : 0));
        break;
      case "Enter":
        e.preventDefault();
        if (searchResults[selectedIndex]) {
          addToHistory(query);
          window.location.href = searchResults[selectedIndex].url;
        }
        break;
      case "Escape":
        e.preventDefault();
        onClose();
        break;
    }
  };

  const handleHistoryClick = (term: string) => {
    setQuery(term);
    inputRef.current?.focus();
  };

  const typeIcons: Record<SearchResult["type"], React.ReactElement> = {
    plugin: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z"
      />
    ),
    showcase: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    ),
    doc: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    ),
  };

  const typeLabels: Record<SearchResult["type"], string> = {
    plugin: "插件",
    showcase: "案例",
    doc: "文档",
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] backdrop-blur-sm bg-black/20 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-neutral-950 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center border-b border-neutral-200 px-4 dark:border-neutral-800">
          <svg
            className="h-5 w-5 text-neutral-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="搜索插件、案例、文档..."
            className="flex-1 border-none bg-transparent px-3 py-4 text-sm outline-none placeholder:text-neutral-400 dark:placeholder:text-neutral-600"
          />
          <kbd className="hidden rounded border border-neutral-200 bg-neutral-100 px-2 py-1 text-xs text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-500 sm:block">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div
          ref={resultsRef}
          className="max-h-[60vh] overflow-y-auto overflow-x-hidden"
        >
          {query.trim() ? (
            searchResults.length > 0 ? (
              <div className="py-2">
                {searchResults.map((result, index) => (
                  <a
                    key={result.id}
                    href={result.url}
                    className={cn(
                      "mx-2 flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors",
                      "hover:bg-neutral-100 focus:bg-neutral-100 focus:outline-none",
                      "dark:hover:bg-neutral-900 dark:focus:bg-neutral-900",
                      selectedIndex === index &&
                        "bg-neutral-100 dark:bg-neutral-900",
                    )}
                    onClick={() => addToHistory(query)}
                  >
                    <svg
                      className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      {typeIcons[result.type]}
                    </svg>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">
                          {result.title}
                        </span>
                        {result.category && (
                          <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                            {result.category}
                          </span>
                        )}
                        <span className="rounded-full bg-brand-100 px-1.5 py-0.5 text-xs text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
                          {typeLabels[result.type]}
                        </span>
                      </div>
                      <p className="truncate text-xs text-neutral-500 dark:text-neutral-500">
                        {result.description}
                      </p>
                    </div>
                    <kbd
                      className={cn(
                        "hidden rounded border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 text-xs text-neutral-400 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-600 sm:block",
                        selectedIndex === index
                          ? "border-brand-300 bg-brand-50 text-brand-600 dark:border-brand-700 dark:bg-brand-900/30 dark:text-brand-400"
                          : "",
                      )}
                    >
                      {index + 1 === 10 ? "0" : index + 1}
                    </kbd>
                  </a>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-neutral-300 dark:text-neutral-700"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-500">
                  没有找到匹配结果
                </p>
              </div>
            )
          ) : history.length > 0 ? (
            <div className="py-2">
              <div className="px-4 py-2 text-xs font-medium text-neutral-500 dark:text-neutral-500">
                搜索历史
              </div>
              {history.map((term, index) => (
                <button
                  key={term}
                  type="button"
                  className="mx-2 flex w-[calc(100%-16px)] items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-neutral-100 focus:bg-neutral-100 focus:outline-none dark:hover:bg-neutral-900 dark:focus:bg-neutral-900"
                  onClick={() => handleHistoryClick(term)}
                >
                  <svg
                    className="h-4 w-4 shrink-0 text-neutral-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="truncate text-sm text-neutral-700 dark:text-neutral-300">
                    {term}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <svg
                className="mx-auto h-12 w-12 text-neutral-300 dark:text-neutral-700"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-500">
                输入关键词开始搜索
              </p>
              <div className="mt-4 flex justify-center gap-2 text-xs text-neutral-400">
                <span className="rounded border border-neutral-200 bg-neutral-100 px-2 py-1 dark:border-neutral-800 dark:bg-neutral-900">
                  插件名称
                </span>
                <span className="rounded border border-neutral-200 bg-neutral-100 px-2 py-1 dark:border-neutral-800 dark:bg-neutral-900">
                  案例标题
                </span>
                <span className="rounded border border-neutral-200 bg-neutral-100 px-2 py-1 dark:border-neutral-800 dark:bg-neutral-900">
                  文档内容
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-neutral-200 px-4 py-2 text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-600">
          <div className="flex gap-3">
            <span>
              <kbd className="rounded border border-neutral-200 bg-neutral-100 px-1.5 dark:border-neutral-800 dark:bg-neutral-900">
                ↑↓
              </kbd>{" "}
              导航
            </span>
            <span>
              <kbd className="rounded border border-neutral-200 bg-neutral-100 px-1.5 dark:border-neutral-800 dark:bg-neutral-900">
                Enter
              </kbd>{" "}
              选择
            </span>
            <span>
              <kbd className="rounded border border-neutral-200 bg-neutral-100 px-1.5 dark:border-neutral-800 dark:bg-neutral-900">
                Esc
              </kbd>{" "}
              关闭
            </span>
          </div>
          {searchResults.length > 0 && (
            <span>共 {searchResults.length} 个结果</span>
          )}
        </div>
      </div>
    </div>
  );
}

// Hook for using SearchDialog with keyboard shortcut
export function useSearchDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return { open, setOpen, onClose: () => setOpen(false) };
}
