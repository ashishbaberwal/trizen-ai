"use client";

import * as React from "react";
import {
  ArrowUpDown,
  CheckSquare,
  Download,
  FolderPlus,
  Search,
  Square,
  Upload,
  X,
  Images,
} from "lucide-react";
import { toast } from "sonner";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import { cn, formatNumber } from "@/lib/utils";
import { photoService } from "@/lib/services";
import type { Photo } from "@/types";
import { AppShell } from "@/components/dashboard/app-shell";
import { PhotoCard } from "@/components/photos/photo-card";
import { UploadModal } from "@/components/photos/upload-modal";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CreateGalleryWizard } from "@/components/galleries/create-gallery-wizard";

type Filter = "all" | "selected" | "unselected";
type Sort = "newest" | "oldest" | "uploader";

export default function PhotosPage() {
  const params = useParams<{ eventId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const eventId = params.eventId;

  const [loading, setLoading] = React.useState(true);
  const [photos, setPhotos] = React.useState<Photo[]>([]);
  const [filter, setFilter] = React.useState<Filter>("all");
  const [sort, setSort] = React.useState<Sort>("newest");
  const [query, setQuery] = React.useState("");
  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [wizardOpen, setWizardOpen] = React.useState(searchParams.get("createGallery") === "1");
  const lastClickedIndex = React.useRef<number | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    photoService.listByEvent(eventId).then((data) => {
      if (!cancelled) {
        setPhotos(data);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const visible = React.useMemo(() => {
    let list = [...photos];
    if (filter === "selected") list = list.filter((p) => p.selected);
    if (filter === "unselected") list = list.filter((p) => !p.selected);
    if (query) list = list.filter((p) => p.uploaderName.toLowerCase().includes(query.toLowerCase()));
    list.sort((a, b) => {
      if (sort === "newest") return +new Date(b.uploadedAt) - +new Date(a.uploadedAt);
      if (sort === "oldest") return +new Date(a.uploadedAt) - +new Date(b.uploadedAt);
      return a.uploaderName.localeCompare(b.uploaderName);
    });
    return list;
  }, [photos, filter, sort, query]);

  const selectedIds = React.useMemo(() => photos.filter((p) => p.selected).map((p) => p.id), [photos]);
  const visibleSelectedCount = visible.filter((p) => p.selected).length;

  function togglePhoto(photo: Photo, shiftKey: boolean) {
    setPhotos((prev) => {
      const index = prev.findIndex((p) => p.id === photo.id);
      if (index === -1) return prev;
      const next = [...prev];
      const target = !prev[index].selected;

      if (shiftKey && lastClickedIndex.current !== null) {
        const [start, end] = [lastClickedIndex.current, index].sort((a, b) => a - b);
        for (let i = start; i <= end; i++) {
          next[i] = { ...next[i], selected: target };
        }
      } else {
        next[index] = { ...next[index], selected: target };
      }
      lastClickedIndex.current = index;
      return next;
    });
  }

  function setAll(selected: boolean) {
    setPhotos((prev) => prev.map((p) => ({ ...p, selected })));
  }

  function selectVisible(selected: boolean) {
    const ids = new Set(visible.map((p) => p.id));
    setPhotos((prev) => prev.map((p) => (ids.has(p.id) ? { ...p, selected } : p)));
  }

  async function saveSelection() {
    await photoService.setSelected(selectedIds, true, eventId);
  }

  const crumbs = [{ label: "Events", href: "/dashboard/events" }, { label: "Photos", href: `/dashboard/events/${eventId}/photos` }];

  return (
    <AppShell
      title="Photos"
      crumbs={crumbs}
      actions={
        <Button size="sm" onClick={() => setUploadOpen(true)}>
          <Upload /> <span className="hidden sm:inline">Upload photos</span>
          <span className="sm:hidden">Upload</span>
        </Button>
      }
    >
      <div className="animate-fade-up pb-24">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Photos</h1>
        <p className="mt-1 text-muted-foreground">
          {loading ? (
            <Skeleton className="inline-block h-4 w-40 align-middle" />
          ) : (
            `${formatNumber(photos.length)} photos uploaded`
          )}
          {" · "}
          {formatNumber(selectedIds.length)} selected
        </p>

        {/* Toolbar */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <div className="rounded-lg border p-0.5" role="group" aria-label="Filter photos">
            {(["all", "selected", "unselected"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                aria-pressed={filter === f}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer",
                  filter === f ? "bg-secondary font-medium text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {f}
              </button>
            ))}
          </div>

          <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
            <SelectTrigger className="w-[150px]" aria-label="Sort photos">
              <ArrowUpDown className="size-3.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
              <SelectItem value="uploader">By uploader</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative ml-auto w-full sm:w-52">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by uploader"
              className="pl-8"
              aria-label="Filter by uploader"
            />
          </div>
        </div>

        {/* Bulk actions row */}
        {!loading && photos.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Button variant="ghost" size="sm" onClick={() => selectVisible(true)} disabled={visibleSelectedCount === visible.length}>
              <CheckSquare /> Select all shown
            </Button>
            <Button variant="ghost" size="sm" onClick={() => selectVisible(false)} disabled={visibleSelectedCount === 0}>
              <Square /> Deselect shown
            </Button>
            <span className="hidden sm:inline">Tip: hold Shift to select a range.</span>
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 15 }).map((_, i) => (
              <Skeleton key={i} className={cn("rounded-lg", i % 3 === 0 ? "aspect-[3/4]" : i % 3 === 1 ? "aspect-[4/3]" : "aspect-square")} />
            ))}
          </div>
        ) : photos.length === 0 ? (
          <EmptyState
            icon={Images}
            title="No photos yet"
            description="Photos from your team will appear here as soon as they upload."
            action={{ label: "Upload photos", onClick: () => setUploadOpen(true) }}
            className="mt-6 rounded-xl border border-dashed"
          />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={Search}
            title="Nothing matches"
            description="No photos match this combination of filter, sort, and search. Clear them to see everything."
            action={{ label: "Clear filters", onClick: () => { setFilter("all"); setQuery(""); } }}
            className="mt-6 rounded-xl border border-dashed"
          />
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {visible.map((photo) => (
              <PhotoCard
                key={photo.id}
                photo={photo}
                selected={photo.selected}
                onToggle={togglePhoto}
              />
            ))}
          </div>
        )}
      </div>

      {/* Sticky selection toolbar */}
      {!loading && selectedIds.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85 animate-fade-up lg:pl-60">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 md:px-6">
            <p className="text-sm font-medium">
              <span className="tabular-nums">{selectedIds.length}</span>{" "}
              {selectedIds.length === 1 ? "photo" : "photos"} selected
            </p>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                onClick={() => {
                  saveSelection();
                  setWizardOpen(true);
                }}
              >
                <FolderPlus /> Add to gallery
              </Button>
              <Button variant="outline" size="sm" onClick={() => toast.success("Download started", { description: `${selectedIds.length} photos will be packaged as a ZIP.` })}>
                <Download /> Download
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setAll(false)}>
                <X /> Clear
              </Button>
            </div>
          </div>
        </div>
      )}

      <UploadModal open={uploadOpen} onOpenChange={setUploadOpen} />
      <CreateGalleryWizard
        open={wizardOpen}
        onOpenChange={(open) => {
          setWizardOpen(open);
          if (!open) router.replace(`/dashboard/events/${eventId}/photos`);
        }}
        eventId={eventId}
        photos={photos}
      />
    </AppShell>
  );
}
