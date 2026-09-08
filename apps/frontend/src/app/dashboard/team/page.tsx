"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldX } from "lucide-react";

import { useCurrentUserState } from "@/lib/api/use-current-user";
import { TeamManagement } from "@/components/team/team-management";
import { AppShell } from "@/components/dashboard/app-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Team Management — ADMIN only.
 * For TEAM_MEMBER this renders a deliberate access-denied state (never a
 * raw 404). The backend independently enforces 403 on every admin API.
 */
export default function TeamPage() {
  const { user, loading } = useCurrentUserState();
  const router = useRouter();

  if (loading) {
    return (
      <AppShell title="Team" crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Team" }]}>
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="mt-6 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      </AppShell>
    );
  }

  if (user?.role !== "admin") {
    return (
      <AppShell
        title="Team"
        crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Team" }]}
      >
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card px-6 py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
            <ShieldX className="size-6 text-destructive" aria-hidden="true" />
          </div>
          <h1 className="mt-4 font-display text-lg font-semibold">Team Management</h1>
          <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
            You are a Team Member and don&apos;t have permission to manage team members.
            Only Admins can invite or manage team members.
          </p>
          <div className="mt-5 flex gap-2">
            <Button asChild>
              <Link href="/dashboard">Back to My Events</Link>
            </Button>
            <Button variant="outline" onClick={() => router.back()}>
              Go back
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Team"
      crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Team" }]}
    >
      <TeamManagement />
    </AppShell>
  );
}
