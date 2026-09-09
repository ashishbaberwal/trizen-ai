"use client";

import * as React from "react";
import {
  AlertCircle,
  CheckCircle2,
  CloudUpload,
  Loader2,
  RotateCw,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { cn, formatFileSize } from "@/lib/utils";
import { useAuth } from "@clerk/nextjs";
import { uploadPhotos } from "@/lib/api/client";
import type { UploadItem } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

const MAX_FILE_BYTES = 25 * 1024 * 1024; // must match the backend limit

interface UploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  /** Called with the number of newly uploaded photos so the grid can refresh. */
  onUploaded?: (count: number) => void;
}

function makeItems(files: File[]): UploadItem[] {
  return files.map((file, i) => ({
    id: `upload-${i}-${file.name}-${file.size}`,
    file,
    previewUrl: URL.createObjectURL(file),
    progress: 0,
    status: "queued",
  }));
}

/**
 * Real upload flow: files go to the backend multipart endpoint, which stores
 * binaries in Appwrite and metadata in PostgreSQL. Progress comes from the
 * actual XHR upload event — nothing is simulated.
 */
export function UploadModal({ open, onOpenChange, eventId, onUploaded }: UploadModalProps) {
  const { getToken } = useAuth();
  const [items, setItems] = React.useState<UploadItem[]>([]);
  const [dragOver, setDragOver] = React.useState(false);
  const [phase, setPhase] = React.useState<"idle" | "uploading" | "done">("idle");
  const [serverError, setServerError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const addFiles = (fileList: FileList | null) => {
    if (!fileList?.length) return;
    const rejected: string[] = [];
    const images: File[] = [];
    for (const f of Array.from(fileList)) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) {
        rejected.push(f.name);
      } else if (f.size > MAX_FILE_BYTES) {
        rejected.push(f.name);
      } else {
        images.push(f);
      }
    }
    if (rejected.length > 0) {
      toast.error(
        `${rejected.length} file${rejected.length === 1 ? "" : "s"} skipped — JPEG/PNG/WebP up to 25 MB only.`,
        { description: rejected.slice(0, 3).join(", ") + (rejected.length > 3 ? "…" : "") }
      );
    }
    if (images.length > 0) setItems((prev) => [...prev, ...makeItems(images)]);
  };

  React.useEffect(() => {
    if (open) return;
    // Defer cleanup so state updates don't fire synchronously in the effect.
    const t = setTimeout(() => {
      setItems((prev) => {
        prev.forEach((it) => URL.revokeObjectURL(it.previewUrl));
        return [];
      });
      setPhase("idle");
      setServerError(null);
    }, 0);
    return () => clearTimeout(t);
  }, [open]);

  const uploading = items.some((i) => i.status === "uploading" || i.status === "queued");
  const uploadedCount = items.filter((i) => i.status === "uploaded").length;
  const failedItems = items.filter((i) => i.status === "failed");

  function markFailed(ids: string[], error: string) {
    setItems((prev) =>
      prev.map((it) =>
        ids.includes(it.id) ? { ...it, status: "failed", error } : it
      )
    );
  }

  async function startUpload() {
    setServerError(null);
    const pending = items.filter((i) => i.status === "queued" || i.status === "failed");
    if (pending.length === 0) return;
    setPhase("uploading");
    setItems((prev) =>
      prev.map((it) =>
        pending.some((p) => p.id === it.id) ? { ...it, status: "uploading", progress: 0 } : it
      )
    );
    try {
      const token = await getToken();
      // Backend currently accepts the whole batch; track aggregate progress.
      await uploadPhotos(token, eventId, pending.map((p) => p.file), (percent) => {
        setItems((prev) =>
          prev.map((it) =>
            pending.some((p) => p.id === it.id) ? { ...it, progress: percent } : it
          )
        );
      });
      setItems((prev) =>
        prev.map((it) =>
          pending.some((p) => p.id === it.id)
            ? { ...it, progress: 100, status: "uploaded" as const }
            : it
        )
      );
      setPhase("done");
      onUploaded?.(pending.length);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to connect to the server. Please try again.";
      setServerError(message);
      markFailed(
        pending.map((p) => p.id),
        message
      );
      setPhase("idle");
    }
  }

  function retry() {
    setItems((prev) =>
      prev.map((it) => (it.status === "failed" ? { ...it, status: "queued", progress: 0, error: undefined } : it))
    );
    void startUpload();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload photos</DialogTitle>
          <DialogDescription>
            Drop photos here or browse. They&apos;re stored securely and visible to this event&apos;s team.
          </DialogDescription>
        </DialogHeader>

        {/* Dropzone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            addFiles(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            dragOver ? "border-ring bg-accent" : "border-border hover:border-muted-foreground/40 hover:bg-secondary/40"
          )}
          role="button"
          tabIndex={0}
          aria-label="Upload photos: drag and drop or press Enter to browse"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
        >
          <CloudUpload className="size-8 text-muted-foreground" aria-hidden="true" />
          <p className="mt-3 text-sm font-medium">Drag photos here or browse</p>
          <p className="mt-1 text-xs text-muted-foreground">JPEG, PNG or WebP · up to 25 MB each</p>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="sr-only"
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>

        {/* Queue */}
        {items.length > 0 && (
          <div className="max-h-64 space-y-2 overflow-y-auto pr-1" aria-live="polite">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 rounded-lg border p-2.5">
                <div className="relative size-11 shrink-0 overflow-hidden rounded-md bg-secondary">
                  {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview is not optimizable by next/image */}
                  <img src={item.previewUrl} alt="" className="size-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">{item.file.name}</p>
                    <span className="shrink-0 text-xs text-muted-foreground">{formatFileSize(item.file.size)}</span>
                  </div>
                  {item.status === "failed" ? (
                    <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
                      <AlertCircle className="size-3" /> {item.error ?? "Upload failed"}
                    </p>
                  ) : item.status === "uploaded" ? (
                    <p className="mt-1 flex items-center gap-1 text-xs text-success">
                      <CheckCircle2 className="size-3" /> Uploaded
                    </p>
                  ) : (
                    <div className="mt-1.5 flex items-center gap-2">
                      <Progress value={item.progress} className="h-1" />
                      <span className="w-9 text-right text-xs tabular-nums text-muted-foreground">{item.progress}%</span>
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {item.status === "uploading" && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
                  {item.status === "queued" && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remove ${item.file.name}`}
                      onClick={() => {
                        URL.revokeObjectURL(item.previewUrl);
                        setItems((prev) => prev.filter((it) => it.id !== item.id));
                      }}
                    >
                      <X />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {serverError && (
          <p className="flex items-center gap-1.5 text-xs text-destructive" role="alert">
            <AlertCircle className="size-3.5" /> {serverError}
          </p>
        )}

        <DialogFooter className="items-center">
          {failedItems.length > 0 && phase !== "uploading" && (
            <Button variant="ghost" size="sm" className="mr-auto" onClick={retry}>
              <RotateCw /> Retry {failedItems.length} failed
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {phase === "done" ? "Close" : "Cancel"}
          </Button>
          <Button
            disabled={uploading || items.length === 0 || phase === "uploading"}
            onClick={startUpload}
          >
            {uploading ? (
              <>
                <Loader2 className="animate-spin" /> Uploading…
              </>
            ) : phase === "done" ? (
              <>
                <CheckCircle2 /> Uploaded {uploadedCount}
              </>
            ) : items.length > 0 ? (
              `Upload ${items.length} photo${items.length === 1 ? "" : "s"}`
            ) : (
              "Upload photos"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
