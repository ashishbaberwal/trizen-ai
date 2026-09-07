"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Calendar,
  Copy,
  ExternalLink,
  Images,
  MoreHorizontal,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { formatDate, formatNumber } from "@/lib/utils";
import { galleryService } from "@/lib/services";
import type { Gallery } from "@/types";
import { AppShell } from "@/components/dashboard/app-shell";
import { GalleryStatusBadge } from "@/components/dashboard/status-badge";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { CreateGalleryWizard } from "@/components/galleries/create-gallery-wizard";

export default function GalleriesPage() {
  const [loading, setLoading] = React.useState(true);
  const [galleries, setGalleries] = React.useState<Gallery[]>([]);
  const [wizardOpen, setWizardOpen] = React.useState(false);
  const [confirmGallery, setConfirmGallery] = React.useState<Gallery | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    galleryService.list().then((data) => {
      if (!cancelled) {
        setGalleries(data);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function setStatus(gallery: Gallery, status: Gallery["status"]) {
    await galleryService.setStatus(gallery.id, status);
    setGalleries((prev) => prev.map((g) => (g.id === gallery.id ? { ...g, status } : g)));
    toast.success(status === "published" ? "Gallery published" : "Gallery unpublished", {
      description: gallery.name,
    });
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
        <Button size="sm" onClick={() => setWizardOpen(true)}>
          <Sparkles /> <span className="hidden sm:inline">New gallery</span>
          <span className="sm:hidden">New</span>
        </Button>
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
        ) : galleries.length === 0 ? (
          <EmptyState
            icon={Images}
            title="No galleries yet"
            description="Pick photos from an event and turn them into a private, PIN-protected gallery."
            action={{ label: "Create gallery", onClick: () => setWizardOpen(true) }}
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
                  <Image
                    src={gallery.coverUrl}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 420px"
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                  <div className="absolute right-2.5 top-2.5">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="secondary"
                          size="icon-sm"
                          aria-label={`Actions for ${gallery.name}`}
                          className="bg-white/90 text-neutral-900 shadow-sm hover:bg-white"
                        >
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem asChild>
                          <Link href={`/gallery/${gallery.slug}`} target="_blank">
                            <ExternalLink /> View
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => copy(gallery.url, "Link")}>
                          <Copy /> Copy link
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {gallery.status === "published" ? (
                          <DropdownMenuItem
                            destructive
                            onSelect={() => setConfirmGallery(gallery)}
                          >
                            Unpublish
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onSelect={() => setStatus(gallery, "published")}>
                            <Sparkles /> Publish
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
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
                      <code className="truncate font-mono text-xs text-muted-foreground">{gallery.url}</code>
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

      <CreateGalleryWizard open={wizardOpen} onOpenChange={setWizardOpen} eventId={null} photos={[]} />

      <AlertDialog open={!!confirmGallery} onOpenChange={(o) => !o && setConfirmGallery(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unpublish this gallery?</AlertDialogTitle>
            <AlertDialogDescription>
              “{confirmGallery?.name}” will stop being reachable at its link. Clients who open it
              will see that the gallery isn&apos;t available. You can publish it again later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (confirmGallery) setStatus(confirmGallery, "draft");
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
