"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  Download,
  FileQuestion,
  Images,
  Loader2,
  LockKeyhole,
  Share2,
} from "lucide-react";
import { toast } from "sonner";

import { formatDate } from "@/lib/utils";
import { galleryService } from "@/lib/services";
import type { Gallery, Photo } from "@/types";
import { PinInput } from "@/components/gallery/pin-input";
import { PhotoLightbox } from "@/components/photos/photo-lightbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

type Gate =
  | { state: "loading" }
  | { state: "pin"; gallery: Gallery }
  | { state: "viewing"; gallery: Gallery; photos: Photo[] }
  | { state: "not-found" }
  | { state: "unpublished"; gallery: Gallery }
  | { state: "expired"; gallery: Gallery }
  | { state: "empty"; gallery: Gallery };

export default function CustomerGalleryPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? null;
  const [gate, setGate] = React.useState<Gate>({ state: "loading" });
  const [pin, setPin] = React.useState("");
  const [verifying, setVerifying] = React.useState(false);
  const [pinError, setPinError] = React.useState(false);
  const [shakeKey, setShakeKey] = React.useState(0);
  const [lightboxIndex, setLightboxIndex] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    galleryService.getBySlug(slug).then((gallery) => {
      if (cancelled) return;
      if (!gallery) {
        setGate({ state: "not-found" });
        return;
      }
      if (gallery.status === "draft") {
        setGate({ state: "unpublished", gallery });
        return;
      }
      if (gallery.status === "expired") {
        setGate({ state: "expired", gallery });
        return;
      }
      setGate({ state: "pin", gallery });
    });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  async function verifyPin(code: string) {
    if (gate.state !== "pin" || code.length !== 6) return;
    setVerifying(true);
    const result = await galleryService.verifyPin(gate.gallery.slug, code);
    setVerifying(false);
    if (result === "ok") {
      const photos = await galleryService.getPhotos(gate.gallery.id);
      if (photos.length === 0) {
        setGate({ state: "empty", gallery: gate.gallery });
      } else {
        setGate({ state: "viewing", gallery: gate.gallery, photos });
      }
    } else {
      setPinError(true);
      setShakeKey((k) => k + 1);
      setPin("");
      const t = setTimeout(() => setPinError(false), 1800);
      void t;
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
          gallery={gate.gallery}
          pin={pin}
          onPinChange={setPin}
          onComplete={verifyPin}
          verifying={verifying}
          error={pinError}
          shakeKey={shakeKey}
        />
      )}

      {gate.state === "viewing" && (
        <GalleryView
          gallery={gate.gallery}
          photos={gate.photos}
          lightboxIndex={lightboxIndex}
          setLightboxIndex={setLightboxIndex}
        />
      )}

      {gate.state === "not-found" && (
        <GalleryMessage
          icon={FileQuestion}
          title="Gallery not found"
          description="This link doesn't match any gallery. Check the link with your photographer, or head back to the FrameFlow site."
        />
      )}

      {gate.state === "unpublished" && (
        <GalleryMessage
          icon={Clock}
          title="This gallery isn't available yet"
          description={`“${gate.gallery.name}” is still being prepared. Your photographer will share it the moment it's ready.`}
        />
      )}

      {gate.state === "expired" && (
        <GalleryMessage
          icon={Clock}
          title="This gallery has expired"
          description={`“${gate.gallery.name}” was available until ${formatDate(gate.gallery.expiresAt ?? "")}. Contact your photographer if you still need access.`}
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
  gallery,
  pin,
  onPinChange,
  onComplete,
  verifying,
  error,
  shakeKey,
}: {
  gallery: Gallery;
  pin: string;
  onPinChange: (pin: string) => void;
  onComplete: (pin: string) => void;
  verifying: boolean;
  error: boolean;
  shakeKey: number;
}) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6">
      <div className="absolute inset-0" aria-hidden="true">
        <Image
          src={gallery.coverUrl}
          alt=""
          fill
          sizes="100vw"
          className="scale-110 object-cover blur-2xl brightness-[0.4]"
          priority
        />
      </div>

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center text-center animate-fade-up">
        <p className="font-display text-lg font-semibold tracking-tight">FrameFlow</p>
        <span className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur">
          <LockKeyhole className="size-3" aria-hidden="true" /> Private gallery
        </span>
        <h1 className="mt-6 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {gallery.eventName}
        </h1>
        <p className="mt-2 text-sm text-white/70">
          Enter the PIN provided by your photographer.
        </p>

        <div className="mt-8">
          <PinInput
            value={pin}
            onValueChange={onPinChange}
            onComplete={verifyAndReset}
            error={error}
            disabled={verifying}
            errorShakeKey={shakeKey}
          />
        </div>

        <p aria-live="assertive" className="mt-4 min-h-5 text-sm">
          {error ? (
            <span className="text-red-300">Incorrect PIN. Please try again.</span>
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

  async function verifyAndReset(code: string) {
    onComplete(code);
  }
}

/* ---------- Gallery view ---------- */

function GalleryView({
  gallery,
  photos,
  lightboxIndex,
  setLightboxIndex,
}: {
  gallery: Gallery;
  photos: Photo[];
  lightboxIndex: number | null;
  setLightboxIndex: (i: number | null) => void;
}) {
  function share() {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: gallery.name, url }).catch(() => {});
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
              {gallery.name}
            </p>
            <p className="text-xs text-white/60">
              {gallery.eventName} · {photos.length} photos
              {gallery.expiresAt ? ` · Available until ${formatDate(gallery.expiresAt)}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {gallery.downloadEnabled && (
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/10 hover:text-white"
                onClick={() => toast.success("Download started", { description: "Preparing your photos as a ZIP." })}
              >
                <Download /> <span className="hidden sm:inline">Download</span>
              </Button>
            )}
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
        {gallery.description}
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
                alt={`${gallery.eventName} — photo ${index + 1} of ${photos.length}`}
                width={photo.width}
                height={photo.height}
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
        downloadEnabled={gallery.downloadEnabled}
        title={gallery.name}
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
