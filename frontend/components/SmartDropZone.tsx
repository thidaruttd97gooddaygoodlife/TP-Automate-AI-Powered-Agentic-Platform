"use client";

import { useRef, useState } from "react";
import { ImagePlus, UploadCloud } from "lucide-react";

type SmartDropZoneProps = {
  title: string;
  accept: string;
  multiple?: boolean;
  onFiles: (files: File[]) => Promise<void>;
};

export function SmartDropZone({ title, accept, multiple = false, onFiles }: SmartDropZoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) {
      return;
    }

    setBusy(true);
    try {
      await onFiles(Array.from(files));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={`rounded-2xl border-2 border-dashed bg-white p-6 transition ${
        dragging ? "border-slate-900 bg-slate-50" : "border-slate-900/35"
      }`}
      onDragEnter={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        void handleFiles(e.dataTransfer.files);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => void handleFiles(e.target.files)}
      />

      <div className="flex flex-col items-center gap-3 text-center">
        <div className="rounded-full bg-red-100 p-3 text-red-700">
          {accept.includes("image") ? <ImagePlus size={22} /> : <UploadCloud size={22} />}
        </div>
        <p className="text-lg font-semibold text-slate-800">{title}</p>
        <p className="text-sm text-slate-500">ลากไฟล์มาวางที่นี่ หรือกดเพื่อเลือกไฟล์</p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="mt-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? "กำลังประมวลผล..." : "เลือกไฟล์"}
        </button>
      </div>
    </div>
  );
}
