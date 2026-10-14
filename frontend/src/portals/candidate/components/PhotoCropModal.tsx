// ============================================================
// Clyptus Job Portal - Candidate Portal
// Component: PhotoCropModal
// Aspect-ratio configurable crop modal:
// - Cover Banner: locked to 4:1, canvas export 1584x396
// - Profile Photo (Avatar): locked to 1:1, canvas export 400x400
// Features: Zoom, rotation, pan, canvas crop with async Promise toBlob,
// client-side preview, clean WebP/JPEG export, and double-click prevention
// ============================================================

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, Check, Loader2 } from 'lucide-react';
import { getCroppedCanvasBlob } from '../lib/crop.util';

export interface PhotoCropModalProps {
  imageFile: File | null;
  isOpen: boolean;
  onClose: () => void;
  onCropComplete: (croppedBlob: Blob, previewUrl: string) => Promise<void>;
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
  const [initialPan, setInitialPan] = useState({ x: 0, y: 0 });
  const [isGeneratingCrop, setIsGeneratingCrop] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const isCover = aspectRatio === '4:1';
  const targetWidth = isCover ? 1584 : 400;
  const targetHeight = isCover ? 396 : 400;

  // Draw the image on preview canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !img.complete) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0, 0, targetWidth, targetHeight);

    ctx.save();
    ctx.translate(targetWidth / 2, targetHeight / 2);

    if (rotation !== 0) {
      ctx.rotate((rotation * Math.PI) / 180);
    }

    ctx.scale(zoom, zoom);
    ctx.translate(pan.x, pan.y);

    const imgAspect = img.naturalWidth / img.naturalHeight;
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
  }, [targetWidth, targetHeight, rotation, zoom, pan]);

  // Read selected file as data URL
  useEffect(() => {
    if (!imageFile) {
      setImageSrc(null);
      imgRef.current = null;
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

  // Load HTMLImageElement once when imageSrc changes
  useEffect(() => {
    if (!imageSrc) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imgRef.current = img;
      drawCanvas();
    };
    img.src = imageSrc;
  }, [imageSrc, drawCanvas]);

  // Redraw preview whenever transform props change
  useEffect(() => {
    if (imgRef.current) {
      drawCanvas();
    }
  }, [drawCanvas]);

  // Mouse & touch drag handling
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialPan({ ...pan });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleFactor = targetWidth / (rect.width || targetWidth);
    const deltaX = (e.clientX - dragStart.x) * scaleFactor;
    const deltaY = (e.clientY - dragStart.y) * scaleFactor;
    setPan({
      x: initialPan.x + deltaX,
      y: initialPan.y + deltaY,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Apply button handler
  const handleApply = async () => {
    console.log('[PhotoCropModal] Apply click triggered', {
      aspectRatio,
      targetWidth,
      targetHeight,
      zoom,
      rotation,
      pan,
    });

    if (!imgRef.current) {
      console.error('[PhotoCropModal] Image not loaded yet');
      return;
    }

    try {
      setIsGeneratingCrop(true);

      const croppedBlob = await getCroppedCanvasBlob(
        imgRef.current,
        pan,
        zoom,
        rotation,
        targetWidth,
        targetHeight,
        'image/webp',
        0.9,
      );

      const previewUrl = URL.createObjectURL(croppedBlob);
      console.log('[PhotoCropModal] Crop result generated', {
        blobSize: croppedBlob.size,
        blobType: croppedBlob.type,
        previewUrl,
      });

      // Pass cropped blob and instant previewUrl back to parent
      await onCropComplete(croppedBlob, previewUrl);
      console.log('[PhotoCropModal] onCropComplete completed successfully');
    } catch (err) {
      console.error('[PhotoCropModal] Error during crop application:', err);
    } finally {
      setIsGeneratingCrop(false);
    }
  };

  if (!isOpen || !imageFile) return null;

  const isBusy = isLoading || isGeneratingCrop;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="crop-modal-title"
    >
      <div
        className={`bg-white rounded-2xl w-full ${
          isCover ? 'max-w-2xl' : 'max-w-md'
        } shadow-xl border border-[#E8DFD4] overflow-hidden`}
      >
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
            disabled={isBusy}
            className="p-1 rounded-lg text-[#5C564E] hover:text-[#1B1A17] hover:bg-[#FAF6F1] transition-colors disabled:opacity-50"
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
              className="w-full h-full object-cover block"
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
              disabled={isBusy}
              className="px-3 py-1.5 rounded-lg border border-[#E8DFD4] text-[#1B1A17] hover:bg-[#FAF6F1] text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
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
              disabled={isBusy}
              className="px-4 py-2 rounded-xl border border-[#E8DFD4] text-[#1B1A17] hover:bg-[#FAF6F1] text-xs font-semibold transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={isBusy}
              className="px-5 py-2 rounded-xl bg-[#C2410C] hover:bg-[#9A3412] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
            >
              {isBusy ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Applying...</span>
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
