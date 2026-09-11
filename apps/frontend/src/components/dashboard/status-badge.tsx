import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { EventStatus, GalleryStatus } from "@/types";

const eventStatusMap: Record<EventStatus, { label: string; variant: "success" | "warning" | "secondary" }> = {
  active: { label: "Active", variant: "success" },
  completed: { label: "Completed", variant: "secondary" },
  draft: { label: "Draft", variant: "warning" },
};

const galleryStatusMap: Record<GalleryStatus, { label: string; variant: "success" | "warning" | "destructive" | "secondary" }> = {
  published: { label: "Published", variant: "success" },
  draft: { label: "Draft", variant: "warning" },
  expired: { label: "Expired", variant: "destructive" },
};

export function EventStatusBadge({ status }: { status: EventStatus }) {
  const { label, variant } = eventStatusMap[status];
  return <Badge variant={variant}>{label}</Badge>;
}

export function GalleryStatusBadge({ status }: { status: GalleryStatus }) {
  const { label, variant } = galleryStatusMap[status];
  return <Badge variant={variant}>{label}</Badge>;
}

const markDot: Record<EventStatus, string> = {
  active: "bg-success",
  completed: "bg-muted-foreground/50",
  draft: "bg-warning",
};

/**
 * Editorial status mark: a color dot beside a mono overline label — the
 * print-margin annotation version of a status badge. `onImage` renders the
 * light variant for use over photographs.
 */
export function EventStatusMark({
  status,
  onImage = false,
  className,
}: {
  status: EventStatus;
  onImage?: boolean;
  className?: string;
}) {
  const { label } = eventStatusMap[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5",
        onImage ? "text-white/90" : "text-muted-foreground",
        className
      )}
    >
      <span className={cn("size-1.5 rounded-full", markDot[status], onImage && "brightness-125")} />
      <span className="overline-label">{label}</span>
    </span>
  );
}
