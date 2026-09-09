"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
  Images,
  KeyRound,
  Loader2,
  PartyPopper,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@clerk/nextjs";

import { cn } from "@/lib/utils";
import { api, ApiError, type GalleryApi } from "@/lib/api/client";
import type { Photo } from "@/types";
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
import { EmptyState } from "@/components/dashboard/empty-state";

interface CreateGalleryWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Event whose photos are being curated. */
  eventId: string;
  eventName: string;
  photos: Photo[];
}

const STEPS = ["Photos", "Settings", "Review"] as const;

/**
 * Admin gallery wizard, wired to the real backend:
 * POST /api/v1/events/:id/galleries creates the gallery with the selected
 * photo IDs (the server validates they all belong to the event) and
 * generates the PIN server-side; POST /galleries/:id/publish publishes it.
 * Expiry/downloads are existing UI ideas not part of this phase's API —
 * removed rather than faked.
 */
export function CreateGalleryWizard({
  open,
  onOpenChange,
  eventId,
  eventName,
  photos,
}: CreateGalleryWizardProps) {
  const router = useRouter();
  const { getToken } = useAuth();
  const [step, setStep] = React.useState(0);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [published, setPublished] = React.useState<GalleryApi | null>(null);

  const shareUrl = published
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/gallery/${published.slug}`
    : "";

  React.useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      setStep(0);
      setPublished(null);
      setName("");
      setDescription("");
      setServerError(null);
      setSelectedIds(new Set(photos.filter((p) => p.selected).map((p) => p.id)));
    }, 0);
    return () => clearTimeout(t);
  }, [open, photos]);

  const canNext =
    (step === 0 && selectedIds.size > 0) || (step === 1 && name.trim().length >= 2);

  async function publish() {
    setServerError(null);
    setSubmitting(true);
    try {
      const token = await getToken();
      const { gallery } = await api.createGallery(token, eventId, {
        name: name.trim(),
        description: description.trim() || undefined,
        photo_ids: [...selectedIds],
      });
      const { gallery: publishedGallery } = await api.publishGallery(token, gallery.id);
      setPublished(publishedGallery);
      toast.success("Gallery published", { description: gallery.name });
      router.refresh();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.status === 400
            ? err.message
            : err.status === 403
              ? "You don't have permission to create galleries."
              : "Unable to create the gallery. Please try again."
          : "Unable to connect to the server. Please try again.";
      setServerError(message);
    } finally {
      setSubmitting(false);
    }
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
          /* ---------- Success screen (real URL + server-generated PIN) ---------- */
          <div className="py-4 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950">
              <PartyPopper className="size-6 text-emerald-700 dark:text-emerald-300" aria-hidden="true" />
            </div>
            <h2 className="mt-4 font-display text-2xl font-semibold tracking-tight">Your gallery is ready</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Share the link and PIN with your client. Only people with both can view it.
            </p>

            <div className="mx-auto mt-6 max-w-md space-y-3 text-left">
              <div className="rounded-xl border bg-card p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Gallery link</p>
                <div className="mt-2 flex items-center gap-2">
                  <code className="min-w-0 flex-1 truncate rounded-md bg-secondary px-2.5 py-2 font-mono text-sm">
                    {shareUrl}
                  </code>
                  <Button variant="outline" size="icon" aria-label="Copy gallery link" onClick={() => copy(shareUrl, "Link")}>
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

              <div className="rounded-lg border px-3 py-2.5 text-sm">
                <span className="text-muted-foreground">Photos: </span>
                <span className="font-medium tabular-nums">{published.photo_count}</span>
                <span className="ml-4 text-muted-foreground">Event: </span>
                <span className="font-medium">{eventName}</span>
              </div>
            </div>

            <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
              <Button variant="outline" onClick={() => copy(shareUrl, "Link")}>
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
                {eventName} · Step {step + 1} of {STEPS.length} — {STEPS[step]}
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
              {/* Step 1: select photos */}
              {step === 0 && (
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
                  {photos.length === 0 ? (
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

              {/* Step 2: settings */}
              {step === 1 && (
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

                  <div className="rounded-xl border border-accent-foreground/20 bg-accent p-4">
                    <div className="flex items-center gap-2">
                      <KeyRound className="size-4 text-accent-foreground" aria-hidden="true" />
                      <p className="text-xs font-semibold uppercase tracking-wide text-accent-foreground">Access PIN</p>
                      <ShieldCheck className="ml-auto size-4 text-accent-foreground" aria-hidden="true" />
                    </div>
                    <p className="mt-1.5 text-xs text-accent-foreground/80">
                      A secure 6-digit PIN is generated automatically when you publish — you&apos;ll see it on the next screen.
                    </p>
                  </div>
                </div>
              )}

              {/* Step 3: review */}
              {step === 2 && (
                <div className="grid gap-4">
                  <div className="rounded-xl border bg-card p-4">
                    <p className="font-display text-lg font-semibold">{name || "Untitled gallery"}</p>
                    <p className="text-sm text-muted-foreground">{eventName}</p>
                  </div>
                  <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border px-3 py-2.5">
                      <dt className="text-xs text-muted-foreground">Photos</dt>
                      <dd className="font-medium tabular-nums">{selectedIds.size}</dd>
                    </div>
                    <div className="rounded-lg border px-3 py-2.5">
                      <dt className="text-xs text-muted-foreground">Visibility</dt>
                      <dd className="font-medium">Published</dd>
                    </div>
                    <div className="rounded-lg border border-accent-foreground/20 bg-accent px-3 py-2.5">
                      <dt className="flex items-center gap-1 text-xs text-accent-foreground">
                        <KeyRound className="size-3" /> PIN
                      </dt>
                      <dd className="font-mono font-semibold tracking-widest text-accent-foreground">••••••</dd>
                    </div>
                  </dl>
                  {description && <p className="text-sm text-muted-foreground">“{description}”</p>}
                  {serverError && (
                    <p className="text-xs text-destructive" role="alert">
                      {serverError}
                    </p>
                  )}
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
                <Button onClick={publish} disabled={submitting || selectedIds.size === 0}>
                  {submitting ? (
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
