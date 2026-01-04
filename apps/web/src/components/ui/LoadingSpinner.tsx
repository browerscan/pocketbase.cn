import { memo, useMemo } from "react";
import { cn } from "../../lib/utils/cn";

interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg";
  variant?: "default" | "primary" | "white";
}

const sizeStyles = {
  sm: "w-4 h-4 border-2",
  md: "w-6 h-6 border-2",
  lg: "w-8 h-8 border-3",
};

const variantStyles = {
  default:
    "border-neutral-200 border-t-neutral-600 dark:border-neutral-800 dark:border-t-neutral-300",
  primary: "border-brand-200 border-t-brand-600",
  white: "border-white/20 border-t-white",
};

export function LoadingSpinner({
  className,
  size = "md",
  variant = "default",
  ...props
}: LoadingSpinnerProps) {
  const combinedClassName = useMemo(
    () =>
      cn(
        "animate-spin rounded-full",
        sizeStyles[size],
        variantStyles[variant],
        className,
      ),
    [size, variant, className],
  );

  return (
    <div
      className={combinedClassName}
      role="status"
      aria-label="Loading"
      {...props}
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

export const LoadingSpinnerMemo = memo(LoadingSpinner);

interface FullPageLoaderProps {
  message?: string;
}

export function FullPageLoader({ message = "加载中..." }: FullPageLoaderProps) {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <LoadingSpinner size="lg" variant="primary" />
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {message}
        </p>
      </div>
    </div>
  );
}

interface InlineLoaderProps {
  message?: string;
}

export function InlineLoader({ message }: InlineLoaderProps) {
  return (
    <div className="flex items-center gap-3">
      <LoadingSpinner size="sm" />
      {message && (
        <span className="text-sm text-neutral-600 dark:text-neutral-400">
          {message}
        </span>
      )}
    </div>
  );
}
