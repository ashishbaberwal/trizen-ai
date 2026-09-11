"use client";

import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  X,
} from "lucide-react";

import { cn, timeAgo } from "@/lib/utils";
import type { Photo } from "@/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Trigger a real download. Appwrite's /download endpoint serves
 * Content-Disposition: attachment with the original filename, so the browser
 * saves the file even though the URL is cross-origin (the `download`
 * attribute alone is a same-origin hint and is ignored there).
 */
function downloadPhoto(photo: Photo) {
  const a = document.createElement("a");
  a.href = photo.downloadUrl ?? photo.fullUrl;
  a.rel = "noopener";
  if (photo.filename) a.download = photo.filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

interface PhotoLightboxProps {
  photos: Photo[];
  index: number | null;
  onClose: () => void;
  onNavigate: (index: number) => void;
  downloadEnabled?: boolean;
  title?: string;
}

export function PhotoLightbox({
  photos,
  index,
  onClose,
  onNavigate,
  downloadEnabled = false,
  title,
}: PhotoLightboxProps) {
  const open = index !== null;
  const photo = open ? photos[index] : null;
  const [loaded, setLoaded] = React.useState(false);

  const goPrev = React.useCallback(() => {
    if (index === null) return;
    onNavigate((index - 1 + photos.length) % photos.length);
  }, [index, photos.length, onNavigate]);

  const goNext = React.useCallback(() => {
    if (index === null) return;
    onNavigate((index + 1) % photos.length);
  }, [index, photos.length, onNavigate]);

  React.useEffect(() => {
    // Reset the image fade when moving between photos.
    const id = requestAnimationFrame(() => setLoaded(false));
    return () => cancelAnimationFrame(id);
  }, [index]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, goPrev, goNext, onClose]);

  // Touch swipe
  const touchStartX = React.useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (dx > 48) goPrev();
    else if (dx < -48) goNext();
    touchStartX.current = null;
  };

  if (!open || !photo) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title ? `Photo viewer — ${title}` : "Photo viewer"}
      className="fixed inset-0 z-50 flex flex-col bg-black/95 animate-fade-in"
      onKeyDown={() => {}}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <p className="text-sm tabular-nums">
          {index + 1} <span className="text-white/60">/ {photos.length}</span>
          {title ? <span className="ml-3 hidden text-white/80 sm:inline">{title}</span> : null}
        </p>
        <div className="flex items-center gap-1.5">
          {downloadEnabled && (
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/15 hover:text-white"
              aria-label="Download photo"
              onClick={() => downloadPhoto(photo)}
            >
              <Download />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/15 hover:text-white"
            aria-label="Close viewer"
            onClick={onClose}
          >
            <X />
          </Button>
        </div>
      </div>

      {/* Image area */}
      <div
        className="relative flex flex-1 items-center justify-center overflow-hidden px-4 pb-4"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {photos.length > 1 && (
          <>
            <button
              onClick={goPrev}
              aria-label="Previous photo"
              className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white backdrop-blur transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white cursor-pointer"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              onClick={goNext}
              aria-label="Next photo"
              className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white backdrop-blur transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white cursor-pointer"
            >
              <ChevronRight className="size-5" />
            </button>
          </>
        )}
        {!loaded && <Skeleton className="absolute h-64 w-64 max-w-full rounded-lg bg-white/10" />}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.fullUrl}
          alt={title ? `${title} — photo ${index + 1} of ${photos.length}` : `Photo ${index + 1} of ${photos.length}`}
          className={cn(
            "max-h-full max-w-full rounded-md object-contain shadow-2xl transition-opacity duration-200",
            loaded ? "opacity-100" : "opacity-0"
          )}
          onLoad={() => setLoaded(true)}
          draggable={false}
        />
      </div>

      {photo.uploaderName && (
        <p className="pb-3 text-center text-xs text-white/60">
          Uploaded by {photo.uploaderName} (
          {photo.uploaderRole === "admin" ? "Admin" : "Team member"}) ·{" "}
          {timeAgo(photo.uploadedAt)}
        </p>
      )}
    </div>
  );
}
