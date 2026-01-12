import { useEffect, useMemo, useState } from "react";
import { POCKETBASE_URL } from "../../lib/constants/config";
import { TableSkeleton } from "../ui/Skeleton";
import { ErrorBoundary } from "../ui/ErrorBoundary";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import { fetchApi, postApi } from "../../lib/utils/api";
import { getErrorMessage } from "../../lib/errors/AppError";
import { cn } from "../../lib/utils/cn";

export type DownloadPlatform =
  | "windows"
  | "darwin"
  | "linux"
  | "freebsd"
  | "openbsd"
  | "netbsd"
  | "";
export type DownloadArch =
  | "amd64"
  | "arm64"
  | "armv7"
  | "386"
  | "ppc64le"
  | "s390x"
  | "riscv64"
  | "";

export interface DownloadFile {
  id: string;
  version: string;
  platform: DownloadPlatform;
  arch: DownloadArch;
  checksum?: string;
  size?: number;
  prerelease?: boolean;
  published_at?: string | null;
  url?: string | null;
}

export interface ClientTarget {
  platform: DownloadPlatform;
  arch: DownloadArch;
}

export interface InitialDownloads {
  versions: string[];
  version: string;
  files: DownloadFile[];
}

function guessClientTarget(): ClientTarget | null {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent || "";
  const platform = (): DownloadPlatform => {
    if (/windows/i.test(ua)) return "windows";
    if (/macintosh|mac os x/i.test(ua)) return "darwin";
    if (/linux/i.test(ua)) return "linux";
    return "";
  };

  const arch = (): DownloadArch => {
    if (/arm64|aarch64/i.test(ua)) return "arm64";
    if (/armv7/i.test(ua)) return "armv7";
    if (/ppc64le/i.test(ua)) return "ppc64le";
    if (/s390x/i.test(ua)) return "s390x";
    if (/x86_64|win64|x64|amd64/i.test(ua)) return "amd64";
    if (/i386|i686|x86/i.test(ua)) return "386";
    return "";
  };

  const p = platform();
  const a = arch();
  if (!p || !a) return null;
  return { platform: p, arch: a };
}

function bytes(n?: number) {
  const v = Number(n || 0);
  if (!v) return "-";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let x = v;
  while (x >= 1024 && i < units.length - 1) {
    x /= 1024;
    i++;
  }
  return `${x.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

const OFFICIAL_RELEASE_PREFIX =
  "https://github.com/" +
  "pocketbase/pocketbase/" +
  "releases/download/";

function officialDownloadUrl(file: DownloadFile) {
  if (!file.version || !file.platform || !file.arch) return "";
  return `${OFFICIAL_RELEASE_PREFIX}v${file.version}/pocketbase_${file.version}_${file.platform}_${file.arch}.zip`;
}

function isOfficialDownloadUrl(url?: string | null) {
  return Boolean(url && url.startsWith(OFFICIAL_RELEASE_PREFIX));
}

function DownloadsBrowserContent({ initial }: { initial?: InitialDownloads }) {
  const [versions, setVersions] = useState<string[]>(
    () => initial?.versions || [],
  );
  const [version, setVersion] = useState<string>(() => initial?.version || "");
  const [files, setFiles] = useState<DownloadFile[]>(
    () => initial?.files || [],
  );
  const initialFilesVersionRef = useMemo(() => initial?.version || "", []);
  const initialHasFilesRef = useMemo(() => Boolean(initial?.files?.length), []);
  const [target, setTarget] = useState<ClientTarget | null>(null);
  const [loadingVersions, setLoadingVersions] = useState(
    () => !initial?.versions?.length,
  );
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedChecksum, setCopiedChecksum] = useState<string | null>(null);

  const versionsUrl = useMemo(
    () => new URL("/api/downloads/versions", POCKETBASE_URL).toString(),
    [],
  );

  useEffect(() => {
    setTarget(guessClientTarget());
  }, []);

  useEffect(() => {
    let alive = true;
    // If we have SSR data, refresh silently; otherwise show loading.
    setLoadingVersions(!initial?.versions?.length);

    const loadVersions = async () => {
      const result = await fetchApi<{ data: string[] }>(versionsUrl);
      if (!alive) return;

      if (result.error) {
        setError(getErrorMessage(result.error));
      } else {
        const list = result.data?.data ?? [];
        setVersions(list);
        setVersion((prev) => prev || list[0] || "");
      }
      setLoadingVersions(false);
    };

    loadVersions();

    return () => {
      alive = false;
    };
  }, [versionsUrl, initial?.versions?.length]);

  useEffect(() => {
    if (!version) return;
    let alive = true;
    const shouldShowLoading = !(
      initialHasFilesRef && version === initialFilesVersionRef
    );
    setLoadingFiles(shouldShowLoading);
    setError(null);

    const url = new URL("/api/downloads/files", POCKETBASE_URL);
    url.searchParams.set("version", version);

    const loadFiles = async () => {
      const result = await fetchApi<{ data: DownloadFile[] }>(url.toString());
      if (!alive) return;

      if (result.error) {
        setError(getErrorMessage(result.error));
      } else {
        setFiles(result.data?.data ?? []);
      }
      setLoadingFiles(false);
    };

    loadFiles();

    return () => {
      alive = false;
    };
  }, [version, initialFilesVersionRef, initialHasFilesRef]);

  const recommended = useMemo(() => {
    if (!target) return null;
    return (
      files.find(
        (f) => f.platform === target.platform && f.arch === target.arch,
      ) || null
    );
  }, [files, target]);

  const copyChecksum = async (checksum: string) => {
    try {
      await navigator.clipboard.writeText(checksum);
      setCopiedChecksum(checksum);
      setTimeout(() => setCopiedChecksum(null), 2000);
    } catch {
      // Silently fail if clipboard access is denied
    }
  };

  const trackDownload = async (file: DownloadFile) => {
    try {
      await postApi(
        new URL("/api/downloads/track", POCKETBASE_URL).toString(),
        {
          version: file.version,
          platform: file.platform,
          arch: file.arch,
        },
      );
    } catch {
      // Silently fail tracking - download should still work
    }
  };

  const recommendedFallback = recommended ? officialDownloadUrl(recommended) : "";
  const showRecommendedFallback = Boolean(
    recommendedFallback &&
      (!recommended?.url || !isOfficialDownloadUrl(recommended.url)),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="text-sm text-neutral-600 dark:text-neutral-400">
          {loadingVersions ? (
            <span className="inline-flex items-center gap-2">
              <LoadingSpinner size="sm" />
              加载版本中…
            </span>
          ) : (
            `共 ${versions.length} 个版本`
          )}
        </div>
        <label htmlFor="version-select" className="sr-only">
          选择版本
        </label>
        <select
          id="version-select"
          className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:border-neutral-800 dark:bg-neutral-950 md:w-56"
          value={version}
          onChange={(e) => setVersion(e.target.value)}
          disabled={loadingVersions || versions.length === 0}
        >
          {versions.map((v) => (
            <option key={v} value={v}>
              v{v}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <div
          className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/40 dark:bg-red-950/30"
          role="alert"
        >
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-2 text-sm font-medium text-red-700 underline hover:text-red-900 dark:text-red-300"
          >
            刷新重试
          </button>
        </div>
      ) : null}

      {loadingFiles ? <TableSkeleton rows={5} columns={5} /> : null}

      {!loadingFiles && recommended ? (
        <div className="rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm dark:border-brand-900/40 dark:bg-brand-950/30">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="font-medium">推荐下载</div>
              <div className="text-neutral-700 dark:text-neutral-200">
                {recommended.platform} / {recommended.arch} ·{" "}
                {bytes(recommended.size)}
              </div>
            </div>
            {recommended.url || showRecommendedFallback ? (
              <div className="flex flex-wrap gap-2">
                {recommended.url ? (
                  <a
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
                    href={recommended.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackDownload(recommended)}
                  >
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
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    下载 v{recommended.version}
                  </a>
                ) : null}
                {showRecommendedFallback ? (
                  <a
                    className="inline-flex items-center justify-center rounded-md border border-brand-200 bg-white px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:border-brand-900/40 dark:bg-neutral-950 dark:text-brand-300 dark:hover:bg-brand-950/30"
                    href={recommendedFallback}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackDownload(recommended)}
                  >
                    官方源下载
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {!loadingFiles && files.length > 0 ? (
        <>
          {/* Desktop Table View */}
          <div className="hidden overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800 md:block">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-left dark:bg-neutral-900">
                <tr>
                  <th className="px-4 py-2" scope="col">
                    平台
                  </th>
                  <th className="px-4 py-2" scope="col">
                    架构
                  </th>
                  <th className="px-4 py-2" scope="col">
                    大小
                  </th>
                  <th className="px-4 py-2" scope="col">
                    校验
                  </th>
                  <th className="px-4 py-2" scope="col">
                    链接
                  </th>
                </tr>
              </thead>
              <tbody>
                {files.map((f) => {
                  const fallbackUrl = officialDownloadUrl(f);
                  const showFallback = Boolean(
                    fallbackUrl &&
                      (!f.url || !isOfficialDownloadUrl(f.url)),
                  );

                  return (
                    <tr
                      key={f.id}
                      className={[
                        "border-t border-neutral-200 dark:border-neutral-800",
                        recommended?.id === f.id
                          ? "bg-brand-50/70 dark:bg-brand-950/20"
                          : "",
                      ].join(" ")}
                    >
                      <td className="px-4 py-2">{f.platform}</td>
                      <td className="px-4 py-2">{f.arch}</td>
                      <td className="px-4 py-2">{bytes(f.size)}</td>
                      <td className="px-4 py-2 font-mono text-xs">
                        {f.checksum ? (
                          <span className="inline-flex items-center gap-2">
                            <span title={f.checksum}>
                              {f.checksum.slice(0, 12)}…
                            </span>
                            <button
                              type="button"
                              className="rounded border border-neutral-200 bg-white px-2 py-1 text-[11px] hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:bg-neutral-900"
                              onClick={() => copyChecksum(f.checksum!)}
                              aria-label={`复制校验值 ${f.checksum.slice(0, 12)}`}
                            >
                              {copiedChecksum === f.checksum ? "已复制" : "复制"}
                            </button>
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {f.url || showFallback ? (
                          <div className="flex flex-col gap-1">
                            {f.url ? (
                              <a
                                className="text-brand-700 hover:underline focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 rounded dark:text-brand-300"
                                href={f.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => trackDownload(f)}
                              >
                                下载
                              </a>
                            ) : null}
                            {showFallback ? (
                              <a
                                className="text-xs text-neutral-500 hover:underline focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 rounded dark:text-neutral-400"
                                href={fallbackUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => trackDownload(f)}
                              >
                                官方源
                              </a>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-neutral-500">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="space-y-3 md:hidden">
            {files.map((f) => {
              const fallbackUrl = officialDownloadUrl(f);
              const showFallback = Boolean(
                fallbackUrl && (!f.url || !isOfficialDownloadUrl(f.url)),
              );

              return (
                <div
                  key={f.id}
                  className={cn(
                    "overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950",
                    recommended?.id === f.id
                      ? "border-brand-300 bg-brand-50/50 dark:border-brand-700 dark:bg-brand-950/30"
                      : "",
                  )}
                >
                  <div className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-neutral-900 dark:text-neutral-100">
                        {f.platform} / {f.arch}
                      </h3>
                      {recommended?.id === f.id ? (
                        <span className="rounded-full bg-brand-600 px-2 py-0.5 text-xs font-medium text-white">
                          推荐
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                      {bytes(f.size)}
                    </p>
                  </div>
                  <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                    <div className="flex justify-between px-4 py-3">
                      <span className="text-sm text-neutral-600 dark:text-neutral-400">
                        校验值
                      </span>
                      <span className="font-mono text-xs text-neutral-900 dark:text-neutral-100">
                        {f.checksum ? (
                          <span className="inline-flex items-center gap-2">
                            <span
                              title={f.checksum}
                              className="max-w-[120px] truncate"
                            >
                              {f.checksum.slice(0, 12)}…
                            </span>
                            <button
                              type="button"
                              className="rounded border border-neutral-200 bg-white px-2 py-1 text-[11px] hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:bg-neutral-900"
                              onClick={() => copyChecksum(f.checksum!)}
                              aria-label={`复制校验值 ${f.checksum.slice(0, 12)}`}
                            >
                              {copiedChecksum === f.checksum ? "已复制" : "复制"}
                            </button>
                          </span>
                        ) : (
                          "-"
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between px-4 py-3">
                      <span className="text-sm text-neutral-600 dark:text-neutral-400">
                        下载链接
                      </span>
                      {f.url || showFallback ? (
                        <div className="flex flex-col items-end gap-1">
                          {f.url ? (
                            <a
                              className="min-h-[44px] min-w-[44px] inline-flex items-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
                              href={f.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => trackDownload(f)}
                            >
                              <svg
                                className="mr-1 h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                aria-hidden="true"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                                />
                              </svg>
                              下载
                            </a>
                          ) : null}
                          {showFallback ? (
                            <a
                              className="text-xs text-neutral-500 hover:underline focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 rounded dark:text-neutral-400"
                              href={fallbackUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => trackDownload(f)}
                            >
                              官方源
                            </a>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-neutral-500">-</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : null}

      {!loadingFiles && files.length === 0 && !error ? (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-6 text-center dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-sm text-neutral-500">
            暂无文件记录。请确认后端已运行同步任务，或管理员手动触发同步。
          </p>
        </div>
      ) : null}

      <div className="text-xs text-neutral-500">
        校验值来自 GitHub Release 的{" "}
        <code className="rounded bg-neutral-100 px-1 py-0.5 dark:bg-neutral-800">
          checksums.txt
        </code>
        （若存在）；若为空表示上游未提供或尚未解析。
      </div>
    </div>
  );
}

export default function DownloadsBrowser(props: {
  initial?: InitialDownloads;
}) {
  return (
    <ErrorBoundary>
      <DownloadsBrowserContent initial={props.initial} />
    </ErrorBoundary>
  );
}
