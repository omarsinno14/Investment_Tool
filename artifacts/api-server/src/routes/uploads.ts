import { Router, type Request, type Response } from "express";
import multer from "multer";
import { prisma } from "../lib/db.js";
import { logger } from "../lib/logger.js";
import { DOCUMENT_TYPES, IMAGE_TYPES, MAX_UPLOAD_BYTES, readFile, saveFile } from "../lib/storage.js";

const router = Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 } });

function requireAuth(req: any, res: any): string | null {
  if (!req.session.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return req.session.userId as string;
}

/** Run multer for a single `file` field and translate its errors into 400s. */
function receiveFile(req: Request, res: Response): Promise<Express.Multer.File | null> {
  return new Promise((resolve) => {
    upload.single("file")(req, res, (err: unknown) => {
      if (err) {
        const tooBig = err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE";
        res.status(400).json({ error: tooBig ? "File is too large (max 5 MB)" : "Upload failed" });
        return resolve(null);
      }
      if (!req.file) {
        res.status(400).json({ error: "No file provided" });
        return resolve(null);
      }
      resolve(req.file);
    });
  });
}

async function storeUpload(
  req: Request,
  res: Response,
  opts: { folder: string; allowed: Set<string>; kind: string },
): Promise<string | null> {
  const userId = requireAuth(req, res);
  if (!userId) return null;
  const file = await receiveFile(req, res);
  if (!file) return null;
  if (!opts.allowed.has(file.mimetype)) {
    res.status(400).json({ error: `Unsupported file type for ${opts.kind}` });
    return null;
  }
  const folder = opts.folder === "*" ? String(req.body?.folder ?? "misc") : opts.folder;
  const { url } = await saveFile({
    ownerId: userId,
    folder,
    filename: file.originalname?.slice(0, 200) ?? null,
    mimeType: file.mimetype,
    data: file.buffer,
  });
  return url;
}

/** POST /upload — generic image upload (hub images, deal photos). Returns { url }. */
router.post("/upload", async (req, res) => {
  try {
    const url = await storeUpload(req, res, { folder: "*", allowed: IMAGE_TYPES, kind: "images" });
    return url ? res.json({ url }) : undefined;
  } catch (e) {
    logger.error({ err: e }, "Upload error");
    return res.headersSent ? undefined : res.status(500).json({ error: "Upload failed" });
  }
});

router.post("/user/profile/photo", async (req, res) => {
  try {
    const url = await storeUpload(req, res, { folder: "avatars", allowed: IMAGE_TYPES, kind: "profile photos" });
    if (!url) return undefined;
    await prisma.profile.upsert({
      where: { userId: req.session.userId! },
      create: { userId: req.session.userId!, imageUrl: url },
      update: { imageUrl: url },
    });
    return res.json({ imageUrl: url });
  } catch (e) {
    logger.error({ err: e }, "Profile photo upload error");
    return res.headersSent ? undefined : res.status(500).json({ error: "Upload failed" });
  }
});

router.post("/user/profile/cover-photo", async (req, res) => {
  try {
    const url = await storeUpload(req, res, { folder: "covers", allowed: IMAGE_TYPES, kind: "cover photos" });
    if (!url) return undefined;
    await prisma.profile.upsert({
      where: { userId: req.session.userId! },
      create: { userId: req.session.userId!, coverPhotoUrl: url },
      update: { coverPhotoUrl: url },
    });
    return res.json({ coverPhotoUrl: url });
  } catch (e) {
    logger.error({ err: e }, "Cover photo upload error");
    return res.headersSent ? undefined : res.status(500).json({ error: "Upload failed" });
  }
});

router.post("/user/profile/cv", async (req, res) => {
  try {
    const url = await storeUpload(req, res, { folder: "cvs", allowed: DOCUMENT_TYPES, kind: "CVs (PDF or Word)" });
    if (!url) return undefined;
    await prisma.profile.upsert({
      where: { userId: req.session.userId! },
      create: { userId: req.session.userId!, cvUrl: url },
      update: { cvUrl: url },
    });
    return res.json({ cvUrl: url });
  } catch (e) {
    logger.error({ err: e }, "CV upload error");
    return res.headersSent ? undefined : res.status(500).json({ error: "Upload failed" });
  }
});

/** GET /files/:id — serve a stored file. Ids are unguessable random tokens. */
router.get("/files/:id", async (req, res) => {
  try {
    if (!/^[a-f0-9]{32}$/.test(req.params.id)) return res.status(404).end();
    const file = await readFile(req.params.id);
    if (!file) return res.status(404).end();
    res.setHeader("Content-Type", file.mimeType);
    res.setHeader("Cache-Control", "private, max-age=31536000, immutable");
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (!file.mimeType.startsWith("image/")) {
      const name = (file.filename ?? "document").replace(/[^\w.\- ]/g, "");
      res.setHeader("Content-Disposition", `inline; filename="${name}"`);
    }
    return res.end(file.data);
  } catch (e) {
    logger.error({ err: e }, "File GET error");
    return res.status(500).end();
  }
});

export default router;
