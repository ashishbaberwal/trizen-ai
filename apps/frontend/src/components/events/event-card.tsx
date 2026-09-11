"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Calendar, MapPin } from "lucide-react";
import { motion, type Variants } from "motion/react";

import { formatDate, formatNumber } from "@/lib/utils";
import type { Event } from "@/types";
import { EventStatusMark } from "@/components/dashboard/status-badge";

/**
 * An event, presented two ways:
 * - grid: a gallery-wall card — cover photograph first, title set in the
 *   studio serif, hairline-framed like a print.
 * - list: an editorial index row — hairline rules, serif titles, mono
 *   numerals. A table of contents for the studio's shoots.
 *
 * teamMemberCount is deliberately not rendered: the API does not provide it,
 * and a permanent "0 members" reads as broken.
 */
export function EventCard({
  event,
  view = "grid",
  index = 0,
}: {
  event: Event;
  view?: "grid" | "list";
  index?: number;
}) {
  if (view === "list") {
    return (
      <motion.div layout variants={cardVariants} exit={{ opacity: 0, y: -8 }}>
        <Link
          href={`/dashboard/events/${event.id}`}
          className="group grid grid-cols-[1.75rem_1fr_auto] items-baseline gap-x-4 border-b py-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:gap-x-6"
        >
          <span className="font-mono text-xs tabular-nums text-muted-foreground/70">
            {String(index + 1).padStart(2, "0")}
          </span>
          <div className="min-w-0">
            <h3 className="font-display text-xl font-medium leading-snug tracking-tight transition-transform duration-300 ease-out group-hover:translate-x-1.5 sm:text-2xl">
              {event.name}
            </h3>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="size-3.5" aria-hidden="true" />
                {formatDate(event.date)}
              </span>
              {event.location && (
                <span className="inline-flex min-w-0 items-center gap-1.5">
                  <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">{event.location}</span>
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-4 sm:gap-6">
            <span className="font-mono text-xs tabular-nums text-muted-foreground">
              {formatNumber(event.photoCount)} photos
            </span>
            <EventStatusMark status={event.status} className="hidden sm:inline-flex" />
            <ArrowRight
              className="size-4 -translate-x-1 text-muted-foreground opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
              aria-hidden="true"
            />
          </div>
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div layout variants={cardVariants} exit={{ opacity: 0, scale: 0.96 }} className="h-full">
      <Link
        href={`/dashboard/events/${event.id}`}
        className="group flex h-full flex-col overflow-hidden rounded-xl border bg-card shadow-hairline transition-shadow duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring hover:shadow-lift"
      >
        <div className="relative aspect-[3/2] overflow-hidden bg-secondary">
          <Image
            src={event.coverUrl}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
            className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
          />
          <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 text-white backdrop-blur-md">
              <EventStatusMark status={event.status} onImage />
            </span>
          </div>
        </div>
        <div className="flex flex-1 flex-col p-4">
          <h3 className="font-display text-lg font-medium leading-snug">{event.name}</h3>
          <p className="mb-4 mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="size-3.5" aria-hidden="true" />
              {formatDate(event.date)}
            </span>
            {event.location && (
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{event.location}</span>
              </span>
            )}
          </p>
          <div className="mt-auto flex items-center justify-between border-t pt-3">
            <span className="font-mono text-xs tabular-nums text-muted-foreground">
              {formatNumber(event.photoCount)} photos
            </span>
            <ArrowRight
              className="size-4 -translate-x-1 text-muted-foreground opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
              aria-hidden="true"
            />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};
