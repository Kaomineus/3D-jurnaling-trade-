"use client";

import { useState } from "react";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import { Zoom, Counter } from "yet-another-react-lightbox/plugins";
import { ImageIcon } from "lucide-react";

interface ImageGalleryProps {
  images: { id: string; url: string; thumbnailUrl: string | null }[];
}

export default function ImageGallery({ images }: ImageGalleryProps) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 rounded-xl bg-slate-800/30 border border-slate-700/30">
        <ImageIcon className="w-8 h-8 text-slate-600 mb-2" />
        <p className="text-xs text-slate-500">Tidak ada lampiran gambar</p>
      </div>
    );
  }

  const slides = images.map((img) => ({
    src: img.url,
    alt: "Trade screenshot",
  }));

  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        {images.map((image, idx) => (
          <button
            key={image.id}
            onClick={() => {
              setIndex(idx);
              setOpen(true);
            }}
            className="relative group aspect-video rounded-lg overflow-hidden border border-slate-700/30 bg-slate-800 hover:border-emerald-500/30 transition-all"
          >
            <img
              src={image.thumbnailUrl || image.url}
              alt="Trade screenshot"
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-white font-medium px-2 py-1 rounded bg-black/50">
                Klik untuk zoom
              </div>
            </div>
          </button>
        ))}
      </div>

      <Lightbox
        open={open}
        close={() => setOpen(false)}
        index={index}
        slides={slides}
        plugins={[Zoom, Counter]}
        counter={{
          container: {
            style: {
              background: "rgba(0,0,0,0.6)",
              borderRadius: "8px",
              fontSize: "12px",
              padding: "4px 10px",
            },
          },
        }}
        styles={{
          container: { backgroundColor: "rgba(0,0,0,0.92)" },
        }}
      />
    </>
  );
}
