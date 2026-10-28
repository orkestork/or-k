"use client";

import { createClient } from "@/lib/work/supabase/client";

/** Uploads a file to the private `work` bucket under `prefix` and returns its path. */
export async function uploadToWork(prefix: string, file: File) {
  const safe = file.name.normalize("NFD").replace(/[^\w.-]+/g, "_");
  const path = `${prefix}/${Date.now()}-${safe}`;
  const { error } = await createClient()
    .storage.from("work")
    .upload(path, file, { contentType: file.type || undefined });
  if (error) throw new Error(`${file.name}: ${error.message}`);
  return path;
}

export function formatBytes(bytes: number | null | undefined) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
