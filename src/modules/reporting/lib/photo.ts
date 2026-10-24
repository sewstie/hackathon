// Internal: the runtime photo uploader (Supabase Storage).
//
// The reporting module takes the uploader as an injected function so tests
// never touch the cloud and a failure is just a rejected promise the flow can
// swallow. This builds the default uploader used by the app: it puts the file
// in the public "report-photos" bucket and returns its public URL. Any error
// propagates so fileReport can record photoError and file without a photo.
import { getSupabaseClient } from "@/lib/supabase/client";

const BUCKET = "report-photos";

/** A function that stores a photo and resolves to its public URL. */
export type PhotoUploader = (photo: Blob, key: string) => Promise<string>;

/** The largest photo the optional report photo step will accept (10 MB). */
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

/** The outcome of validating a file the student picked on the Photo step. */
export interface PhotoSelection {
  /** True when the file is an image within the size cap and safe to preview. */
  accepted: boolean;
  /** When rejected, a short human-readable reason; null when accepted. */
  reason: string | null;
}

/**
 * Pure validation for a file the student picks on the optional Photo step.
 *
 * The Photo step is optional (no file at all is always fine), so a missing file
 * is "accepted" with no reason. A present file must be an image (`image/*`) and
 * no larger than {@link MAX_PHOTO_BYTES}; otherwise it is rejected with copy the
 * UI shows. This is pure — it reads only `type` and `size`, so it is proven
 * through the reporting interface without a browser, DOM, or `URL`.
 */
export function evaluatePhotoSelection(file: { type: string; size: number } | null | undefined): PhotoSelection {
  if (!file) return { accepted: true, reason: null };
  if (!file.type.startsWith("image/")) {
    return { accepted: false, reason: "That file isn't an image. Please choose a photo." };
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return { accepted: false, reason: "That photo is larger than 10 MB. Please choose a smaller one." };
  }
  return { accepted: true, reason: null };
}

/** The default Supabase Storage uploader (used at runtime, not in tests). */
export const uploadToSupabaseStorage: PhotoUploader = async (photo, key) => {
  const supabase = getSupabaseClient();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(key, photo, { upsert: true, contentType: photo.type || "image/jpeg" });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(key);
  if (!data?.publicUrl) throw new Error("No public URL returned for the photo.");
  return data.publicUrl;
};
