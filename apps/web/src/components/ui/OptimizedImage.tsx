import { forwardRef, useState, useRef, useEffect, useCallback } from "react";
import { cn } from "../../lib/utils/cn";

export interface ImageCdnConfig {
  baseUrl?: string;
  quality?: number;
  formats?: ("webp" | "avif" | "jpeg" | "png")[];
}

const DEFAULT_CDN_CONFIG: ImageCdnConfig = {
  quality: 75,
  formats: ["webp", "jpeg"],
};

export interface OptimizedImageProps extends Omit<
  React.ImgHTMLAttributes<HTMLImageElement>,
  "srcSet" | "sizes"
> {
  src: string;
  alt: string;
  width: number;
  height: number;
  cdn?: ImageCdnConfig;
  breakpoints?: number[];
  sizes?: string;
  lazy?: boolean;
  placeholder?: "blur" | "color" | "none";
  blurColor?: string;
}

export const OptimizedImage = forwardRef<HTMLImageElement, OptimizedImageProps>(
  (
    {
      src,
      alt,
      width,
      height,
      cdn = DEFAULT_CDN_CONFIG,
      breakpoints = [320, 640, 960, 1280, 1920],
      sizes,
      lazy = true,
      placeholder = "blur",
      blurColor = "#e5e7eb",
      className,
      onLoad,
      onError,
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

      if (img.complete) setIsLoaded(true);

      return () => {
        img.removeEventListener("load", handleLoad);
        img.removeEventListener("error", handleError);
      };
    }, [onLoad]);

    const generateSrcSet = () => {
      if (!cdn.baseUrl) return undefined;
      return breakpoints
        .map((bp) => {
          const url = new URL(src, cdn.baseUrl);
          url.searchParams.set("width", String(bp));
          url.searchParams.set("quality", String(cdn.quality));
          return url.toString() + " " + bp + "w";
        })
        .join(", ");
    };

    const srcSet = generateSrcSet();
    const defaultSizes =
      sizes ||
      breakpoints
        .map((bp, i) =>
          i === 0 ? "(max-width: " + bp + "px) 100vw" : bp + "px",
        )
        .join(", ");

    const placeholderStyle =
      placeholder === "color" ? { backgroundColor: blurColor } : undefined;

    return (
      <div className="relative overflow-hidden" style={{ width, height }}>
        {!isLoaded && placeholder === "blur" && (
          <div
            className="absolute inset-0 animate-pulse"
            style={{ backgroundColor: blurColor }}
            aria-hidden="true"
          />
        )}
        {hasError && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-neutral-100 dark:bg-neutral-800"
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
        <picture>
          {cdn.formats?.includes("avif") && (
            <source srcSet={srcSet} sizes={defaultSizes} type="image/avif" />
          )}
          {cdn.formats?.includes("webp") && (
            <source srcSet={srcSet} sizes={defaultSizes} type="image/webp" />
          )}
          <img
            ref={setRef}
            src={src}
            srcSet={srcSet}
            sizes={defaultSizes}
            alt={alt}
            width={width}
            height={height}
            loading={lazy ? "lazy" : "eager"}
            decoding="async"
            className={cn(
              "transition-opacity duration-300 ease-in-out",
              isLoaded ? "opacity-100" : "opacity-0",
              className,
            )}
            style={placeholderStyle}
            {...props}
          />
        </picture>
      </div>
    );
  },
);

OptimizedImage.displayName = "OptimizedImage";

export interface PocketBaseImageProps {
  collection: string;
  recordId: string;
  filename: string;
  alt: string;
  width?: number;
  height?: number;
  thumb?: string;
  className?: string;
  imgProps?: Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src" | "alt">;
}

export function PocketBaseImage({
  collection,
  recordId,
  filename,
  alt,
  width = 320,
  height = 240,
  thumb,
  className,
  imgProps,
}: PocketBaseImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    const handleLoad = () => setIsLoaded(true);
    if (img.complete) setIsLoaded(true);
    else img.addEventListener("load", handleLoad);

    return () => img.removeEventListener("load", handleLoad);
  }, []);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const thumbParam = thumb ? "?thumb=" + thumb : "";
  const src =
    baseUrl +
    "/api/files/" +
    collection +
    "/" +
    recordId +
    "/" +
    filename +
    thumbParam;

  return (
    <div className="relative overflow-hidden">
      {!isLoaded && (
        <div
          className="absolute inset-0 animate-pulse bg-neutral-200 dark:bg-neutral-800"
          aria-hidden="true"
        />
      )}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading="lazy"
        decoding="async"
        className={cn(
          "transition-opacity duration-300 ease-in-out",
          isLoaded ? "opacity-100" : "opacity-0",
          className,
        )}
        {...imgProps}
      />
    </div>
  );
}

PocketBaseImage.displayName = "PocketBaseImage";

export { ProgressiveImage, ResponsiveImage } from "./ProgressiveImage";
