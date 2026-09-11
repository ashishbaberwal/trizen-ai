"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CloudOff,
  FileQuestion,
  Images,
  Loader2,
  LockKeyhole,
  Share2,
} from "lucide-react";
import { toast } from "sonner";

import { api, ApiError, type PublicGalleryApi, type PublicPhotoApi } from "@/lib/api/client";
import type { Photo } from "@/types";
import { PinInput } from "@/components/gallery/pin-input";
import { PhotoLightbox } from "@/components/photos/photo-lightbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

/** Metadata the customer sees before and after unlocking — served by the backend. */
type GalleryMeta = {
  name: string;
  description: string;
  slug: string;
  eventName: string;
  photoCount: number;
};

type Gate =
  | { state: "loading" }
  | { state: "pin"; meta: GalleryMeta }
  | { state: "viewing"; meta: GalleryMeta; photos: Photo[] }
  | { state: "not-found" }
  | { state: "unavailable" }
  | { state: "empty"; meta: GalleryMeta };

function toMeta(g: PublicGalleryApi): GalleryMeta {
  return {
    name: g.name,
    description: g.description,
    slug: g.slug,
    eventName: g.event_name ?? g.name,
    photoCount: g.photo_count,
  };
}

function toPublicPhoto(p: PublicPhotoApi): Photo {
  return {
    id: p.id,
    eventId: "",
    url: p.url,
    fullUrl: p.url,
    downloadUrl: p.download_url,
    filename: p.filename,
    width: 0,
    height: 0,
    // The public surface deliberately carries no uploader attribution.
    uploaderName: "",
    uploaderRole: "member",
    uploadedAt: p.created_at,
    selected: false,
  };
}

export default function CustomerGalleryPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? null;
  const [gate, setGate] = React.useState<Gate>({ state: "loading" });
  const [pin, setPin] = React.useState("");
  const [verifying, setVerifying] = React.useState(false);
  const [pinError, setPinError] = React.useState(false);
  const [pinMessage, setPinMessage] = React.useState<string | null>(null);
  const [shakeKey, setShakeKey] = React.useState(0);
  const [lightboxIndex, setLightboxIndex] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    api.getPublicGallery(slug).then(
      (res) => {
        if (cancelled) return;
        setGate({ state: "pin", meta: toMeta(res.gallery) });
      },
      (err: unknown) => {
        if (cancelled) return;
        // Unknown or unpublished slugs 404; anything else is a reachability problem.
        setGate({
          state: err instanceof ApiError && err.status === 404 ? "not-found" : "unavailable",
        });
      }
    );
    return () => {
      cancelled = true;
    };
  }, [slug]);

  async function verifyPin(code: string) {
    if (gate.state !== "pin" || code.length !== 6 || !slug) return;
    setVerifying(true);
    setPinMessage(null);
    try {
      const res = await api.unlockGallery(slug, code);
      if (res.photos.length === 0) {
        setGate({ state: "empty", meta: toMeta(res.gallery) });
      } else {
        setGate({ state: "viewing", meta: toMeta(res.gallery), photos: res.photos.map(toPublicPhoto) });
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setGate({ state: "not-found" });
      } else {
        // Wrong PIN (403), locked out (429), or a network failure — the
        // backend message is customer-safe either way.
        setPinMessage(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
        setPinError(true);
        setShakeKey((k) => k + 1);
        setPin("");
        const t = setTimeout(() => setPinError(false), 1800);
        void t;
      }
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="min-h-dvh bg-neutral-950 text-white">
      {gate.state === "loading" && (
        <div className="mx-auto flex min-h-dvh max-w-5xl items-center justify-center px-6">
          <div className="w-full">
            <Skeleton className="mx-auto h-8 w-52 bg-white/10" />
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-lg bg-white/10" />
              ))}
            </div>
          </div>
        </div>
      )}

      {gate.state === "pin" && (
        <PinGate
          meta={gate.meta}
          pin={pin}
          onPinChange={setPin}
          onComplete={verifyPin}
          verifying={verifying}
          error={pinError}
          message={pinMessage}
          shakeKey={shakeKey}
        />
      )}

      {gate.state === "viewing" && (
        <GalleryView
          meta={gate.meta}
          photos={gate.photos}
          lightboxIndex={lightboxIndex}
          setLightboxIndex={setLightboxIndex}
        />
      )}

      {gate.state === "not-found" && (
        <GalleryMessage
          icon={FileQuestion}
          title="Gallery not found"
          description="This link doesn't match any published gallery. Check the link with your photographer, or head back to the FrameFlow site."
        />
      )}

      {gate.state === "unavailable" && (
        <GalleryMessage
          icon={CloudOff}
          title="Gallery unavailable"
          description="We couldn't reach the server just now. Check your connection and reload the page in a moment."
        />
      )}

      {gate.state === "empty" && (
        <GalleryMessage
          icon={Images}
          title="No photos yet"
          description="This gallery doesn't contain any photos yet. Check back shortly."
        />
      )}
    </div>
  );
}

/* ---------- PIN gate ---------- */

function PinGate({
  meta,
  pin,
  onPinChange,
  onComplete,
  verifying,
  error,
  message,
  shakeKey,
}: {
  meta: GalleryMeta;
  pin: string;
  onPinChange: (pin: string) => void;
  onComplete: (pin: string) => void;
  verifying: boolean;
  error: boolean;
  message: string | null;
  shakeKey: number;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6">
      <div className="flex w-full max-w-sm flex-col items-center text-center animate-fade-up">
        <p className="font-display text-lg font-semibold tracking-tight">FrameFlow</p>
        <span className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur">
          <LockKeyhole className="size-3" aria-hidden="true" /> Private gallery
        </span>
        <h1 className="mt-6 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {meta.eventName}
        </h1>
        <p className="mt-2 text-sm text-white/70">
          Enter the PIN provided by your photographer.
        </p>

        <div className="mt-8">
          <PinInput
            value={pin}
            onValueChange={onPinChange}
            onComplete={onComplete}
            error={error}
            disabled={verifying}
            errorShakeKey={shakeKey}
          />
        </div>

        <p aria-live="assertive" className="mt-4 min-h-5 text-sm">
          {error ? (
            <span className="text-red-300">{message ?? "Incorrect PIN. Please try again."}</span>
          ) : verifying ? (
            <span className="inline-flex items-center gap-2 text-white/70">
              <Loader2 className="size-3.5 animate-spin" /> Verifying…
            </span>
          ) : null}
        </p>

        <Button
          size="lg"
          disabled={pin.length !== 6 || verifying}
          onClick={() => onComplete(pin)}
          className="mt-2 w-full bg-white text-neutral-900 hover:bg-white/90"
        >
          {verifying ? <Loader2 className="animate-spin" /> : null}
          View gallery
        </Button>

        <p className="mt-8 text-xs text-white/50">
          Photos stay private — only people with this link and PIN can see them.
        </p>
      </div>
    </div>
  );
}

/* ---------- Gallery view ---------- */

function GalleryView({
  meta,
  photos,
  lightboxIndex,
  setLightboxIndex,
}: {
  meta: GalleryMeta;
  photos: Photo[];
  lightboxIndex: number | null;
  setLightboxIndex: (i: number | null) => void;
}) {
  function share() {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: meta.name, url }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(url).then(
        () => toast.success("Link copied"),
        () => toast.error("Couldn't copy link")
      );
    }
  }

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-neutral-950/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3.5 md:px-6">
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg font-semibold leading-tight tracking-tight">
              {meta.name}
            </p>
            <p className="text-xs text-white/60">
              {meta.eventName} · {photos.length} photos
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="bg-white text-neutral-900 hover:bg-white/90"
              onClick={share}
            >
              <Share2 /> <span className="hidden sm:inline">Share</span>
            </Button>
          </div>
        </div>
      </header>

      <p className="mx-auto max-w-6xl px-4 pt-6 text-sm text-white/60 md:px-6">
        {meta.description}
      </p>

      {/* Masonry grid */}
      <div className="mx-auto max-w-6xl px-4 pb-20 pt-4 md:px-6">
        <div className="columns-2 gap-3 [column-fill:_balance] sm:columns-3 lg:columns-4">
          {photos.map((photo, index) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => setLightboxIndex(index)}
              className="group mb-3 block w-full break-inside-avoid overflow-hidden rounded-lg bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white cursor-pointer"
              aria-label={`Open photo ${index + 1} of ${photos.length}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt={`${meta.eventName} — photo ${index + 1} of ${photos.length}`}
                width={photo.width || undefined}
                height={photo.height || undefined}
                loading="lazy"
                className="w-full transition-transform duration-300 group-hover:scale-[1.02]"
              />
            </button>
          ))}
        </div>
      </div>

      <PhotoLightbox
        photos={photos}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onNavigate={(i) => setLightboxIndex(i)}
        downloadEnabled
        title={meta.name}
      />
    </div>
  );
}

/* ---------- Message states ---------- */

function GalleryMessage({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center px-6 text-center animate-fade-up">
      <div className="flex size-14 items-center justify-center rounded-full bg-white/10">
        <Icon className="size-6 text-white/80" aria-hidden="true" />
      </div>
      <h1 className="mt-5 font-display text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-white/60">{description}</p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center gap-1.5 rounded-md border border-white/20 px-4 py-2 text-sm font-medium text-white/85 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <ArrowLeft className="size-4" /> Go to FrameFlow
      </Link>
    </div>
  );
}
