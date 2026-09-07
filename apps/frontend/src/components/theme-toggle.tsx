"use client";

import * as React from "react";
import { ThemeProvider } from "next-themes";
import { LogOut, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";

import type { User } from "@/types";
import { currentUser } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const { resolvedTheme, setTheme } = useTheme();

  if (!mounted)
    return (
      <Button variant="ghost" size="icon" aria-label="Toggle theme" className="opacity-0" tabIndex={-1} />
    );

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      {resolvedTheme === "dark" ? <Sun /> : <Moon />}
    </Button>
  );
}

export function ThemeModeToggleRow({ user = currentUser }: { user?: User }) {
  return (
    <div className="flex items-center gap-2 border-t px-4 py-3">
      <ThemeToggle />
      <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
        <Link href="/login">
          <LogOut className="size-4" />
          Log out
        </Link>
      </Button>
      <span className="ml-auto text-xs text-muted-foreground">{user.role === "admin" ? "Admin" : "Team"}</span>
    </div>
  );
}

export function ThemeProviderWrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>{children}</ThemeProvider>;
}
