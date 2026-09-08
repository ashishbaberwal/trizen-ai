"use client";

import * as React from "react";
import { LayoutGrid, List, Plus, Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { eventService } from "@/lib/services";
import { useCurrentUserState } from "@/lib/api/use-current-user";
import type { Event, EventStatus } from "@/types";
import { AppShell } from "@/components/dashboard/app-shell";
import { EventCard } from "@/components/events/event-card";
import { CreateEventModal } from "@/components/events/create-event-modal";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const STATUS_FILTERS: { value: EventStatus | "all"; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "draft", label: "Draft" },
];

export default function EventsPage() {
  const { user } = useCurrentUserState();
  const isAdmin = user?.role === "admin";
  const [loading, setLoading] = React.useState(true);
  const [events, setEvents] = React.useState<Event[]>([]);
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState<EventStatus | "all">("all");
  const [view, setView] = React.useState<"grid" | "list">("grid");
  const [createOpen, setCreateOpen] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    eventService.list().then((data) => {
      if (!cancelled) {
        setEvents(data);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = events.filter((event) => {
    const matchesQuery =
      event.name.toLowerCase().includes(query.toLowerCase()) ||
      event.location.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = status === "all" || event.status === status;
    return matchesQuery && matchesStatus;
  });

  return (
    <AppShell
      title="Events"
      crumbs={[{ label: "Events" }]}
      actions={
        isAdmin ? (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus /> <span className="hidden sm:inline">Create event</span>
            <span className="sm:hidden">Create</span>
          </Button>
        ) : undefined
      }
    >
      <div className="animate-fade-up">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          {isAdmin ? "Events" : "My Events"}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {isAdmin ? "Manage your photography projects." : "Events you've been assigned to."}
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or location"
              className="pl-8"
              aria-label="Search events"
            />
          </div>
          <div className="flex items-center gap-2 sm:ml-auto">
            <Select value={status} onValueChange={(v) => setStatus(v as EventStatus | "all")}>
              <SelectTrigger className="w-[150px]" aria-label="Filter by status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTERS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Change layout">
                  {view === "grid" ? <LayoutGrid /> : <List />}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuRadioGroup
                  value={view}
                  onValueChange={(v: string) => setView(v as "grid" | "list")}
                >
                  <DropdownMenuRadioItem value="grid">Grid view</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="list">List view</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {loading ? (
          <div className={cn("mt-6 grid gap-4", view === "grid" ? "sm:grid-cols-2 xl:grid-cols-3" : "grid-cols-1")}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-xl border">
                <Skeleton className="aspect-[16/9] rounded-none" />
                <div className="space-y-2 p-4">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Search}
            title={query || status !== "all" ? "No events match your filters" : "No events yet"}
            description={
              query || status !== "all"
                ? "Try a different search term or clear the status filter."
                : isAdmin
                  ? "Create your first event and invite your team to start uploading."
                  : "You're not assigned to any events yet. Your admin will assign you soon."
            }
            action={
              isAdmin ? { label: "Create event", onClick: () => setCreateOpen(true) } : undefined
            }
            className="rounded-xl border border-dashed"
          />
        ) : (
          <div
            className={cn(
              "mt-6 grid gap-4",
              view === "grid" ? "sm:grid-cols-2 xl:grid-cols-3" : "grid-cols-1 max-w-3xl"
            )}
          >
            {filtered.map((event) => (
              <EventCard key={event.id} event={event} view={view} />
            ))}
          </div>
        )}
      </div>

      <CreateEventModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(event) => setEvents((prev) => [event, ...prev])}
      />
    </AppShell>
  );
}
