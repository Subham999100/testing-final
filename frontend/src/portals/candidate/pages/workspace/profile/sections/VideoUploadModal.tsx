// ============================================================
// Clyptus Job Portal - Candidate Portal
// Component: VideoUploadModal
// File upload flow for MP4, WebM, MOV up to 100MB with
// client-side duration validation (30s min - 3m max), progress bar,
// error retry, and recruiter visibility consent
// ============================================================

import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileVideo,
  Loader2,
  RotateCcw,
  Upload,
  UploadCloud,
  X,
} from 'lucide-react';
import {
  ALLOWED_VIDEO_EXTENSIONS,
  MAX_FILE_BYTES,
  MAX_FILE_MB,
  MAX_SECONDS,
  MIN_SECONDS,
} from '../../../../lib/video-profile.constants';

interface VideoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File, durationSeconds: number) => void;
  isUploading?: boolean;
  uploadProgress?: number;
}

export const VideoUploadModal: React.FC<VideoUploadModalProps> = ({
  isOpen,
  onClose,
  onUpload,
  isUploading = false,
  uploadProgress = 0,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [detectedDuration, setDetectedDuration] = useState<number | null>(null);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [consentChecked, setConsentChecked] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Validate file size and measure duration via in-memory HTML5 video element
  const handleProcessFile = (file: File) => {
    setValidationError(null);
    setSelectedFile(null);
    setDetectedDuration(null);

    // 1. File extension & type check
    const lowerName = file.name.toLowerCase();
    const isExtensionMatch = ALLOWED_VIDEO_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
    if (!isExtensionMatch && !file.type.startsWith('video/')) {
      setValidationError(
        `Unsupported file type. Please upload MP4, WebM, or MOV video file.`,
      );
      return;
    }

    // 2. File size check (Max 100 MB)
    if (file.size > MAX_FILE_BYTES) {
      setValidationError(
        `File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds maximum allowed limit of ${MAX_FILE_MB} MB.`,
      );
      return;
    }

    setIsValidating(true);

    // 3. Measure duration using HTML5 video object
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl);
      const duration = video.duration;
      setIsValidating(false);

      if (isNaN(duration) || !isFinite(duration)) {
        setValidationError(
          'Unable to read video duration from this file. Please verify it is a valid video.',
        );
        return;
      }

      if (duration < MIN_SECONDS) {
        setValidationError(
          `Video is too short (${Math.round(duration)} seconds). Minimum required duration is ${MIN_SECONDS} seconds.`,
        );
        return;
      }

      if (duration > MAX_SECONDS) {
        const mins = Math.floor(duration / 60);
        const secs = Math.round(duration % 60);
        setValidationError(
          `Video is too long (${mins}m ${secs}s). Maximum allowed duration is 3 minutes (${MAX_SECONDS}s).`,
        );
        return;
      }

      // Valid video!
      setSelectedFile(file);
      setDetectedDuration(duration);
    };

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      setIsValidating(false);
      setValidationError(
        'Failed to decode video file. Please check that the file is not corrupted.',
      );
    };

    video.src = objectUrl;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleReset = () => {
    setSelectedFile(null);
    setDetectedDuration(null);
    setValidationError(null);
    setConsentChecked(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleConfirmUpload = async () => {
    if (!selectedFile || detectedDuration == null || !consentChecked || isUploading) return;
    setUploadError(null);
    try {
      await onUpload(selectedFile, detectedDuration);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error?.message ||
        err?.message ||
        'Failed to upload video.';
      const resolved = Array.isArray(msg) ? msg.join(', ') : String(msg);
      setUploadError(resolved);
    }
  };


  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.round(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-modal-title"
    >
      <div className="relative w-full max-w-lg bg-white rounded-2xl border border-[#E8DFD4] shadow-2xl overflow-hidden flex flex-col text-[#1B1A17]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8DFD4] bg-[#FAF6F1]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#FFF1E6] border border-[#C2410C]/20 flex items-center justify-center text-[#C2410C]">
              <UploadCloud className="w-4 h-4" />
            </div>
            <div>
              <h3 id="upload-modal-title" className="text-base sm:text-lg font-serif font-semibold text-[#1B1A17]">
                Upload Video Profile
              </h3>
              <p className="text-xs text-[#5C564E]">
                MP4, WebM, MOV &middot; Max 100 MB &middot; 30s to 3min
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            aria-label="Close upload modal"
            className="p-1.5 rounded-lg text-[#5C564E] hover:text-[#1B1A17] hover:bg-[#E8DFD4]/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".mp4,.webm,.mov,video/mp4,video/webm,video/quicktime"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Dropzone */}
          {!selectedFile && (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`p-8 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
                isDragOver
                  ? 'border-[#C2410C] bg-[#FFF8EE]'
                  : 'border-[#D7C9BA] hover:border-[#C2410C] bg-[#FAF6F1]/50 hover:bg-[#FAF6F1]'
              }`}
            >
              {isValidating ? (
                <div className="space-y-2">
                  <Loader2 className="w-8 h-8 text-[#C2410C] animate-spin mx-auto" />
                  <p className="text-xs text-[#5C564E] font-medium">Validating video duration & size...</p>
                </div>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full bg-[#FFF1E6] border border-[#C2410C]/20 flex items-center justify-center text-[#C2410C] mb-3">
                    <FileVideo className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-[#1B1A17]">
                    Click to browse or drag & drop video
                  </p>
                  <p className="text-xs text-[#5C564E] mt-1">
                    MP4, WebM, or MOV up to 100 MB
                  </p>
                  <span className="mt-3 text-[11px] font-semibold text-[#C2410C] px-2.5 py-0.5 rounded-full bg-[#FFF1E6]">
                    Must be 30 seconds to 3 minutes long
                  </span>
                </>
              )}
            </div>
          )}

          {/* Validation Error Message */}
          {validationError && (
            <div className="p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FCA5A5] text-xs text-[#991B1B] flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1">
                <span className="font-semibold">Validation Issue:</span>
                <p className="leading-relaxed">{validationError}</p>
              </div>
              <button
                type="button"
                onClick={handleReset}
                className="text-xs font-semibold text-[#991B1B] hover:underline"
              >
                Retry
              </button>
            </div>
          )}

          {/* Selected File Details */}
          {selectedFile && detectedDuration != null && (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-[#FAF6F1] border border-[#E8DFD4] flex items-center justify-between text-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-white border border-[#E8DFD4] flex items-center justify-center text-[#C2410C] shrink-0">
                    <FileVideo className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-[#1B1A17] truncate">{selectedFile.name}</div>
                    <div className="text-[#5C564E] flex items-center gap-2 mt-0.5">
                      <span>{(selectedFile.size / (1024 * 1024)).toFixed(1)} MB</span>
                      <span>&middot;</span>
                      <span className="flex items-center gap-1 font-mono text-[#1B1A17]">
                        <Clock className="w-3 h-3 text-[#C2410C]" /> {formatDuration(detectedDuration)}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleReset}
                  disabled={isUploading}
                  className="p-1 text-[#5C564E] hover:text-[#DC2626] transition-colors"
                  title="Change file"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              {/* Upload Progress Bar */}
              {isUploading && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-[#5C564E]">
                    <span>Uploading & processing video...</span>
                    <span className="font-mono font-semibold">{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-[#E8DFD4] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#C2410C] transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Consent Checkbox */}
              <div className="p-3 rounded-xl bg-white border border-[#E8DFD4] flex items-start gap-2.5 text-xs text-[#1B1A17]">
                <input
                  id="consent-upload-check"
                  type="checkbox"
                  checked={consentChecked}
                  onChange={(e) => setConsentChecked(e.target.checked)}
                  disabled={isUploading}
                  className="mt-0.5 w-4 h-4 rounded text-[#C2410C] focus:ring-[#C2410C] border-[#D7C9BA] cursor-pointer"
                />
                <label htmlFor="consent-upload-check" className="cursor-pointer select-none leading-relaxed">
                  I agree my video and its AI-generated analysis can be viewed by recruiters.
                </label>
              </div>

              {/* Upload Failure Error Alert with Retry */}
              {uploadError && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start justify-between gap-2.5">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-red-800 block">Upload failed</span>
                      <span className="text-[11px] text-red-600 leading-relaxed block mt-0.5">{uploadError}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleConfirmUpload}
                    disabled={isUploading}
                    className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shrink-0 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>
          )}
        </div>


        {/* Footer Actions */}
        <div className="px-5 py-4 border-t border-[#E8DFD4] bg-[#FAF6F1] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="px-4 py-2 rounded-xl border border-[#D7C9BA] text-[#5C564E] hover:text-[#1B1A17] hover:bg-white text-xs font-semibold transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={!selectedFile || detectedDuration == null || !consentChecked || isUploading}
            onClick={handleConfirmUpload}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold shadow-xs transition-colors ${
              selectedFile && consentChecked && !isUploading
                ? 'bg-[#C2410C] hover:bg-[#9A3412] text-white cursor-pointer'
                : 'bg-[#D7C9BA] text-white/80 cursor-not-allowed'
            }`}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Uploading ({uploadProgress}%)...</span>
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Video</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
