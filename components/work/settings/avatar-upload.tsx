"use client";

import { useRef, useTransition } from "react";
import { Camera, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { WorkUserRecord } from "@/types/work/domain";
import { setAvatarAction } from "@/lib/work/actions";
import { createClient } from "@/lib/work/supabase/client";
import { Button } from "@/components/work/ui/button";
import { PersonAvatar } from "@/components/work/shared/people";

/** Center-crops to a square and downsizes to 512px JPEG before upload. */
async function toSquareJpeg(file: File, size = 512): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  canvas
    .getContext("2d")!
    .drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("No se pudo procesar la imagen"))), "image/jpeg", 0.88),
  );
}

/** Uploads a photo into avatars/<userId>/ and returns its public URL. */
export async function uploadAvatar(userId: string, file: File) {
  const blob = await toSquareJpeg(file);
  const supabase = createClient();
  const path = `${userId}/${Date.now()}.jpg`;
  const { error } = await supabase.storage.from("avatars").upload(path, blob, { contentType: "image/jpeg" });
  if (error) throw new Error(error.message);
  return supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
}

export function AvatarUpload({ person }: { person: WorkUserRecord }) {
  const input = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();

  const upload = (file: File) =>
    start(async () => {
      try {
        await setAvatarAction(person.id, await uploadAvatar(person.id, file));
        toast.success("Foto actualizada");
      } catch (e) {
        toast.error(e instanceof Error ? `No se pudo subir la foto: ${e.message}` : "No se pudo subir la foto");
      }
    });

  return (
    <div className="flex items-center gap-4">
      <PersonAvatar person={person} size="lg" />
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => input.current?.click()}>
          <Camera className="size-4" /> {pending ? "Subiendo…" : person.avatarUrl ? "Cambiar foto" : "Subir foto"}
        </Button>
        {person.avatarUrl ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() =>
              start(async () => {
                try {
                  await setAvatarAction(person.id, null);
                  toast.success("Foto quitada");
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "No se pudo quitar");
                }
              })
            }
          >
            <Trash2 className="size-4" /> Quitar
          </Button>
        ) : null}
        <input
          ref={input}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
