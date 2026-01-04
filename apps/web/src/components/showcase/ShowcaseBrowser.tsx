import { useState } from "react";
import type { ShowcaseItem } from "../../lib/types/showcase";
import { SHOWCASE_CATEGORIES } from "../../lib/constants/categories";
import { pocketbaseFileUrl } from "../../lib/utils/fileUrl";
import { GridSkeleton } from "../ui/Skeleton";
import { ErrorBoundary } from "../ui/ErrorBoundary";
import {
  MobileFilterDrawer,
  FilterToggleButton,
} from "../ui/MobileFilterDrawer";
import { usePaginatedListWithFilters } from "../../hooks/usePaginatedList";
import type { InitialPaginatedData } from "../../hooks/usePaginatedList";

type InitialListState = InitialPaginatedData<ShowcaseItem>;

const SHOWCASE_SORT_OPTIONS = [
  { value: "-featured,-created", label: "精选优先" },
  { value: "-created", label: "最新" },
  { value: "-votes", label: "最多投票" },
  { value: "-views", label: "最多浏览" },
  { value: "title", label: "名称" },
];

function ShowcaseBrowserContent({
  initialParams,
  initial,
}: {
  initialParams?: { query: string; category: string; sort: string };
  initial?: InitialListState;
}) {
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  const {
    items,
    loading,
    loadingMore,
    error,
    hasMore,
    query,
    setQuery,
    category,
    setCategory,
    sort,
    setSort,
    loadPage,
    sentinelRef,
  } = usePaginatedListWithFilters<ShowcaseItem>({
    endpoint: "/api/showcase/list",
    defaultSort: "-featured,-created",
    sortOptions: SHOWCASE_SORT_OPTIONS,
    initialParams,
    initial,
  });

  const activeFilterCount = category ? 1 : 0;

  return (
    <div className="space-y-4">
      {/* Search and Filter Bar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <label htmlFor="showcase-search" className="sr-only">
            搜索案例
          </label>
          <input
            id="showcase-search"
            className="w-full rounded-md border border-neutral-200 bg-white px-4 py-3 pl-10 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-neutral-800 dark:bg-neutral-950 md:py-2 md:pl-9"
            placeholder="搜索案例（标题/描述）"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
          />
          <svg
            className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 md:left-3"
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
        </div>

        {/* Mobile Filter Button */}
        <FilterToggleButton
          onClick={() => setFilterDrawerOpen(true)}
          count={activeFilterCount}
        />

        {/* Desktop Filter Controls */}
        <div className="hidden gap-3 md:flex">
          <label htmlFor="showcase-category" className="sr-only">
            分类筛选
          </label>
          <select
            id="showcase-category"
            className="w-44 rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-neutral-800 dark:bg-neutral-950"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">全部分类</option>
            {SHOWCASE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <label htmlFor="showcase-sort" className="sr-only">
            排序方式
          </label>
          <select
            id="showcase-sort"
            className="w-36 rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-neutral-800 dark:bg-neutral-950"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            {SHOWCASE_SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      <MobileFilterDrawer
        open={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        categories={SHOWCASE_CATEGORIES}
        category={category}
        onCategoryChange={setCategory}
        sortOptions={SHOWCASE_SORT_OPTIONS}
        sort={sort}
        onSortChange={setSort}
        categoryLabel="案例分类"
        sortLabel="排序方式"
      />

      {error ? (
        <div
          className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/40 dark:bg-red-950/30"
          role="alert"
        >
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          <button
            type="button"
            onClick={() => loadPage(true)}
            className="mt-2 text-sm font-medium text-red-700 underline hover:text-red-900 dark:text-red-300"
          >
            重试
          </button>
        </div>
      ) : null}

      {loading && items.length === 0 ? (
        <GridSkeleton count={6} showAvatar={false} />
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((s) => (
          <a
            key={s.id}
            href={`/showcase/${s.slug}`}
            className="group rounded-xl border border-neutral-200 bg-white p-5 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:border-neutral-800 dark:bg-neutral-950"
          >
            {s.thumbnail ? (
              <img
                src={pocketbaseFileUrl(
                  "showcase",
                  String(s.id),
                  String(s.thumbnail),
                  { thumb: "320x240" },
                )}
                alt={`${s.title} preview`}
                className="mb-3 aspect-video w-full rounded-lg border border-neutral-200 object-cover dark:border-neutral-800"
                loading="lazy"
                decoding="async"
                width={320}
                height={240}
              />
            ) : null}
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-semibold group-hover:text-brand-700 dark:group-hover:text-brand-300">
                {s.title}
              </h3>
              {s.featured ? (
                <span className="rounded bg-brand-600/10 px-2 py-1 text-xs font-medium text-brand-700 dark:text-brand-300">
                  精选
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              {s.description}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
              {s.category ? (
                <span className="rounded bg-neutral-100 px-2 py-1 dark:bg-neutral-800">
                  {s.category}
                </span>
              ) : null}
              <span className="ml-auto inline-flex gap-3" aria-label="案例统计">
                <span>♥ {s.votes ?? 0}</span>
                <span>👁 {s.views ?? 0}</span>
              </span>
            </div>
          </a>
        ))}
      </div>

      {loadingMore ? <GridSkeleton count={3} showAvatar={false} /> : null}
      <div ref={sentinelRef} aria-hidden="true" />

      {!loading && !error && items.length === 0 ? (
        <p className="text-sm text-neutral-500" role="status">
          没有匹配的案例。
        </p>
      ) : null}

      {!loading && !error && hasMore ? (
        <button
          type="button"
          className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm font-medium hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:bg-neutral-900"
          onClick={() => loadPage(false)}
          disabled={loadingMore}
          aria-label="加载更多案例"
        >
          加载更多
        </button>
      ) : null}
    </div>
  );
}

export default function ShowcaseBrowser(props: {
  initialParams?: { query: string; category: string; sort: string };
  initial?: InitialListState;
}) {
  return (
    <ErrorBoundary>
      <ShowcaseBrowserContent
        initialParams={props.initialParams}
        initial={props.initial}
      />
    </ErrorBoundary>
  );
}
