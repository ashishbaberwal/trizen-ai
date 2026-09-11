"use client";

import * as React from "react";
import { Menu } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { UserButton } from "@clerk/nextjs";

interface TopHeaderProps {
  crumbs: { label: string; href?: string }[];
  title: string;
  onOpenNav?: () => void;
  actions?: React.ReactNode;
}

/**
 * Quiet rail header: breadcrumb on the left, page actions + account on the
 * right. No global search or notifications until they're wired to something
 * real — a dead search box erodes trust faster than it adds polish.
 */
export function TopHeader({ crumbs, title, onOpenNav, actions }: TopHeaderProps) {
  return (
    <header
      aria-label={title}
      className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background/90 px-5 backdrop-blur supports-[backdrop-filter]:bg-background/75 md:px-8 lg:px-10"
    >
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onOpenNav}
        aria-label="Open navigation"
      >
        <Menu />
      </Button>

      <div className="hidden min-w-0 items-baseline gap-2.5 lg:flex">
        <span className="overline-label text-muted-foreground">
          <nav aria-label="Breadcrumb">
            <ol className="flex items-center gap-2">
              {crumbs.map((c, i) => (
                <li key={i} className="flex items-center gap-2">
                  {i > 0 && <span aria-hidden="true">/</span>}
                  {c.href ? (
                    <Link href={c.href} className="transition-colors hover:text-foreground">
                      {c.label}
                    </Link>
                  ) : (
                    <span className="truncate">{c.label}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        </span>
      </div>

      <div className="lg:hidden">
        <Logo />
      </div>

      <div className="ml-auto flex items-center gap-2">
        {actions}
        {/* Single profile control: Clerk UserButton (account, sessions, sign-out). */}
        <UserButton />
      </div>
    </header>
  );
}
