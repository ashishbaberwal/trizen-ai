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

interface UploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function makeItems(files: File[]): UploadItem[] {
  return files.map((file, i) => ({
    id: `upload-${i}-${file.name}`,
    file,
    previewUrl: URL.createObjectURL(file),
    progress: 0,
    status: "queued",
  }));
}

export function UploadModal({ open, onOpenChange }: UploadModalProps) {
  const [items, setItems] = React.useState<UploadItem[]>([]);
  const [dragOver, setDragOver] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const startedRef = React.useRef(false);

  const addFiles = (fileList: FileList | null) => {
    if (!fileList?.length) return;
    const images = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    if (images.length === 0) {
      toast.error("Only image files can be uploaded");
      return;
    }
    setItems((prev) => [...prev, ...makeItems(images)]);
  };

  // Drive mock upload progress once items exist.
  React.useEffect(() => {
    if (!open || items.length === 0 || startedRef.current) return;
    startedRef.current = true;
    const timers: ReturnType<typeof setTimeout>[] = [];

    items.forEach((item, index) => {
      const willFail = (index + 1) % 5 === 0;
      const duration = 900 + Math.random() * 1600;
      const start = Date.now();
      const tick = () => {
        setItems((prev) =>
          prev.map((it) => {
            if (it.id !== item.id || it.status === "uploaded" || it.status === "failed") return it;
            const ratio = Math.min((Date.now() - start) / duration, 1);
            const progress = Math.round(ratio * 100);
            if (ratio >= 1) {
              return { ...it, progress: 100, status: willFail ? "failed" : "uploaded", error: willFail ? "Upload interrupted" : undefined };
            }
            return { ...it, progress, status: "uploading" };
          })
        );
        const current = Date.now() - start;
        if (current < duration) timers.push(setTimeout(tick, 160));
      };
      timers.push(setTimeout(tick, 250 + index * 60));
    });

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [open, items]);

  React.useEffect(() => {
    if (!open) {
      startedRef.current = false;
      // Revoke object previews and clear the queue when the modal closes.
      items.forEach((it) => URL.revokeObjectURL(it.previewUrl));
      const clear = () => setItems([]);
      const id = setTimeout(clear, 0);
      return () => clearTimeout(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const uploading = items.filter((i) => i.status === "uploading" || i.status === "queued").length;
  const uploadedCount = items.filter((i) => i.status === "uploaded").length;
  const failedCount = items.filter((i) => i.status === "failed").length;
  const done = items.length > 0 && uploading === 0;

  function retry(item: UploadItem) {
    setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, status: "uploading", progress: 0, error: undefined } : it)));
    const duration = 1200;
    const start = Date.now();
    const tick = () => {
      setItems((prev) =>
        prev.map((it) => {
          if (it.id !== item.id) return it;
          const ratio = Math.min((Date.now() - start) / duration, 1);
          const progress = Math.round(ratio * 100);
          return ratio >= 1
            ? { ...it, progress: 100, status: "uploaded" }
            : { ...it, progress, status: "uploading" };
        })
      );
      if (Date.now() - start < duration) setTimeout(tick, 160);
    };
    setTimeout(tick, 150);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload photos</DialogTitle>
          <DialogDescription>
            Drop photos here or browse. Your team will see them in the event workspace.
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
          <p className="mt-1 text-xs text-muted-foreground">JPEG, PNG, WebP or HEIC · up to 500 files at once</p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
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
                  <ImagePreview item={item} />
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
                  {item.status === "failed" && (
                    <Button variant="ghost" size="icon-sm" aria-label={`Retry ${item.file.name}`} onClick={() => retry(item)}>
                      <RotateCw />
                    </Button>
                  )}
                  {item.status !== "uploading" && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remove ${item.file.name}`}
                      onClick={() => setItems((prev) => prev.filter((it) => it.id !== item.id))}
                    >
                      <X />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <DialogFooter className="items-center">
          {failedCount > 0 && (
            <p className="mr-auto text-xs text-destructive">{failedCount} failed — retry or remove them.</p>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {done ? "Close" : "Cancel"}
          </Button>
          <Button
            disabled={uploading > 0 || items.length === 0}
            onClick={() => {
              toast.success(
                uploadedCount > 0 ? `${uploadedCount} photo${uploadedCount === 1 ? "" : "s"} uploaded` : "No uploads completed",
                failedCount > 0 ? { description: `${failedCount} failed and can be retried.` } : undefined
              );
              onOpenChange(false);
            }}
          >
            {uploading > 0 ? (
              <>
                <Loader2 className="animate-spin" /> Uploading…
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

function ImagePreview({ item }: { item: UploadItem }) {
  if (item.status === "failed") {
    return (
      <div className="flex size-full items-center justify-center bg-destructive/10 text-destructive">
        <AlertCircle className="size-4" />
      </div>
    );
  }
  return (
    /* eslint-disable-next-line @next/next/no-img-element -- local blob: preview URLs are not optimizable by next/image */
    <img src={item.previewUrl} alt="" className="size-full object-cover" />
  );
}
