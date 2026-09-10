"use client";

import Image from "next/image";
import Link from "next/link";
import { Calendar, MapPin, Images, Users } from "lucide-react";

import { cn, formatDate, formatNumber, timeAgo } from "@/lib/utils";
import type { Event } from "@/types";
import { EventStatusBadge } from "@/components/dashboard/status-badge";

export function EventCard({
  event,
  view = "grid",
}: {
  event: Event;
  view?: "grid" | "list";
}) {
  const cover = (
    <div
      className={cn(
        "relative overflow-hidden bg-secondary",
        view === "grid" ? "aspect-[16/9]" : "aspect-[16/9] sm:aspect-auto sm:w-56 sm:shrink-0 sm:self-stretch"
      )}
    >
      <Image
        src={event.coverUrl}
        alt=""
        fill
        sizes={view === "grid" ? "(max-width: 768px) 100vw, 400px" : "224px"}
        className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
      />
    </div>
  );

  return (
    <Link
      href={`/dashboard/events/${event.id}`}
      className={cn(
        "group flex overflow-hidden rounded-xl border bg-card transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring hover:shadow-md",
        view === "list" && "flex-col sm:flex-row"
      )}
    >
      {cover}
      <div className="flex min-w-0 flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-base font-semibold leading-snug">{event.name}</h3>
          <EventStatusBadge status={event.status} />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="size-3.5" aria-hidden="true" />
            {formatDate(event.date)}
          </span>
          <span className="inline-flex items-center gap-1.5 min-w-0">
            <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{event.location}</span>
          </span>
        </div>
        <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Images className="size-3.5" aria-hidden="true" />
            {formatNumber(event.photoCount)} photos
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Users className="size-3.5" aria-hidden="true" />
            {event.teamMemberCount} members
          </span>
        </div>
        <p className="mt-auto pt-3 text-xs text-muted-foreground">
          Last activity {timeAgo(event.lastActivity)}
        </p>
      </div>
    </Link>
  );
}
