"use client";

import * as React from "react";
import Link from "next/link";
import { LogOut } from "lucide-react";

import { cn } from "@/lib/utils";
import { SignOutButton } from "@clerk/nextjs";
import type { User } from "@/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/logo";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "bg-secondary text-foreground"
          : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
      )}
    >
      <item.icon className={cn("size-4", active ? "text-foreground" : "text-muted-foreground")} />
      {item.label}
    </Link>
  );
}

/**
 * Shared sidebar inner layout (desktop rail + mobile drawer).
 * `roleLoading` shows skeletons instead of trusting a fallback role.
 */
export function SidebarInner({
  user,
  roleLoading,
  pathname,
  items,
}: {
  user: User;
  roleLoading?: boolean;
  pathname: string;
  items: NavItem[];
}) {
  return (
    <>
      <div className="flex h-16 items-center border-b px-4">
        <Logo />
      </div>
      <nav aria-label="Main" className="flex-1 space-y-1 overflow-y-auto p-3">
        {roleLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="mx-1 h-9 w-full rounded-md" />
            ))
          : items.map((item) => {
              const active =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);
              return <NavLink key={item.href} item={item} active={active} />;
            })}
      </nav>
      <UserBlock user={user} />
    </>
  );
}

function UserBlock({ user }: { user: User }) {
  return (
    <div className="flex items-center gap-3 border-t px-4 py-4">
      <Avatar className="size-9">
        <AvatarFallback>{(user.name || "U").split(" ").map((n) => n[0]).slice(0, 2).join("")}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{user.name}</p>
        <div className="mt-0.5 flex items-center gap-1.5">
          <Badge variant={user.role === "admin" ? "info" : "secondary"} className="capitalize">
            {user.role === "admin" ? "Admin" : "Team member"}
          </Badge>
        </div>
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
