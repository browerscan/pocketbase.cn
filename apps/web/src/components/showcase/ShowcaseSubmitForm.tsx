import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@nanostores/react";
import { z } from "zod";
import { pb } from "../../lib/pocketbase/client";
import {
  authLoading,
  authUser,
  initAuth,
  isAuthenticated,
} from "../../lib/stores/auth";
import { SHOWCASE_CATEGORIES } from "../../lib/constants/categories";
import { slugify } from "../../lib/utils/slug";
import { showcaseSubmitSchema } from "../../lib/schemas";
import {
  clearDraft,
  loadDraft,
  saveDraft,
  type DraftData,
} from "../../lib/utils/draftStore";
import {
  createTouchTracker,
  type FormErrors,
} from "../../lib/utils/formValidation";
import { MarkdownEditor } from "../ui/MarkdownPreview";

const schema = showcaseSubmitSchema.extend({
  category: z.enum(SHOWCASE_CATEGORIES),
});

export interface ShowcaseEditData {
  id: string;
  slug: string;
  title: string;
  description: string;
  url: string;
  repository?: string;
  category?: string;
  tags?: string[];
  content?: string;
}

interface ShowcaseSubmitFormProps {
  mode?: "create" | "edit";
  initialData?: ShowcaseEditData;
}

function parseTags(input: string) {
  return String(input || "")
    .split(/[,，]/g)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 12);
}

export default function ShowcaseSubmitForm({
  mode = "create",
  initialData,
}: ShowcaseSubmitFormProps) {
  const loading = useStore(authLoading);
  const authed = useStore(isAuthenticated);
  const user = useStore(authUser);

  const isEditMode = mode === "edit" && initialData;

  // Draft management
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const draftSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchTracker = useRef(createTouchTracker()).current;

  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(
    initialData?.description || "",
  );
  const [url, setUrl] = useState(initialData?.url || "");
  const [repository, setRepository] = useState(initialData?.repository || "");
  const [category, setCategory] = useState<
    (typeof SHOWCASE_CATEGORIES)[number]
  >((initialData?.category as (typeof SHOWCASE_CATEGORIES)[number]) || "saas");
  const [tags, setTags] = useState(
    Array.isArray(initialData?.tags) ? initialData.tags.join(", ") : "",
  );
  const [content, setContent] = useState(initialData?.content || "");
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [screenshots, setScreenshots] = useState<File[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});

  useEffect(() => {
    initAuth();
  }, []);

  // Load draft on mount (only for create mode)
  useEffect(() => {
    if (mode === "create" && !initialData) {
      const draft = loadDraft("showcase", "create");
      if (draft && Object.keys(draft).length > 0) {
        setShowDraftBanner(true);
        if (draft.title) setTitle(String(draft.title));
        if (draft.description) setDescription(String(draft.description));
        if (draft.url) setUrl(String(draft.url));
        if (draft.repository) setRepository(String(draft.repository));
        if (draft.category)
          setCategory(draft.category as (typeof SHOWCASE_CATEGORIES)[number]);
        if (draft.tags) setTags(String(draft.tags));
        if (draft.content) setContent(String(draft.content));
      }
    }
  }, [mode]);

  // Auto-save draft
  const saveDraftDebounced = useCallback(() => {
    if (mode === "edit") return; // Don't save drafts in edit mode
    if (draftSaveTimer.current) clearTimeout(draftSaveTimer.current);
    draftSaveTimer.current = setTimeout(() => {
      const draftData: DraftData = {
        title,
        description,
        url,
        repository,
        category,
        tags,
        content,
      };
      saveDraft("showcase", draftData, "create");
    }, 1000);
  }, [title, description, url, repository, category, tags, content, mode]);

  useEffect(() => {
    saveDraftDebounced();
    return () => {
      if (draftSaveTimer.current) clearTimeout(draftSaveTimer.current);
    };
  }, [saveDraftDebounced]);

  // Restore draft from banner
  const handleRestoreDraft = () => {
    setShowDraftBanner(false);
  };

  // Clear draft
  const handleClearDraft = () => {
    clearDraft("showcase", "create");
    setShowDraftBanner(false);
    // Reset form
    setTitle("");
    setDescription("");
    setUrl("");
    setRepository("");
    setCategory("saas");
    setTags("");
    setContent("");
    touchTracker.reset();
    setFieldErrors({});
  };

  // Validate field on blur
  const handleFieldBlur = useCallback(
    (fieldName: string) => {
      touchTracker.touch(fieldName);
      const data = {
        title,
        description,
        url,
        repository,
        category,
        tags,
        content,
      };
      try {
        schema.parse({
          ...data,
          [fieldName]: data[fieldName as keyof typeof data],
        });
        setFieldErrors((prev) => {
          const next = { ...prev };
          delete next[fieldName];
          return next;
        });
      } catch (err) {
        if (err instanceof z.ZodError) {
          const issue = err.issues.find((i) => i.path.join(".") === fieldName);
          if (issue) {
            setFieldErrors((prev) => ({ ...prev, [fieldName]: issue.message }));
          }
        }
      }
    },
    [
      title,
      description,
      url,
      repository,
      category,
      tags,
      content,
      touchTracker,
    ],
  );

  const getFieldError = (fieldName: string) => {
    return touchTracker.isTouched(fieldName)
      ? fieldErrors[fieldName]
      : undefined;
  };

  const tagPreview = useMemo(() => parseTags(tags), [tags]);

  if (loading) return <p className="text-sm text-neutral-500">加载中…</p>;
  if (!authed || !user?.id) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950">
        <p className="text-sm text-neutral-700 dark:text-neutral-300">
          需要登录后才能提交案例。
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
    <form
      className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        setOk(null);
        setSubmitting(true);
        try {
          // Refresh auth token before submission to ensure valid session
          try {
            await pb.collection("users").authRefresh();
          } catch (authErr) {
            setError("会话已过期，请重新登录");
            setSubmitting(false);
            window.setTimeout(() => {
              window.location.href = "/auth/login";
            }, 1500);
            return;
          }

          const parsed = schema.parse({
            title,
            description,
            url,
            repository,
            category,
            tags,
            content,
          });

          const tagsArr = parseTags(parsed.tags || "");

          const form = new FormData();
          form.set("title", parsed.title);
          form.set("description", parsed.description);
          form.set("url", parsed.url);
          if (parsed.repository) form.set("repository", parsed.repository);
          form.set("category", parsed.category);
          if (tagsArr.length) form.set("tags", JSON.stringify(tagsArr));
          if (parsed.content) form.set("content", parsed.content);
          if (thumbnail) form.set("thumbnail", thumbnail);
          for (const f of screenshots) form.append("screenshots", f);

          if (isEditMode) {
            // Update existing showcase
            await pb.collection("showcase").update(initialData.id, form);
            setOk("更新成功。");
            window.setTimeout(() => {
              window.location.href = `/showcase/${initialData.slug}`;
            }, 600);
          } else {
            // Create new showcase
            const newSlug = slugify(parsed.title);
            form.set("slug", newSlug);
            await pb.collection("showcase").create(form);
            setOk("提交成功，已进入审核队列。");
            // Clear draft on successful submission
            clearDraft("showcase", "create");
            window.setTimeout(() => {
              window.location.href = "/dashboard";
            }, 600);
          }
        } catch (err: unknown) {
          if (
            err &&
            typeof err === "object" &&
            "issues" in err &&
            Array.isArray(err.issues) &&
            err.issues[0]?.message
          ) {
            setError(String(err.issues[0].message));
          } else {
            const message = err instanceof Error ? err.message : "提交失败";
            setError(message);
          }
        } finally {
          setSubmitting(false);
        }
      }}
    >
      {/* Draft restoration banner */}
      {showDraftBanner ? (
        <div className="mb-4 flex items-center justify-between rounded-lg bg-amber-50 p-3 text-sm dark:bg-amber-950/30">
          <span className="text-amber-800 dark:text-amber-300">
            Found a saved draft. Would you like to restore it?
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleClearDraft}
              className="rounded px-2 py-1 text-xs text-amber-700 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-900/30"
            >
              Dismiss
            </button>
            <button
              type="button"
              onClick={handleRestoreDraft}
              className="rounded bg-amber-600 px-2 py-1 text-xs text-white hover:bg-amber-700"
            >
              Restore Draft
            </button>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1">
          <div className="text-sm font-medium">标题</div>
          <input
            className={`w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-brand-500 dark:bg-neutral-950 ${getFieldError("title") ? "border-red-500 bg-red-50 dark:bg-red-950/20" : "border-neutral-200 bg-white dark:border-neutral-800"}`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => handleFieldBlur("title")}
            placeholder="例如：PocketBase + Astro 作品集"
          />
          {getFieldError("title") && (
            <p className="text-xs text-red-600">{getFieldError("title")}</p>
          )}
        </label>
        <label className="space-y-1">
          <div className="text-sm font-medium">分类</div>
          <select
            className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-neutral-800 dark:bg-neutral-950"
            value={category}
            onChange={(e) =>
              setCategory(
                e.target.value as (typeof SHOWCASE_CATEGORIES)[number],
              )
            }
          >
            {SHOWCASE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="mt-4 block space-y-1">
        <div className="text-sm font-medium">简介</div>
        <textarea
          className={`min-h-[110px] w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-brand-500 dark:bg-neutral-950 ${getFieldError("description") ? "border-red-500 bg-red-50 dark:bg-red-950/20" : "border-neutral-200 bg-white dark:border-neutral-800"}`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => handleFieldBlur("description")}
          placeholder="说明这个项目做什么、为什么值得参考（10-1000 字）"
        />
        {getFieldError("description") && (
          <p className="text-xs text-red-600">{getFieldError("description")}</p>
        )}
      </label>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="space-y-1">
          <div className="text-sm font-medium">项目地址</div>
          <input
            className={`w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-brand-500 dark:bg-neutral-950 ${getFieldError("url") ? "border-red-500 bg-red-50 dark:bg-red-950/20" : "border-neutral-200 bg-white dark:border-neutral-800"}`}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onBlur={() => handleFieldBlur("url")}
            placeholder="https://example.com"
          />
          {getFieldError("url") && (
            <p className="text-xs text-red-600">{getFieldError("url")}</p>
          )}
        </label>
        <label className="space-y-1">
          <div className="text-sm font-medium">仓库地址（可选）</div>
          <input
            className={`w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-brand-500 dark:bg-neutral-950 ${getFieldError("repository") ? "border-red-500 bg-red-50 dark:bg-red-950/20" : "border-neutral-200 bg-white dark:border-neutral-800"}`}
            value={repository}
            onChange={(e) => setRepository(e.target.value)}
            onBlur={() => handleFieldBlur("repository")}
            placeholder="https://github.com/owner/repo"
          />
          {getFieldError("repository") && (
            <p className="text-xs text-red-600">
              {getFieldError("repository")}
            </p>
          )}
        </label>
      </div>

      <label className="mt-4 block space-y-1">
        <div className="text-sm font-medium">标签（逗号分隔，可选）</div>
        <input
          className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-neutral-800 dark:bg-neutral-950"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="saas, dashboard, ..."
        />
        {tagPreview.length ? (
          <div className="flex flex-wrap gap-2 pt-1 text-xs text-neutral-600 dark:text-neutral-400">
            {tagPreview.map((t) => (
              <span
                key={t}
                className="rounded bg-neutral-100 px-2 py-1 dark:bg-neutral-800"
              >
                {t}
              </span>
            ))}
          </div>
        ) : null}
      </label>

      <MarkdownEditor
        value={content}
        onChange={setContent}
        label="内容（可选，支持 Markdown）"
        placeholder="写一点实现思路、用到的技术栈、经验总结…"
        minHeight="160px"
        error={getFieldError("content")}
      />

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="space-y-1">
          <div className="text-sm font-medium">封面图（可选）</div>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setThumbnail(e.target.files?.[0] || null)}
          />
          <p className="text-xs text-neutral-500">
            建议 1200×630 或 16:9，≤5MB
          </p>
        </label>
        <label className="space-y-1">
          <div className="text-sm font-medium">截图（可选，最多 10 张）</div>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            onChange={(e) =>
              setScreenshots(Array.from(e.target.files || []).slice(0, 10))
            }
          />
          <p className="text-xs text-neutral-500">PNG/JPG/WebP，单张 ≤10MB</p>
        </label>
      </div>

      {error ? <p className="mt-5 text-sm text-red-600">{error}</p> : null}
      {ok ? <p className="mt-5 text-sm text-green-700">{ok}</p> : null}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          disabled={submitting}
        >
          {submitting
            ? isEditMode
              ? "保存中..."
              : "提交中..."
            : isEditMode
              ? "保存修改"
              : "提交"}
        </button>
        <a
          className="text-sm text-neutral-600 hover:underline dark:text-neutral-400"
          href={isEditMode ? `/showcase/${initialData?.slug}` : "/dashboard"}
        >
          {isEditMode ? "取消" : "返回我的面板"}
        </a>
      </div>
    </form>
  );
}
