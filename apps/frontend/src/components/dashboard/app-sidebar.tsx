"use client";

import * as React from "react";
import {
  FolderClosed,
  Images,
  LayoutDashboard,
  UserRound,
} from "lucide-react";
import { usePathname } from "next/navigation";

import { useCurrentUserState } from "@/lib/api/use-current-user";
import { MEMBER_SAFE_USER } from "@/lib/api/use-current-user";
import type { User, UserRole } from "@/types";
import { SidebarInner } from "@/components/dashboard/sidebar-inner";

/**
 * Role-aware navigation.
 * - ADMIN: Overview / Events / Galleries / Team
 * - TEAM_MEMBER: My Events
 *
 * "My Uploads" used to point at /dashboard/uploads, which has no page — it
 * 404'd for every member. Removed until that page actually exists; a per-user
 * uploads view is still open work, not a dead link.
 *
 * Nav visibility is UX only — every admin action is enforced server-side.
 */
const adminNav: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Events", href: "/dashboard/events", icon: FolderClosed },
  { label: "Galleries", href: "/dashboard/galleries", icon: Images },
  { label: "Team", href: "/dashboard/team", icon: UserRound },
];

const memberNav: NavItem[] = [
  { label: "My Events", href: "/dashboard", icon: FolderClosed },
];

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function roleNav(role: UserRole): NavItem[] {
  return role === "admin" ? adminNav : memberNav;
}

export function AppSidebar() {
  const { user, loading } = useCurrentUserState();
  const pathname = usePathname();
  // While the role is loading, render nothing meaningful (avoids flashing the
  // wrong nav). After load, fall back to member-safe view on failure.
  const resolved: User = user ?? MEMBER_SAFE_USER;

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r bg-card lg:flex">
      <SidebarInner
        user={resolved}
        roleLoading={loading}
        pathname={pathname}
        items={roleNav(resolved.role)}
      />
    </aside>
  );
}
