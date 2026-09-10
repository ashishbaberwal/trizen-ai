// Direct Appwrite upload test — verifies the real binary path with the
// exact same code the backend route uses. Cleans up after itself.
require("dotenv").config({ path: ".env.local" });
const { randomUUID } = require("node:crypto");
const { Client, Storage } = require("node-appwrite");

(async () => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);
  const storage = new Storage(client);

  // 1x1 PNG
  const PNG = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64"
  );

  const fileId = randomUUID();
  console.log("uploading to bucket:", process.env.APPWRITE_BUCKET_ID);
  const file = new File([PNG], "diag.png", { type: "image/png" });
  const created = await storage.createFile({
    bucketId: process.env.APPWRITE_BUCKET_ID,
    fileId,
    file,
  });
  console.log("UPLOAD OK — id match:", created.$id === fileId, "| size:", created.sizeOriginal, "| mime:", created.mimeType);

  // View URL accessibility check (what the browser <img> would use).
  const viewUrl = `${process.env.APPWRITE_ENDPOINT}/storage/buckets/${process.env.APPWRITE_BUCKET_ID}/files/${fileId}/view?project=${process.env.APPWRITE_PROJECT_ID}`;
  const vres = await fetch(viewUrl);
  console.log("view URL status (no auth):", vres.status, vres.status === 200 ? "(public read OK)" : "(browser <img> WILL FAIL)");

  await storage.deleteFile({ bucketId: process.env.APPWRITE_BUCKET_ID, fileId });
  console.log("cleanup OK");
})().catch((e) => {
  console.error("APPWRITE FAIL:", e.code, e.message);
  process.exit(1);
});
