"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, ImagePlus } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { eventService } from "@/lib/services";
import type { Event } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const createEventSchema = z.object({
  name: z.string().min(2, "Event name must be at least 2 characters"),
  description: z.string().max(280, "Keep the description under 280 characters").optional().or(z.literal("")),
  date: z.string().min(1, "Choose an event date"),
  location: z.string().min(2, "Add a location"),
});

type CreateEventValues = z.infer<typeof createEventSchema>;

const COVER_CHOICES = [
  "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1600&h=900&q=80",
  "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1600&h=900&q=80",
  "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1600&h=900&q=80",
  "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=1600&h=900&q=80",
];

export function CreateEventModal({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the newly created event so list views can update without a reload. */
  onCreated?: (event: Event) => void;
}) {
  const router = useRouter();
  const [cover, setCover] = React.useState(COVER_CHOICES[0]);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateEventValues>({
    resolver: zodResolver(createEventSchema),
    defaultValues: { name: "", description: "", date: "", location: "" },
  });

  async function onSubmit(values: CreateEventValues) {
    const event = await eventService.create({ ...values, coverUrl: cover });
    onCreated?.(event);
    toast.success("Event created", { description: `${values.name} is ready for uploads.` });
    reset();
    setCover(COVER_CHOICES[0]);
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={open => { if (!open) reset(); onOpenChange(open); }}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Create event</DialogTitle>
          <DialogDescription>
            Set up a project for your team to upload and organize photos.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
          <div className="grid gap-1.5">
            <Label htmlFor="event-name">Event name</Label>
            <Input
              id="event-name"
              placeholder="e.g. Sharma–Iyer Wedding"
              aria-invalid={!!errors.name}
              {...register("name")}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="event-description">Description</Label>
            <Textarea
              id="event-description"
              placeholder="What should the team know about this event?"
              rows={2}
              aria-invalid={!!errors.description}
              {...register("description")}
            />
            {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="event-date">Date</Label>
              <Input id="event-date" type="date" aria-invalid={!!errors.date} {...register("date")} />
              {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="event-location">Location</Label>
              <Input
                id="event-location"
                placeholder="Venue, city"
                aria-invalid={!!errors.location}
                {...register("location")}
              />
              {errors.location && <p className="text-xs text-destructive">{errors.location.message}</p>}
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Cover image</Label>
            <div className="grid grid-cols-4 gap-2">
              {COVER_CHOICES.map((url) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => setCover(url)}
                  aria-pressed={cover === url}
                  aria-label={`Use cover option ${COVER_CHOICES.indexOf(url) + 1}`}
                  className={cn(
                    "relative aspect-[16/9] overflow-hidden rounded-md border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer",
                    cover === url ? "border-ring" : "border-transparent hover:border-border"
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="size-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <ImagePlus className="size-3.5" aria-hidden="true" />
              Custom covers can be uploaded once storage is connected.
            </p>
          </div>

          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin" />}
              Create event
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
