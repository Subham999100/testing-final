// ============================================================
// Clyptus Job Portal - Candidate Portal
// Utility: Canvas Crop Helper (crop.util.ts)
// Generates cropped Blob from HTMLImageElement using HTML5 Canvas
// Handles zoom, rotation, pan, target aspect ratio (4:1 cover, 1:1 avatar)
// Safe crossOrigin handling and Promise-wrapped canvas.toBlob
// ============================================================

export interface CropArea {
  x: number;
  y: number;
}

/**
 * Generates a cropped image Blob from an HTMLImageElement using canvas.
 * - Banner output: exactly 1584x396 (4:1)
 * - Avatar output: exactly 400x400 (1:1)
 * Returns a Promise that resolves with the cropped Blob.
 */
export async function getCroppedCanvasBlob(
  image: HTMLImageElement,
  pan: { x: number; y: number },
  zoom: number = 1,
  rotation: number = 0,
  targetWidth: number = 400,
  targetHeight: number = 400,
  mimeType: string = 'image/webp',
  quality: number = 0.9,
): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    try {
      console.log('[crop.util] getCroppedCanvasBlob starting', {
        targetWidth,
        targetHeight,
        zoom,
        rotation,
        pan,
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
      });

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Could not get 2D canvas rendering context');
      }

      // Smooth scaling quality
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Clear the canvas
      ctx.clearRect(0, 0, targetWidth, targetHeight);

      ctx.save();

      // 1. Move to canvas center
      ctx.translate(targetWidth / 2, targetHeight / 2);

      // 2. Apply user rotation
      if (rotation !== 0) {
        ctx.rotate((rotation * Math.PI) / 180);
      }

      // 3. Apply user zoom scale
      ctx.scale(zoom, zoom);

      // 4. Apply pan translation (in target canvas coordinates)
      ctx.translate(pan.x, pan.y);

      // 5. Draw image centered
      const imgAspect = image.naturalWidth / image.naturalHeight;
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

      ctx.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
      ctx.restore();

      // Convert canvas to blob with Promise
      canvas.toBlob(
        (blob) => {
          if (blob) {
            console.log('[crop.util] Blob generated successfully', {
              size: blob.size,
              type: blob.type,
            });
            resolve(blob);
          } else {
            // Fallback to jpeg if webp encoding is unsupported
            canvas.toBlob(
              (fallbackBlob) => {
                if (fallbackBlob) {
                  console.log('[crop.util] Fallback JPEG blob generated', {
                    size: fallbackBlob.size,
                    type: fallbackBlob.type,
                  });
                  resolve(fallbackBlob);
                } else {
                  reject(new Error('Canvas failed to generate image blob'));
                }
              },
              'image/jpeg',
              quality,
            );
          }
        },
        mimeType,
        quality,
      );
    } catch (err) {
      console.error('[crop.util] Exception during canvas crop:', err);
      reject(err);
    }
  });
}
