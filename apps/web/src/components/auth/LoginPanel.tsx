import { useMemo, useState } from "react";
import { pb } from "../../lib/pocketbase/client";
import { publicEnv } from "../../lib/env/public";

export default function LoginPanel() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"github" | "password">("github");
  const [identity, setIdentity] = useState("");
  const [password, setPassword] = useState("");

  const enablePasswordLogin = useMemo(() => {
    if (publicEnv.PUBLIC_ENABLE_PASSWORD_LOGIN === "1") return true;
    try {
      return (
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1"
      );
    } catch {
      return false;
    }
  }, []);

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950 sm:p-5">
      <div className="flex gap-2">
        <button
          type="button"
          className={`flex min-h-[44px] flex-1 rounded-md px-3 py-3 text-sm font-medium sm:py-2 ${mode === "github" ? "bg-brand-600 text-white hover:bg-brand-700" : "border border-neutral-200 bg-white hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:bg-neutral-900"}`}
          onClick={() => setMode("github")}
        >
          GitHub OAuth
        </button>
        {enablePasswordLogin ? (
          <button
            type="button"
            className={`flex min-h-[44px] flex-1 rounded-md px-3 py-3 text-sm font-medium sm:py-2 ${mode === "password" ? "bg-brand-600 text-white hover:bg-brand-700" : "border border-neutral-200 bg-white hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:bg-neutral-900"}`}
            onClick={() => setMode("password")}
          >
            邮箱密码
          </button>
        ) : null}
      </div>

      {mode === "github" ? (
        <button
          type="button"
          className="mt-3 flex min-h-[48px] w-full items-center justify-center rounded-md bg-brand-600 px-4 py-3 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60 sm:py-2 sm:px-3"
          disabled={loading}
          onClick={async () => {
            setError(null);
            setLoading(true);
            try {
              await pb.collection("users").authWithOAuth2({
                provider: "github",
                redirectUrl: `${window.location.origin}/auth/callback`,
              });
              window.location.href = "/";
            } catch (e: unknown) {
              const message =
                e instanceof Error ? e.message : "登录失败，请稍后重试";
              setError(message);
            } finally {
              setLoading(false);
            }
          }}
        >
          {loading ? "跳转中…" : "使用 GitHub 登录"}
        </button>
      ) : (
        <form
          className="mt-3 space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            setLoading(true);
            try {
              await pb
                .collection("users")
                .authWithPassword(identity.trim(), password);
              window.location.href = "/dashboard";
            } catch (e2: unknown) {
              const message = e2 instanceof Error ? e2.message : "登录失败";
              setError(message);
            } finally {
              setLoading(false);
            }
          }}
        >
          <input
            className="w-full rounded-md border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-neutral-800 dark:bg-neutral-950 sm:px-3 sm:py-2"
            placeholder="邮箱或用户名"
            value={identity}
            onChange={(e) => setIdentity(e.target.value)}
            autoComplete="username"
          />
          <input
            className="w-full rounded-md border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-neutral-800 dark:bg-neutral-950 sm:px-3 sm:py-2"
            placeholder="密码"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          <button
            type="submit"
            className="flex min-h-[48px] w-full items-center justify-center rounded-md bg-brand-600 px-4 py-3 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60 sm:py-2 sm:px-3"
            disabled={loading}
          >
            {loading ? "登录中…" : "登录"}
          </button>
        </form>
      )}

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      <p className="mt-4 text-xs text-neutral-600 dark:text-neutral-400">
        {mode === "github"
          ? "需要在 PocketBase 后端配置 GitHub OAuth Provider，并设置允许的回调地址。"
          : "邮箱/密码登录适用于自建账号（本地开发默认开启，可用 PUBLIC_ENABLE_PASSWORD_LOGIN=1 强制开启）。"}
      </p>
    </div>
  );
}
