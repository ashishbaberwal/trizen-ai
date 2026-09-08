"use client";

import { AppShell } from "@/components/dashboard/app-shell";
import { TeamManagement } from "@/components/team/team-management";

export default function TeamPage() {
  return (
    <AppShell
      title="Team"
      crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Team" }]}
    >
      <div className="animate-fade-up">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-semibold tracking-tight">Team management</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Invite photographers and editors, manage roles, and control who has access.
          </p>
        </div>
        <TeamManagement />
      </div>
    </AppShell>
  );
}
