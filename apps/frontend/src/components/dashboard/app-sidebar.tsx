"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Images,
  LayoutDashboard,
  LogOut,
  Palette,
  FolderClosed,
  UserRound,
  UploadCloud,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { currentUser } from "@/lib/mock-data";
import type { User, UserRole } from "@/types";
import { SignOutButton, UserButton } from "@clerk/nextjs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/logo";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const adminNav: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Events", href: "/dashboard/events", icon: FolderClosed },
  { label: "Galleries", href: "/dashboard/galleries", icon: Images },
  { label: "Team", href: "/dashboard/team", icon: UserRound },
  { label: "Settings", href: "/dashboard/settings", icon: Palette },
];

const memberNav: NavItem[] = [
  { label: "My Events", href: "/dashboard", icon: FolderClosed },
  { label: "My Uploads", href: "/dashboard/uploads", icon: UploadCloud },
  { label: "Profile", href: "/dashboard/profile", icon: UserRound },
];

function roleNav(role: UserRole): NavItem[] {
  return role === "admin" ? adminNav : memberNav;
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

function UserBlock({ user }: { user: User }) {
  return (
    <div className="flex items-center gap-3 border-t px-4 py-4">
      <Avatar className="size-9">
        <AvatarFallback>{user.name.split(" ").map((n) => n[0]).join("")}</AvatarFallback>
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
      <UserButton />
    </div>
  );
}

export function AppSidebar({ user = currentUser }: { user?: User }) {
  const pathname = usePathname();
  const items = roleNav(user.role);

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r bg-card lg:flex">
      <div className="flex h-16 items-center border-b px-4">
        <Logo />
      </div>
      <nav aria-label="Main" className="flex-1 space-y-1 overflow-y-auto p-3">
        {items.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return <NavLink key={item.href} item={item} active={active} />;
        })}
      </nav>
      <UserBlock user={user} />
    </aside>
  );
}

export function SidebarContent({ user = currentUser }: { user?: User }) {
  const pathname = usePathname();
  const items = roleNav(user.role);
  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex h-16 items-center border-b px-4">
        <Logo />
      </div>
      <nav aria-label="Main" className="flex-1 space-y-1 overflow-y-auto p-3">
        {items.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return <NavLink key={item.href} item={item} active={active} />;
        })}
      </nav>
      <UserBlock user={user} />
    </div>
  );
}
