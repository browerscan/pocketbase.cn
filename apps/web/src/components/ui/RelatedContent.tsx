import { cn } from "../../lib/utils/cn";

export interface RelatedItem {
  title: string;
  slug: string;
  description?: string;
  category?: string;
  type: "plugin" | "showcase" | "doc";
}

interface RelatedContentProps {
  items: RelatedItem[];
  title?: string;
  className?: string;
}

function getTypeLabel(type: RelatedItem["type"]) {
  switch (type) {
    case "plugin":
      return "插件";
    case "showcase":
      return "案例";
    case "doc":
      return "文档";
  }
}

function getTypeHref(type: RelatedItem["type"], slug: string) {
  switch (type) {
    case "plugin":
      return `/plugins/${slug}`;
    case "showcase":
      return `/showcase/${slug}`;
    case "doc":
      return `/docs/${slug}`;
  }
}

export function RelatedContent({
  items,
  title = "相关内容",
  className,
}: RelatedContentProps) {
  if (items.length === 0) return null;

  return (
    <section
      className={cn(
        "rounded-xl border border-neutral-200 bg-neutral-50 p-6 dark:border-neutral-800 dark:bg-neutral-900",
        className,
      )}
    >
      <h3 className="mb-4 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
        {title}
      </h3>
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={`${item.type}-${item.slug}`}>
            <a
              href={getTypeHref(item.type, item.slug)}
              className="group block rounded-lg p-3 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-brand-700 dark:text-brand-300">
                      {getTypeLabel(item.type)}
                    </span>
                    <h4 className="truncate text-sm font-medium text-neutral-900 group-hover:text-brand-700 dark:text-neutral-100 dark:group-hover:text-brand-300">
                      {item.title}
                    </h4>
                  </div>
                  {item.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-neutral-600 dark:text-neutral-400">
                      {item.description}
                    </p>
                  )}
                </div>
                <svg
                  className="h-4 w-4 shrink-0 text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
