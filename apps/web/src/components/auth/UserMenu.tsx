import { useEffect, useRef, useState } from "react";
import { useStore } from "@nanostores/react";
import {
  authLoading,
  authUser,
  initAuth,
  isAuthenticated,
  logout,
} from "../../lib/stores/auth";
import { pb } from "../../lib/pocketbase/client";

export default function UserMenu() {
  const loading = useStore(authLoading);
  const authed = useStore(isAuthenticated);
  const user = useStore(authUser);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const avatarUrl = (() => {
    const avatar = String(user?.avatar || "").trim();
    if (!avatar) return "";
    if (avatar.startsWith("http://") || avatar.startsWith("https://"))
      return avatar;
    try {
      return pb.files.getUrl(user as any, avatar, { thumb: "100x100" });
    } catch {
      return "";
    }
  })();

  useEffect(() => {
    initAuth();
  }, []);

  // Close menu when clicking outside or pressing Escape
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const menuItems = [
    { href: "/dashboard", label: "我的面板" },
    { href: "/profile", label: "个人资料" },
    { href: "/docs", label: "文档" },
    { href: "/plugins/submit", label: "提交插件" },
    { href: "/showcase/submit", label: "提交案例" },
  ];

  // Keyboard navigation for menu
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const focusableElements = menuRef.current?.querySelectorAll("a, button");
      if (!focusableElements?.length) return;

      const currentIndex = Array.from(focusableElements).findIndex(
        (el) => el === document.activeElement,
      );
      const direction = event.key === "ArrowDown" ? 1 : -1;
      const nextIndex =
        (currentIndex + direction + focusableElements.length) %
        focusableElements.length;
      (focusableElements[nextIndex] as HTMLElement).focus();
    }
  };

  if (loading)
    return (
      <span className="text-sm text-neutral-500" aria-label="加载用户信息中">
        …
      </span>
    );

  if (!authed) {
    return (
      <a
        className="inline-flex items-center rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
        href="/auth/login"
      >
        GitHub 登录
      </a>
    );
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-sm hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:bg-neutral-900"
        aria-expanded={open}
        aria-haspopup="true"
        id="user-menu-button"
      >
        <span className="h-6 w-6 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={`${user?.name || "用户"}头像`}
              className="h-full w-full object-cover"
            />
          ) : null}
        </span>
        <span className="max-w-[140px] truncate">
          {user?.name || user?.username || "用户"}
        </span>
        <svg
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {open ? (
        <div
          ref={menuRef}
          className="absolute right-0 z-10 mt-2 w-44 overflow-hidden rounded-md border border-neutral-200 bg-white shadow dark:border-neutral-800 dark:bg-neutral-950"
          role="menu"
          aria-labelledby="user-menu-button"
          onKeyDown={handleKeyDown}
        >
          {menuItems.map((item) => (
            <a
              key={item.href}
              className="block px-3 py-2 text-sm hover:bg-neutral-50 focus:bg-neutral-50 focus:outline-none dark:hover:bg-neutral-900 dark:focus:bg-neutral-900"
              href={item.href}
              role="menuitem"
              tabIndex={0}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </a>
          ))}
          <div className="border-t border-neutral-200 dark:border-neutral-800" />
          <button
            className="block w-full px-3 py-2 text-left text-sm hover:bg-neutral-50 focus:bg-neutral-50 focus:outline-none dark:hover:bg-neutral-900 dark:focus:bg-neutral-900"
            type="button"
            role="menuitem"
            tabIndex={0}
            onClick={async () => {
              await logout();
              window.location.reload();
            }}
          >
            退出登录
          </button>
        </div>
      ) : null}
    </div>
  );
}
