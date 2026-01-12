import { useEffect, useMemo, useState } from "react";
import { useStore } from "@nanostores/react";
import { pb } from "../../lib/pocketbase/client";
import {
  authLoading,
  authToken,
  authUser,
  initAuth,
  isAuthenticated,
  logout,
} from "../../lib/stores/auth";

export default function ProfilePanel() {
  const loading = useStore(authLoading);
  const authed = useStore(isAuthenticated);
  const token = useStore(authToken);
  const user = useStore(authUser);

  const avatarUrl = useMemo(() => {
    const avatar = String(user?.avatar || "").trim();
    if (!avatar) return "";
    if (avatar.startsWith("http://") || avatar.startsWith("https://"))
      return avatar;
    try {
      return pb.files.getUrl(user as any, avatar, { thumb: "100x100" });
    } catch {
      return "";
    }
  }, [user]);

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [website, setWebsite] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    initAuth();
  }, []);

  useEffect(() => {
    setName(String(user?.name || ""));
    setBio(String(user?.bio || ""));
    setWebsite(String(user?.website || ""));
  }, [user]);

  if (loading) return <p className="text-sm text-neutral-500">加载中…</p>;
  if (!authed || !user?.id) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950">
        <p className="text-sm text-neutral-700 dark:text-neutral-300">
          需要登录后才能查看个人资料。
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
    <div className="space-y-6">
      <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={`${user?.name || user?.username || user?.email || "用户"}头像`}
                className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
                width={48}
                height={48}
              />
            ) : null}
          </div>
          <div className="min-w-0">
            <div className="truncate font-medium">
              {user?.name || user?.username || user?.email || "用户"}
            </div>
            <div className="text-xs text-neutral-500">ID: {user.id}</div>
          </div>
        </div>
      </div>

      <form
        className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950"
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          setOk(null);
          setSaving(true);
          try {
            const form = new FormData();
            form.set("name", name);
            form.set("bio", bio);
            form.set("website", website);
            if (avatarFile) form.set("avatar", avatarFile);

            await pb.collection("users").update(user.id, form);
            await initAuth();
            setOk("已保存");
          } catch (err: any) {
            setError(err?.message || "保存失败");
          } finally {
            setSaving(false);
          }
        }}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1">
            <div className="text-sm font-medium">显示名称</div>
            <input
              className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-neutral-800 dark:bg-neutral-950"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="可选"
            />
          </label>
          <label className="space-y-1">
            <div className="text-sm font-medium">网站</div>
            <input
              className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-neutral-800 dark:bg-neutral-950"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://example.com"
            />
          </label>
        </div>

        <label className="mt-4 block space-y-1">
          <div className="text-sm font-medium">简介</div>
          <textarea
            className="min-h-[120px] w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-neutral-800 dark:bg-neutral-950"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="最多 500 字"
          />
        </label>

        <label className="mt-4 block space-y-1">
          <div className="text-sm font-medium">头像（可选）</div>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
          />
        </label>

        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
        {ok ? <p className="mt-4 text-sm text-green-700">{ok}</p> : null}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            disabled={saving}
          >
            {saving ? "保存中…" : "保存"}
          </button>
          <a
            className="text-sm text-neutral-600 hover:underline dark:text-neutral-400"
            href="/dashboard"
          >
            返回我的面板
          </a>
        </div>
      </form>

      <div className="rounded-xl border border-red-200 bg-white p-5 dark:border-red-900/60 dark:bg-neutral-950">
        <div className="font-semibold text-red-700 dark:text-red-300">
          危险操作
        </div>
        <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">
          删除账号会移除你的插件/案例/评论等数据，且不可恢复。
        </p>
        <button
          type="button"
          className="mt-4 rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-950"
          disabled={!token}
          onClick={async () => {
            if (!token) return;
            const confirm = window.prompt(
              "输入 DELETE 以确认删除账号（不可恢复）",
            );
            if (confirm !== "DELETE") return;
            try {
              const res = await fetch(`${pb.baseUrl}/api/me/delete`, {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                  Accept: "application/json",
                },
                body: JSON.stringify({ confirm: "DELETE" }),
              });
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              await logout();
              window.location.href = "/";
            } catch (err: any) {
              window.alert(err?.message || "删除失败");
            }
          }}
        >
          删除账号
        </button>
      </div>
    </div>
  );
}
