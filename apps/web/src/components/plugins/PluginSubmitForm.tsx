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
import { PLUGIN_CATEGORIES } from "../../lib/constants/categories";
import { slugify } from "../../lib/utils/slug";
import { pluginSubmitSchema } from "../../lib/schemas";
import {
  clearDraft,
  loadDraft,
  saveDraft,
  hasDraft,
  type DraftData,
} from "../../lib/utils/draftStore";
import {
  createTouchTracker,
  type FormErrors,
} from "../../lib/utils/formValidation";

const schema = pluginSubmitSchema.extend({
  category: z.enum(PLUGIN_CATEGORIES),
});

export interface PluginEditData {
  id: string;
  slug: string;
  name: string;
  description: string;
  repository?: string;
  homepage?: string;
  category?: string;
  tags?: string[];
  license?: string;
}

interface PluginSubmitFormProps {
  mode?: "create" | "edit";
  initialData?: PluginEditData;
}

const MAX_ICON_SIZE = 512 * 1024; // 512KB
const MAX_SCREENSHOT_SIZE = 2 * 1024 * 1024; // 2MB

function validateIcon(file: File | null): { valid: boolean; error?: string } {
  if (!file) return { valid: true };
  if (file.size > MAX_ICON_SIZE) {
    return { valid: false, error: "Icon must be ≤512KB" };
  }
  if (!file.type.startsWith("image/")) {
    return { valid: false, error: "Icon must be an image" };
  }
  return { valid: true };
}

function validateScreenshots(files: File[]): {
  valid: boolean;
  error?: string;
} {
  if (files.length > 5) {
    return { valid: false, error: "Maximum 5 screenshots allowed" };
  }
  for (const f of files) {
    if (f.size > MAX_SCREENSHOT_SIZE) {
      return {
        valid: false,
        error: `Screenshot "${f.name}" exceeds 2MB limit`,
      };
    }
    if (!f.type.startsWith("image/")) {
      return { valid: false, error: `Screenshot "${f.name}" must be an image` };
    }
  }
  return { valid: true };
}

function parseTags(input: string) {
  return String(input || "")
    .split(/[,，]/g)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 10);
}

export default function PluginSubmitForm({
  mode = "create",
  initialData,
}: PluginSubmitFormProps) {
  const loading = useStore(authLoading);
  const authed = useStore(isAuthenticated);
  const user = useStore(authUser);

  const isEditMode = mode === "edit" && initialData;

  // Draft management
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const draftSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchTracker = useRef(createTouchTracker()).current;

  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(
    initialData?.description || "",
  );
  const [repository, setRepository] = useState(initialData?.repository || "");
  const [homepage, setHomepage] = useState(initialData?.homepage || "");
  const [category, setCategory] = useState<(typeof PLUGIN_CATEGORIES)[number]>(
    (initialData?.category as (typeof PLUGIN_CATEGORIES)[number]) || "utility",
  );
  const [tags, setTags] = useState(
    Array.isArray(initialData?.tags) ? initialData.tags.join(", ") : "",
  );
  const [license, setLicense] = useState(initialData?.license || "MIT");
  const [icon, setIcon] = useState<File | null>(null);
  const [screenshots, setScreenshots] = useState<File[]>([]);

  const [version, setVersion] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [pocketbaseVersion, setPocketbaseVersion] = useState("");
  const [changelog, setChangelog] = useState("");

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
      const draft = loadDraft("plugin", "create");
      if (draft && Object.keys(draft).length > 0) {
        setShowDraftBanner(true);
        if (draft.name) setName(String(draft.name));
        if (draft.description) setDescription(String(draft.description));
        if (draft.repository) setRepository(String(draft.repository));
        if (draft.homepage) setHomepage(String(draft.homepage));
        if (draft.category)
          setCategory(draft.category as (typeof PLUGIN_CATEGORIES)[number]);
        if (draft.tags) setTags(String(draft.tags));
        if (draft.license) setLicense(String(draft.license));
        if (draft.version) setVersion(String(draft.version));
        if (draft.downloadUrl) setDownloadUrl(String(draft.downloadUrl));
        if (draft.pocketbaseVersion)
          setPocketbaseVersion(String(draft.pocketbaseVersion));
        if (draft.changelog) setChangelog(String(draft.changelog));
      }
    }
  }, [mode]);

  // Auto-save draft
  const saveDraftDebounced = useCallback(() => {
    if (mode === "edit") return; // Don't save drafts in edit mode
    if (draftSaveTimer.current) clearTimeout(draftSaveTimer.current);
    draftSaveTimer.current = setTimeout(() => {
      const draftData: DraftData = {
        name,
        description,
        repository,
        homepage,
        category,
        tags,
        license,
        version,
        downloadUrl,
        pocketbaseVersion,
        changelog,
      };
      saveDraft("plugin", draftData, "create");
    }, 1000);
  }, [
    name,
    description,
    repository,
    homepage,
    category,
    tags,
    license,
    version,
    downloadUrl,
    pocketbaseVersion,
    changelog,
    mode,
  ]);

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
    clearDraft("plugin", "create");
    setShowDraftBanner(false);
    // Reset form
    setName("");
    setDescription("");
    setRepository("");
    setHomepage("");
    setCategory("utility");
    setTags("");
    setLicense("MIT");
    setVersion("");
    setDownloadUrl("");
    setPocketbaseVersion("");
    setChangelog("");
    touchTracker.reset();
    setFieldErrors({});
  };

  // Validate field on blur
  const handleFieldBlur = useCallback(
    (fieldName: string) => {
      touchTracker.touch(fieldName);
      const data = {
        name,
        description,
        repository,
        homepage,
        category,
        tags,
        license,
        version,
        download_url: downloadUrl,
        pocketbase_version: pocketbaseVersion,
        changelog,
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
      name,
      description,
      repository,
      homepage,
      category,
      tags,
      license,
      version,
      downloadUrl,
      pocketbaseVersion,
      changelog,
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
          需要登录后才能提交插件。
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

          // Validate file sizes before submission
          const iconValidation = validateIcon(icon);
          if (!iconValidation.valid) {
            setError(iconValidation.error || "Icon validation failed");
            setSubmitting(false);
            return;
          }
          const screenshotsValidation = validateScreenshots(screenshots);
          if (!screenshotsValidation.valid) {
            setError(
              screenshotsValidation.error || "Screenshot validation failed",
            );
            setSubmitting(false);
            return;
          }

          const parsed = schema.parse({
            name,
            description,
            repository,
            homepage,
            category,
            tags,
            license,
            version,
            download_url: downloadUrl,
            pocketbase_version: pocketbaseVersion,
            changelog,
          });

          const tagsArr = parseTags(parsed.tags || "");

          const form = new FormData();
          form.set("name", parsed.name);
          form.set("description", parsed.description);
          form.set("repository", parsed.repository);
          if (parsed.homepage) form.set("homepage", parsed.homepage);
          form.set("category", parsed.category);
          if (tagsArr.length) form.set("tags", JSON.stringify(tagsArr));
          if (parsed.license) form.set("license", parsed.license);
          if (icon) form.set("icon", icon);
          for (const f of screenshots) form.append("screenshots", f);

          if (isEditMode) {
            // Update existing plugin
            await pb.collection("plugins").update(initialData.id, form);
            setOk("更新成功。");
            window.setTimeout(() => {
              window.location.href = `/plugins/${initialData.slug}`;
            }, 600);
          } else {
            // Create new plugin
            const newSlug = slugify(parsed.name);
            form.set("slug", newSlug);
            const plugin = await pb.collection("plugins").create(form);

            const wantsVersion = Boolean(
              parsed.version ||
              parsed.download_url ||
              parsed.pocketbase_version ||
              parsed.changelog,
            );
            if (wantsVersion) {
              if (
                !parsed.version ||
                !parsed.download_url ||
                !parsed.pocketbase_version
              ) {
                throw new Error(
                  "填写版本信息时，必须同时提供 Version / Download URL / PocketBase Version",
                );
              }
              await pb.collection("plugin_versions").create({
                plugin: plugin.id,
                version: parsed.version,
                download_url: parsed.download_url,
                pocketbase_version: parsed.pocketbase_version,
                changelog: parsed.changelog || "",
              });
            }

            setOk("提交成功，已进入审核队列。");
            // Clear draft on successful submission
            clearDraft("plugin", "create");
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
          <div className="text-sm font-medium">插件名称</div>
          <input
            className={`w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-brand-500 dark:bg-neutral-950 ${getFieldError("name") ? "border-red-500 bg-red-50 dark:bg-red-950/20" : "border-neutral-200 bg-white dark:border-neutral-800"}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => handleFieldBlur("name")}
            placeholder="例如：PB OSS Storage"
          />
          {getFieldError("name") && (
            <p className="text-xs text-red-600">{getFieldError("name")}</p>
          )}
        </label>
        <label className="space-y-1">
          <div className="text-sm font-medium">分类</div>
          <select
            className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-neutral-800 dark:bg-neutral-950"
            value={category}
            onChange={(e) =>
              setCategory(e.target.value as (typeof PLUGIN_CATEGORIES)[number])
            }
          >
            {PLUGIN_CATEGORIES.map((c) => (
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
          placeholder="一句话说明这个插件解决什么问题（10-500 字）"
        />
        {getFieldError("description") && (
          <p className="text-xs text-red-600">{getFieldError("description")}</p>
        )}
      </label>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="space-y-1">
          <div className="text-sm font-medium">仓库地址（GitHub/Gitee）</div>
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
        <label className="space-y-1">
          <div className="text-sm font-medium">主页（可选）</div>
          <input
            className={`w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-brand-500 dark:bg-neutral-950 ${getFieldError("homepage") ? "border-red-500 bg-red-50 dark:bg-red-950/20" : "border-neutral-200 bg-white dark:border-neutral-800"}`}
            value={homepage}
            onChange={(e) => setHomepage(e.target.value)}
            onBlur={() => handleFieldBlur("homepage")}
            placeholder="https://example.com"
          />
          {getFieldError("homepage") && (
            <p className="text-xs text-red-600">{getFieldError("homepage")}</p>
          )}
        </label>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="space-y-1">
          <div className="text-sm font-medium">标签（逗号分隔，可选）</div>
          <input
            className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-neutral-800 dark:bg-neutral-950"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="auth, storage, ..."
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
        <label className="space-y-1">
          <div className="text-sm font-medium">License（可选）</div>
          <input
            className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-neutral-800 dark:bg-neutral-950"
            value={license}
            onChange={(e) => setLicense(e.target.value)}
            placeholder="MIT"
          />
        </label>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="space-y-1">
          <div className="text-sm font-medium">图标（可选）</div>
          <input
            type="file"
            accept="image/png,image/svg+xml"
            onChange={(e) => setIcon(e.target.files?.[0] || null)}
          />
          <p className="text-xs text-neutral-500">
            建议 100×100，PNG/SVG，≤512KB
          </p>
        </label>
        <label className="space-y-1">
          <div className="text-sm font-medium">截图（可选，最多 5 张）</div>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            onChange={(e) =>
              setScreenshots(Array.from(e.target.files || []).slice(0, 5))
            }
          />
          <p className="text-xs text-neutral-500">PNG/JPG/WebP，单张 ≤2MB</p>
        </label>
      </div>

      <div className="mt-8 rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/40">
        <div className="font-semibold">可选：提交一个初始版本</div>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          如果你的插件已有可下载的包（zip 等），可以同时填写版本信息。
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="space-y-1">
            <div className="text-sm font-medium">Version</div>
            <input
              className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-neutral-800 dark:bg-neutral-950"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="1.0.0"
            />
          </label>
          <label className="space-y-1">
            <div className="text-sm font-medium">PocketBase Version</div>
            <input
              className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-neutral-800 dark:bg-neutral-950"
              value={pocketbaseVersion}
              onChange={(e) => setPocketbaseVersion(e.target.value)}
              placeholder=">=0.23.0"
            />
          </label>
        </div>
        <label className="mt-4 block space-y-1">
          <div className="text-sm font-medium">Download URL</div>
          <input
            className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-neutral-800 dark:bg-neutral-950"
            value={downloadUrl}
            onChange={(e) => setDownloadUrl(e.target.value)}
            placeholder="https://github.com/owner/repo/releases/download/v1.0.0/plugin.zip"
          />
        </label>
        <label className="mt-4 block space-y-1">
          <div className="text-sm font-medium">Changelog（可选）</div>
          <textarea
            className="min-h-[90px] w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-neutral-800 dark:bg-neutral-950"
            value={changelog}
            onChange={(e) => setChangelog(e.target.value)}
            placeholder="- Initial release"
          />
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
          href={isEditMode ? `/plugins/${initialData?.slug}` : "/dashboard"}
        >
          {isEditMode ? "取消" : "返回我的面板"}
        </a>
      </div>
    </form>
  );
}
