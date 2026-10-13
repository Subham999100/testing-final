// ============================================================
// Clyptus Job Portal - Candidate Portal
// Component: PhotoCropModal
// Aspect-ratio configurable crop modal (1:1 circular avatar 400x400 or 4:1 banner 1584x396)
// With zoom & pan, client-side canvas preview, EXIF-clean webp export
// Candidate-owned (zero recruiter-portal dependencies)
// ============================================================

import React, { useState, useRef, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, Check, Loader2 } from 'lucide-react';

export interface PhotoCropModalProps {
  imageFile: File | null;
  isOpen: boolean;
  onClose: () => void;
  onCropComplete: (croppedBlob: Blob) => Promise<void>;
  isLoading: boolean;
  aspectRatio?: '1:1' | '4:1';
}

export const PhotoCropModal: React.FC<PhotoCropModalProps> = ({
  imageFile,
  isOpen,
  onClose,
  onCropComplete,
  isLoading,
  aspectRatio = '1:1',
}) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const targetWidth = aspectRatio === '4:1' ? 1584 : 400;
  const targetHeight = aspectRatio === '4:1' ? 396 : 400;

  useEffect(() => {
    if (!imageFile) {
      setImageSrc(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      setZoom(1);
      setRotation(0);
      setPan({ x: 0, y: 0 });
    };
    reader.readAsDataURL(imageFile);
  }, [imageFile]);

  // Load HTMLImageElement
  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imgRef.current = img;
      drawCanvas();
    };
    img.src = imageSrc;
  }, [imageSrc, zoom, rotation, pan, aspectRatio]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    ctx.clearRect(0, 0, targetWidth, targetHeight);

    // Save context
    ctx.save();

    // Center origin
    ctx.translate(targetWidth / 2, targetHeight / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);
    ctx.translate(pan.x, pan.y);

    // Calculate scale to cover canvas
    const imgAspect = img.width / img.height;
    const canvasAspect = targetWidth / targetHeight;

    let drawWidth: number;
    let drawHeight: number;

    if (imgAspect > canvasAspect) {
      drawHeight = targetHeight;
      drawWidth = targetHeight * imgAspect;
    } else {
      drawWidth = targetWidth;
      drawHeight = targetWidth / imgAspect;
    }

    ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    ctx.restore();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleSaveCrop = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob(
      (blob) => {
        if (blob) {
          void onCropComplete(blob);
        }
      },
      'image/webp',
      0.9,
    );
  };

  if (!isOpen || !imageFile) return null;

  const isCover = aspectRatio === '4:1';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="crop-modal-title"
    >
      <div className={`bg-white rounded-2xl w-full ${isCover ? 'max-w-2xl' : 'max-w-md'} shadow-xl border border-[#E8DFD4] overflow-hidden`}>
        <div className="p-4 sm:p-5 border-b border-[#E8DFD4] flex items-center justify-between">
          <div>
            <h3 id="crop-modal-title" className="font-semibold text-[#1B1A17] text-base font-serif">
              {isCover ? 'Crop Cover Banner' : 'Crop Profile Photo'}
            </h3>
            <p className="text-xs text-[#5C564E] mt-0.5">
              {isCover
                ? 'Adjust and reposition banner (locked to 4:1 aspect ratio, 1584x396)'
                : 'Adjust and center your portrait photo (400x400)'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="p-1 rounded-lg text-[#5C564E] hover:text-[#1B1A17] hover:bg-[#FAF6F1] transition-colors"
            aria-label="Close crop modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Crop Stage Area */}
        <div className="p-6 flex flex-col items-center justify-center bg-[#1B1A17] select-none overflow-hidden relative">
          <div
            className={`relative overflow-hidden border-2 border-[#C2410C] shadow-lg cursor-grab active:cursor-grabbing ${
              isCover ? 'w-full aspect-[4/1] max-w-[560px] rounded-lg' : 'w-64 h-64 rounded-full'
            }`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <canvas
              ref={canvasRef}
              className="w-full h-full object-cover"
              style={{ width: '100%', height: '100%' }}
            />
          </div>

          <p className="text-[11px] text-[#FAF6F1]/80 mt-3">
            Click and drag inside area to reposition image
          </p>
        </div>

        {/* Controls: Zoom & Rotate */}
        <div className="p-4 sm:p-5 bg-white space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-1">
              <ZoomOut className="w-4 h-4 text-[#5C564E]" />
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                aria-label="Zoom photo"
                className="w-full h-1.5 bg-[#E8DFD4] rounded-lg appearance-none cursor-pointer accent-[#C2410C]"
              />
              <ZoomIn className="w-4 h-4 text-[#5C564E]" />
            </div>

            <button
              type="button"
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="px-3 py-1.5 rounded-lg border border-[#E8DFD4] text-[#1B1A17] hover:bg-[#FAF6F1] text-xs font-medium flex items-center gap-1.5 transition-colors"
              title="Rotate 90 degrees"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Rotate</span>
            </button>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E8DFD4]">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl border border-[#E8DFD4] text-[#1B1A17] hover:bg-[#FAF6F1] text-xs font-semibold transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveCrop}
              disabled={isLoading}
              className="px-5 py-2 rounded-xl bg-[#C2410C] hover:bg-[#9A3412] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Apply Photo</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default PhotoCropModal;
