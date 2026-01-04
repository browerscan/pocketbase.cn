import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "../../lib/utils/cn";

interface FilterOption {
  value: string;
  label: string;
}

interface MobileFilterDrawerProps {
  open: boolean;
  onClose: () => void;
  categories: string[];
  category: string;
  onCategoryChange: (value: string) => void;
  sortOptions: FilterOption[];
  sort: string;
  onSortChange: (value: string) => void;
  categoryLabel?: string;
  sortLabel?: string;
}

export function MobileFilterDrawer({
  open,
  onClose,
  categories,
  category,
  onCategoryChange,
  sortOptions,
  sort,
  onSortChange,
  categoryLabel = "分类",
  sortLabel = "排序",
}: MobileFilterDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchCurrent, setTouchCurrent] = useState<number | null>(null);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // Handle escape key
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, handleClose]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Handle swipe to close
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientY);
    setTouchCurrent(e.touches[0].clientY);
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (touchStart === null) return;
      const currentY = e.touches[0].clientY;
      setTouchCurrent(currentY);

      // Calculate swipe distance
      const diff = currentY - touchStart;

      // If swiping down significantly, follow the touch
      if (diff > 0 && drawerRef.current) {
        const transform = `translateY(${Math.min(diff, 300)}px)`;
        drawerRef.current.style.transform = transform;
      }
    },
    [touchStart],
  );

  const handleTouchEnd = useCallback(() => {
    if (touchStart === null || touchCurrent === null) return;

    const diff = touchCurrent - touchStart;

    // Close if swiped down more than 100px
    if (diff > 100) {
      handleClose();
    } else if (drawerRef.current) {
      // Reset position
      drawerRef.current.style.transform = "";
    }

    setTouchStart(null);
    setTouchCurrent(null);
  }, [touchStart, touchCurrent, handleClose]);

  return (
    <>
      {/* Overlay */}
      <div
        ref={overlayRef}
        className={cn(
          "fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 md:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        aria-hidden="true"
        onClick={handleClose}
      />

      {/* Bottom Sheet Drawer */}
      <div
        ref={drawerRef}
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 max-h-[80vh] transform rounded-t-2xl bg-white shadow-xl transition-transform duration-300 ease-out dark:bg-neutral-950 md:hidden",
          open ? "translate-y-0" : "translate-y-full",
        )}
        style={{ touchAction: "pan-y" }}
      >
        {/* Drag Handle */}
        <div
          className="flex justify-center pt-3 pb-1"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="h-1.5 w-12 rounded-full bg-neutral-300 dark:bg-neutral-700" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            筛选和排序
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:hover:bg-neutral-900 dark:hover:text-neutral-300"
            aria-label="关闭筛选"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto px-4 py-4">
          {/* Category Filter */}
          <div className="mb-6">
            <label className="mb-3 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {categoryLabel}
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={cn(
                  "min-h-[44px] min-w-[44px] rounded-full border px-4 py-2.5 text-sm font-medium transition-colors",
                  category === ""
                    ? "border-brand-500 bg-brand-600 text-white"
                    : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800",
                )}
                onClick={() => onCategoryChange("")}
              >
                全部
              </button>
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={cn(
                    "min-h-[44px] rounded-full border px-4 py-2.5 text-sm font-medium transition-colors",
                    category === c
                      ? "border-brand-500 bg-brand-600 text-white"
                      : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800",
                  )}
                  onClick={() => onCategoryChange(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Sort Options */}
          <div>
            <label className="mb-3 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {sortLabel}
            </label>
            <div className="space-y-2">
              {sortOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={cn(
                    "flex min-h-[48px] w-full items-center justify-between rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors",
                    sort === opt.value
                      ? "border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-500 dark:bg-brand-950 dark:text-brand-300"
                      : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800",
                  )}
                  onClick={() => onSortChange(opt.value)}
                >
                  <span>{opt.label}</span>
                  {sort === opt.value && (
                    <svg
                      className="h-5 w-5 text-brand-600 dark:text-brand-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Apply Button */}
        <div className="border-t border-neutral-200 px-4 py-3 dark:border-neutral-800">
          <button
            type="button"
            onClick={handleClose}
            className="flex h-[48px] w-full items-center justify-center rounded-lg bg-brand-600 px-4 py-3 text-sm font-medium text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
          >
            完成
          </button>
        </div>
      </div>
    </>
  );
}

interface FilterToggleButtonProps {
  onClick: () => void;
  count?: number;
}

export function FilterToggleButton({
  onClick,
  count = 0,
}: FilterToggleButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 md:hidden"
      aria-label="打开筛选选项"
    >
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
        />
      </svg>
      <span>筛选</span>
      {count > 0 && (
        <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[11px] font-medium text-white">
          {count}
        </span>
      )}
    </button>
  );
}
