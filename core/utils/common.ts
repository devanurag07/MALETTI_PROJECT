import { CAMERA_CAPTURE_KEY } from "../constants/common-constants";
import { toCdnUrl } from "@/core/utils/cdn-url";


interface StoredFileData {
    name: string;
    type: string;
    dataURL: string;
}

export function saveFileToLocalStorage(file: File, key: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function (event: ProgressEvent<FileReader>) {
            if (event.target && typeof event.target.result === "string") {
                const fileData: StoredFileData = {
                    name: file.name,
                    type: file.type,
                    dataURL: event.target.result,
                };
                // setItem throws (e.g. QuotaExceededError) inside this callback, which would otherwise leave the promise pending forever.
                try {
                    localStorage.setItem(key, JSON.stringify(fileData));
                    resolve();
                } catch (error) {
                    reject(error);
                }
            } else {
                reject(new Error("FileReader produced no result"));
            }
        };
        reader.onerror = () =>
            reject(reader.error ?? new Error("FileReader failed"));
        reader.readAsDataURL(file);
    });
}

export function getFileFromLocalStorage(key: string): File | null {
    const item = localStorage.getItem(key);
    if (!item) {
        return null;
    }

    try {
        const fileData: StoredFileData = JSON.parse(item);
        // Convert data URL back to Blob
        const blob = dataURLtoBlob(fileData.dataURL);
        // Create a new File object with original filename and type
        return new File([blob], fileData.name, { type: fileData.type });
    } catch (error) {
        console.error('Error parsing stored file data:', error);
        return null;
    }
}


export function removeFileFromLocalStorage(key: string): void {
    localStorage.removeItem(key);
}

export function dataURLtoBlob(dataURL: string): Blob {
    const arr = dataURL.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : '';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);

    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }

    return new Blob([u8arr], { type: mime });
}

export function saveToLocalStorage(key: string, value: string) {
    if (window) {
        localStorage.setItem(key, value);
    }
}

export function getFromStorage(key: string) {
    if (window) {
        return localStorage.getItem(key);
    }

    return undefined;
}

export const capitalizeText = (text: string) => {
    let capitalizedText = text.charAt(0).toUpperCase() + text.slice(1)
    capitalizedText = capitalizedText.replace("_", " ")
    return capitalizedText
}




// sets image base64 as input image (watermarked results are reused as-is)
export const setBase64AsInput = async (
    base64: string
): Promise<void> => {
    const dataUrl = base64.includes("base64,")
        ? base64
        : base64.startsWith("data:")
          ? base64
          : `data:image/png;base64,${base64}`;

    const blob = dataURLtoBlob(dataUrl);
    const file = new File([blob], "camera_capture.jpg", {
        lastModified: new Date().getTime(),
        type: blob.type || "image/jpeg",
    });

    await saveFileToLocalStorage(file, CAMERA_CAPTURE_KEY);
};

export async function imageUrlToBase64(url: string): Promise<string> {
    const response: Response = await fetch(toCdnUrl(url));
    if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
    }

    const blob: Blob = await response.blob();

    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Failed to convert blob to base64"));
        reader.readAsDataURL(blob);
    });
}


/**
 * Convert any image file to JPEG, resize to max dimensions, and compress.
 * Handles HEIC from iPad via heic2any library, then canvas resize/compress.
 * Always returns a proper JPEG File.
 */
export async function convertFileToJpeg(
  file: File,
  maxDimension = 2048,
  quality = 0.85,
): Promise<File> {
  let sourceBlob: Blob = file;

  // Try native decode first (works for JPEG, PNG, WebP, etc.)
  let nativeDecodeWorked = false;
  try {
    const testBitmap = await createImageBitmap(file);
    testBitmap.close();
    nativeDecodeWorked = true;
  } catch {
    // Native decode failed — likely HEIC or unsupported format
  }

  // If native decode failed, use heic2any (handles HEIC regardless of reported type)
  if (!nativeDecodeWorked) {
    try {
      const { default: heic2any } = await import("heic2any");
      const converted = await heic2any({
        blob: file,
        toType: "image/jpeg",
        quality,
      });
      sourceBlob = Array.isArray(converted) ? converted[0] : converted;
    } catch (err) {
      console.error("heic2any conversion also failed:", err);
      throw new Error("Cannot decode image file");
    }
  }

  // Draw on canvas to resize and produce consistent JPEG
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  const bitmap = await createImageBitmap(sourceBlob);
  let width = bitmap.width;
  let height = bitmap.height;

  if (width > maxDimension || height > maxDimension) {
    const scale = maxDimension / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality),
  );
  if (!blob) throw new Error("Canvas toBlob returned null");

  const baseName = (file.name || "image").replace(/\.[^.]+$/, "");
  return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
}

