"use client";

import * as React from "react";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { motion } from "motion/react";

import { cn } from "@/lib/utils";
import { SignOutButton } from "@clerk/nextjs";
import type { User } from "@/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/logo";
import { springSnappy } from "@/lib/motion";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

function NavLink({
  item,
  active,
  idPrefix,
}: {
  item: NavItem;
  active: boolean;
  idPrefix: string;
}) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "text-background"
          : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
      )}
    >
      {active && (
        <motion.span
          layoutId={`${idPrefix}-active`}
          transition={springSnappy}
          className="absolute inset-0 rounded-md bg-foreground"
        />
      )}
      <item.icon className={cn("relative z-10 size-4", active && "text-background")} />
      <span className="relative z-10">{item.label}</span>
    </Link>
  );
}

/**
 * Shared sidebar inner layout (desktop rail + mobile drawer).
 * `roleLoading` shows skeletons instead of trusting a fallback role.
 * `idPrefix` namespaces the active-pill layoutId so the two mounted
 * instances (desktop rail + mobile drawer) never fight over it.
 */
export function SidebarInner({
  user,
  roleLoading,
  pathname,
  items,
  idPrefix = "sidebar",
}: {
  user: User;
  roleLoading?: boolean;
  pathname: string;
  items: NavItem[];
  idPrefix?: string;
}) {
  return (
    <>
      <div className="flex h-16 items-center border-b px-5">
        <Logo />
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-5">
        <p className="overline-label px-3 pb-2 text-muted-foreground/70">Workspace</p>
        <nav aria-label="Main" className="space-y-1">
          {roleLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="mx-1 h-9 w-full rounded-md" />
              ))
            : items.map((item) => {
                const active =
                  item.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname.startsWith(item.href);
                return (
                  <NavLink key={item.href} item={item} active={active} idPrefix={idPrefix} />
                );
              })}
        </nav>
      </div>
      <UserBlock user={user} roleLoading={roleLoading} />
    </>
  );
}

function UserBlock({ user, roleLoading }: { user: User; roleLoading?: boolean }) {
  const initials =
    (user.name || user.email || "U")
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  return (
    <div className="flex items-center gap-3 border-t px-4 py-4">
      {roleLoading ? (
        <Skeleton className="size-9 rounded-full" />
      ) : (
        <Avatar className="size-9 border">
          <AvatarFallback className="text-xs font-medium">{initials}</AvatarFallback>
        </Avatar>
      )}
      <div className="min-w-0 flex-1">
        {roleLoading ? (
          <>
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="mt-1.5 h-2.5 w-14" />
          </>
        ) : (
          <>
            <p className="truncate text-sm font-medium">
              {user.name || user.email || "Studio member"}
            </p>
            <p className="overline-label mt-0.5 text-muted-foreground/80">
              {user.role === "admin" ? "Admin" : "Team member"}
            </p>
          </>
        )}
      </div>
      <ThemeToggle />
      <SignOutButton redirectUrl="/login">
        <Button variant="ghost" size="icon" aria-label="Log out">
          <LogOut className="size-4" />
        </Button>
      </SignOutButton>
    </div>
  );
}
