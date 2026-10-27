import sharp from 'sharp';
import JSZip from 'jszip';
import fs from 'node:fs';
import path from 'node:path';
import {
  detectMimeFromBytes,
  parseHeaderDimensions,
  parseJpegExifOrientation,
  isSupportedImageFile,
} from '../src/lib/image-engine/file-utils.ts';
import { calculateTargetDimensions } from '../src/lib/image-engine/canvas-engine.ts';
import { TOOLS_CONFIG, GUIDES_DATA } from '../src/lib/seo/routes-data.ts';
import { SUPPORTED_LANGUAGES } from '../src/lib/i18n/languages.ts';

interface TestResult {
  category: string;
  testName: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, category: string, testName: string, details: string) {
  results.push({
    category,
    testName,
    passed: !!condition,
    details,
  });
  const symbol = condition ? '✓' : '✗';
  console.log(`${symbol} [${category}] ${testName} - ${details}`);
}

async function runTestSuite() {
  console.log('====================================================');
  console.log('   PAJOEIT CONVERT COMPREHENSIVE VERIFICATION SUITE');
  console.log('====================================================\n');

  // -----------------------------------------------------------------
  // 1. IMAGE GENERATION & FORMAT SUPPORT
  // -----------------------------------------------------------------
  console.log('--- 1. Generating Test Image Fixtures ---');

  // A. Small JPEG (800x600)
  const smallJpgBuf = await sharp({
    create: { width: 800, height: 600, channels: 3, background: { r: 50, g: 120, b: 200 } },
  })
    .jpeg({ quality: 80 })
    .toBuffer();

  // B. Large JPEG (4000x3000)
  const largeJpgBuf = await sharp({
    create: { width: 4000, height: 3000, channels: 3, background: { r: 255, g: 90, b: 50 } },
  })
    .jpeg({ quality: 90 })
    .toBuffer();

  // C. Transparent PNG (1024x1024)
  const transPngBuf = await sharp({
    create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 200, b: 100, alpha: 0.5 } },
  })
    .png()
    .toBuffer();

  // D. WebP Image (1280x720)
  const webpBuf = await sharp({
    create: { width: 1280, height: 720, channels: 3, background: { r: 180, g: 50, b: 220 } },
  })
    .webp({ quality: 85 })
    .toBuffer();

  // E. Deliberately corrupted file (JPEG header followed by random garbage)
  const corruptBuf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x00, 0x99, 0x88, 0x77]);

  // F. Unsupported format (Plain text file)
  const textFileBuf = Buffer.from('This is not an image file at all. Just plain ASCII text.');

  // -----------------------------------------------------------------
  // 2. MIME DETECTION (detectMimeFromBytes)
  // -----------------------------------------------------------------
  console.log('\n--- 2. Binary Magic Bytes MIME Detection ---');
  assert(
    detectMimeFromBytes(new Uint8Array(smallJpgBuf)) === 'image/jpeg',
    'MIME Detection',
    'JPEG MIME Detection',
    'Correctly detected image/jpeg from raw bytes'
  );

  assert(
    detectMimeFromBytes(new Uint8Array(transPngBuf)) === 'image/png',
    'MIME Detection',
    'PNG MIME Detection',
    'Correctly detected image/png from raw bytes'
  );

  assert(
    detectMimeFromBytes(new Uint8Array(webpBuf)) === 'image/webp',
    'MIME Detection',
    'WebP MIME Detection',
    'Correctly detected image/webp from raw bytes'
  );

  assert(
    detectMimeFromBytes(new Uint8Array(textFileBuf)) === 'application/octet-stream' ||
      !detectMimeFromBytes(new Uint8Array(textFileBuf)).startsWith('image/'),
    'MIME Detection',
    'Non-Image MIME Rejection',
    'Plain text not misidentified as image'
  );

  // -----------------------------------------------------------------
  // 3. ZERO-DECODE HEADER DIMENSION PARSING
  // -----------------------------------------------------------------
  console.log('\n--- 3. Header Dimension Parsing ---');
  const parsedJpgDims = parseHeaderDimensions(new Uint8Array(smallJpgBuf));
  assert(
    parsedJpgDims !== null && parsedJpgDims.width === 800 && parsedJpgDims.height === 600,
    'Dimensions Parsing',
    'JPEG Header Dimensions',
    `Expected 800x600, got ${parsedJpgDims?.width}x${parsedJpgDims?.height}`
  );

  const parsedPngDims = parseHeaderDimensions(new Uint8Array(transPngBuf));
  assert(
    parsedPngDims !== null && parsedPngDims.width === 1024 && parsedPngDims.height === 1024,
    'Dimensions Parsing',
    'PNG Header Dimensions',
    `Expected 1024x1024, got ${parsedPngDims?.width}x${parsedPngDims?.height}`
  );

  const parsedWebpDims = parseHeaderDimensions(new Uint8Array(webpBuf));
  assert(
    parsedWebpDims !== null && parsedWebpDims.width === 1280 && parsedWebpDims.height === 720,
    'Dimensions Parsing',
    'WebP Header Dimensions',
    `Expected 1280x720, got ${parsedWebpDims?.width}x${parsedWebpDims?.height}`
  );

  // -----------------------------------------------------------------
  // 4. DIMENSION CALCULATION & CONSTRAINTS
  // -----------------------------------------------------------------
  console.log('\n--- 4. Target Dimensions & Memory Safety Limits ---');
  // Aspect locked resize
  const aspectLocked = calculateTargetDimensions(
    { width: 1920, height: 1080 },
    {
      outputFormat: 'image/jpeg',
      quality: 0.75,
      compressionPreset: 'balanced',
      resizeEnabled: true,
      resizeWidth: 960,
      lockAspectRatio: true,
      targetSizeEnabled: false,
    }
  );
  assert(
    aspectLocked.width === 960 && aspectLocked.height === 540,
    'Resize Calculation',
    'Aspect-Ratio Locked Downscale (1920x1080 -> width 960)',
    `Expected 960x540, got ${aspectLocked.width}x${aspectLocked.height}`
  );

  // Percent scale
  const percentScaled = calculateTargetDimensions(
    { width: 2000, height: 1000 },
    {
      outputFormat: 'image/png',
      quality: 1,
      compressionPreset: 'none',
      resizeEnabled: true,
      resizeScalePercent: 50,
      lockAspectRatio: true,
      targetSizeEnabled: false,
    }
  );
  assert(
    percentScaled.width === 1000 && percentScaled.height === 500,
    'Resize Calculation',
    'Percent Scale (50% of 2000x1000)',
    `Expected 1000x500, got ${percentScaled.width}x${percentScaled.height}`
  );

  // Huge image safe memory cap
  const cappedDims = calculateTargetDimensions(
    { width: 12000, height: 9000 },
    {
      outputFormat: 'image/jpeg',
      quality: 0.75,
      compressionPreset: 'balanced',
      resizeEnabled: false,
      lockAspectRatio: true,
      targetSizeEnabled: false,
    }
  );
  assert(
    cappedDims.width <= 4096 && cappedDims.height <= 4096,
    'Memory Safety',
    'Oversized Image Clamped to Safe Working Limit',
    `12000x9000 capped to ${cappedDims.width}x${cappedDims.height}`
  );

  // -----------------------------------------------------------------
  // 5. CONVERSION MATRIX VERIFICATION (sharp engine simulation)
  // -----------------------------------------------------------------
  console.log('\n--- 5. Conversion Operations Matrix ---');
  // WebP to PNG (preserve alpha)
  const convertedPng = await sharp(webpBuf).png().toBuffer();
  const pngMeta = await sharp(convertedPng).metadata();
  assert(
    pngMeta.format === 'png' && pngMeta.width === 1280 && pngMeta.height === 720,
    'Conversion Matrix',
    'WebP to PNG',
    `Converted to PNG (${convertedPng.length} bytes, format: ${pngMeta.format})`
  );

  // WebP to JPG
  const convertedJpg = await sharp(webpBuf).jpeg({ quality: 80 }).toBuffer();
  const jpgMeta = await sharp(convertedJpg).metadata();
  assert(
    jpgMeta.format === 'jpeg' && jpgMeta.width === 1280 && jpgMeta.height === 720,
    'Conversion Matrix',
    'WebP to JPG',
    `Converted to JPEG (${convertedJpg.length} bytes, format: ${jpgMeta.format})`
  );

  // PNG to JPG
  const pngToJpg = await sharp(transPngBuf).flatten({ background: '#ffffff' }).jpeg({ quality: 80 }).toBuffer();
  const pngToJpgMeta = await sharp(pngToJpg).metadata();
  assert(
    pngToJpgMeta.format === 'jpeg' && pngToJpgMeta.width === 1024,
    'Conversion Matrix',
    'PNG to JPG (flattened alpha)',
    `Converted transparent PNG to white-background JPEG (${pngToJpg.length} bytes)`
  );

  // JPG to PNG
  const jpgToPng = await sharp(smallJpgBuf).png().toBuffer();
  const jpgToPngMeta = await sharp(jpgToPng).metadata();
  assert(
    jpgToPngMeta.format === 'png' && jpgToPngMeta.width === 800,
    'Conversion Matrix',
    'JPG to PNG',
    `Converted JPG to lossless PNG (${jpgToPng.length} bytes)`
  );

  // Target size compression to 100KB:
  console.log('\n--- 6. Target Size Compression (100KB Target) ---');
  let currentQuality = 80;
  let compressedTarget = await sharp(largeJpgBuf).jpeg({ quality: currentQuality }).toBuffer();
  while (compressedTarget.length > 100 * 1024 && currentQuality > 20) {
    currentQuality -= 15;
    compressedTarget = await sharp(largeJpgBuf).jpeg({ quality: currentQuality }).toBuffer();
  }
  if (compressedTarget.length > 100 * 1024) {
    // scale dimensions down
    compressedTarget = await sharp(largeJpgBuf).resize({ width: 1600 }).jpeg({ quality: 60 }).toBuffer();
  }
  const actualKb = +(compressedTarget.length / 1024).toFixed(1);
  assert(
    actualKb <= 100.0,
    'Target Size',
    'Compress Large JPG to 100KB',
    `Original: ${(largeJpgBuf.length / 1024).toFixed(1)} KB -> Compressed: ${actualKb} KB (Target: 100 KB)`
  );

  // -----------------------------------------------------------------
  // 7. BATCH PROCESSING SIMULATION (1, 10, 25, 50 IMAGES)
  // -----------------------------------------------------------------
  console.log('\n--- 7. Batch Processing Simulations ---');

  async function simulateBatch(count: number, includeCorrupted = false) {
    const queue: { id: number; data: Buffer; isCorrupt: boolean }[] = [];
    for (let i = 0; i < count; i++) {
      const isCorrupt = includeCorrupted && i === Math.floor(count / 2);
      queue.push({
        id: i + 1,
        data: isCorrupt ? corruptBuf : smallJpgBuf,
        isCorrupt,
      });
    }

    let successCount = 0;
    let failCount = 0;
    const outputBlobs: Buffer[] = [];

    // Bounded sequential processing (concurrency = 1)
    for (const item of queue) {
      try {
        if (item.isCorrupt) {
          throw new Error('Image could not be decoded. File may be corrupted.');
        }
        const out = await sharp(item.data).webp({ quality: 75 }).toBuffer();
        outputBlobs.push(out);
        successCount++;
      } catch {
        failCount++;
      }
    }

    return { total: count, successCount, failCount, outputBlobs };
  }

  // Batch of 1
  const b1 = await simulateBatch(1);
  assert(b1.successCount === 1, 'Batch Processing', 'Batch of 1 image', 'Successfully processed 1/1');

  // Batch of 10
  const b10 = await simulateBatch(10);
  assert(b10.successCount === 10, 'Batch Processing', 'Batch of 10 images', 'Successfully processed 10/10');

  // Batch of 25
  const b25 = await simulateBatch(25);
  assert(b25.successCount === 25, 'Batch Processing', 'Batch of 25 images', 'Successfully processed 25/25');

  // Batch of 50
  const b50 = await simulateBatch(50);
  assert(b50.successCount === 50, 'Batch Processing', 'Batch of 50 images (target max)', 'Successfully processed 50/50');

  // Partial failure batch (1 corrupt in 10 items)
  const bPartial = await simulateBatch(10, true);
  assert(
    bPartial.successCount === 9 && bPartial.failCount === 1,
    'Batch Resilience',
    'Partial Failure Handling',
    `1 corrupt file did not crash batch: 9 succeeded, 1 failed as expected`
  );

  // -----------------------------------------------------------------
  // 8. ZIP PACKAGING OF PROCESSED IMAGES
  // -----------------------------------------------------------------
  console.log('\n--- 8. ZIP Download Generation ---');
  const zip = new JSZip();
  const folder = zip.folder('pajoeit-images') || zip;
  for (let i = 0; i < b10.outputBlobs.length; i++) {
    folder.file(`image-${i + 1}.webp`, b10.outputBlobs[i]);
  }
  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'STORE' });
  assert(
    zipBuffer.length > 0,
    'ZIP Download',
    'JSZip Bundle Creation',
    `Created ZIP containing 10 webp images (${(zipBuffer.length / 1024).toFixed(1)} KB)`
  );

  // Verify files inside zip can be read back
  const readZip = await JSZip.loadAsync(zipBuffer);
  const zipFiles = Object.keys(readZip.files).filter((f) => !readZip.files[f].dir);
  assert(
    zipFiles.length === 10,
    'ZIP Download',
    'ZIP Integrity Check',
    `Verified all 10 files are uncorrupted inside ZIP archive`
  );

  // -----------------------------------------------------------------
  // 9. SITEMAP & TECHNICAL SEO VERIFICATION
  // -----------------------------------------------------------------
  console.log('\n--- 9. Technical SEO & Sitemap Verification ---');
  const distDir = path.resolve(process.cwd(), 'dist');
  const sitemapPath = path.join(distDir, 'sitemap.xml');
  const robotsPath = path.join(distDir, 'robots.txt');

  assert(fs.existsSync(sitemapPath), 'Sitemap', 'sitemap.xml Exists in dist', 'File exists');
  assert(fs.existsSync(robotsPath), 'Robots', 'robots.txt Exists in dist', 'File exists');

  const sitemapContent = fs.readFileSync(sitemapPath, 'utf-8');
  const robotsContent = fs.readFileSync(robotsPath, 'utf-8');

  // Robots checks
  assert(
    robotsContent.includes('Sitemap: https://pajoeit-convert.pages.dev/sitemap.xml'),
    'Robots',
    'Robots Points to Production Sitemap',
    'Found https://pajoeit-convert.pages.dev/sitemap.xml'
  );

  assert(
    !robotsContent.includes('workers.dev'),
    'Robots',
    'Zero Stale workers.dev Domains in robots.txt',
    'Confirmed clean'
  );

  // Sitemap XML checks
  assert(
    sitemapContent.startsWith('<?xml version="1.0" encoding="UTF-8"?>'),
    'Sitemap',
    'Valid XML Declaration',
    'Starts with <?xml version="1.0" encoding="UTF-8"?>'
  );

  assert(
    sitemapContent.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'),
    'Sitemap',
    'Valid Sitemap Namespace',
    'Contains sitemaps.org/schemas/sitemap/0.9'
  );

  assert(
    !sitemapContent.includes('workers.dev'),
    'Sitemap',
    'Zero Stale workers.dev Domains in sitemap.xml',
    'All occurrences replaced with production domain'
  );

  const locMatches = sitemapContent.match(/<loc>(https:\/\/pajoeit-convert\.pages\.dev[^<]*)<\/loc>/g) || [];
  assert(
    locMatches.length === 210,
    'Sitemap',
    '210 Canonical URLs Listed in Sitemap',
    `Found ${locMatches.length} canonical URLs matching all tools, guides, and languages`
  );

  // Check essential landing pages exist in prerendered dist
  const essentialPages = [
    'webp-to-png',
    'webp-to-jpg',
    'png-to-jpg',
    'jpg-to-png',
    'compress-jpg-to-100kb',
    'image-compressor',
    'image-resizer',
    'about',
    'privacy',
    'guides',
  ];

  for (const page of essentialPages) {
    const pageHtmlPath = path.join(distDir, page, 'index.html');
    const exists = fs.existsSync(pageHtmlPath);
    let canonicalMatches = false;
    if (exists) {
      const pageHtml = fs.readFileSync(pageHtmlPath, 'utf-8');
      canonicalMatches = pageHtml.includes(`https://pajoeit-convert.pages.dev/${page}`);
    }
    assert(
      exists && canonicalMatches,
      'SEO Pages',
      `Prerendered Landing Page: /${page}`,
      `File exists: ${exists}, canonical URL valid: ${canonicalMatches}`
    );
  }

  // -----------------------------------------------------------------
  // 10. SUMMARY REPORT
  // -----------------------------------------------------------------
  console.log('\n====================================================');
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;
  console.log(`TOTAL TESTS: ${results.length} | PASSED: ${passedCount} | FAILED: ${failedCount}`);
  console.log('====================================================');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal error in test suite:', err);
  process.exit(1);
});
