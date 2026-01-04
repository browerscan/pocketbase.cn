import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "../../lib/utils/cn";

interface NavItem {
  href: string;
  label: string;
}

const navItems: NavItem[] = [
  { href: "/docs", label: "文档" },
  { href: "/blog", label: "博客" },
  { href: "/plugins", label: "插件" },
  { href: "/showcase", label: "案例" },
  { href: "/downloads", label: "下载" },
];

interface MobileNavProps {
  currentPath?: string;
}

export default function MobileNav({ currentPath = "" }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const firstFocusableRef = useRef<HTMLAnchorElement>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchCurrent, setTouchCurrent] = useState<number | null>(null);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
    buttonRef.current?.focus();
  }, []);

  // Handle click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        closeMenu();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, closeMenu]);

  // Handle escape key and focus trap
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
        return;
      }

      // Focus trap
      if (event.key === "Tab" && menuRef.current) {
        const focusableElements = menuRef.current.querySelectorAll<HTMLElement>(
          "a[href], button:not([disabled])",
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeMenu]);

  // Focus first item when menu opens
  useEffect(() => {
    if (isOpen && firstFocusableRef.current) {
      firstFocusableRef.current.focus();
    }
  }, [isOpen]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Handle swipe to close
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
    setTouchCurrent(e.touches[0].clientX);
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (touchStart === null) return;
      const currentX = e.touches[0].clientX;
      setTouchCurrent(currentX);

      // Calculate swipe distance
      const diff = touchStart - currentX;

      // If swiping left significantly, follow the touch
      if (diff > 0 && menuRef.current) {
        const transform = `translateX(${Math.max(-diff, -300)}px)`;
        menuRef.current.style.transform = transform;
      }
    },
    [touchStart],
  );

  const handleTouchEnd = useCallback(() => {
    if (touchStart === null || touchCurrent === null) return;

    const diff = touchStart - touchCurrent;

    // Close if swiped left more than 100px
    if (diff > 100) {
      closeMenu();
    } else if (menuRef.current) {
      // Reset position
      menuRef.current.style.transform = "";
    }

    setTouchStart(null);
    setTouchCurrent(null);
  }, [touchStart, touchCurrent, closeMenu]);

  return (
    <div className="md:hidden">
      {/* Hamburger Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="inline-flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-700 transition-colors hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300 dark:hover:bg-neutral-900"
        aria-expanded={isOpen}
        aria-controls="mobile-nav-menu"
        aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
      >
        {isOpen ? (
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
        ) : (
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
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        )}
      </button>

      {/* Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/50 transition-opacity duration-300",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        aria-hidden="true"
        onClick={closeMenu}
      />

      {/* Slide-out Menu */}
      <div
        ref={menuRef}
        id="mobile-nav-menu"
        className={cn(
          "fixed right-0 top-0 z-50 h-full w-72 max-w-[85vw] transform bg-white shadow-xl transition-transform duration-300 ease-in-out dark:bg-neutral-950",
          isOpen ? "translate-x-0" : "translate-x-full",
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        style={{ touchAction: "pan-y" }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Close button inside menu */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-4 dark:border-neutral-800">
          <span className="font-semibold text-neutral-900 dark:text-neutral-100">
            Menu
          </span>
          <button
            type="button"
            onClick={closeMenu}
            className="inline-flex h-9 w-9 min-h-[36px] min-w-[36px] items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:hover:bg-neutral-900 dark:hover:text-neutral-300"
            aria-label="Close navigation menu"
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

        {/* Navigation Links */}
        <nav className="px-2 py-4" aria-label="Mobile navigation">
          <ul className="space-y-1">
            {navItems.map((item, index) => (
              <li key={item.href}>
                <a
                  ref={index === 0 ? firstFocusableRef : undefined}
                  href={item.href}
                  className={cn(
                    "block min-h-[44px] rounded-md px-4 py-3 text-base font-medium transition-colors hover:bg-neutral-100 focus:bg-neutral-100 focus:outline-none dark:hover:bg-neutral-900 dark:focus:bg-neutral-900",
                    currentPath === item.href
                      ? "bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300"
                      : "text-neutral-700 dark:text-neutral-300",
                  )}
                  aria-current={currentPath === item.href ? "page" : undefined}
                  onClick={() => setIsOpen(false)}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer with auth link */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-neutral-200 p-4 dark:border-neutral-800">
          <a
            href="/auth/login"
            className="flex min-h-[44px] w-full items-center justify-center rounded-md bg-brand-600 px-4 py-3 text-sm font-medium text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
          >
            GitHub 登录
          </a>
        </div>
      </div>
    </div>
  );
}
