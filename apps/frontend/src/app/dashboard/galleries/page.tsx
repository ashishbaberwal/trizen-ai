"use client";

import * as React from "react";
import Link from "next/link";
import {
  Calendar,
  Copy,
  Images,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@clerk/nextjs";

import { formatDate, formatNumber } from "@/lib/utils";
import { api, ApiError, type GalleryApi } from "@/lib/api/client";
import { useCurrentUserState } from "@/lib/api/use-current-user";
import type { Gallery } from "@/types";
import { AppShell } from "@/components/dashboard/app-shell";
import { GalleryStatusBadge } from "@/components/dashboard/status-badge";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/**
 * Admin galleries index — real data from the workspace-scoped API.
 * Galleries are created from an event's photo workspace, so the primary
 * action here explains where to start; per-event galleries are listed.
 */
export default function GalleriesPage() {
  const { getToken } = useAuth();
  const { user, loading: roleLoading } = useCurrentUserState();
  const isAdmin = user?.role === "admin";
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [galleries, setGalleries] = React.useState<Gallery[]>([]);
  const [confirmGallery, setConfirmGallery] = React.useState<Gallery | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      // Derive the workspace gallery list from the user's events.
      const { events } = await api.listEvents(token);
      const perEvent = await Promise.all(
        events.map((e) =>
          api
            .listEventGalleries(token, e.id)
            .then((r) => r.galleries)
            .catch(() => [] as GalleryApi[])
        )
      );
      setGalleries(
        perEvent.flat().map((g) => ({
          id: g.id,
          slug: g.slug,
          eventId: g.event_id,
          eventName: events.find((e) => e.id === g.event_id)?.name ?? "Event",
          name: g.name,
          description: g.description,
          coverUrl:
            "https://images.unsplash.com/photo-1450388940901-a4598e4b87c8?auto=format&fit=crop&w=800&h=450&q=80",
          photoCount: g.photo_count,
          status: g.status,
          createdAt: g.created_at,
          publishedAt: g.published_at ?? undefined,
          expiresAt: undefined,
          pin: g.pin,
          url: `${window.location.origin}/gallery/${g.slug}`,
          downloadEnabled: false,
        }))
      );
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 403
          ? "You don't have permission to view galleries."
          : "Unable to connect to the server. Please try again."
      );
      setGalleries([]);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  React.useEffect(() => {
    if (roleLoading) return;
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [roleLoading, load]);

  async function unpublish(gallery: Gallery) {
    // Unpublish isn't part of this phase's API surface — be honest about it.
    toast.info("Unpublishing arrives with the customer gallery phase.");
    void gallery;
  }

  function copy(text: string, label: string) {
    navigator.clipboard?.writeText(text).then(
      () => toast.success(`${label} copied`),
      () => toast.error(`Couldn't copy ${label.toLowerCase()}`)
    );
  }

  return (
    <AppShell
      title="Galleries"
      crumbs={[{ label: "Galleries" }]}
      actions={
        isAdmin ? (
          <Button size="sm" asChild>
            <Link href="/dashboard/events">
              <Sparkles /> <span className="hidden sm:inline">New gallery</span>
              <span className="sm:hidden">New</span>
            </Link>
          </Button>
        ) : undefined
      }
    >
      <div className="animate-fade-up">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Galleries</h1>
        <p className="mt-1 text-muted-foreground">Client-ready collections shared with a private link and PIN.</p>

        {loading ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-xl border">
                <Skeleton className="aspect-[16/9] rounded-none" />
                <div className="space-y-2 p-4">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <EmptyState
            icon={Images}
            title="Couldn't load galleries"
            description={error}
            action={{ label: "Try again", onClick: () => void load() }}
            className="mt-6 rounded-xl border border-dashed"
          />
        ) : galleries.length === 0 ? (
          <EmptyState
            icon={Images}
            title="No galleries yet"
            description="Open an event, select photos, and choose “Create gallery” to build your first private client gallery."
            action={{ label: "Go to events", href: "/dashboard/events" }}
            className="mt-6 rounded-xl border border-dashed"
          />
        ) : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {galleries.map((gallery) => (
              <li
                key={gallery.id}
                className="group overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md"
              >
                <div className="relative aspect-[16/9] overflow-hidden bg-secondary">
                  <Images className="absolute inset-0 m-auto size-10 text-muted-foreground/40" aria-hidden="true" />
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate font-display text-base font-semibold">{gallery.name}</h3>
                      <p className="truncate text-sm text-muted-foreground">{gallery.eventName}</p>
                    </div>
                    <GalleryStatusBadge status={gallery.status} />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <Images className="size-3.5" /> {formatNumber(gallery.photoCount)} photos
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="size-3.5" />
                      {gallery.publishedAt ? `Published ${formatDate(gallery.publishedAt)}` : `Created ${formatDate(gallery.createdAt)}`}
                    </span>
                  </div>
                  {gallery.status === "published" && (
                    <div className="mt-3 flex items-center gap-2 rounded-lg bg-secondary/70 px-2.5 py-2">
                      <code className="truncate font-mono text-xs text-muted-foreground">
                        /gallery/{gallery.slug}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="ml-auto shrink-0"
                        aria-label="Copy gallery link"
                        onClick={() => copy(gallery.url, "Link")}
                      >
                        <Copy />
                      </Button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <AlertDialog open={!!confirmGallery} onOpenChange={(o) => !o && setConfirmGallery(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unpublish this gallery?</AlertDialogTitle>
            <AlertDialogDescription>
              “{confirmGallery?.name}” will stop being reachable at its link. You can publish it again later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (confirmGallery) void unpublish(confirmGallery);
                setConfirmGallery(null);
              }}
            >
              Unpublish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
