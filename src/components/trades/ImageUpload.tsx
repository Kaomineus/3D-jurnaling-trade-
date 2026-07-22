"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, Loader2, ImageIcon } from "lucide-react";
import toast from "react-hot-toast";
import { useUploadThing } from "@/lib/uploadthing";

interface ImageUploadProps {
  tradeId: string | null;
  images: { id: string; url: string; thumbnailUrl: string }[];
  onImageUploaded: (image: {
    id: string;
    url: string;
    thumbnailUrl: string;
  }) => void;
  onImageRemoved: (imageId: string) => void;
}

export default function ImageUpload({
  tradeId,
  images,
  onImageUploaded,
  onImageRemoved,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);

  const { startUpload } = useUploadThing("tradeImage", {
    onClientUploadComplete: async (res) => {
      if (!res?.length) {
        toast.error("Upload gagal");
        setUploading(false);
        return;
      }

      // Save the uploaded URL to our database
      try {
        const saveRes = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: res[0].url,
            tradeId,
          }),
        });

        if (!saveRes.ok) {
          const err = await saveRes.json();
          toast.error(err.error || "Gagal menyimpan gambar");
          setUploading(false);
          return;
        }

        const data = await saveRes.json();
        onImageUploaded(data);
        toast.success("Gambar berhasil diupload ke cloud!");
      } catch {
        toast.error("Gagal menyimpan gambar");
      } finally {
        setUploading(false);
      }
    },
    onUploadError: (error: Error) => {
      toast.error(`Upload gagal: ${error.message}`);
      setUploading(false);
    },
  });

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (images.length + acceptedFiles.length > 3) {
        toast.error("Maksimal 3 gambar per trade");
        return;
      }

      // Filter files by size
      const validFiles = acceptedFiles.filter(
        (f) => f.size <= 5 * 1024 * 1024
      );
      const oversized = acceptedFiles.filter(
        (f) => f.size > 5 * 1024 * 1024
      );
      oversized.forEach((f) =>
        toast.error(`File ${f.name} terlalu besar (max 5 MB)`)
      );

      if (!validFiles.length) return;

      setUploading(true);
      // Upload to Uploadthing cloud
      await startUpload(validFiles);
    },
    [images.length, startUpload, tradeId]
  );

  const handleRemove = async (imageId: string) => {
    try {
      await fetch("/api/upload", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId }),
      });
      onImageRemoved(imageId);
      toast.success("Gambar dihapus");
    } catch {
      toast.error("Gagal menghapus gambar");
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
    },
    maxSize: 5 * 1024 * 1024,
    disabled: images.length >= 3 || uploading,
    multiple: true,
  });

  return (
    <div>
      <label className="block text-xs font-medium text-slate-300 mb-2">
        Attachments (max 3)
      </label>

      {/* Uploaded images */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {images.map((image) => (
            <div
              key={image.id}
              className="relative group w-20 h-20 rounded-lg overflow-hidden border border-slate-700/50 bg-slate-800"
            >
              <img
                src={image.thumbnailUrl || image.url}
                alt="Trade screenshot"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => handleRemove(image.id)}
                className="absolute top-1 right-1 p-0.5 bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
              <div className="absolute bottom-0 inset-x-0 h-6 bg-gradient-to-t from-black/40 to-transparent" />
            </div>
          ))}
        </div>
      )}

      {/* Drop zone */}
      {images.length < 3 && (
        <div
          {...getRootProps()}
          className={`relative flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed transition-all cursor-pointer ${
            isDragActive
              ? "border-emerald-400 bg-emerald-500/5"
              : "border-slate-700/50 bg-slate-800/30 hover:border-slate-600/50 hover:bg-slate-800/50"
          } ${uploading ? "pointer-events-none opacity-50" : ""}`}
        >
          <input {...getInputProps()} />
          {uploading ? (
            <Loader2 className="w-6 h-6 text-emerald-400 animate-spin mb-2" />
          ) : (
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-10 h-10 rounded-full bg-slate-800/80 flex items-center justify-center">
                {isDragActive ? (
                  <ImageIcon className="w-5 h-5 text-emerald-400" />
                ) : (
                  <Upload className="w-5 h-5 text-slate-400" />
                )}
              </div>
              <p className="text-xs text-slate-400">
                {isDragActive ? (
                  "Drop gambar di sini..."
                ) : (
                  <>
                    <span className="text-emerald-400 font-medium">
                      Click to upload
                    </span>{" "}
                    or drag and drop
                  </>
                )}
              </p>
              <p className="text-[10px] text-slate-500">
                JPG, PNG, WebP (max 5 MB)
              </p>
            </div>
          )}
        </div>
      )}

      <p className="text-[10px] text-slate-500 mt-1.5">
        {images.length}/3 gambar terupload ke cloud
      </p>
    </div>
  );
}
