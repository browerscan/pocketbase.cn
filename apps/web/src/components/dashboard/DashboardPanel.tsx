import { useEffect, useMemo, useState } from "react";
import { useStore } from "@nanostores/react";
import { pb } from "../../lib/pocketbase/client";
import {
  authLoading,
  authUser,
  initAuth,
  isAuthenticated,
} from "../../lib/stores/auth";

type ListItem = {
  id: string;
  slug?: string;
  title?: string;
  name?: string;
  description?: string;
  status?: string;
  created?: string;
  updated?: string;
};

export default function DashboardPanel() {
  const loading = useStore(authLoading);
  const authed = useStore(isAuthenticated);
  const user = useStore(authUser);

  const isStaff = useMemo(
    () => /admin|moderator/.test(String(user?.role || "")),
    [user],
  );

  const [plugins, setPlugins] = useState<ListItem[]>([]);
  const [showcases, setShowcases] = useState<ListItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initAuth();
  }, []);

  useEffect(() => {
    if (!authed || !user?.id) return;
    let alive = true;
    setError(null);

    Promise.all([
      pb.collection("plugins").getList(1, 50, {
        filter: pb.filter("author = {:author}", { author: user.id }),
        sort: "-created",
      }),
      pb.collection("showcase").getList(1, 50, {
        filter: pb.filter("author = {:author}", { author: user.id }),
        sort: "-created",
      }),
    ])
      .then(([p, s]) => {
        if (!alive) return;
        setPlugins((p.items as ListItem[]) || []);
        setShowcases((s.items as ListItem[]) || []);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        const message = e instanceof Error ? e.message : "加载失败";
        setError(message);
      });

    return () => {
      alive = false;
    };
  }, [authed, user?.id]);

  if (loading) return <p className="text-sm text-neutral-500">加载中…</p>;
  if (!authed || !user?.id) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950">
        <p className="text-sm text-neutral-700 dark:text-neutral-300">
          需要登录后才能查看我的面板。
        </p>
        <a
          className="mt-3 inline-block text-sm font-medium text-brand-700 hover:underline dark:text-brand-300"
          href="/auth/login"
        >
          去登录 →
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">我的插件</h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              提交后会进入审核流程。
            </p>
          </div>
          <a
            className="text-sm font-medium text-brand-700 hover:underline dark:text-brand-300"
            href="/plugins/submit"
          >
            提交插件 →
          </a>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {plugins.map((p) => (
            <div
              key={p.id}
              className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-medium">
                    {p.name || p.slug || p.id}
                  </div>
                  <div className="mt-1 line-clamp-2 text-sm text-neutral-600 dark:text-neutral-400">
                    {p.description}
                  </div>
                </div>
                <span className="rounded bg-neutral-100 px-2 py-1 text-xs text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                  {p.status || "unknown"}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                {p.slug ? (
                  <a
                    className="text-sm text-brand-700 hover:underline dark:text-brand-300"
                    href={`/plugins/${p.slug}/edit`}
                  >
                    编辑
                  </a>
                ) : null}
                {p.slug && p.status === "approved" ? (
                  <a
                    className="text-sm text-neutral-600 hover:underline dark:text-neutral-400"
                    href={`/plugins/${p.slug}`}
                  >
                    查看详情
                  </a>
                ) : null}
              </div>
            </div>
          ))}
        </div>
        {plugins.length === 0 ? (
          <p className="text-sm text-neutral-500">暂无插件提交记录。</p>
        ) : null}
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">我的案例</h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              优质案例会进入精选展示。
            </p>
          </div>
          <a
            className="text-sm font-medium text-brand-700 hover:underline dark:text-brand-300"
            href="/showcase/submit"
          >
            提交案例 →
          </a>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {showcases.map((s) => (
            <div
              key={s.id}
              className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-medium">
                    {s.title || s.slug || s.id}
                  </div>
                  <div className="mt-1 line-clamp-2 text-sm text-neutral-600 dark:text-neutral-400">
                    {s.description}
                  </div>
                </div>
                <span className="rounded bg-neutral-100 px-2 py-1 text-xs text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                  {s.status || "unknown"}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                {s.slug ? (
                  <a
                    className="text-sm text-brand-700 hover:underline dark:text-brand-300"
                    href={`/showcase/${s.slug}/edit`}
                  >
                    编辑
                  </a>
                ) : null}
                {s.slug && s.status === "approved" ? (
                  <a
                    className="text-sm text-neutral-600 hover:underline dark:text-neutral-400"
                    href={`/showcase/${s.slug}`}
                  >
                    查看详情
                  </a>
                ) : null}
              </div>
            </div>
          ))}
        </div>
        {showcases.length === 0 ? (
          <p className="text-sm text-neutral-500">暂无案例提交记录。</p>
        ) : null}
      </section>

      {isStaff ? (
        <section className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950">
          <h2 className="text-lg font-semibold">审核 / 管理</h2>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            你拥有 {String(user?.role || "")} 权限，可以进入审核队列。
          </p>
          <a
            className="mt-3 inline-block text-sm font-medium text-brand-700 hover:underline dark:text-brand-300"
            href="/admin/moderation"
          >
            打开审核队列 →
          </a>
        </section>
      ) : null}
    </div>
  );
}
