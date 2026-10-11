import { FormatExtension, ImageDimensions, SupportedFormat } from '../../types/image';

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatDimensions(dims?: ImageDimensions): string {
  if (!dims || !dims.width || !dims.height) return '—';
  return `${dims.width} × ${dims.height}`;
}

export function getMimeShortName(mime: string): string {
  if (!mime) return 'IMAGE';
  if (mime.includes('webp')) return 'WEBP';
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'JPG';
  if (mime.includes('png')) return 'PNG';
  if (mime.includes('gif')) return 'GIF';
  if (mime.includes('svg')) return 'SVG';
  if (mime.includes('bmp')) return 'BMP';
  if (mime.includes('avif')) return 'AVIF';
  return mime.split('/')[1]?.toUpperCase() || 'IMG';
}

export function getExtensionFromMime(mime: string): FormatExtension {
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/png') return 'png';
  return 'jpg';
}

export function getMimeFromExtension(ext: string): SupportedFormat {
  const clean = ext.toLowerCase().replace('.', '');
  if (clean === 'webp') return 'image/webp';
  if (clean === 'png') return 'image/png';
  if (clean === 'jpg' || clean === 'jpeg') return 'image/jpeg';
  return 'original';
}

export function isSupportedImageFile(file: File): boolean {
  const validMimes = [
    'image/jpeg',
    'image/jpg',
    'image/pjpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/bmp',
    'image/x-ms-bmp',
    'image/svg+xml',
    'image/avif',
  ];
  if (file.type && validMimes.includes(file.type.toLowerCase())) return true;
  const validExtensions = /\.(jpe?g|png|webp|gif|bmp|svg|avif)$/i;
  return validExtensions.test(file.name);
}

/**
 * Inspects binary magic bytes to determine the true MIME type of an image buffer.
 */
export function detectMimeFromBytes(
  bytes: Uint8Array,
  fallbackMime?: string,
  fileName?: string
): string {
  if (bytes && bytes.length >= 12) {
    // 1. JPEG: FF D8 FF
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
      return 'image/jpeg';
    }
    // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    ) {
      return 'image/png';
    }
    // 3. GIF: 'GIF87a' or 'GIF89a'
    if (
      bytes[0] === 0x47 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x38
    ) {
      return 'image/gif';
    }
    // 4. WebP: 'RIFF'....'WEBP'
    if (
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    ) {
      return 'image/webp';
    }
    // 5. BMP: 'BM'
    if (bytes[0] === 0x42 && bytes[1] === 0x4d) {
      return 'image/bmp';
    }
    // 6. ISO Base Media File Format (AVIF / HEIC): 'ftyp' at offset 4
    if (
      bytes[4] === 0x66 &&
      bytes[5] === 0x74 &&
      bytes[6] === 0x79 &&
      bytes[7] === 0x70
    ) {
      const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]).toLowerCase();
      if (brand === 'avif' || brand === 'avis' || brand === 'MA1B' || brand === 'MA1A') {
        return 'image/avif';
      }
      if (
        brand === 'heic' ||
        brand === 'heix' ||
        brand === 'hevc' ||
        brand === 'hevx' ||
        brand === 'mif1' ||
        brand === 'msf1'
      ) {
        return 'image/heic';
      }
    }
    // 7. SVG check in first 256 bytes
    try {
      const headStr = new TextDecoder('utf-8', { fatal: false })
        .decode(bytes.subarray(0, Math.min(bytes.length, 256)))
        .trim()
        .toLowerCase();
      if (headStr.startsWith('<svg') || (headStr.startsWith('<?xml') && headStr.includes('<svg'))) {
        return 'image/svg+xml';
      }
    } catch {
      // Ignore text decode errors
    }
  }

  const cleanFallback = (fallbackMime || '').trim().toLowerCase();
  if (cleanFallback === 'image/jpg' || cleanFallback === 'image/pjpeg') {
    return 'image/jpeg';
  }
  if (cleanFallback === 'image/x-ms-bmp') {
    return 'image/bmp';
  }
  if (cleanFallback && cleanFallback.startsWith('image/')) {
    return cleanFallback;
  }

  const lowerName = (fileName || '').toLowerCase();
  if (lowerName.endsWith('.png')) return 'image/png';
  if (lowerName.endsWith('.webp')) return 'image/webp';
  if (lowerName.endsWith('.gif')) return 'image/gif';
  if (lowerName.endsWith('.bmp')) return 'image/bmp';
  if (lowerName.endsWith('.svg')) return 'image/svg+xml';
  if (lowerName.endsWith('.avif')) return 'image/avif';
  return 'image/jpeg';
}

/**
 * Extracts EXIF orientation (1..8) from a JPEG buffer. Returns 1 if not present.
 */
export function parseJpegExifOrientation(bytes: Uint8Array): number {
  if (!bytes || bytes.length < 12 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return 1;
  }

  try {
    let offset = 2;
    const len = bytes.length;

    while (offset < len - 4) {
      if (bytes[offset] !== 0xff) {
        offset++;
        continue;
      }
      while (offset < len && bytes[offset] === 0xff) {
        offset++;
      }
      if (offset >= len) break;

      const marker = bytes[offset++];
      if (marker === 0xda || marker === 0xd9) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;

      if (offset + 2 > len) break;
      const segmentLength = (bytes[offset] << 8) | bytes[offset + 1];
      if (segmentLength < 2) break;

      if (marker === 0xe1 && offset + segmentLength <= len) {
        if (
          bytes[offset + 2] === 0x45 &&
          bytes[offset + 3] === 0x78 &&
          bytes[offset + 4] === 0x69 &&
          bytes[offset + 5] === 0x66 &&
          bytes[offset + 6] === 0x00 &&
          bytes[offset + 7] === 0x00
        ) {
          const tiffOffset = offset + 8;
          const isLittleEndian =
            bytes[tiffOffset] === 0x49 && bytes[tiffOffset + 1] === 0x49;
          const read16 = (o: number) =>
            isLittleEndian
              ? bytes[o] | (bytes[o + 1] << 8)
              : (bytes[o] << 8) | bytes[o + 1];
          const read32 = (o: number) =>
            isLittleEndian
              ? (bytes[o] |
                  (bytes[o + 1] << 8) |
                  (bytes[o + 2] << 16) |
                  (bytes[o + 3] << 24)) >>>
                0
              : ((bytes[o] << 24) |
                  (bytes[o + 1] << 16) |
                  (bytes[o + 2] << 8) |
                  bytes[o + 3]) >>>
                0;

          const firstIFDOffset = read32(tiffOffset + 4);
          if (firstIFDOffset >= 8 && tiffOffset + firstIFDOffset + 2 <= len) {
            const ifd0 = tiffOffset + firstIFDOffset;
            const entries = read16(ifd0);
            const maxEntries = Math.min(entries, 60);
            for (let e = 0; e < maxEntries; e++) {
              const entryOffset = ifd0 + 2 + e * 12;
              if (entryOffset + 12 > len) break;
              const tag = read16(entryOffset);
              if (tag === 0x0112) {
                const val = read16(entryOffset + 8);
                if (val >= 1 && val <= 8) return val;
              }
            }
          }
        }
      }

      offset += segmentLength;
    }
  } catch {
    // Ignore malformed EXIF
  }

  return 1;
}

/**
 * Sanitizes Android / mobile camera JPEG streams that contain trailing vendor data
 * after EOI (such as MPF multi-picture depth maps, Motion Photo streams, or UltraHDR
 * secondary streams) or malformed proprietary APP3..APP15 segments that cause
 * mobile browser image decoders to reject valid photographs.
 */
export function sanitizeJpegBytes(
  bytes: Uint8Array,
  stripExif = false
): Uint8Array | null {
  if (!bytes || bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return null;
  }

  try {
    const chunks: Uint8Array[] = [new Uint8Array([0xff, 0xd8])];
    let offset = 2;
    const len = bytes.length;
    let foundSof = false;

    while (offset < len) {
      // Find next marker 0xFF
      if (bytes[offset] !== 0xff) {
        offset++;
        continue;
      }
      while (offset < len && bytes[offset] === 0xff) {
        offset++;
      }
      if (offset >= len) break;

      const marker = bytes[offset++];

      // End of Image (EOI)
      if (marker === 0xd9) {
        chunks.push(new Uint8Array([0xff, 0xd9]));
        break;
      }

      // Standalone markers without length
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
        chunks.push(new Uint8Array([0xff, marker]));
        continue;
      }

      if (offset + 2 > len) break;
      const segLen = (bytes[offset] << 8) | bytes[offset + 1];
      if (segLen < 2 || offset + segLen > len) break;

      if (
        marker === 0xc0 ||
        marker === 0xc1 ||
        marker === 0xc2 ||
        marker === 0xc3 ||
        (marker >= 0xc5 && marker <= 0xc7) ||
        (marker >= 0xc9 && marker <= 0xcb) ||
        (marker >= 0xcd && marker <= 0xcf)
      ) {
        foundSof = true;
      }

      // Start of Scan (SOS: 0xDA) -> copy SOS header + entropy scan until EOI (0xFF 0xD9) or next valid scan marker
      if (marker === 0xda) {
        const sosHeaderEnd = offset + segLen;
        let scanPos = sosHeaderEnd;

        while (scanPos < len) {
          if (bytes[scanPos] === 0xff) {
            if (scanPos + 1 >= len) {
              scanPos++;
              break;
            }
            const nextByte = bytes[scanPos + 1];
            if (nextByte === 0x00) {
              // Byte stuffing (0xFF 0x00)
              scanPos += 2;
              continue;
            }
            if (nextByte >= 0xd0 && nextByte <= 0xd7) {
              // Restart marker (RST0..RST7)
              scanPos += 2;
              continue;
            }
            if (nextByte === 0xff) {
              scanPos++;
              continue;
            }
            // Reached EOI (0xD9) or another valid marker (e.g. progressive multi-scan SOS/DHT/DQT)
            break;
          }
          scanPos++;
        }

        const fullScanSegment = new Uint8Array(2 + (scanPos - offset));
        fullScanSegment[0] = 0xff;
        fullScanSegment[1] = 0xda;
        fullScanSegment.set(bytes.subarray(offset, scanPos), 2);
        chunks.push(fullScanSegment);

        offset = scanPos;
        continue;
      }

      // Filter out vendor APP3..APP15 (0xE3..0xEF) and COM (0xFE) segments,
      // and optionally APP1/APP2 if stripExif is requested.
      const isVendorApp = marker >= 0xe2 && marker <= 0xef;
      const isComment = marker === 0xfe;
      const isExifApp1 = marker === 0xe1 && stripExif;

      if (!isVendorApp && !isComment && !isExifApp1) {
        const seg = new Uint8Array(2 + segLen);
        seg[0] = 0xff;
        seg[1] = marker;
        seg.set(bytes.subarray(offset, offset + segLen), 2);
        chunks.push(seg);
      }

      offset += segLen;
    }

    if (!foundSof) return null;

    // Ensure EOI marker at the end
    const lastChunk = chunks[chunks.length - 1];
    if (
      !lastChunk ||
      lastChunk.length < 2 ||
      lastChunk[lastChunk.length - 2] !== 0xff ||
      lastChunk[lastChunk.length - 1] !== 0xd9
    ) {
      chunks.push(new Uint8Array([0xff, 0xd9]));
    }

    const totalLen = chunks.reduce((acc, c) => acc + c.length, 0);
    const out = new Uint8Array(totalLen);
    let writePos = 0;
    for (const c of chunks) {
      out.set(c, writePos);
      writePos += c.length;
    }
    return out;
  } catch {
    return null;
  }
}

export function generateOutputFilename(
  originalName: string,
  targetMime: SupportedFormat,
  originalMime: string,
  suffix = ''
): string {
  const dotIndex = originalName.lastIndexOf('.');
  const baseName = dotIndex !== -1 ? originalName.substring(0, dotIndex) : originalName;
  
  let targetExt: string;
  if (targetMime === 'original') {
    targetExt = getExtensionFromMime(originalMime);
  } else {
    targetExt = getExtensionFromMime(targetMime);
  }

  const cleanSuffix = suffix ? `-${suffix}` : '';
  return `${baseName}${cleanSuffix}.${targetExt}`;
}

/**
 * Detects whether the current device is a mobile device or memory-constrained environment.
 */
export function isMobileOrLowMemoryDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as any;
  const isTouch = ('ontouchstart' in window) || (nav.maxTouchPoints > 0);
  const lowMemory = typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 4;
  const lowCores = typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency <= 4;
  const mobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(nav.userAgent || '');
  return mobileUA || (isTouch && lowMemory) || lowMemory || (isTouch && lowCores);
}

/**
 * Retrieves safe dimension and area thresholds based on the device environment.
 */
export function getDeviceMemorySafeLimits() {
  const isMobile = isMobileOrLowMemoryDevice();
  return {
    isMobile,
    // Absolute bounds above which devices crash GPU textures or run out of memory
    maxDimensionAllowed: isMobile ? 8192 : 12288,
    maxAreaAllowed: isMobile ? 36_000_000 : 64_000_000,
    // Safe working resolution when user did not request custom resize
    // Mobile: 2560px max dim (~5.5MP / 22MB uncompressed) keeps processing 100% reliable on Android & iOS
    // Desktop: 3840px max dim (4K UHD / ~12MP) preserves ultra-high resolution
    safeWorkingMaxDim: isMobile ? 2560 : 3840,
    safeWorkingMaxArea: isMobile ? 5_500_000 : 12_000_000,
  };
}

/**
 * Parses image dimensions directly from file binary header bytes without decoding
 * the entire image into memory. Works instantly for JPEG, PNG, WebP, GIF, BMP.
 * Also parses EXIF orientation from JPEG APP1 to accurately reflect rendered dimensions.
 */
export function parseHeaderDimensions(bytes: Uint8Array): ImageDimensions | null {
  if (!bytes || bytes.length < 24) return null;

  try {
    // 1. PNG Check: 89 50 4E 47 0D 0A 1A 0A
    if (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    ) {
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      const width = view.getUint32(16, false);
      const height = view.getUint32(20, false);
      if (width > 0 && height > 0) return { width, height };
    }

    // 2. GIF Check: 'GIF87a' or 'GIF89a'
    if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      const width = view.getUint16(6, true);
      const height = view.getUint16(8, true);
      if (width > 0 && height > 0) return { width, height };
    }

    // 3. BMP Check: 'BM'
    if (bytes[0] === 0x42 && bytes[1] === 0x4d && bytes.length >= 26) {
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      const width = view.getInt32(18, true);
      const height = Math.abs(view.getInt32(22, true));
      if (width > 0 && height > 0) return { width, height };
    }

    // 4. WebP Check: 'RIFF'....'WEBP'
    if (
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes.length >= 30 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    ) {
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      const type = String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15]);

      if (type === 'VP8 ' && bytes.length >= 30) {
        // Lossy VP8
        const width = (view.getUint16(26, true) & 0x3fff);
        const height = (view.getUint16(28, true) & 0x3fff);
        if (width > 0 && height > 0) return { width, height };
      } else if (type === 'VP8L' && bytes.length >= 25) {
        // Lossless VP8L
        const b1 = bytes[21];
        const b2 = bytes[22];
        const b3 = bytes[23];
        const b4 = bytes[24];
        const width = 1 + (((b2 & 0x3f) << 8) | b1);
        const height = 1 + (((b4 & 0x0f) << 10) | (b3 << 2) | ((b2 & 0xc0) >> 6));
        if (width > 0 && height > 0) return { width, height };
      } else if (type === 'VP8X' && bytes.length >= 30) {
        // Extended VP8X
        const width = 1 + (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16));
        const height = 1 + (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16));
        if (width > 0 && height > 0) return { width, height };
      }
    }

    // 5. JPEG Check: 0xFF, 0xD8 (SOI)
    if (bytes[0] === 0xff && bytes[1] === 0xd8) {
      let offset = 2;
      const len = bytes.length;
      let orientation = 1;

      while (offset < len - 4) {
        if (bytes[offset] !== 0xff) {
          offset++;
          continue;
        }

        // Skip consecutive 0xFF fill bytes
        while (offset < len && bytes[offset] === 0xff) {
          offset++;
        }
        if (offset >= len) break;

        const marker = bytes[offset++];

        // SOS (Start of Scan) or EOI (End of Image) -> stop scanning
        if (marker === 0xda || marker === 0xd9) {
          break;
        }

        // Markers without length parameter
        if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
          continue;
        }

        if (offset + 2 > len) break;
        const segmentLength = (bytes[offset] << 8) | bytes[offset + 1];
        if (segmentLength < 2) break;

        // APP1 (Exif) - parse orientation tag (0x0112)
        if (marker === 0xe1 && offset + segmentLength <= len) {
          try {
            if (
              bytes[offset + 2] === 0x45 && // E
              bytes[offset + 3] === 0x78 && // x
              bytes[offset + 4] === 0x69 && // i
              bytes[offset + 5] === 0x66 && // f
              bytes[offset + 6] === 0x00 &&
              bytes[offset + 7] === 0x00
            ) {
              const tiffOffset = offset + 8;
              const isLittleEndian = bytes[tiffOffset] === 0x49 && bytes[tiffOffset + 1] === 0x49;
              const read16 = (o: number) =>
                isLittleEndian
                  ? bytes[o] | (bytes[o + 1] << 8)
                  : (bytes[o] << 8) | bytes[o + 1];
              const read32 = (o: number) =>
                isLittleEndian
                  ? (bytes[o] | (bytes[o + 1] << 8) | (bytes[o + 2] << 16) | (bytes[o + 3] << 24)) >>> 0
                  : ((bytes[o] << 24) | (bytes[o + 1] << 16) | (bytes[o + 2] << 8) | bytes[o + 3]) >>> 0;

              const firstIFDOffset = read32(tiffOffset + 4);
              if (firstIFDOffset >= 8 && tiffOffset + firstIFDOffset + 2 <= len) {
                const ifd0 = tiffOffset + firstIFDOffset;
                const entries = read16(ifd0);
                const maxEntries = Math.min(entries, 60);
                for (let e = 0; e < maxEntries; e++) {
                  const entryOffset = ifd0 + 2 + e * 12;
                  if (entryOffset + 12 > len) break;
                  const tag = read16(entryOffset);
                  if (tag === 0x0112) {
                    orientation = read16(entryOffset + 8);
                    break;
                  }
                }
              }
            }
          } catch {
            // Non-fatal if EXIF is malformed
          }
        }

        // SOF markers (Start Of Frame):
        // 0xC0 (SOF0: Baseline), 0xC1 (SOF1: Extended Sequential),
        // 0xC2 (SOF2: Progressive), 0xC3 (SOF3: Lossless),
        // 0xC5-0xC7, 0xC9-0xCB, 0xCD-0xCF
        if (
          marker === 0xc0 ||
          marker === 0xc1 ||
          marker === 0xc2 ||
          marker === 0xc3 ||
          marker === 0xc5 ||
          marker === 0xc6 ||
          marker === 0xc7 ||
          marker === 0xc9 ||
          marker === 0xca ||
          marker === 0xcb ||
          marker === 0xcd ||
          marker === 0xce ||
          marker === 0xcf
        ) {
          if (offset + 7 <= len) {
            const h = (bytes[offset + 3] << 8) | bytes[offset + 4];
            const w = (bytes[offset + 5] << 8) | bytes[offset + 6];
            if (w > 0 && h > 0) {
              // If orientation is rotated 90 or 270 degrees, swap width and height
              if (orientation === 5 || orientation === 6 || orientation === 7 || orientation === 8) {
                return { width: h, height: w };
              }
              return { width: w, height: h };
            }
          }
        }

        offset += segmentLength;
      }
    }
  } catch {
    // If parsing fails, return null to fallback
  }

  return null;
}

/**
 * Retrieves image dimensions efficiently.
 * 1. Checks binary header via first 128KB - 256KB slice (0ms, 0MB RAM, zero decoding)
 * 2. Falls back to ImageBitmap probe with immediate bitmap.close()
 * 3. Falls back to HTMLImageElement using img.decode() with immediate object URL revocation
 */
export async function getImageDimensions(file: Blob): Promise<ImageDimensions> {
  // Pass 1: Binary header inspection (fast, zero memory overhead)
  try {
    const sliceLen = Math.min(file.size, 131072);
    const slice = file.slice(0, sliceLen);
    const arrayBuffer = await slice.arrayBuffer();
    const parsed = parseHeaderDimensions(new Uint8Array(arrayBuffer));
    if (parsed && parsed.width > 0 && parsed.height > 0) {
      return parsed;
    }

    // If file is larger than 128KB and header was not found, check up to 1MB slice for large camera EXIF/ICC
    if (file.size > 131072) {
      const slice2Len = Math.min(file.size, 1048576);
      const slice2 = file.slice(0, slice2Len);
      const arrayBuffer2 = await slice2.arrayBuffer();
      const parsed2 = parseHeaderDimensions(new Uint8Array(arrayBuffer2));
      if (parsed2 && parsed2.width > 0 && parsed2.height > 0) {
        return parsed2;
      }
    }
  } catch {
    // Fallback to probe decode
  }

  // Pass 2: Fast ImageBitmap probe with immediate closing
  if (typeof createImageBitmap === 'function') {
    let bitmap: ImageBitmap | null = null;
    try {
      try {
        bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      } catch {
        bitmap = await createImageBitmap(file);
      }
      if (bitmap) {
        const dims = { width: bitmap.width, height: bitmap.height };
        return dims;
      }
    } catch {
      // Fallback
    } finally {
      if (bitmap) {
        try {
          bitmap.close();
        } catch {}
      }
    }
  }

  // Pass 3: HTMLImageElement with immediate cleanup
  const url = URL.createObjectURL(file);
  return new Promise((resolve) => {
    const img = new Image();
    let isSettled = false;

    const cleanup = () => {
      if (!isSettled) {
        isSettled = true;
        URL.revokeObjectURL(url);
        img.onload = null;
        img.onerror = null;
        img.src = '';
      }
    };

    img.onload = () => {
      const dims = {
        width: img.naturalWidth || img.width || 1920,
        height: img.naturalHeight || img.height || 1080,
      };
      cleanup();
      resolve(dims);
    };

    img.onerror = () => {
      cleanup();
      resolve({ width: 1920, height: 1080 });
    };

    img.src = url;
  });
}

/**
 * Creates an inline SVG Data URI placeholder. Zero memory, instant render.
 */
export function createFallbackThumbnailSvg(name: string): string {
  const ext = (name.split('.').pop() || 'IMG').toUpperCase().slice(0, 4);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="120" viewBox="0 0 160 120">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0f172a" />
        <stop offset="100%" stop-color="#1e293b" />
      </linearGradient>
    </defs>
    <rect width="160" height="120" fill="url(#g)" />
    <circle cx="80" cy="50" r="22" fill="#0284c7" opacity="0.25" />
    <path d="M70 56 L76 48 L82 54 L88 44 L94 56 Z" fill="#38bdf8" />
    <text x="80" y="92" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="bold" fill="#94a3b8" text-anchor="middle" letter-spacing="1">${ext}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Creates a lightweight, low-resolution thumbnail blob URL (~8-15KB).
 * Crucial for mobile performance: prevents the browser from retaining
 * full-resolution 4K/12MP camera images when rendering FileCards.
 */
export async function generateThumbnailUrl(
  file: Blob,
  maxDim = 160,
  knownDimensions?: ImageDimensions
): Promise<string> {
  // If SVG, create object URL directly (SVG is vector, zero raster memory)
  if (file.type === 'image/svg+xml' || (file instanceof File && file.name.endsWith('.svg'))) {
    return URL.createObjectURL(file);
  }

  // Calculate target thumbnail dimensions from known or header dimensions
  let thumbW = maxDim;
  let thumbH = maxDim;
  try {
    const dims =
      knownDimensions && knownDimensions.width > 0 && knownDimensions.height > 0
        ? knownDimensions
        : await getImageDimensions(file);
    if (dims && dims.width > 0 && dims.height > 0) {
      if (dims.width > dims.height) {
        thumbW = maxDim;
        thumbH = Math.max(1, Math.round((dims.height / dims.width) * maxDim));
      } else {
        thumbH = maxDim;
        thumbW = Math.max(1, Math.round((dims.width / dims.height) * maxDim));
      }
    }
  } catch {
    // Default to square
  }

  // 1. Try createImageBitmap with resize options (fastest, memory-safe)
  if (typeof createImageBitmap === 'function') {
    let bitmap: ImageBitmap | null = null;
    try {
      try {
        bitmap = await createImageBitmap(file, {
          resizeWidth: thumbW,
          resizeHeight: thumbH,
          resizeQuality: 'medium',
          imageOrientation: 'from-image',
        });
      } catch {
        bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      }

      if (bitmap) {
        const canvas = document.createElement('canvas');
        canvas.width = thumbW;
        canvas.height = thumbH;
        try {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, thumbW, thumbH);
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'medium';
            ctx.drawImage(bitmap, 0, 0, thumbW, thumbH);

            const blob = await new Promise<Blob | null>((res) =>
              canvas.toBlob(res, 'image/jpeg', 0.65)
            );
            if (blob) {
              return URL.createObjectURL(blob);
            }
          }
        } finally {
          canvas.width = 0;
          canvas.height = 0;
        }
      }
    } catch {
      // Fall through to HTMLImageElement fallback
    } finally {
      if (bitmap) {
        try {
          bitmap.close();
        } catch {}
      }
    }
  }

  // 2. Fallback: HTMLImageElement decode to thumbnail canvas with immediate teardown
  try {
    const tempUrl = URL.createObjectURL(file);
    const blob = await new Promise<Blob | null>((resolve) => {
      const img = new Image();
      const cleanupImg = () => {
        URL.revokeObjectURL(tempUrl);
        img.onload = null;
        img.onerror = null;
        img.src = '';
      };

      img.onload = () => {
        const canvas = document.createElement('canvas');
        try {
          const nw = img.naturalWidth || img.width || thumbW;
          const nh = img.naturalHeight || img.height || thumbH;
          let tw = maxDim;
          let th = maxDim;
          if (nw > nh) {
            tw = maxDim;
            th = Math.max(1, Math.round((nh / nw) * maxDim));
          } else {
            th = maxDim;
            tw = Math.max(1, Math.round((nw / nh) * maxDim));
          }

          canvas.width = tw;
          canvas.height = th;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            canvas.width = 0;
            canvas.height = 0;
            cleanupImg();
            resolve(null);
            return;
          }

          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, tw, th);
          ctx.drawImage(img, 0, 0, tw, th);
          cleanupImg();

          canvas.toBlob(
            (b) => {
              canvas.width = 0;
              canvas.height = 0;
              resolve(b);
            },
            'image/jpeg',
            0.65
          );
        } catch {
          canvas.width = 0;
          canvas.height = 0;
          cleanupImg();
          resolve(null);
        }
      };

      img.onerror = () => {
        cleanupImg();
        resolve(null);
      };

      img.src = tempUrl;
    });

    if (blob) {
      return URL.createObjectURL(blob);
    }
  } catch {
    // Fall through to SVG fallback
  }

  // 3. Fallback: Inline SVG Data URI (zero memory overhead; never marks original file as corrupt)
  return createFallbackThumbnailSvg(file instanceof File ? file.name : 'IMG');
}

/**
 * Stabilizes an input File right at selection time:
 * - Reads the file bytes once into a browser-owned Blob/File so Android content://
 *   Photo Picker handles cannot expire before batch processing begins.
 * - Detects true MIME type from binary magic bytes.
 * - Extracts dimensions and EXIF orientation in a single zero-decode pass.
 * - Generates a lightweight thumbnail without retaining full-resolution bitmaps.
 */
export async function prepareWorkspaceFile(file: File): Promise<{
  safeFile: File;
  dimensions: ImageDimensions;
  detectedMime: string;
  previewUrl: string;
}> {
  let safeFile = file;
  let detectedMime = file.type || 'image/jpeg';
  let dimensions: ImageDimensions | null = null;

  try {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    detectedMime = detectMimeFromBytes(bytes, file.type, file.name);
    dimensions = parseHeaderDimensions(bytes);
    safeFile = new File([buffer], file.name, {
      type: detectedMime,
      lastModified: file.lastModified || Date.now(),
    });
  } catch {
    // If full buffer read failed for any reason, fall back to original file reference
    safeFile = file;
  }

  if (!dimensions || dimensions.width <= 0 || dimensions.height <= 0) {
    try {
      dimensions = await getImageDimensions(safeFile);
    } catch {
      dimensions = { width: 1920, height: 1080 };
    }
  }

  let previewUrl = '';
  try {
    previewUrl = await generateThumbnailUrl(safeFile, 160, dimensions);
  } catch {
    previewUrl = createFallbackThumbnailSvg(safeFile.name);
  }

  return {
    safeFile,
    dimensions,
    detectedMime,
    previewUrl,
  };
}

/**
 * Synchronous thumbnail URL creator (returns safe SVG placeholder;
 * caller can replace with async generateThumbnailUrl).
 */
export function createThumbnailUrl(file: Blob, _maxDim = 160): string {
  return createFallbackThumbnailSvg(file instanceof File ? file.name : 'IMG');
}
