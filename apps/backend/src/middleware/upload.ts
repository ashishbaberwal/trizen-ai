import type { NextFunction, Request, Response } from "express";
import multer from "multer";

import { ALLOWED_MIME_TYPES, MAX_PHOTO_BYTES } from "../lib/storage.js";
import { HttpError } from "./error.js";

/**
 * Multipart handling for photo uploads. Files are buffered in memory
 * (photos are ≤ 25 MB) so the Appwrite upload + metadata insert can run
 * as one clean sequence with rollback on failure.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PHOTO_BYTES, files: 20 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(new HttpError(400, `Unsupported file type: ${file.mimetype}. Use JPEG, PNG or WebP.`));
      return;
    }
    cb(null, true);
  },
});

/** Single-photo field name: "photos" (accepts 1..20 files per request). */
export const photoUpload = upload.array("photos", 20);

/** Maps multer errors to the shared error contract. */
export function multerErrorHandler(err: unknown, _req: Request, res: Response, next: NextFunction) {
  if (err instanceof multer.MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "A photo exceeds the 25 MB size limit."
        : err.code === "LIMIT_FILE_COUNT"
          ? "Too many photos in one upload (max 20)."
          : `Upload failed: ${err.code}`;
    res.status(400).json({ error: message });
    return;
  }
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  next(err);
}
