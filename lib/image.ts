"use client";

// Downscale an image File so its longest edge is at most `maxDim` pixels, then
// re-encode it, before it is handed to Storage. A multi-megabyte phone photo
// drops to a few tens of kilobytes, so the storage quota lasts far longer —
// this happens transparently, the user just picks a file as before.
//
// It is best-effort: anything it can't safely redraw (SVGs, animated GIFs, or a
// decode/encode failure) falls through and returns the original File, so an
// upload never breaks because of resizing.

const MAX_DIM = 300;
const QUALITY = 0.85;

export async function resizeImageFile(
  file: File,
  maxDim: number = MAX_DIM,
): Promise<File> {
  // Only raster images the canvas can redraw. SVG is vector (already tiny) and
  // animated GIFs would lose their animation, so leave those untouched.
  if (
    !file.type.startsWith("image/") ||
    file.type === "image/svg+xml" ||
    file.type === "image/gif"
  ) {
    return file;
  }

  try {
    // createImageBitmap honours EXIF orientation, so portrait phone photos
    // aren't rotated sideways once we redraw them.
    const bitmap = await createImageBitmap(file, {
      imageOrientation: "from-image",
    });
    const { width, height } = bitmap;
    const scale = Math.min(1, maxDim / Math.max(width, height));
    const targetW = Math.max(1, Math.round(width * scale));
    const targetH = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, targetW, targetH);
    bitmap.close();

    // WebP keeps transparency (important for logos) and compresses well; fall
    // back to JPEG only if the browser can't produce a WebP blob.
    const blob =
      (await canvasToBlob(canvas, "image/webp", QUALITY)) ??
      (await canvasToBlob(canvas, "image/jpeg", QUALITY));
    if (!blob) return file;

    const ext = blob.type === "image/webp" ? "webp" : "jpg";
    const base = file.name.replace(/\.[^./\\]+$/, "") || "image";
    return new File([blob], `${base}.${ext}`, {
      type: blob.type,
      lastModified: Date.now(),
    });
  } catch {
    // Anything unexpected: keep the original so the upload still works.
    return file;
  }
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), type, quality);
  });
}
