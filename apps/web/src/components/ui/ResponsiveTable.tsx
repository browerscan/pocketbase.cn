import { ReactNode } from "react";
import { cn } from "../../lib/utils/cn";

export interface TableColumn<T> {
  key: string;
  header: string;
  render?: (item: T, index: number) => ReactNode;
  cellClassName?: string;
}

interface ResponsiveTableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  keyExtractor: (item: T, index: number) => string;
  rowClassName?: (item: T, index: number) => string | undefined;
  emptyMessage?: string;
  mobileCardTitle?: (item: T) => string;
  mobileCardSubtitle?: (item: T) => string;
}

export function ResponsiveTable<T>({
  data,
  columns,
  keyExtractor,
  rowClassName,
  emptyMessage = "暂无数据",
  mobileCardTitle,
  mobileCardSubtitle,
}: ResponsiveTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-6 text-center dark:border-neutral-800 dark:bg-neutral-900">
        <p className="text-sm text-neutral-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800 md:block">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left dark:bg-neutral-900">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className="px-4 py-3" scope="col">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr
                key={keyExtractor(item, index)}
                className={cn(
                  "border-t border-neutral-200 dark:border-neutral-800",
                  rowClassName?.(item, index),
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn("px-4 py-3", col.cellClassName)}
                  >
                    {col.render
                      ? col.render(item, index)
                      : (item as any)[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="space-y-3 md:hidden">
        {data.map((item, index) => (
          <div
            key={keyExtractor(item, index)}
            className={cn(
              "overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950",
              rowClassName?.(item, index),
            )}
          >
            {/* Card Header */}
            {(mobileCardTitle || mobileCardSubtitle) && (
              <div className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
                {mobileCardTitle && (
                  <h3 className="font-medium text-neutral-900 dark:text-neutral-100">
                    {mobileCardTitle(item)}
                  </h3>
                )}
                {mobileCardSubtitle && (
                  <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                    {mobileCardSubtitle(item)}
                  </p>
                )}
              </div>
            )}

            {/* Card Content */}
            <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {columns.map((col) => {
                const cellContent = col.render
                  ? col.render(item, index)
                  : (item as any)[col.key];

                // Skip rendering if content is empty/null/undefined
                if (
                  cellContent === null ||
                  cellContent === undefined ||
                  cellContent === ""
                ) {
                  return null;
                }

                return (
                  <div key={col.key} className="flex justify-between px-4 py-3">
                    <span className="text-sm text-neutral-600 dark:text-neutral-400">
                      {col.header}
                    </span>
                    <span
                      className={cn(
                        "text-sm font-medium text-neutral-900 dark:text-neutral-100",
                        col.cellClassName,
                      )}
                    >
                      {cellContent}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Scroll hint for mobile if there are many columns */}
      {data.length > 0 && columns.length > 4 && (
        <div className="mt-4 flex items-center justify-center text-xs text-neutral-500 md:hidden">
          <svg
            className="mr-1 h-4 w-4 animate-pulse"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16l-4-4m0 0l4-4m-4 4h18"
            />
          </svg>
          向左滑动查看更多
        </div>
      )}
    </>
  );
}
