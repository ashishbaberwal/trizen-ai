"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import type { User } from "@/types";
import { currentUser } from "@/lib/mock-data";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { SidebarContent, AppSidebar } from "@/components/dashboard/app-sidebar";
import { TopHeader } from "@/components/dashboard/top-header";

interface AppShellProps {
  title: string;
  crumbs: { label: string; href?: string }[];
  actions?: React.ReactNode;
  children: React.ReactNode;
  user?: User;
  maxWidth?: boolean;
}

export function AppShell({
  title,
  crumbs,
  actions,
  children,
  user = currentUser,
  maxWidth = true,
}: AppShellProps) {
  const [navOpen, setNavOpen] = React.useState(false);

  return (
    <div className="min-h-dvh">
      <AppSidebar user={user} />
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
          <SidebarContent user={user} />
        </DialogContent>
      </Dialog>

      <div className="lg:pl-60">
        <TopHeader
          title={title}
          crumbs={crumbs}
          actions={actions}
          onOpenNav={() => setNavOpen(true)}
          user={user}
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
