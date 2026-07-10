import { supabase } from "./supabase";

/**
 * Uploads a payment proof image to the 'payment-proofs' Supabase Storage bucket.
 * Supports File, Blob, base64 data URIs, or returns existing URL.
 * 
 * @param {File|Blob|string} fileOrBase64 
 * @returns {Promise<string>} Public URL of the uploaded image
 */
export const uploadPaymentProof = async (fileOrBase64) => {
  if (!fileOrBase64) return "";
  
  // If it's already a URL, return as-is
  if (typeof fileOrBase64 === "string" && (fileOrBase64.startsWith("http://") || fileOrBase64.startsWith("https://"))) {
    return fileOrBase64;
  }

  try {
    let blob;
    let fileExtension = "png";
    let contentType = "image/png";

    if (typeof fileOrBase64 === "string" && fileOrBase64.startsWith("data:")) {
      // Decode base64 string
      const parts = fileOrBase64.split(";base64,");
      contentType = parts[0].split(":")[1];
      const raw = window.atob(parts[1]);
      const rawLength = raw.length;
      const uInt8Array = new Uint8Array(rawLength);

      for (let i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
      }
      blob = new Blob([uInt8Array], { type: contentType });
      fileExtension = contentType.split("/")[1] || "png";
    } else if (fileOrBase64 instanceof File || fileOrBase64 instanceof Blob) {
      blob = fileOrBase64;
      contentType = fileOrBase64.type;
      fileExtension = fileOrBase64.name ? fileOrBase64.name.split(".").pop() : "png";
    } else {
      // Fallback
      return fileOrBase64;
    }

    const fileName = `proof_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}.${fileExtension}`;
    const filePath = `payments/${fileName}`;

    const { data, error } = await supabase.storage
      .from("payment-proofs")
      .upload(filePath, blob, {
        contentType,
        cacheControl: "3600",
        upsert: false
      });

    if (error) throw error;

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from("payment-proofs")
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  } catch (err) {
    console.error("Error uploading payment proof:", err);
    throw err;
  }
};
