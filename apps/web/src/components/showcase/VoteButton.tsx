import { useState, memo } from "react";
import { POCKETBASE_URL } from "../../lib/constants/config";
import { pb } from "../../lib/pocketbase/client";

function VoteButton({ slug }: { slug: string }) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  return (
    <button
      type="button"
      className="w-full rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
      disabled={loading}
      onClick={async () => {
        setStatus(null);
        setIsError(false);
        if (!pb.authStore.isValid) {
          window.location.href = "/auth/login";
          return;
        }

        setLoading(true);
        try {
          const url = new URL(
            `/api/showcase/${encodeURIComponent(slug)}/vote`,
            POCKETBASE_URL,
          );
          const res = await fetch(url.toString(), {
            method: "POST",
            headers: {
              Accept: "application/json",
              Authorization: pb.authStore.token
                ? `Bearer ${pb.authStore.token}`
                : "",
            },
          });

          const json = await res.json().catch(() => null);
          if (!res.ok)
            throw new Error(json?.error?.message || `HTTP ${res.status}`);
          const voted = Boolean(json?.data?.voted);
          setStatus(voted ? "已投票" : "已取消");
        } catch (e: unknown) {
          const message = e instanceof Error ? e.message : "操作失败，请重试";
          setStatus(message);
          setIsError(true);
        } finally {
          setLoading(false);
        }
      }}
      aria-label={
        loading ? "处理中" : isError ? "操作失败，点击重试" : "投票或取消投票"
      }
    >
      {loading ? (
        <span className="inline-flex items-center justify-center gap-2">
          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          处理中…
        </span>
      ) : isError ? (
        <span className="inline-flex items-center gap-2">
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          重试
        </span>
      ) : (
        "Vote / Unvote"
      )}
      {status && !isError ? (
        <span className="ml-2 opacity-80">({status})</span>
      ) : null}
    </button>
  );
}

export default memo(VoteButton);
