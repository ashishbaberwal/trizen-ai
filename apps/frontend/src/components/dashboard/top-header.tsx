"use client";

import * as React from "react";
import { Bell, Menu, Search } from "lucide-react";
import Link from "next/link";

import type { User } from "@/types";
import { UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Logo } from "@/components/logo";

interface TopHeaderProps {
  crumbs: { label: string; href?: string }[];
  title: string;
  onOpenNav?: () => void;
  user?: User;
  actions?: React.ReactNode;
}

const notifications = [
  { id: 1, title: "Sarah uploaded 128 photos", detail: "Arjun & Priya Wedding", time: "2h ago" },
  { id: 2, title: "Gallery published", detail: "Ceremony Highlights is live", time: "5h ago" },
  { id: 3, title: "New team member", detail: "Inês Carvalho joined Wedding Team", time: "1d ago" },
];

export function TopHeader({ crumbs, title, onOpenNav, actions }: TopHeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onOpenNav}
        aria-label="Open navigation"
      >
        <Menu />
      </Button>

      <div className="hidden min-w-0 flex-col justify-center lg:flex">
        <p className="truncate font-display text-sm font-semibold leading-tight">{title}</p>
        <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
          <ol className="flex items-center gap-1">
            {crumbs.map((c, i) => (
              <li key={i} className="flex items-center gap-1">
                {i > 0 && <span aria-hidden="true">/</span>}
                {c.href ? (
                  <Link href={c.href} className="hover:text-foreground">
                    {c.label}
                  </Link>
                ) : (
                  <span className="truncate">{c.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      </div>

      <div className="lg:hidden">
        <Logo />
      </div>

      <div className="ml-auto flex items-center gap-1.5 md:gap-2">
        {actions}
        <div className="relative hidden sm:block">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search events, photos…"
            className="h-9 w-44 rounded-full bg-secondary/60 pl-8 md:w-56 lg:w-64"
            aria-label="Search"
          />
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
              <Bell />
              <span className="absolute right-2 top-2 size-2 rounded-full bg-destructive" aria-hidden="true" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <div className="border-b px-4 py-3">
              <p className="text-sm font-semibold">Notifications</p>
            </div>
            <ul className="max-h-80 overflow-y-auto">
              {notifications.map((n) => (
                <li key={n.id} className="border-b px-4 py-3 last:border-0 hover:bg-secondary/50">
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="text-xs text-muted-foreground">{n.detail}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{n.time}</p>
                </li>
              ))}
            </ul>
          </PopoverContent>
        </Popover>

        {/* Single profile control: Clerk UserButton (account, sessions, sign-out). */}
        <UserButton />
      </div>
    </header>
  );
}
