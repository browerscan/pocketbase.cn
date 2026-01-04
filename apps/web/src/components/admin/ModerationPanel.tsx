import { useEffect, useMemo, useState } from "react";
import { useStore } from "@nanostores/react";
import { pb } from "../../lib/pocketbase/client";
import {
  authLoading,
  authUser,
  initAuth,
  isAuthenticated,
} from "../../lib/stores/auth";

type Row = {
  id: string;
  slug?: string;
  name?: string;
  title?: string;
  description?: string;
  status?: string;
  created?: string;
};

type CommentRow = {
  id: string;
  content?: string;
  status?: string;
  created?: string;
  plugin?: string;
  showcase?: string;
  author?: string;
};

export default function ModerationPanel() {
  const loading = useStore(authLoading);
  const authed = useStore(isAuthenticated);
  const user = useStore(authUser);

  const isStaff = useMemo(
    () => /admin|moderator/.test(String(user?.role || "")),
    [user],
  );

  const [plugins, setPlugins] = useState<Row[]>([]);
  const [showcases, setShowcases] = useState<Row[]>([]);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    initAuth();
  }, []);

  async function refresh() {
    setError(null);
    try {
      const [p, s, c] = await Promise.all([
        pb
          .collection("plugins")
          .getList(1, 100, { filter: "status = 'pending'", sort: "-created" }),
        pb
          .collection("showcase")
          .getList(1, 100, { filter: "status = 'pending'", sort: "-created" }),
        pb
          .collection("comments")
          .getList(1, 100, { filter: "status = 'pending'", sort: "-created" }),
      ]);
      setPlugins((p.items as any[]) || []);
      setShowcases((s.items as any[]) || []);
      setComments((c.items as any[]) || []);
    } catch (e: any) {
      setError(e?.message || "加载失败");
    }
  }

  useEffect(() => {
    if (!authed || !isStaff) return;
    refresh();
  }, [authed, isStaff]);

  if (loading) return <p className="text-sm text-neutral-500">加载中…</p>;
  if (!authed || !user?.id)
    return (
      <p className="text-sm text-neutral-700 dark:text-neutral-300">
        需要登录。
      </p>
    );
  if (!isStaff)
    return (
      <p className="text-sm text-neutral-700 dark:text-neutral-300">
        需要 moderator/admin 权限。
      </p>
    );

  async function setStatus(collection: string, id: string, status: string) {
    setBusyId(id);
    try {
      await pb.collection(collection).update(id, { status });
      await refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-10">
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <section className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">待审核插件</h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              审核后才会进入公开列表。
            </p>
          </div>
          <button
            type="button"
            className="min-h-[44px] self-start rounded-md px-4 py-2 text-sm font-medium text-brand-700 hover:underline focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:text-brand-300"
            onClick={() => refresh()}
          >
            刷新
          </button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {plugins.map((p) => (
            <div
              key={p.id}
              className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950"
            >
              <div className="font-medium">{p.name || p.slug || p.id}</div>
              <div className="mt-1 line-clamp-2 text-sm text-neutral-600 dark:text-neutral-400">
                {p.description}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busyId === p.id}
                  className="min-h-[44px] rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
                  onClick={() => setStatus("plugins", p.id, "approved")}
                >
                  通过
                </button>
                <button
                  type="button"
                  disabled={busyId === p.id}
                  className="min-h-[44px] rounded-md border border-neutral-200 px-4 py-2 text-sm font-medium hover:bg-neutral-50 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:border-neutral-800 dark:hover:bg-neutral-900"
                  onClick={() => setStatus("plugins", p.id, "rejected")}
                >
                  拒绝
                </button>
              </div>
            </div>
          ))}
        </div>
        {plugins.length === 0 ? (
          <p className="text-sm text-neutral-500">暂无待审核插件。</p>
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">待审核案例</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {showcases.map((s) => (
            <div
              key={s.id}
              className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950"
            >
              <div className="font-medium">{s.title || s.slug || s.id}</div>
              <div className="mt-1 line-clamp-2 text-sm text-neutral-600 dark:text-neutral-400">
                {s.description}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busyId === s.id}
                  className="min-h-[44px] rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
                  onClick={() => setStatus("showcase", s.id, "approved")}
                >
                  通过
                </button>
                <button
                  type="button"
                  disabled={busyId === s.id}
                  className="min-h-[44px] rounded-md border border-neutral-200 px-4 py-2 text-sm font-medium hover:bg-neutral-50 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:border-neutral-800 dark:hover:bg-neutral-900"
                  onClick={() => setStatus("showcase", s.id, "rejected")}
                >
                  拒绝
                </button>
              </div>
            </div>
          ))}
        </div>
        {showcases.length === 0 ? (
          <p className="text-sm text-neutral-500">暂无待审核案例。</p>
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">待审核评论</h2>
        <div className="space-y-2">
          {comments.map((c) => (
            <div
              key={c.id}
              className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950"
            >
              <div className="text-sm text-neutral-700 dark:text-neutral-300">
                {c.content}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busyId === c.id}
                  className="min-h-[44px] rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
                  onClick={() => setStatus("comments", c.id, "approved")}
                >
                  通过
                </button>
                <button
                  type="button"
                  disabled={busyId === c.id}
                  className="min-h-[44px] rounded-md border border-neutral-200 px-4 py-2 text-sm font-medium hover:bg-neutral-50 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:border-neutral-800 dark:hover:bg-neutral-900"
                  onClick={() => setStatus("comments", c.id, "rejected")}
                >
                  拒绝
                </button>
                <button
                  type="button"
                  disabled={busyId === c.id}
                  className="min-h-[44px] rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-950"
                  onClick={() => setStatus("comments", c.id, "spam")}
                >
                  Spam
                </button>
              </div>
            </div>
          ))}
        </div>
        {comments.length === 0 ? (
          <p className="text-sm text-neutral-500">暂无待审核评论。</p>
        ) : null}
      </section>
    </div>
  );
}
