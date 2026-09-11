"use client";

import * as React from "react";
import {
  FolderClosed,
  LayoutDashboard,
  UserRound,
} from "lucide-react";
import { usePathname } from "next/navigation";

import { useCurrentUserState, MEMBER_SAFE_USER } from "@/lib/api/use-current-user";
import type { User, UserRole } from "@/types";
import { SidebarInner } from "@/components/dashboard/sidebar-inner";

/**
 * Role-aware navigation.
 * - ADMIN: Overview / Events / Team
 * - TEAM_MEMBER: My Events
 *
 * Galleries live under each event now, so the standalone entry was removed.
 * "My Uploads" used to point at /dashboard/uploads, which has no page — it
 * 404'd for every member; a per-user uploads view is still open work.
 *
 * Nav visibility is UX only — every admin action is enforced server-side.
 */
const adminNav: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Events", href: "/dashboard/events", icon: FolderClosed },
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
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r bg-card/40 lg:flex">
      <SidebarInner
        user={resolved}
        roleLoading={loading}
        pathname={pathname}
        items={roleNav(resolved.role)}
        idPrefix="sidebar-desktop"
      />
    </aside>
  );
}
