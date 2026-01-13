import { useState, useRef, useEffect, forwardRef, useCallback } from "react";
import { cn } from "../../lib/utils/cn";

export interface ProgressiveImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  blurhash?: string;
  placeholder?: string;
  blurClassName?: string;
}

export const ProgressiveImage = forwardRef<
  HTMLImageElement,
  ProgressiveImageProps
>(
  (
    {
      src,
      alt,
      blurhash,
      placeholder = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3Crect fill='%23e5e7eb' width='1' height='1'/%3E%3C/svg%3E",
      blurClassName,
      className,
      onLoad,
      ...props
    },
    externalRef,
  ) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);
    const internalRef = useRef<HTMLImageElement>(null);

    // Store the DOM element directly (for internal use)
    const [imageNode, setImageNode] = useState<HTMLImageElement | null>(null);

    // Ref callback to capture the DOM element
    const setRef = useCallback(
      (node: HTMLImageElement | null) => {
        setImageNode(node);
        if (typeof externalRef === "function") {
          externalRef(node);
        } else if (externalRef) {
          (
            externalRef as React.MutableRefObject<HTMLImageElement | null>
          ).current = node;
        }
      },
      [externalRef],
    );

    useEffect(() => {
      const img = imageNode;
      if (!img) return;

      const handleLoad = () => {
        setIsLoaded(true);
        onLoad?.({
          nativeEvent: {} as Event,
        } as React.SyntheticEvent<HTMLImageElement>);
      };
      const handleError = () => setHasError(true);

      img.addEventListener("load", handleLoad);
      img.addEventListener("error", handleError);

      if (img.complete) {
        setIsLoaded(true);
      }

      return () => {
        img.removeEventListener("load", handleLoad);
        img.removeEventListener("error", handleError);
      };
    }, [onLoad]);

    return (
      <div className="relative overflow-hidden">
        <img
          ref={setRef}
          src={src}
          alt={alt}
          className={cn(
            "transition-opacity duration-300 ease-in-out",
            isLoaded ? "opacity-100" : "opacity-0",
            className,
          )}
          loading="lazy"
          decoding="async"
          {...props}
        />
        {!isLoaded && !hasError && (
          <img
            src={placeholder}
            alt=""
            aria-hidden="true"
            className={cn(
              "absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ease-out",
              isLoaded && "opacity-0",
              blurClassName ||
                "animate-pulse bg-neutral-200 dark:bg-neutral-800",
            )}
          />
        )}
        {hasError && (
          <div
            className={cn(
              "absolute inset-0 flex items-center justify-center bg-neutral-100 dark:bg-neutral-800",
              className?.includes("aspect-") ? "" : "aspect-video",
            )}
            aria-hidden="true"
          >
            <svg
              className="h-8 w-8 text-neutral-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
      </div>
    );
  },
);

ProgressiveImage.displayName = "ProgressiveImage";

export interface ResponsiveImageProps extends ProgressiveImageProps {
  sizes?: string;
  srcSet?: string;
  breakpoints?: number[];
  aspectRatio?: "16:9" | "4:3" | "1:1" | "3:2" | "21:9";
}

export const ResponsiveImage = forwardRef<
  HTMLImageElement,
  ResponsiveImageProps
>(
  (
    {
      breakpoints = [320, 640, 960, 1280],
      sizes,
      aspectRatio,
      className,
      ...props
    },
    ref,
  ) => {
    const aspectClass = {
      "16:9": "aspect-video",
      "4:3": "aspect-[4/3]",
      "1:1": "aspect-square",
      "3:2": "aspect-[3/2]",
      "21:9": "aspect-[21/9]",
    }[aspectRatio || "16:9"];

    return (
      <ProgressiveImage
        ref={ref}
        className={cn(aspectClass, className)}
        sizes={
          sizes ||
          breakpoints.map((bp) => `(max-width: ${bp}px) ${bp}px`).join(", ")
        }
        {...props}
      />
    );
  },
);

ResponsiveImage.displayName = "ResponsiveImage";
