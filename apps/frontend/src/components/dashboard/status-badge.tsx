import { Badge } from "@/components/ui/badge";
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
