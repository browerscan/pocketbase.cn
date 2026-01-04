import { useState } from "react";
import { POCKETBASE_URL } from "../../lib/constants/config";
import { fetchWithCsrf } from "../../lib/utils/csrf";

type MessageStatus = "success" | "error" | null;

export default function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageStatus, setMessageStatus] = useState<MessageStatus>(null);

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setMessage(null);
        setMessageStatus(null);
        setLoading(true);
        try {
          const res = await fetchWithCsrf(
            new URL("/api/newsletter/subscribe", POCKETBASE_URL).toString(),
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
              },
              body: JSON.stringify({ email, source: "downloads" }),
            },
          );
          const json = await res.json().catch(() => null);
          if (!res.ok)
            throw new Error(json?.error?.message || `HTTP ${res.status}`);
          setMessage("已提交，请到邮箱确认订阅。");
          setMessageStatus("success");
          setEmail("");
        } catch (err: unknown) {
          const errorMessage =
            err instanceof Error ? err.message : "提交失败，请重试";
          setMessage(errorMessage);
          setMessageStatus("error");
        } finally {
          setLoading(false);
        }
      }}
    >
      <label htmlFor="newsletter-email" className="sr-only">
        邮箱地址
      </label>
      <input
        id="newsletter-email"
        className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-neutral-800 dark:bg-neutral-950"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        type="email"
        autoComplete="email"
        disabled={loading}
        aria-describedby={message ? "newsletter-message" : undefined}
      />
      <button
        className="inline-flex w-full items-center justify-center rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
        disabled={loading}
        type="submit"
        aria-label={loading ? "提交中" : "订阅更新"}
      >
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <svg
              className="h-4 w-4 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
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
            提交中…
          </span>
        ) : (
          "订阅更新"
        )}
      </button>
      {message ? (
        <p
          id="newsletter-message"
          className={`text-sm ${
            messageStatus === "error"
              ? "text-red-600 dark:text-red-400"
              : "text-green-600 dark:text-green-400"
          }`}
          role="status"
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
