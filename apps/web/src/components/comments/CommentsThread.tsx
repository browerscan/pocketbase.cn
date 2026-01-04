import { useEffect, useMemo, useState } from "react";
import { useStore } from "@nanostores/react";
import { POCKETBASE_URL } from "../../lib/constants/config";
import {
  authLoading,
  authToken,
  authUser,
  initAuth,
  isAuthenticated,
} from "../../lib/stores/auth";
import { pocketbaseFileUrl } from "../../lib/utils/fileUrl";

type CommentAuthor = {
  id: string;
  username?: string;
  name?: string;
  avatar?: string;
};

type CommentRow = {
  id: string;
  content: string;
  status: string;
  parent: string;
  created?: string | null;
  updated?: string | null;
  author?: CommentAuthor | null;
};

type Props = {
  pluginSlug?: string;
  showcaseSlug?: string;
};

export default function CommentsThread({ pluginSlug, showcaseSlug }: Props) {
  const loading = useStore(authLoading);
  const authed = useStore(isAuthenticated);
  const token = useStore(authToken);
  const user = useStore(authUser);

  const targetQuery = useMemo(() => {
    if (pluginSlug) return `plugin=${encodeURIComponent(pluginSlug)}`;
    if (showcaseSlug) return `showcase=${encodeURIComponent(showcaseSlug)}`;
    return "";
  }, [pluginSlug, showcaseSlug]);

  const [items, setItems] = useState<CommentRow[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    initAuth();
  }, []);

  async function loadPage(nextOffset: number, replace: boolean) {
    if (!targetQuery) return;
    setFetching(true);
    setError(null);
    try {
      const url = new URL(`/api/comments/list?${targetQuery}`, POCKETBASE_URL);
      url.searchParams.set("limit", "30");
      url.searchParams.set("offset", String(nextOffset));

      const res = await fetch(url.toString(), {
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const rows = Array.isArray(json?.data) ? (json.data as CommentRow[]) : [];
      const meta = json?.meta || {};

      setItems((prev) => (replace ? rows : prev.concat(rows)));
      setHasMore(Boolean(meta?.hasMore));
      setOffset(Number(meta?.nextOffset || nextOffset + rows.length));
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "加载失败";
      setError(message);
    } finally {
      setFetching(false);
    }
  }

  useEffect(() => {
    setItems([]);
    setOffset(0);
    setHasMore(false);
    if (!targetQuery) return;
    loadPage(0, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetQuery, token]);

  const canPost = !loading && authed && Boolean(token);

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">评论</h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            新评论默认进入审核（pending），通过后公开展示。
          </p>
        </div>
        <button
          type="button"
          className="text-sm font-medium text-brand-700 hover:underline focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:text-brand-300"
          onClick={() => loadPage(0, true)}
          disabled={fetching}
          aria-label="刷新评论"
        >
          刷新
        </button>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
        {!canPost ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            需要{" "}
            <a
              className="text-brand-700 hover:underline focus:outline-none focus:rounded focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:text-brand-300"
              href="/auth/login"
            >
              登录
            </a>{" "}
            后才能发表评论。
          </p>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!token) return;
              const text = content.trim();
              if (!text) return;
              setPosting(true);
              setError(null);
              try {
                const res = await fetch(
                  new URL("/api/comments/create", POCKETBASE_URL).toString(),
                  {
                    method: "POST",
                    headers: {
                      Authorization: `Bearer ${token}`,
                      "Content-Type": "application/json",
                      Accept: "application/json",
                    },
                    body: JSON.stringify({
                      plugin: pluginSlug || "",
                      showcase: showcaseSlug || "",
                      content: text,
                    }),
                  },
                );
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                setContent("");
                await loadPage(0, true);
              } catch (e2: unknown) {
                const message = e2 instanceof Error ? e2.message : "发送失败";
                setError(message);
              } finally {
                setPosting(false);
              }
            }}
          >
            <label htmlFor="comment-input" className="sr-only">
              评论内容
            </label>
            <textarea
              id="comment-input"
              className="min-h-[90px] w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-neutral-800 dark:bg-neutral-950"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="写下你的评论…"
              disabled={posting}
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="text-xs text-neutral-500">
                已登录：
                {user?.name || user?.username || user?.email || user?.id}
              </div>
              <button
                type="submit"
                disabled={posting}
                className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {posting ? "发送中…" : "发送"}
              </button>
            </div>
          </form>
        )}
      </div>

      {error ? (
        <div
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200"
          role="alert"
        >
          {error}
        </div>
      ) : null}
      {fetching ? (
        <p className="text-sm text-neutral-500" role="status">
          加载中…
        </p>
      ) : null}

      <div className="space-y-3" role="list" aria-label="评论列表">
        {items.map((c) => {
          const author = c.author || null;
          const avatar = author?.avatar
            ? pocketbaseFileUrl(
                "users",
                String(author.id),
                String(author.avatar),
                { thumb: "100x100" },
              )
            : "";
          return (
            <article
              key={c.id}
              className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950"
              role="listitem"
              aria-labelledby={`comment-author-${c.id}`}
            >
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                  {avatar ? (
                    <img
                      src={avatar}
                      alt={`${author?.name || author?.username || "用户"}头像`}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      width={36}
                      height={36}
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span
                      id={`comment-author-${c.id}`}
                      className="text-sm font-medium"
                    >
                      {author?.name || author?.username || author?.id || "用户"}
                    </span>
                    {c.status && c.status !== "approved" ? (
                      <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                        {c.status}
                      </span>
                    ) : null}
                    {c.created ? (
                      <span className="text-xs text-neutral-500">
                        {String(c.created).replace("T", " ").replace("Z", "")}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2 whitespace-pre-wrap text-sm text-neutral-800 dark:text-neutral-200">
                    {c.content}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {!fetching && hasMore ? (
        <button
          type="button"
          className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm font-medium hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:bg-neutral-900"
          onClick={() => loadPage(offset, false)}
        >
          加载更多
        </button>
      ) : null}

      {!fetching && !error && items.length === 0 ? (
        <p className="text-sm text-neutral-500" role="status">
          暂无评论。
        </p>
      ) : null}
    </div>
  );
}
