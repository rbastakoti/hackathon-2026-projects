"use client";

import { useRef, useState, DragEvent, ChangeEvent } from "react";
import { FileText, Upload, Trash2, File, ImageIcon } from "lucide-react";

export type UploadedFile = {
  id: string;
  name: string;
  size: number;
  uploadDate: string;
  type: string;
};

interface Props {
  files: UploadedFile[];
  setFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>;
}

const SAMPLE_DOCS: UploadedFile[] = [
  {
    id: "sample-1",
    name: "BlueCross_Policy_2026.pdf",
    size: 2_340_000,
    uploadDate: "2026-01-15",
    type: "application/pdf",
  },
  {
    id: "sample-2",
    name: "SunLife_Benefits_Schedule.pdf",
    size: 1_820_000,
    uploadDate: "2026-01-15",
    type: "application/pdf",
  },
];

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

function FileIcon({ type }: { type: string }) {
  if (type.startsWith("image/")) return <ImageIcon className="w-5 h-5 text-teal-500" />;
  return <FileText className="w-5 h-5 text-teal-500" />;
}

export default function DocumentsUpload({ files, setFiles }: Props) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Pre-load sample docs if files list is empty and samples not yet added
  const allFiles: UploadedFile[] = files.length === 0
    ? SAMPLE_DOCS
    : [...SAMPLE_DOCS, ...files.filter((f) => !SAMPLE_DOCS.find((s) => s.id === f.id))];

  function addFiles(fileList: FileList) {
    const today = new Date().toISOString().split("T")[0];
    const newFiles: UploadedFile[] = Array.from(fileList).map((f) => ({
      id: `${f.name}-${Date.now()}`,
      name: f.name,
      size: f.size,
      uploadDate: today,
      type: f.type,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.length) addFiles(e.target.files);
  }

  function deleteFile(id: string) {
    // Can only delete user-uploaded files, not samples
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-1">Insurance Documents</h2>
        <p className="text-sm text-gray-500">
          Upload your policy documents. They&apos;ll be used to build your personal knowledge graph.
        </p>
      </div>

      {/* Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
          dragging
            ? "border-teal-500 bg-teal-50 scale-[1.01]"
            : "border-gray-300 bg-white hover:border-teal-400 hover:bg-teal-50"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          multiple
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          onChange={handleChange}
        />
        <Upload className={`w-10 h-10 mx-auto mb-3 transition-colors ${dragging ? "text-teal-600" : "text-gray-400"}`} />
        {dragging ? (
          <p className="text-teal-600 font-semibold">Drop files here!</p>
        ) : (
          <>
            <p className="text-gray-600 font-medium">Drag &amp; drop files here</p>
            <p className="text-gray-400 text-sm mt-1">or click to browse</p>
            <p className="text-gray-400 text-xs mt-3">Supports PDF, DOC, DOCX, JPG, PNG</p>
          </>
        )}
      </div>

      {/* File List */}
      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-700 text-sm">
            {allFiles.length} document{allFiles.length !== 1 ? "s" : ""}
          </h3>
          <span className="text-xs text-gray-400">Uploaded</span>
        </div>
        <div className="divide-y divide-gray-100">
          {allFiles.map((file) => {
            const isSample = SAMPLE_DOCS.some((s) => s.id === file.id);
            return (
              <div key={file.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                <div className="w-9 h-9 bg-teal-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileIcon type={file.type} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
                  <p className="text-xs text-gray-400">
                    {formatBytes(file.size)} · {file.uploadDate}
                    {isSample && (
                      <span className="ml-2 bg-teal-50 text-teal-600 px-1.5 py-0.5 rounded text-xs">
                        sample
                      </span>
                    )}
                  </p>
                </div>
                {!isSample && (
                  <button
                    onClick={() => deleteFile(file.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                {isSample && (
                  <File className="w-4 h-4 text-gray-300" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {files.length > 0 && (
        <p className="text-sm text-teal-600 text-center">
          ✓ {files.length} new document{files.length !== 1 ? "s" : ""} added — view your Knowledge Graph tab to explore connections
        </p>
      )}
    </div>
  );
}
