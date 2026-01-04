import { useEffect, useMemo, useRef, useState } from "react";
import { POCKETBASE_URL } from "../lib/constants/config";
import { fetchPaginated, type ApiResponse } from "../lib/utils/api";
import { getErrorMessage } from "../lib/errors/AppError";

export interface PaginatedMeta {
  hasMore?: boolean;
  nextOffset?: number;
}

export interface InitialPaginatedData<T> {
  endpointUrl: string;
  items: T[];
  meta?: PaginatedMeta;
}

interface UsePaginatedListOptions<T> {
  endpointUrl: string;
  rootMargin?: string;
  initial?: InitialPaginatedData<T>;
}

interface PaginatedListResult<T> {
  items: T[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  loadPage: (replace: boolean) => void;
  sentinelRef: React.RefObject<HTMLDivElement>;
}

export function usePaginatedList<T>({
  endpointUrl,
  rootMargin = "400px",
  initial,
}: UsePaginatedListOptions<T>): PaginatedListResult<T> {
  const initialMatches =
    Boolean(initial?.endpointUrl) && initial?.endpointUrl === endpointUrl;
  const initialAppliedRef = useRef(false);

  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<T[]>(() =>
    initialMatches ? (initial?.items as T[]) : [],
  );
  const [offset, setOffset] = useState(() => {
    if (!initialMatches) return 0;
    const next = Number(initial?.meta?.nextOffset);
    if (Number.isFinite(next) && next >= 0) return next;
    return Array.isArray(initial?.items) ? initial!.items.length : 0;
  });
  const [hasMore, setHasMore] = useState(() =>
    initialMatches ? Boolean(initial?.meta?.hasMore) : false,
  );
  const [trigger, setTrigger] = useState(0);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const endpointBase = useMemo(() => new URL(endpointUrl), [endpointUrl]);

  async function loadPage(replace: boolean) {
    const nextOffset = replace ? 0 : offset;
    setError(null);
    if (replace) setLoading(true);
    else setLoadingMore(true);

    try {
      const url = new URL(endpointBase.toString());
      url.searchParams.set("offset", String(nextOffset));
      const result: ApiResponse<{ data: T[]; meta?: PaginatedMeta }> =
        await fetchPaginated(url.toString());

      if (result.error) {
        setError(getErrorMessage(result.error));
        return;
      }

      const rows = result.data?.data ?? [];
      const meta = result.data?.meta ?? {};

      setItems((prev) => (replace ? rows : prev.concat(rows)));
      setHasMore(Boolean(meta?.hasMore));
      setOffset(Number(meta?.nextOffset ?? nextOffset + rows.length));
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    const matchesNow =
      Boolean(initial?.endpointUrl) && initial?.endpointUrl === endpointUrl;

    if (matchesNow && !initialAppliedRef.current) {
      initialAppliedRef.current = true;
      setItems(Array.isArray(initial?.items) ? (initial!.items as T[]) : []);
      setHasMore(Boolean(initial?.meta?.hasMore));
      setOffset(
        Number.isFinite(Number(initial?.meta?.nextOffset))
          ? Number(initial?.meta?.nextOffset)
          : Array.isArray(initial?.items)
            ? initial!.items.length
            : 0,
      );
      setError(null);
      setLoading(false);
      setLoadingMore(false);
      return;
    }

    // When endpoint changes (filters), fetch fresh data.
    initialAppliedRef.current = false;
    setItems([]);
    setOffset(0);
    setHasMore(false);
    loadPage(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpointUrl, trigger]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    if (!hasMore) return;
    if (loading || loadingMore) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry && entry.isIntersecting) loadPage(false);
      },
      { rootMargin },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [
    hasMore,
    offset,
    loading,
    loadingMore,
    endpointBase.toString(),
    rootMargin,
  ]);

  return {
    items,
    loading,
    loadingMore,
    error,
    hasMore,
    loadPage: (replace: boolean) => loadPage(replace),
    sentinelRef,
  };
}

interface UsePaginatedListWithFiltersOptions {
  endpoint: string;
  limit?: number;
  rootMargin?: string;
  defaultSort?: string;
  sortOptions?: { value: string; label: string }[];
}

export function usePaginatedListWithFilters<T>({
  endpoint,
  limit = 24,
  rootMargin = "400px",
  defaultSort = "-created",
  sortOptions = [],
  initialParams,
  initial,
}: UsePaginatedListWithFiltersOptions & {
  initialParams?: { query: string; category: string; sort: string };
  initial?: InitialPaginatedData<T>;
}) {
  // Initialize from URL params
  const getInitialParams = () => {
    if (typeof window === "undefined")
      return { query: "", category: "", sort: defaultSort };
    const params = new URLSearchParams(window.location.search);
    return {
      query: params.get("q") || "",
      category: params.get("category") || "",
      sort: params.get("sort") || defaultSort,
    };
  };

  const initialState = initialParams || getInitialParams();
  const [query, setQuery] = useState(initialState.query);
  const [category, setCategory] = useState(initialState.category);
  const [sort, setSort] = useState(initialState.sort);

  // Persist to URL
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (category.trim()) params.set("category", category.trim());
    if (sort && sort !== defaultSort) params.set("sort", sort);
    const newUrl = params.toString()
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;
    window.history.replaceState({}, "", newUrl);
  }, [query, category, sort, defaultSort]);

  const endpointUrl = useMemo(() => {
    const url = new URL(endpoint, POCKETBASE_URL);
    if (query.trim()) url.searchParams.set("q", query.trim());
    if (category.trim()) url.searchParams.set("category", category.trim());
    if (sort) url.searchParams.set("sort", sort);
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("offset", "0");
    return url.toString();
  }, [endpoint, query, category, sort, limit]);

  const listState = usePaginatedList<T>({
    endpointUrl,
    rootMargin,
    initial,
  });

  return {
    ...listState,
    query,
    setQuery,
    category,
    setCategory,
    sort,
    setSort,
    sortOptions,
  };
}
