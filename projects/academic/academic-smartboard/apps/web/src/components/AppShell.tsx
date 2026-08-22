"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown, LogOut } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useAuth } from "../lib/auth.tsx";
import { cn } from "../lib/cn.ts";
import { filterByRole, NAV_ITEMS } from "../lib/nav.ts";

// next.config.ts sets trailingSlash: true, so usePathname() returns
// "/master/murid/" while NAV_ITEMS hrefs are written without the trailing
// slash. Strip it before comparing so the active nav state actually fires.
function stripTrailingSlash(value: string): string {
  if (value.length > 1 && value.endsWith("/")) {
    return value.slice(0, -1);
  }
  return value;
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  if (!user) {
    return null;
  }

  const items = filterByRole(NAV_ITEMS, user.role);
  const normalizedPathname = stripTrailingSlash(pathname ?? "/");

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <div className="flex min-h-screen">
      <aside
        className="hidden w-(--layout-rail-width) shrink-0 border-r border-line-subtle bg-surface md:block"
        aria-label="Navigasi utama"
      >
        <div className="px-(--space-4) py-(--space-5)">
          <span className="text-(length:--font-size-title-section) font-semibold uppercase tracking-(--letter-spacing-label) text-secondary">
            Sentra Smartboard
          </span>
        </div>
        <nav className="flex flex-col gap-(--space-1) px-(--space-2)">
          {items.map((item) => {
            const active = normalizedPathname === stripTrailingSlash(item.href);
            return (
              <Link
                key={item.href}
                href={item.href as Route}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-(--target-min) items-center rounded-control px-(--space-3) py-(--space-2) text-(length:--font-size-body) text-primary transition-colors duration-(--motion-duration-fast) ease-(--motion-easing-standard) hover:bg-canvas",
                  active && "bg-canvas font-medium text-accent-text",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-(--target-min) items-center justify-end border-b border-line-subtle bg-canvas px-(--space-4) py-(--space-2)">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                className="inline-flex min-h-(--target-min) items-center gap-(--space-2) rounded-control px-(--space-3) py-(--space-2) text-(length:--font-size-body) text-primary hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-focus-ring)"
              >
                {user.name}
                <ChevronDown size={16} strokeWidth={1.5} aria-hidden="true" />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={8}
                className="z-(--z-drawer) min-w-40 rounded-control border border-line-subtle bg-canvas p-(--space-1) shadow-overlay"
              >
                <DropdownMenu.Item
                  onSelect={() => {
                    void handleLogout();
                  }}
                  className="flex min-h-(--target-min) cursor-pointer items-center gap-(--space-2) rounded-control px-(--space-3) py-(--space-2) text-(length:--font-size-body) text-primary outline-none data-[highlighted]:bg-surface"
                >
                  <LogOut size={16} strokeWidth={1.5} aria-hidden="true" />
                  Keluar
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </header>

        <main className="flex-1 px-(--space-4) py-(--space-5)">{children}</main>
      </div>
    </div>
  );
}
