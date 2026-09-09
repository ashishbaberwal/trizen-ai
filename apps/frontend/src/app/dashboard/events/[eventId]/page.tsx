"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Calendar,
  MapPin,
  Images,
  Upload,
  UserPlus,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";

import { formatDate, formatNumber, timeAgo } from "@/lib/utils";
import { eventService, galleryService, teamService } from "@/lib/services";
import { api } from "@/lib/api/client";
import { useAuth } from "@clerk/nextjs";
import { useCurrentUser } from "@/lib/api/use-current-user";
import type { Event, Gallery, Photo, TeamMember } from "@/types";
import { AppShell } from "@/components/dashboard/app-shell";
import { EventStatusBadge, GalleryStatusBadge } from "@/components/dashboard/status-badge";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UploadModal } from "@/components/photos/upload-modal";
import { AddMemberModal } from "@/components/team/add-member-modal";
import { EventTeamPanel } from "@/components/team/event-team-panel";

export default function EventDetailPage() {
  const params = useParams<{ eventId: string }>();
  const eventId = params.eventId;
  const user = useCurrentUser();
  const { getToken } = useAuth();
  const [loading, setLoading] = React.useState(true);
  const [event, setEvent] = React.useState<Event | null>(null);
  const [members, setMembers] = React.useState<TeamMember[]>([]);
  const [galleries, setGalleries] = React.useState<Gallery[]>([]);
  const [photos, setPhotos] = React.useState<Photo[]>([]);
  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [memberOpen, setMemberOpen] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await getToken();
      // Photos come from the real API; event/team/galleries remain mock-served
      // until their phases wire them up.
      const [event, members, galleries, photosRes] = await Promise.all([
        eventService.get(eventId),
        teamService.listByEvent(eventId),
        galleryService.listByEvent(eventId),
        api
          .listPhotos(token, eventId)
          .then((r) =>
            r.photos.map((p) => ({
              id: p.id,
              eventId: p.event_id,
              url: p.url,
              fullUrl: p.url,
              width: 0,
              height: 0,
              uploaderName: "Team member",
              uploadedAt: p.created_at,
              selected: false,
            })) as Photo[]
          )
          .catch(() => [] as Photo[]),
      ]);
      if (cancelled) return;
      setEvent(event ?? null);
      setMembers(members);
      setGalleries(galleries);
      setPhotos(photosRes);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [eventId, getToken]);

  const selectedCount = photos.filter((p) => p.selected).length;

  if (loading) {
    return (
      <AppShell title="Event" crumbs={[{ label: "Events", href: "/dashboard/events" }, { label: "…" }]}>
        <Skeleton className="h-48 w-full rounded-xl" />
        <div className="mt-6 space-y-3">
          <Skeleton className="h-7 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </AppShell>
    );
  }

  if (!event) {
    return (
      <AppShell title="Event" crumbs={[{ label: "Events", href: "/dashboard/events" }, { label: "Not found" }]}>
        <EmptyState
          icon={Images}
          title="Event not found"
          description="This event may have been deleted, or the link is out of date."
          action={{ label: "Back to events", href: "/dashboard/events" }}
          className="rounded-xl border border-dashed"
        />
      </AppShell>
    );
  }

  const crumbs = [{ label: "Events", href: "/dashboard/events" }, { label: event.name }];

  return (
    <AppShell
      title={event.name}
      crumbs={crumbs}
      actions={
        <Button size="sm" onClick={() => setUploadOpen(true)}>
          <Upload /> <span className="hidden sm:inline">Upload photos</span>
          <span className="sm:hidden">Upload</span>
        </Button>
      }
    >
      <div className="animate-fade-up">
        {/* Banner */}
        <div className="relative h-40 overflow-hidden rounded-xl bg-secondary sm:h-56">
          <Image src={event.coverUrl} alt="" fill sizes="(max-width: 1024px) 100vw, 1100px" className="object-cover" priority />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          <Link
            href="/dashboard/events"
            className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-md bg-white/90 px-2.5 py-1.5 text-xs font-medium text-neutral-900 backdrop-blur hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="size-3.5" /> All events
          </Link>
          <div className="absolute bottom-4 left-4 right-4 text-white">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">{event.name}</h1>
              <EventStatusBadge status={event.status} />
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-sm text-white/85">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="size-3.5" /> {formatDate(event.date)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-3.5" /> {event.location}
              </span>
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => setUploadOpen(true)}>
            <Upload /> Upload photos
          </Button>
          <Button variant="outline" onClick={() => setMemberOpen(true)}>
            <UserPlus /> Manage team
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/dashboard/events/${event.id}/photos?createGallery=1`}>
              <Sparkles /> Create gallery
            </Link>
          </Button>
        </div>

        <Tabs defaultValue="overview" className="mt-6">
          <TabsList className="w-full justify-start overflow-x-auto no-scrollbar sm:w-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="photos">Photos</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="galleries">Galleries</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[
                { label: "Total photos", value: formatNumber(event.photoCount) },
                { label: "Selected for delivery", value: formatNumber(selectedCount) },
                { label: "Team members", value: String(members.length) },
                { label: "Galleries", value: String(galleries.length) },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl border bg-card p-4">
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="mt-1 font-display text-2xl font-semibold tabular-nums">{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <div className="rounded-xl border bg-card">
                <h2 className="border-b px-5 py-3.5 font-display text-sm font-semibold">About</h2>
                <div className="space-y-3 px-5 py-4 text-sm">
                  <p className="text-muted-foreground">{event.description}</p>
                  <p className="text-muted-foreground">
                    Created {formatDate(event.createdAt)} · Last activity {timeAgo(event.lastActivity)}
                  </p>
                </div>
                <h3 className="border-t px-5 py-3 font-display text-sm font-semibold">Recent team</h3>
                <ul className="px-5 pb-4">
                  {members.slice(0, 4).map((m) => (
                    <li key={m.id} className="flex items-center gap-3 py-2">
                      <Avatar className="size-8">
                        <AvatarFallback className="text-[10px]">
                          {m.name.split(" ").map((n) => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{m.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                      </div>
                      {m.role === "admin" && (
                        <span className="text-xs font-medium text-muted-foreground">Admin</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border bg-card">
                <h2 className="border-b px-5 py-3.5 font-display text-sm font-semibold">Latest galleries</h2>
                {galleries.length === 0 ? (
                  <EmptyState
                    icon={Images}
                    title="No galleries yet"
                    description="Select photos and publish your first client gallery."
                    action={{ label: "Create gallery", href: `/dashboard/events/${event.id}/photos?createGallery=1` }}
                    className="py-10"
                  />
                ) : (
                  <ul className="divide-y">
                    {galleries.slice(0, 4).map((g) => (
                      <li key={g.id} className="flex items-center gap-3 px-5 py-3">
                        <div className="relative size-12 shrink-0 overflow-hidden rounded-md bg-secondary">
                          <Image src={g.coverUrl} alt="" fill sizes="48px" className="object-cover" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{g.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {g.photoCount} photos
                            {g.publishedAt ? ` · Published ${formatDate(g.publishedAt)}` : " · Draft"}
                          </p>
                        </div>
                        <GalleryStatusBadge status={g.status} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Photos */}
          <TabsContent value="photos">
            <div className="rounded-xl border border-dashed">
              <EmptyState
                icon={Images}
                title={photos.length > 0 ? `${formatNumber(photos.length)} photos in this event` : "No photos yet"}
                description={
                  photos.length > 0
                    ? "Open the photo workspace to review, select, and curate."
                    : "Upload the first batch to get started."
                }
                action={{ label: "Upload photos", onClick: () => setUploadOpen(true) }}
              />
              {photos.length > 0 && (
                <div className="flex justify-center pb-8">
                  <Button asChild>
                    <Link href={`/dashboard/events/${event.id}/photos`}>
                      Open photo workspace <CheckCircle2 className="size-4" />
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Team */}
          <TabsContent value="team">
            <EventTeamPanel eventId={event.id} isAdmin={user?.role === "admin"} />
          </TabsContent>

          {/* Galleries */}
          <TabsContent value="galleries">
            {galleries.length === 0 ? (
              <EmptyState
                icon={Images}
                title="No galleries yet"
                description="Select photos and publish your first client gallery."
                action={{ label: "Create gallery", href: `/dashboard/events/${event.id}/photos?createGallery=1` }}
                className="rounded-xl border border-dashed"
              />
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2">
                {galleries.map((g) => (
                  <li key={g.id} className="overflow-hidden rounded-xl border bg-card">
                    <div className="relative aspect-[16/9] bg-secondary">
                      <Image src={g.coverUrl} alt="" fill sizes="(max-width: 640px) 100vw, 500px" className="object-cover" />
                    </div>
                    <div className="flex items-center justify-between p-4">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{g.name}</p>
                        <p className="text-xs text-muted-foreground">{g.photoCount} photos</p>
                      </div>
                      <GalleryStatusBadge status={g.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <UploadModal
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        eventId={eventId}
        onUploaded={() => {
          // Refresh the photo count in the overview after an upload.
          window.location.reload();
        }}
      />
      <AddMemberModal open={memberOpen} onOpenChange={setMemberOpen} eventId={event.id} />
    </AppShell>
  );
}
