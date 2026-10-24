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
