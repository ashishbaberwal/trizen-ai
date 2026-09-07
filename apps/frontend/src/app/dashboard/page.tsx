"use client";

import * as React from "react";
import Link from "next/link";
import {
  FolderClosed,
  Images,
  Plus,
  UserRound,
  ImageIcon,
  Upload,
  UserPlus,
  Sparkles,
  ClipboardCheck,
} from "lucide-react";

import { formatNumber, timeAgo } from "@/lib/utils";
import { uploadActivity } from "@/lib/mock-data";
import { dashboardService, eventService } from "@/lib/services";
import type { ActivityItem, Event } from "@/types";
import { AppShell } from "@/components/dashboard/app-shell";
import { StatCard } from "@/components/dashboard/stat-card";
import { UploadActivityChart } from "@/components/dashboard/upload-activity-chart";
import { EventCard } from "@/components/events/event-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const activityIcons = {
  upload: Upload,
  publish: Sparkles,
  join: UserPlus,
  create: FolderClosed,
  select: ClipboardCheck,
} as const;

export default function DashboardPage() {
  const [loading, setLoading] = React.useState(true);
  const [stats, setStats] = React.useState<Awaited<ReturnType<typeof dashboardService.getStats>> | null>(null);
  const [events, setEvents] = React.useState<Event[]>([]);
  const [activity, setActivity] = React.useState<ActivityItem[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    Promise.all([
      dashboardService.getStats(),
      eventService.list(),
      dashboardService.getRecentActivity(),
    ]).then(([stats, events, activity]) => {
      if (cancelled) return;
      setStats(stats);
      setEvents(events);
      setActivity(activity);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const today = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date());

  return (
    <AppShell
      title="Overview"
      crumbs={[{ label: "Overview" }]}
      actions={
        <Button size="sm" asChild className="hidden md:inline-flex">
          <Link href="/dashboard/events">
            <Plus /> New event
          </Link>
        </Button>
      }
    >
      <div className="animate-fade-up">
        <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
          Good morning, Alex
        </h1>
        <p className="mt-1 text-muted-foreground">
          Here&apos;s what&apos;s happening across your events this {today.toLowerCase()}.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Active events"
            value={stats ? stats.activeEvents : ""}
            loading={loading}
            icon={FolderClosed}
            hint="2 closing this month"
          />
          <StatCard
            label="Total photos"
            value={stats ? formatNumber(stats.totalPhotos) : ""}
            loading={loading}
            icon={ImageIcon}
            hint="+1,128 this week"
          />
          <StatCard
            label="Published galleries"
            value={stats ? stats.publishedGalleries : ""}
            loading={loading}
            icon={Images}
            hint="3 awaiting review"
          />
          <StatCard
            label="Team members"
            value={stats ? stats.teamMembers : ""}
            loading={loading}
            icon={UserRound}
            hint="Across 5 events"
          />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-5">
          <section
            aria-labelledby="upload-activity-heading"
            className="rounded-xl border bg-card p-5 lg:col-span-3"
          >
            <div className="flex items-center justify-between">
              <h2 id="upload-activity-heading" className="font-display text-base font-semibold">
                Photos uploaded
              </h2>
              <span className="text-xs text-muted-foreground">Last 7 days</span>
            </div>
            {loading ? (
              <Skeleton className="mt-4 h-56 w-full" />
            ) : (
              <UploadActivityChart data={uploadActivity} />
            )}
          </section>

          <section
            aria-labelledby="recent-activity-heading"
            className="rounded-xl border bg-card p-5 lg:col-span-2"
          >
            <h2 id="recent-activity-heading" className="font-display text-base font-semibold">
              Recent activity
            </h2>
            {loading ? (
              <div className="mt-4 space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Skeleton className="size-8 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-3/4" />
                      <Skeleton className="h-3 w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <ul className="mt-4 space-y-1">
                {activity.map((item) => {
                  const Icon = activityIcons[item.type] ?? Upload;
                  return (
                    <li key={item.id} className="flex items-start gap-3 rounded-lg p-2 hover:bg-secondary/60">
                      <Avatar className="size-8">
                        <AvatarFallback className="text-[10px]">
                          {item.actorName.split(" ").map((n) => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm leading-snug">
                          <span className="font-medium">{item.actorName}</span>{" "}
                          <span className="text-muted-foreground">
                            {item.action} <span className="font-medium text-foreground">{item.target}</span>
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground">{timeAgo(item.timestamp)}</p>
                      </div>
                      <Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        <section aria-labelledby="recent-events-heading" className="mt-6">
          <div className="flex items-center justify-between">
            <h2 id="recent-events-heading" className="font-display text-base font-semibold">
              Recent events
            </h2>
            <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
              <Link href="/dashboard/events">View all</Link>
            </Button>
          </div>
          {loading ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="overflow-hidden rounded-xl border">
                  <Skeleton className="aspect-[16/9] rounded-none" />
                  <div className="space-y-2 p-4">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {events.slice(0, 3).map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
