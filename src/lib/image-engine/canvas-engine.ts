import { ImageDimensions, ImageErrorCode, ImageProcessingSettings, ProcessedImageItem } from '../../types/image';
import {
  detectMimeFromBytes,
  getDeviceMemorySafeLimits,
  getExtensionFromMime,
  isSupportedImageFile,
  parseHeaderDimensions,
  parseJpegExifOrientation,
  sanitizeJpegBytes,
} from './file-utils';
import { optimizeToTargetSize } from './target-size';

export class ImageProcessingError extends Error {
  code: ImageErrorCode;
  isTransientMemoryError: boolean;

  constructor(code: ImageErrorCode, message: string, isTransientMemoryError = false) {
    super(message);
    this.name = 'ImageProcessingError';
    this.code = code;
    this.isTransientMemoryError = isTransientMemoryError;
  }
}

export interface ProcessImageResult {
  blob: Blob;
  url: string;
  size: number;
  dimensions: ImageDimensions;
  format: string;
  savedPercent: number;
  targetAchieved?: {
    targetKB: number;
    actualKB: number;
    note: string;
  };
}

export interface DecodedImageSource {
  source: ImageBitmap | HTMLImageElement;
  width: number;
  height: number;
  isBitmap: boolean;
  close: () => void;
}

/**
 * Calculates target output dimensions based on user settings,
 * while respecting device memory safety limits.
 */
export function calculateTargetDimensions(
  original: ImageDimensions,
  settings: ImageProcessingSettings
): ImageDimensions {
  const limits = getDeviceMemorySafeLimits();

  // Guard against missing or zero dimensions
  const origW = original && original.width > 0 ? original.width : 1920;
  const origH = original && original.height > 0 ? original.height : 1080;

  // If user requested custom resize:
  if (settings.resizeEnabled) {
    if (settings.resizeScalePercent && settings.resizeScalePercent > 0 && settings.resizeScalePercent <= 200) {
      const factor = settings.resizeScalePercent / 100;
      return {
        width: Math.max(1, Math.round(origW * factor)),
        height: Math.max(1, Math.round(origH * factor)),
      };
    }

    const { resizeWidth, resizeHeight, lockAspectRatio } = settings;

    if (resizeWidth && resizeHeight) {
      if (lockAspectRatio) {
        const ratio = Math.min(resizeWidth / origW, resizeHeight / origH);
        return {
          width: Math.max(1, Math.round(origW * ratio)),
          height: Math.max(1, Math.round(origH * ratio)),
        };
      }
      return {
        width: Math.max(1, Math.round(resizeWidth)),
        height: Math.max(1, Math.round(resizeHeight)),
      };
    }

    if (resizeWidth && !resizeHeight) {
      const factor = resizeWidth / origW;
      return {
        width: Math.max(1, Math.round(resizeWidth)),
        height: lockAspectRatio ? Math.max(1, Math.round(origH * factor)) : origH,
      };
    }

    if (!resizeWidth && resizeHeight) {
      const factor = resizeHeight / origH;
      return {
        width: lockAspectRatio ? Math.max(1, Math.round(origW * factor)) : origW,
        height: Math.max(1, Math.round(resizeHeight)),
      };
    }
  }

  // If resize is NOT enabled:
  // Automatically calculate safe working resolution while preserving exact aspect ratio
  let targetW = origW;
  let targetH = origH;
  const maxDim = Math.max(targetW, targetH);
  const area = targetW * targetH;

  if (maxDim > limits.safeWorkingMaxDim || area > limits.safeWorkingMaxArea) {
    // Gracefully scale down to safe working limit preserving exact aspect ratio
    const dimScale = limits.safeWorkingMaxDim / maxDim;
    const areaScale = Math.sqrt(limits.safeWorkingMaxArea / area);
    const safeScale = Math.min(dimScale, areaScale);

    targetW = Math.max(1, Math.round(targetW * safeScale));
    targetH = Math.max(1, Math.round(targetH * safeScale));
  }

  return { width: targetW, height: targetH };
}

/**
 * Loads a Blob into an HTMLImageElement without setting crossOrigin on same-origin
 * blob: URLs and without racing img.decode() against img.onload.
 */
function loadBlobViaHtmlImage(blob: Blob): Promise<{
  img: HTMLImageElement;
  width: number;
  height: number;
  close: () => void;
}> {
  const url = URL.createObjectURL(blob);
  return new Promise((resolve, reject) => {
    const img = new Image();
    let isSettled = false;
    let isClosed = false;

    const close = () => {
      if (!isClosed) {
        isClosed = true;
        URL.revokeObjectURL(url);
        img.onload = null;
        img.onerror = null;
        img.src = '';
      }
    };

    img.onload = () => {
      if (!isSettled) {
        isSettled = true;
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        if (w > 0 && h > 0) {
          resolve({ img, width: w, height: h, close });
        } else {
          close();
          reject(new Error('Loaded image has zero dimensions'));
        }
      }
    };

    img.onerror = () => {
      if (!isSettled) {
        isSettled = true;
        close();
        reject(new Error('HTMLImageElement failed to load blob'));
      }
    };

    img.src = url;
  });
}

/**
 * Draws a decoded image source (HTMLImageElement or ImageBitmap) onto a newly
 * allocated canvas of targetDims, applying manual EXIF orientation if the source
 * was decoded without automatic EXIF rotation (e.g. when EXIF was stripped or
 * plain createImageBitmap was used on an older browser).
 */
function renderSourceToCanvas(
  source: ImageBitmap | HTMLImageElement,
  sourceW: number,
  sourceH: number,
  targetDims: ImageDimensions,
  outputMime: string,
  manualExifOrientation = 1
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = targetDims.width;
  canvas.height = targetDims.height;

  try {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new ImageProcessingError(
        'MEMORY_ERROR',
        'This image is too large for this device to process safely.',
        true
      );
    }

    if (outputMime === 'image/jpeg') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, targetDims.width, targetDims.height);
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Determine if the decoded source needs manual 90/180/270 EXIF rotation:
    // If manualExifOrientation is 5..8 AND the source's aspect orientation is still unrotated
    // compared to targetDims, or if manualExifOrientation is 2..4 when EXIF was stripped:
    const needsManualTransform =
      manualExifOrientation > 1 &&
      (manualExifOrientation <= 4 ||
        (sourceW > sourceH) !== (targetDims.width > targetDims.height));

    if (needsManualTransform) {
      const w = targetDims.width;
      const h = targetDims.height;
      ctx.save();
      switch (manualExifOrientation) {
        case 2:
          ctx.translate(w, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(source, 0, 0, w, h);
          break;
        case 3:
          ctx.translate(w, h);
          ctx.rotate(Math.PI);
          ctx.drawImage(source, 0, 0, w, h);
          break;
        case 4:
          ctx.translate(0, h);
          ctx.scale(1, -1);
          ctx.drawImage(source, 0, 0, w, h);
          break;
        case 5:
          ctx.rotate(0.5 * Math.PI);
          ctx.scale(1, -1);
          ctx.drawImage(source, 0, 0, h, w);
          break;
        case 6:
          ctx.translate(w, 0);
          ctx.rotate(0.5 * Math.PI);
          ctx.drawImage(source, 0, 0, h, w);
          break;
        case 7:
          ctx.translate(w, h);
          ctx.rotate(0.5 * Math.PI);
          ctx.scale(-1, 1);
          ctx.drawImage(source, 0, 0, h, w);
          break;
        case 8:
          ctx.translate(0, h);
          ctx.rotate(-0.5 * Math.PI);
          ctx.drawImage(source, 0, 0, h, w);
          break;
        default:
          ctx.drawImage(source, 0, 0, w, h);
          break;
      }
      ctx.restore();
    } else {
      ctx.drawImage(source, 0, 0, targetDims.width, targetDims.height);
    }

    return canvas;
  } catch (err) {
    canvas.width = 0;
    canvas.height = 0;
    throw err;
  }
}

/**
 * Multi-stage resilient decode-and-draw pipeline for real-world phone photos:
 * - Normalizes MIME type from binary magic bytes.
 * - Tries HTMLImageElement (stream-decoded by browser into target canvas).
 * - Tries createImageBitmap with medium resize / from-image orientation / plain options.
 * - If an Android camera JPEG fails due to vendor APP segments, MPF depth maps,
 *   or corrupted EXIF/ICC headers, sanitizes the JPEG bitstream and retries while
 *   preserving EXIF orientation.
 * - Guarantees strict try/finally cleanup of every ImageBitmap, object URL, and canvas.
 */
async function decodeAndRenderToCanvas(
  file: Blob,
  initialTargetDims: ImageDimensions,
  originalDims: ImageDimensions,
  outputMime: string
): Promise<{ canvas: HTMLCanvasElement; actualDims: ImageDimensions }> {
  let rawBytes: Uint8Array | null = null;
  let detectedMime = file.type || 'image/jpeg';
  let exifOrientation = 1;

  try {
    const ab = await file.arrayBuffer();
    rawBytes = new Uint8Array(ab);
    if (rawBytes.length === 0) {
      throw new ImageProcessingError(
        'DECODE_ERROR',
        'Image could not be decoded. The file may be corrupted or in an unsupported format.'
      );
    }
    detectedMime = detectMimeFromBytes(rawBytes, file.type, file instanceof File ? file.name : '');
    if (detectedMime === 'image/jpeg') {
      exifOrientation = parseJpegExifOrientation(rawBytes);
    }
  } catch (err) {
    if (err instanceof ImageProcessingError) throw err;
    // Continue with original blob if arrayBuffer read failed
  }

  // Re-verify dimensions from full rawBytes if initial originalDims was a fallback
  let targetDims = initialTargetDims;
  if (rawBytes) {
    const headerDims = parseHeaderDimensions(rawBytes);
    if (
      headerDims &&
      headerDims.width > 0 &&
      headerDims.height > 0 &&
      (originalDims.width !== headerDims.width || originalDims.height !== headerDims.height)
    ) {
      // If header dimensions were rotated or refined, keep targetDims aspect ratio consistent
      if ((headerDims.width > headerDims.height) !== (targetDims.width > targetDims.height)) {
        targetDims = { width: targetDims.height, height: targetDims.width };
      }
    }
  }

  const normalizedBlob =
    rawBytes && detectedMime
      ? new Blob([rawBytes as unknown as BlobPart], { type: detectedMime })
      : file;

  const tryDecodeBlobToCanvas = async (
    blobToDecode: Blob,
    dims: ImageDimensions,
    manualOrientation = 1
  ): Promise<HTMLCanvasElement> => {
    // Strategy A: HTMLImageElement (uses native browser streaming JPEG DCT scaling into target canvas)
    try {
      const loaded = await loadBlobViaHtmlImage(blobToDecode);
      try {
        return renderSourceToCanvas(
          loaded.img,
          loaded.width,
          loaded.height,
          dims,
          outputMime,
          manualOrientation
        );
      } finally {
        loaded.close();
      }
    } catch {
      // Fall through to Strategy B
    }

    // Strategy B: createImageBitmap variations
    if (typeof createImageBitmap === 'function') {
      // B1: Downscaled createImageBitmap with resizeQuality: 'medium' (only when no 90/270 rotation ambiguity)
      if (exifOrientation <= 4 && dims.width > 0 && dims.height > 0) {
        let bitmap: ImageBitmap | null = null;
        try {
          bitmap = await createImageBitmap(blobToDecode, {
            resizeWidth: dims.width,
            resizeHeight: dims.height,
            resizeQuality: 'medium',
            imageOrientation: 'from-image',
          });
          return renderSourceToCanvas(
            bitmap,
            bitmap.width,
            bitmap.height,
            dims,
            outputMime,
            manualOrientation
          );
        } catch {
          // Fall through
        } finally {
          if (bitmap) {
            try {
              bitmap.close();
            } catch {}
          }
        }
      }

      // B2: Standard createImageBitmap with imageOrientation: 'from-image'
      {
        let bitmap: ImageBitmap | null = null;
        try {
          bitmap = await createImageBitmap(blobToDecode, {
            imageOrientation: 'from-image',
          });
          return renderSourceToCanvas(
            bitmap,
            bitmap.width,
            bitmap.height,
            dims,
            outputMime,
            manualOrientation
          );
        } catch {
          // Fall through
        } finally {
          if (bitmap) {
            try {
              bitmap.close();
            } catch {}
          }
        }
      }

      // B3: Plain createImageBitmap without options (maximum mobile browser compatibility)
      {
        let bitmap: ImageBitmap | null = null;
        try {
          bitmap = await createImageBitmap(blobToDecode);
          return renderSourceToCanvas(
            bitmap,
            bitmap.width,
            bitmap.height,
            dims,
            outputMime,
            manualOrientation > 1 ? manualOrientation : exifOrientation
          );
        } catch {
          // Fall through
        } finally {
          if (bitmap) {
            try {
              bitmap.close();
            } catch {}
          }
        }
      }
    }

    throw new Error('All primary decode strategies failed for blob');
  };

  // Pass 1: Decode normalizedBlob at targetDims
  try {
    const canvas = await tryDecodeBlobToCanvas(normalizedBlob, targetDims, 1);
    return { canvas, actualDims: targetDims };
  } catch {
    // Continue to Pass 2
  }

  // Pass 2: If JPEG, sanitize JPEG bitstream (strips trailing MPF/UltraHDR streams and vendor APP segments)
  if (rawBytes && detectedMime === 'image/jpeg') {
    // 2A: Sanitize keeping EXIF APP1
    const cleanKeepExif = sanitizeJpegBytes(rawBytes, false);
    if (cleanKeepExif) {
      try {
        const cleanBlob = new Blob([cleanKeepExif as unknown as BlobPart], { type: 'image/jpeg' });
        const canvas = await tryDecodeBlobToCanvas(cleanBlob, targetDims, exifOrientation);
        return { canvas, actualDims: targetDims };
      } catch {
        // Continue to 2B
      }
    }

    // 2B: Sanitize stripping EXIF APP1 as well (recovers JPEGs with corrupted EXIF/TIFF tables)
    // and apply the parsed exifOrientation (1..8) manually on the canvas!
    const cleanStripExif = sanitizeJpegBytes(rawBytes, true);
    if (cleanStripExif) {
      try {
        const cleanBlob = new Blob([cleanStripExif as unknown as BlobPart], { type: 'image/jpeg' });
        const canvas = await tryDecodeBlobToCanvas(cleanBlob, targetDims, exifOrientation);
        return { canvas, actualDims: targetDims };
      } catch {
        // Continue to Pass 3
      }
    }
  }

  // Pass 3: If decoding failed due to device memory pressure on large dimensions, step down by 0.65x
  if (targetDims.width > 1024 || targetDims.height > 1024) {
    const reducedDims: ImageDimensions = {
      width: Math.max(320, Math.round(targetDims.width * 0.65)),
      height: Math.max(240, Math.round(targetDims.height * 0.65)),
    };
    try {
      const reducedBytes = rawBytes ? sanitizeJpegBytes(rawBytes, true) || rawBytes : null;
      const sourceForReduced =
        reducedBytes && detectedMime === 'image/jpeg'
          ? new Blob([reducedBytes as unknown as BlobPart], { type: 'image/jpeg' })
          : normalizedBlob;
      const canvas = await tryDecodeBlobToCanvas(
        sourceForReduced,
        reducedDims,
        exifOrientation
      );
      return { canvas, actualDims: reducedDims };
    } catch {
      // Fall through to error classification
    }
  }

  if (detectedMime === 'image/heic') {
    throw new ImageProcessingError(
      'UNSUPPORTED_FORMAT',
      'This image format is not supported.'
    );
  }

  throw new ImageProcessingError(
    'DECODE_ERROR',
    'Image could not be decoded. The file may be corrupted or in an unsupported format.'
  );
}

/**
 * Encodes canvas to a Blob using canvas.toBlob() with automatic memory recovery.
 * If canvas.toBlob returns null due to device memory constraints, attempts a graceful
 * downsample recovery before failing with a helpful error message.
 */
export function canvasToBlobAsync(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality?: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      if (!canvas || canvas.width <= 0 || canvas.height <= 0) {
        reject(
          new ImageProcessingError(
            'DIMENSION_ERROR',
            'This image is too large for this device to process safely. Try a smaller image or resize it first.'
          )
        );
        return;
      }

      canvas.toBlob(
        async (blob) => {
          if (blob) {
            resolve(blob);
            return;
          }

          // If blob is null, the browser rejected encoding due to memory constraints.
          // Attempt automatic graceful recovery if canvas is large:
          if (canvas.width > 1200 || canvas.height > 1200) {
            let recCanvas: HTMLCanvasElement | null = null;
            try {
              const recScale = 0.75;
              const recW = Math.max(640, Math.round(canvas.width * recScale));
              const recH = Math.max(480, Math.round(canvas.height * recScale));
              recCanvas = document.createElement('canvas');
              recCanvas.width = recW;
              recCanvas.height = recH;
              const recCtx = recCanvas.getContext('2d');
              if (recCtx) {
                if (mimeType === 'image/jpeg') {
                  recCtx.fillStyle = '#ffffff';
                  recCtx.fillRect(0, 0, recW, recH);
                }
                recCtx.imageSmoothingEnabled = true;
                recCtx.imageSmoothingQuality = 'medium';
                recCtx.drawImage(canvas, 0, 0, recW, recH);

                const targetRec = recCanvas;
                targetRec.toBlob(
                  (recBlob) => {
                    targetRec.width = 0;
                    targetRec.height = 0;
                    if (recBlob) {
                      resolve(recBlob);
                    } else {
                      reject(
                        new ImageProcessingError(
                          'MEMORY_ERROR',
                          'This image is too large for this device to process safely.',
                          true
                        )
                      );
                    }
                  },
                  mimeType,
                  quality
                );
                return;
              }
            } catch {
              if (recCanvas) {
                recCanvas.width = 0;
                recCanvas.height = 0;
              }
            }
          }

          // Fallback check if WebP encoding failed in an older WebKit environment
          if (mimeType === 'image/webp') {
            try {
              canvas.toBlob(
                (fallbackBlob) => {
                  if (fallbackBlob) resolve(fallbackBlob);
                  else
                    reject(
                      new ImageProcessingError(
                        'MEMORY_ERROR',
                        'This image is too large for this device to process safely.',
                        true
                      )
                    );
                },
                'image/jpeg',
                quality
              );
              return;
            } catch {
              // Fallthrough
            }
          }

          reject(
            new ImageProcessingError(
              'MEMORY_ERROR',
              'This image is too large for this device to process safely.',
              true
            )
          );
        },
        mimeType,
        quality
      );
    } catch (err: any) {
      reject(
        new ImageProcessingError('COMPRESSION_ERROR', err?.message || 'Compression failed: Canvas export error.')
      );
    }
  });
}

/**
 * Executes the unified, memory-efficient image processing pipeline.
 * Guarantees zero residual allocations:
 * - Temporary ImageBitmaps are explicitly closed
 * - Temporary object URLs are revoked
 * - Temporary canvas buffers are explicitly reset to 0x0
 */
export async function processSingleImage(
  item: ProcessedImageItem,
  onProgress?: (progress: number, stepMsg: string) => void
): Promise<ProcessImageResult> {
  const limits = getDeviceMemorySafeLimits();
  const file = item.file;

  // 1. Initial Format and Size Validation
  if (!file || file.size === 0) {
    throw new ImageProcessingError(
      'DECODE_ERROR',
      'Image could not be decoded. The file may be corrupted or in an unsupported format.'
    );
  }

  if (!isSupportedImageFile(file)) {
    throw new ImageProcessingError('UNSUPPORTED_FORMAT', 'This image format is not supported.');
  }

  // 2. Validate Dimensions Safety Check
  const origW = item.originalDimensions.width;
  const origH = item.originalDimensions.height;

  if (
    (origW > 0 && origW > limits.maxDimensionAllowed) ||
    (origH > 0 && origH > limits.maxDimensionAllowed) ||
    (origW > 0 && origH > 0 && origW * origH > limits.maxAreaAllowed)
  ) {
    throw new ImageProcessingError(
      'DIMENSION_ERROR',
      'This image is too large for this device to process safely. Try a smaller image or resize it first.'
    );
  }

  // 3. Determine Output MIME Type
  let outputMime = item.settings.outputFormat;
  if (outputMime === 'original') {
    outputMime = (item.originalFormat || 'image/jpeg') as any;
  }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(outputMime)) {
    outputMime = 'image/jpeg';
  }

  onProgress?.(15, 'Preparing memory-safe decode...');
  const initialTargetDims = calculateTargetDimensions(item.originalDimensions, item.settings);

  // 4. Multi-stage resilient decode and render onto target canvas
  onProgress?.(35, 'Decoding image...');
  let canvas: HTMLCanvasElement | null = null;
  let targetDims = initialTargetDims;

  try {
    const decodedResult = await decodeAndRenderToCanvas(
      file,
      initialTargetDims,
      item.originalDimensions,
      outputMime
    );
    canvas = decodedResult.canvas;
    targetDims = decodedResult.actualDims;
  } catch (err: any) {
    const msg = String(err?.message || '').toLowerCase();
    if (
      msg.includes('memory') ||
      msg.includes('quota') ||
      msg.includes('allocation') ||
      msg.includes('arraybuffer') ||
      msg.includes('heap') ||
      msg.includes('out of memory')
    ) {
      throw new ImageProcessingError(
        'MEMORY_ERROR',
        'This image is too large for this device to process safely.',
        true
      );
    }
    if (err instanceof ImageProcessingError) {
      throw err;
    }
    const msgLower = msg;
    if (msgLower.includes('unsupported') || msgLower.includes('not supported') || msgLower.includes('avif') || msgLower.includes('heic')) {
      throw new ImageProcessingError('UNSUPPORTED_FORMAT', 'This image format is not supported by your browser.');
    }
    throw new ImageProcessingError(
      'DECODE_ERROR',
      'Image could not be decoded. The file may be corrupted or in an unsupported format.'
    );
  }

  try {
    // 5. Compression / Target Size
    let finalBlob: Blob;
    let finalDims = targetDims;
    let targetAchievedInfo: ProcessImageResult['targetAchieved'] = undefined;

    if (item.settings.targetSizeEnabled && item.settings.targetSizeKB && item.settings.targetSizeKB > 0) {
      onProgress?.(70, `Targeting ${item.settings.targetSizeKB} KB...`);
      const targetResult = await optimizeToTargetSize(
        canvas,
        outputMime,
        item.settings.targetSizeKB,
        (step) => onProgress?.(80, step)
      );
      finalBlob = targetResult.blob;
      finalDims = targetResult.dimensions;
      targetAchievedInfo = {
        targetKB: item.settings.targetSizeKB,
        actualKB: +(finalBlob.size / 1024).toFixed(1),
        note: targetResult.note,
      };
    } else {
      onProgress?.(75, 'Encoding compressed file...');
      let quality = typeof item.settings.quality === 'number' ? item.settings.quality : 0.75;
      if (item.settings.compressionPreset === 'none') {
        quality = 1.0;
      } else if (item.settings.compressionPreset === 'light') {
        quality = 0.88;
      } else if (item.settings.compressionPreset === 'balanced') {
        quality = 0.75;
      } else if (item.settings.compressionPreset === 'max') {
        quality = 0.50;
      } else {
        quality = Math.max(0.10, Math.min(1.0, quality));
      }

      if (outputMime === 'image/png') {
        finalBlob = await canvasToBlobAsync(canvas, 'image/png');
      } else {
        finalBlob = await canvasToBlobAsync(canvas, outputMime, quality);
      }
    }

    onProgress?.(95, 'Finalizing result...');
    const resultUrl = URL.createObjectURL(finalBlob);
    const originalSize = item.originalSize || file.size;
    const savedBytes = originalSize - finalBlob.size;
    const savedPercent = Math.max(0, Math.round((savedBytes / originalSize) * 100));

    return {
      blob: finalBlob,
      url: resultUrl,
      size: finalBlob.size,
      dimensions: finalDims,
      format: getExtensionFromMime(outputMime).toUpperCase(),
      savedPercent,
      targetAchieved: targetAchievedInfo,
    };
  } finally {
    // 6. GUARANTEED CLEANUP: Reset canvas buffer to 0x0 to free GPU/RAM immediately
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
  }
}
