/**
 * Local avatar helper — frontend only.
 * Reads an image file, center-crops to a square, downscales, and returns a
 * JPEG data URL small enough to persist under the localStorage quota.
 * Nothing is ever uploaded.
 */

const AVATAR_SIZE = 256;
const MAX_SOURCE_BYTES = 5 * 1024 * 1024;
const JPEG_QUALITY = 0.85;

export function fileToAvatarDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Choose an image file (JPEG, PNG or WebP)."));
      return;
    }
    if (file.size > MAX_SOURCE_BYTES) {
      reject(new Error("Image must be smaller than 5 MB."));
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      try {
        const side = Math.min(image.naturalWidth, image.naturalHeight);
        if (!side) {
          reject(new Error("That image has no usable pixels."));
          return;
        }
        const canvas = document.createElement("canvas");
        canvas.width = AVATAR_SIZE;
        canvas.height = AVATAR_SIZE;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not process that image."));
          return;
        }
        const offsetX = (image.naturalWidth - side) / 2;
        const offsetY = (image.naturalHeight - side) / 2;
        ctx.drawImage(
          image,
          offsetX,
          offsetY,
          side,
          side,
          0,
          0,
          AVATAR_SIZE,
          AVATAR_SIZE,
        );
        resolve(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
      } catch {
        reject(new Error("Could not process that image."));
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("That file could not be read as an image."));
    };

    image.src = objectUrl;
  });
}
