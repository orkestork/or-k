"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/work/utils";

/** Click-or-drop area that hands the chosen files to `onFiles`. */
export function Dropzone({
  onFiles,
  multiple = true,
  accept,
  busy,
  hint,
}: {
  onFiles: (files: File[]) => void;
  multiple?: boolean;
  accept?: string;
  busy?: boolean;
  hint?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => input.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const files = Array.from(e.dataTransfer.files);
        if (files.length) onFiles(multiple ? files : files.slice(0, 1));
      }}
      className={cn(
        "flex w-full flex-col items-center gap-1 rounded-md border border-dashed border-border px-4 py-5 text-center text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-60",
        over && "border-primary bg-primary/5 text-foreground",
      )}
    >
      <Upload className="size-4" />
      <span>{busy ? "Subiendo…" : "Arrastra archivos aquí o haz clic para elegir"}</span>
      {hint ? <span className="text-xs">{hint}</span> : null}
      <input
        ref={input}
        type="file"
        multiple={multiple}
        accept={accept}
        className="sr-only"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) onFiles(files);
          e.target.value = "";
        }}
      />
    </button>
  );
}
