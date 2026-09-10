"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { useCurrentUserState } from "@/lib/api/use-current-user";
import { currentUser } from "@/lib/mock-data";
import type { User } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { roleNav, AppSidebar } from "@/components/dashboard/app-sidebar";
import { SidebarInner } from "@/components/dashboard/sidebar-inner";
import { TopHeader } from "@/components/dashboard/top-header";
import { usePathname } from "next/navigation";

interface AppShellProps {
  title: string;
  crumbs: { label: string; href?: string }[];
  actions?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: boolean;
}

export function AppShell({
  title,
  crumbs,
  actions,
  children,
  maxWidth = true,
}: AppShellProps) {
  const [navOpen, setNavOpen] = React.useState(false);
  const { user, loading } = useCurrentUserState();
  const resolved: User = user ?? currentUser;
  const items = roleNav(resolved.role);
  const pathname = usePathname();

  return (
    <div className="min-h-dvh">
      <AppSidebar />
      {/* Mobile navigation drawer */}
      <Dialog open={navOpen} onOpenChange={setNavOpen}>
        <DialogContent
          hideClose
          className="left-0 top-0 h-dvh max-w-[17rem] translate-x-0 translate-y-0 rounded-none border-r p-0 data-[state=open]:animate-fade-in"
          aria-describedby={undefined}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Navigation</DialogTitle>
            <DialogDescription>Main application navigation</DialogDescription>
          </DialogHeader>
          <div className="flex h-full flex-col bg-card">
            <SidebarInner user={resolved} roleLoading={loading} pathname={pathname} items={items} />
          </div>
        </DialogContent>
      </Dialog>

      <div className="lg:pl-60">
        <TopHeader
          title={title}
          crumbs={crumbs}
          actions={actions}
          onOpenNav={() => setNavOpen(true)}
        />
        <main
          className={cn(
            "mx-auto w-full px-4 py-6 md:px-6 md:py-8",
            maxWidth && "max-w-7xl"
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
