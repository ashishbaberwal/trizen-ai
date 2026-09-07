"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Copy,
  ExternalLink,
  Images,
  KeyRound,
  Loader2,
  Lock,
  PartyPopper,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { cn, formatDate, formatNumber } from "@/lib/utils";
import { generatePin, galleryService, photoService } from "@/lib/services";
import type { Event, Gallery, Photo } from "@/types";
import { eventService } from "@/lib/services";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/dashboard/empty-state";

interface CreateGalleryWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string | null;
  photos: Photo[];
}

const STEPS = ["Event", "Photos", "Settings", "Review"] as const;

export function CreateGalleryWizard({ open, onOpenChange, eventId, photos: presetPhotos }: CreateGalleryWizardProps) {
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [events, setEvents] = React.useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = React.useState<string | null>(eventId);
  const [photos, setPhotos] = React.useState<Photo[]>(presetPhotos);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(
    new Set(presetPhotos.filter((p) => p.selected).map((p) => p.id))
  );
  const [loadingPhotos, setLoadingPhotos] = React.useState(false);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [expiresAt, setExpiresAt] = React.useState("");
  const [downloadEnabled, setDownloadEnabled] = React.useState(true);
  const [pin, setPin] = React.useState(generatePin());
  const [publishing, setPublishing] = React.useState(false);
  const [published, setPublished] = React.useState<Gallery | null>(null);
  const [eventsLoading, setEventsLoading] = React.useState(true);

  const wasOpen = React.useRef(false);
  React.useEffect(() => {
    if (open && !wasOpen.current) {
      wasOpen.current = true;
      if (eventId === null) {
        const id = requestAnimationFrame(() => {
          setEventsLoading(true);
          eventService.list().then((list) => {
            setEvents(list.filter((e) => e.status !== "draft" || e.photoCount > 0));
            setEventsLoading(false);
          });
        });
        return () => cancelAnimationFrame(id);
      }
    }
  }, [open, eventId]);

  React.useEffect(() => {
    if (!open && wasOpen.current) {
      wasOpen.current = false;
      const id = requestAnimationFrame(() => {
        setStep(0);
        setPublished(null);
        if (eventId === null) {
          setPhotos([]);
          setSelectedIds(new Set());
          setName("");
          setDescription("");
          setExpiresAt("");
          setDownloadEnabled(true);
          setPin(generatePin());
        }
      });
      return () => cancelAnimationFrame(id);
    }
  }, [open, eventId]);

  async function loadPhotos(id: string) {
    setLoadingPhotos(true);
    // Mock: reuse event photo set
    const list = await photoService.listByEvent(id);
    setPhotos(list);
    setSelectedIds(new Set(list.filter((p) => p.selected).map((p) => p.id)));
    setLoadingPhotos(false);
  }

  const selectedEvent = events.find((e) => e.id === selectedEventId) ?? null;
  const canNext =
    (step === 0 && !!selectedEventId) ||
    (step === 1 && selectedIds.size > 0) ||
    (step === 2 && name.trim().length >= 2);

  async function publish() {
    if (!selectedEventId) return;
    setPublishing(true);
    const gallery = await galleryService.create({
      eventId: selectedEventId,
      name: name.trim(),
      description: description.trim(),
      photoIds: [...selectedIds],
      expiresAt: expiresAt || undefined,
      downloadEnabled,
    });
    await galleryService.setStatus(gallery.id, "published");
    setPublishing(false);
    setPublished({ ...gallery, status: "published", publishedAt: new Date().toISOString() });
    toast.success("Gallery published", { description: gallery.name });
    router.refresh();
  }

  function copy(text: string, label: string) {
    navigator.clipboard?.writeText(text).then(
      () => toast.success(`${label} copied`),
      () => toast.error(`Couldn't copy ${label.toLowerCase()}`)
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-3xl">
        {published ? (
          /* ---------- Success screen ---------- */
          <div className="py-4 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950">
              <PartyPopper className="size-6 text-emerald-700 dark:text-emerald-300" aria-hidden="true" />
            </div>
            <h2 className="mt-4 font-display text-2xl font-semibold tracking-tight">Your gallery is ready</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Share the link and PIN with {selectedEvent?.name ?? "your client"}. Only people with both can view it.
            </p>

            <div className="mx-auto mt-6 max-w-md space-y-3 text-left">
              <div className="rounded-xl border bg-card p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Gallery link</p>
                <div className="mt-2 flex items-center gap-2">
                  <code className="min-w-0 flex-1 truncate rounded-md bg-secondary px-2.5 py-2 font-mono text-sm">
                    {published.url}
                  </code>
                  <Button variant="outline" size="icon" aria-label="Copy gallery link" onClick={() => copy(published.url, "Link")}>
                    <Copy />
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border border-accent-foreground/20 bg-accent p-4">
                <div className="flex items-center gap-2">
                  <KeyRound className="size-4 text-accent-foreground" aria-hidden="true" />
                  <p className="text-xs font-semibold uppercase tracking-wide text-accent-foreground">Access PIN</p>
                  <ShieldCheck className="ml-auto size-4 text-accent-foreground" aria-hidden="true" />
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <p className="min-w-0 flex-1 rounded-md bg-card px-2.5 py-2 font-mono text-lg font-semibold tracking-[0.35em] tabular-nums">
                    {published.pin}
                  </p>
                  <Button variant="outline" size="icon" aria-label="Copy PIN" onClick={() => copy(published.pin, "PIN")}>
                    <Copy />
                  </Button>
                </div>
                <p className="mt-2 text-xs text-accent-foreground/80">
                  Send the PIN separately from the link — for example by SMS.
                </p>
              </div>

              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border px-3 py-2.5">
                  <dt className="text-xs text-muted-foreground">Photos</dt>
                  <dd className="font-medium tabular-nums">{published.photoCount}</dd>
                </div>
                <div className="rounded-lg border px-3 py-2.5">
                  <dt className="text-xs text-muted-foreground">Expires</dt>
                  <dd className="font-medium">{published.expiresAt ? formatDate(published.expiresAt) : "Never"}</dd>
                </div>
              </dl>
            </div>

            <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
              <Button variant="outline" onClick={() => copy(published.url, "Link")}>
                <Copy /> Copy link
              </Button>
              <Button variant="outline" onClick={() => copy(published.pin, "PIN")}>
                <Copy /> Copy PIN
              </Button>
              <Button asChild onClick={() => onOpenChange(false)}>
                <a href={`/gallery/${published.slug}`} target="_blank" rel="noreferrer">
                  <ExternalLink /> Open gallery
                </a>
              </Button>
            </div>
          </div>
        ) : (
          /* ---------- Wizard ---------- */
          <>
            <DialogHeader>
              <DialogTitle>Create gallery</DialogTitle>
              <DialogDescription>
                Step {step + 1} of {STEPS.length} — {STEPS[step]}
              </DialogDescription>
            </DialogHeader>

            {/* Progress */}
            <ol className="flex items-center gap-1.5" aria-label="Progress">
              {STEPS.map((s, i) => (
                <li key={s} className="flex-1">
                  <div
                    className={cn(
                      "h-1.5 rounded-full transition-colors",
                      i < step ? "bg-ring" : i === step ? "bg-ring/50" : "bg-secondary"
                    )}
                  />
                  <span className={cn("mt-1.5 hidden text-xs sm:block", i === step ? "font-medium" : "text-muted-foreground")}>
                    {s}
                  </span>
                </li>
              ))}
            </ol>

            <div className="min-h-[320px]">
              {/* Step 1: select event */}
              {step === 0 && (
                <div>
                  {eventsLoading ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-24 rounded-xl" />
                      ))}
                    </div>
                  ) : (
                    <ul className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Choose event">
                      {events.map((event) => (
                        <li key={event.id}>
                          <button
                            type="button"
                            role="radio"
                            aria-checked={selectedEventId === event.id}
                            onClick={() => {
                              setSelectedEventId(event.id);
                              loadPhotos(event.id);
                            }}
                            className={cn(
                              "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer hover:bg-secondary/50",
                              selectedEventId === event.id && "border-ring bg-accent/60"
                            )}
                          >
                            <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-secondary">
                              <Image src={event.coverUrl} alt="" fill sizes="56px" className="object-cover" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{event.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatNumber(event.photoCount)} photos · {formatDate(event.date)}
                              </p>
                            </div>
                            {selectedEventId === event.id && <Check className="size-4 text-ring" />}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Step 2: select photos */}
              {step === 1 && (
                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground tabular-nums">{selectedIds.size}</span> photos selected
                    </p>
                    <div className="flex gap-1.5">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set(photos.map((p) => p.id)))}>
                        Select all
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
                        Clear
                      </Button>
                    </div>
                  </div>
                  {loadingPhotos ? (
                    <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                      {Array.from({ length: 15 }).map((_, i) => (
                        <Skeleton key={i} className="aspect-square rounded-md" />
                      ))}
                    </div>
                  ) : photos.length === 0 ? (
                    <EmptyState
                      icon={Images}
                      title="No photos in this event"
                      description="Upload photos first, then come back to build the gallery."
                      className="py-10"
                    />
                  ) : (
                    <div className="mt-3 grid max-h-[320px] grid-cols-3 gap-2 overflow-y-auto rounded-lg border p-2 sm:grid-cols-5">
                      {photos.map((photo, index) => {
                        const isSelected = selectedIds.has(photo.id);
                        return (
                          <button
                            key={photo.id}
                            type="button"
                            onClick={() =>
                              setSelectedIds((prev) => {
                                const next = new Set(prev);
                                if (next.has(photo.id)) next.delete(photo.id);
                                else next.add(photo.id);
                                return next;
                              })
                            }
                            aria-pressed={isSelected}
                            aria-label={`${isSelected ? "Deselect" : "Select"} photo ${index + 1}`}
                            className={cn(
                              "relative aspect-square overflow-hidden rounded-md bg-secondary transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer",
                              isSelected ? "ring-2 ring-ring" : "opacity-80 hover:opacity-100"
                            )}
                          >
                            <Image src={photo.url} alt="" fill sizes="160px" className="object-cover" />
                            {isSelected && (
                              <span className="absolute right-1 top-1 flex size-4.5 items-center justify-center rounded-full bg-ring text-white">
                                <Check className="size-3" strokeWidth={3} />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: settings */}
              {step === 2 && (
                <div className="grid gap-4">
                  <div className="grid gap-1.5">
                    <Label htmlFor="gallery-name">Gallery name</Label>
                    <Input
                      id="gallery-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Ceremony Highlights"
                      aria-invalid={name.trim().length > 0 && name.trim().length < 2}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="gallery-description">Description</Label>
                    <Textarea
                      id="gallery-description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="A short note your client will see at the top of the gallery"
                      rows={2}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="gallery-expiry">Expiration date</Label>
                    <div className="relative sm:max-w-xs">
                      <CalendarDays className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="gallery-expiry"
                        type="date"
                        className="pl-8"
                        value={expiresAt}
                        min={new Date().toISOString().slice(0, 10)}
                        onChange={(e) => setExpiresAt(e.target.value)}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Optional — the gallery link stops working after this date.</p>
                  </div>

                  <div className="rounded-xl border p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium">Allow downloads</p>
                        <p className="text-xs text-muted-foreground">Clients can save photos to their device.</p>
                      </div>
                      <Switch checked={downloadEnabled} onCheckedChange={setDownloadEnabled} aria-label="Allow downloads" />
                    </div>
                  </div>

                  <div className="rounded-xl border border-accent-foreground/20 bg-accent p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="flex items-center gap-1.5 text-sm font-medium text-accent-foreground">
                          <Lock className="size-3.5" aria-hidden="true" /> Access PIN
                        </p>
                        <p className="mt-0.5 text-xs text-accent-foreground/80">
                          Required to open the gallery. Regenerate anytime before publishing.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="rounded-md bg-card px-3 py-2 font-mono text-lg font-semibold tracking-[0.3em] tabular-nums" aria-live="polite">
                          {pin}
                        </p>
                        <Button variant="ghost" size="icon" aria-label="Regenerate PIN" onClick={() => setPin(generatePin())}>
                          <RefreshCw />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: review */}
              {step === 3 && selectedEvent && (
                <div className="grid gap-4">
                  <div className="relative aspect-[16/7] overflow-hidden rounded-xl bg-secondary">
                    <Image src={selectedEvent.coverUrl} alt="" fill sizes="(max-width: 768px) 100vw, 640px" className="object-cover" />
                    <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 to-transparent p-4">
                      <div>
                        <p className="font-display text-lg font-semibold text-white">{name || "Untitled gallery"}</p>
                        <p className="text-sm text-white/80">{selectedEvent.name}</p>
                      </div>
                    </div>
                  </div>
                  <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-lg border px-3 py-2.5">
                      <dt className="text-xs text-muted-foreground">Photos</dt>
                      <dd className="font-medium tabular-nums">{selectedIds.size}</dd>
                    </div>
                    <div className="rounded-lg border px-3 py-2.5">
                      <dt className="text-xs text-muted-foreground">Expires</dt>
                      <dd className="font-medium">{expiresAt ? formatDate(expiresAt) : "Never"}</dd>
                    </div>
                    <div className="rounded-lg border px-3 py-2.5">
                      <dt className="text-xs text-muted-foreground">Downloads</dt>
                      <dd className="font-medium">{downloadEnabled ? "Enabled" : "Disabled"}</dd>
                    </div>
                    <div className="rounded-lg border border-accent-foreground/20 bg-accent px-3 py-2.5">
                      <dt className="flex items-center gap-1 text-xs text-accent-foreground">
                        <KeyRound className="size-3" /> PIN
                      </dt>
                      <dd className="font-mono font-semibold tracking-widest text-accent-foreground">{pin}</dd>
                    </div>
                  </dl>
                  {description && <p className="text-sm text-muted-foreground">“{description}”</p>}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t pt-4">
              <Button
                variant="ghost"
                onClick={() => (step === 0 ? onOpenChange(false) : setStep((s) => s - 1))}
              >
                <ArrowLeft /> {step === 0 ? "Cancel" : "Back"}
              </Button>
              {step < STEPS.length - 1 ? (
                <Button disabled={!canNext} onClick={() => setStep((s) => s + 1)}>
                  Continue <ArrowRight />
                </Button>
              ) : (
                <Button onClick={publish} disabled={publishing}>
                  {publishing ? (
                    <>
                      <Loader2 className="animate-spin" /> Publishing…
                    </>
                  ) : (
                    <>
                      <Sparkles /> Publish gallery
                    </>
                  )}
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
