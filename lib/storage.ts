/**
 * Cloudflare R2 Upload Utility
 * 
 * Compresses images client-side using Canvas, then uploads via
 * the /api/upload API route which forwards to Cloudflare R2.
 */

/**
 * Compresses an image file using an OffscreenCanvas / HTMLCanvasElement.
 * Resizes to max 1200px on the longest side and compresses to JPEG ~0.7 quality.
 * Returns a compressed Blob (target ≈ 200KB).
 */
const compressImage = (file: File | Blob): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const MAX_DIMENSION = 1200;
      let { width, height } = img;

      // Scale down if larger than MAX_DIMENSION
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) {
          height = Math.round((height / width) * MAX_DIMENSION);
          width = MAX_DIMENSION;
        } else {
          width = Math.round((width / height) * MAX_DIMENSION);
          height = MAX_DIMENSION;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Canvas toBlob returned null"));
          }
        },
        "image/jpeg",
        0.7 // quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image for compression"));
    };

    img.src = url;
  });
};

/**
 * Checks if a file is an image type that can be compressed.
 */
const isCompressibleImage = (file: File | Blob): boolean => {
  const type = file.type.toLowerCase();
  return type.startsWith("image/") && !type.includes("svg") && !type.includes("gif");
};

/**
 * Uploads a payment proof file to Cloudflare R2 via /api/upload.
 * 
 * - Images are compressed before upload
 * - Documents (PDF etc.) are uploaded as-is
 * - Existing URLs are returned unchanged
 * - Base64 data URIs are converted to Blob before processing
 * 
 * @param fileOrBase64  File, Blob, base64 data URI, or existing URL
 * @returns Public URL of the uploaded file on Cloudflare R2
 */
export const uploadPaymentProof = async (fileOrBase64: File | Blob | string): Promise<string> => {
  if (!fileOrBase64) return "";

  // If it's already a URL, return as-is
  if (typeof fileOrBase64 === "string" && (fileOrBase64.startsWith("http://") || fileOrBase64.startsWith("https://"))) {
    return fileOrBase64;
  }

  try {
    let fileToUpload: File | Blob;
    let fileName = `proof_${Date.now()}.png`;

    if (typeof fileOrBase64 === "string" && fileOrBase64.startsWith("data:")) {
      // Convert base64 data URI to Blob
      const parts = fileOrBase64.split(";base64,");
      const contentType = parts[0].split(":")[1];
      const raw = window.atob(parts[1]);
      const rawLength = raw.length;
      const uInt8Array = new Uint8Array(rawLength);
      for (let i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
      }
      const ext = contentType.split("/")[1] || "png";
      fileName = `proof_${Date.now()}.${ext}`;
      fileToUpload = new File([uInt8Array], fileName, { type: contentType });
    } else if (fileOrBase64 instanceof File) {
      fileToUpload = fileOrBase64;
      fileName = fileOrBase64.name;
    } else if (fileOrBase64 instanceof Blob) {
      const ext = fileOrBase64.type.split("/")[1] || "png";
      fileName = `proof_${Date.now()}.${ext}`;
      fileToUpload = new File([fileOrBase64], fileName, { type: fileOrBase64.type });
    } else {
      return String(fileOrBase64);
    }

    // Compress if it's an image
    if (isCompressibleImage(fileToUpload)) {
      const compressed = await compressImage(fileToUpload);
      fileToUpload = new File([compressed], fileName.replace(/\.[^.]+$/, ".jpg"), {
        type: "image/jpeg",
      });
    }

    // Upload via our API route
    const formData = new FormData();
    formData.append("file", fileToUpload, (fileToUpload as File).name || fileName);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Upload failed with status ${response.status}`);
    }

    const { url } = await response.json();
    return url;
  } catch (err) {
    console.error("Error uploading payment proof:", err);
    throw err;
  }
};
