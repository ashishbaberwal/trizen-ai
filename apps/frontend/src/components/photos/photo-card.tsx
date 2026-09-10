"use client";

import * as React from "react";
import Image from "next/image";
import { User } from "lucide-react";

import { cn, timeAgo } from "@/lib/utils";
import type { Photo } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";

interface PhotoCardProps {
  photo: Photo;
  selected: boolean;
  /** Omitted for team members — selection is an admin-only workflow. */
  onToggle?: (photo: Photo, shiftKey: boolean) => void;
}

export function PhotoCard({ photo, selected, onToggle }: PhotoCardProps) {
  const [loaded, setLoaded] = React.useState(false);
  const selectable = !!onToggle;

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-lg bg-secondary transition-shadow",
        selected ? "ring-2 ring-ring ring-offset-2 ring-offset-background" : "hover:shadow-md"
      )}
    >
      {selectable ? (
        <button
          type="button"
          onClick={(e) => onToggle?.(photo, e.shiftKey)}
          className="block w-full cursor-pointer focus-visible:outline-none"
          aria-pressed={selected}
          aria-label={`${selected ? "Deselect" : "Select"} photo, ${timeAgo(photo.uploadedAt)}`}
        >
          <PhotoImage photo={photo} loaded={loaded} onLoaded={() => setLoaded(true)} />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => window.open(photo.fullUrl || photo.url, "_blank", "noopener")}
          className="block w-full cursor-zoom-in focus-visible:outline-none"
          aria-label={`View photo, ${timeAgo(photo.uploadedAt)}`}
        >
          <PhotoImage photo={photo} loaded={loaded} onLoaded={() => setLoaded(true)} />
        </button>
      )}

      {/* Checkbox (selection workflow only) */}
      {selectable && (
        <div
          className={cn(
            "absolute left-2 top-2 transition-opacity",
            selected ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
          )}
        >
          <span
            className={cn(
              "flex size-5 items-center justify-center rounded-full border shadow-sm transition-colors",
              selected ? "border-ring bg-ring text-white" : "border-white/80 bg-black/35 text-transparent backdrop-blur-sm"
            )}
            aria-hidden="true"
          >
            <svg viewBox="0 0 12 12" className="size-3" fill="none">
              <path d="M2.5 6.5L5 9l4.5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
      )}

      {/* Hover overlay */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent p-2.5 pt-8 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
        <p className="flex items-center gap-1 text-[11px] font-medium text-white">
          <User className="size-3" aria-hidden="true" />
          {photo.uploaderName}
          <span className="text-white/60">·</span>
          <span className="text-white/80">
            {photo.uploaderRole === "admin" ? "Admin" : "Team member"}
          </span>
        </p>
        <p className="text-[10px] text-white/75">{timeAgo(photo.uploadedAt)}</p>
      </div>
    </div>
  );
}

/**
 * Photos render at unknown dimensions from the API; use a fixed aspect box
 * with object-cover and let next/image optimize the Appwrite URL.
 */
function PhotoImage({
  photo,
  loaded,
  onLoaded,
}: {
  photo: Photo;
  loaded: boolean;
  onLoaded: () => void;
}) {
  return (
    <div className="relative aspect-[4/3] w-full">
      {!loaded && <Skeleton className="absolute inset-0 rounded-none" />}
      <Image
        src={photo.url}
        alt={`Photo uploaded ${timeAgo(photo.uploadedAt)}`}
        fill
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 260px"
        className={cn(
          "object-cover transition-opacity duration-300 group-hover:brightness-[0.92]",
          loaded ? "opacity-100" : "opacity-0"
        )}
        onLoad={onLoaded}
      />
    </div>
  );
}
