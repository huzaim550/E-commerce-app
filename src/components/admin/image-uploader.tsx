"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Loader2, Upload, X, Star } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Uploads to /api/uploads (which writes through the configured storage driver)
 * and keeps the resulting URLs in local state. The parent form posts them as a
 * JSON hidden field.
 */
export function ImageUploader({
  value,
  onChange,
  label = "Images",
  single = false,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  label?: string;
  single?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  async function upload(files: FileList | File[]) {
    setError(null);
    setUploading(true);

    const uploaded: string[] = [];
    for (const file of Array.from(files)) {
      const body = new FormData();
      body.append("file", file);

      try {
        const response = await fetch("/api/uploads", { method: "POST", body });
        const result = await response.json();
        if (!response.ok) {
          setError(result.error ?? "Upload failed");
          break;
        }
        uploaded.push(result.url);
      } catch {
        setError("Upload failed — check your connection.");
        break;
      }
    }

    if (uploaded.length) {
      onChange(single ? uploaded.slice(0, 1) : [...value, ...uploaded]);
    }
    setUploading(false);
  }

  return (
    <div className="space-y-2">
      <span className="block text-sm font-medium">{label}</span>

      <div className="flex flex-wrap gap-3">
        {value.map((url, index) => (
          <div
            key={url}
            className="group relative size-24 overflow-hidden rounded-lg border border-line bg-surface"
          >
            <Image src={url} alt="" fill sizes="96px" className="object-cover" />

            {index === 0 && !single && (
              <span
                className="absolute top-1 left-1 rounded bg-black/60 p-0.5 text-white"
                title="Primary image"
              >
                <Star className="size-3 fill-current" />
              </span>
            )}

            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/60 p-1 opacity-0 transition-opacity group-hover:opacity-100">
              {index > 0 && !single && (
                <button
                  type="button"
                  onClick={() => {
                    const next = [...value];
                    [next[index - 1], next[index]] = [next[index], next[index - 1]];
                    onChange(next);
                  }}
                  className="text-[10px] text-white hover:underline"
                >
                  ← Move
                </button>
              )}
              <button
                type="button"
                onClick={() => onChange(value.filter((v) => v !== url))}
                className="ml-auto text-white"
                aria-label="Remove image"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>
        ))}

        {(!single || value.length === 0) && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              if (e.dataTransfer.files.length) upload(e.dataTransfer.files);
            }}
            disabled={uploading}
            className={cn(
              "flex size-24 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-xs text-muted transition-colors",
              dragging ? "border-accent bg-surface" : "border-line hover:border-fg",
            )}
          >
            {uploading ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <>
                <Upload className="size-5" />
                Upload
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={!single}
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) upload(e.target.files);
          e.target.value = "";
        }}
      />

      {error && <p className="text-xs text-red-600">{error}</p>}
      {!error && (
        <p className="text-xs text-muted">
          {single
            ? "PNG, JPG, WebP or SVG, up to 8MB."
            : "Drag and drop or click to upload. The first image is the primary one."}
        </p>
      )}
    </div>
  );
}
