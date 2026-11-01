/**
 * Generate all required icon sizes from the new PAJOEIT brand assets.
 * Uses sharp to resize without distortion, preserving transparency.
 */
import sharp from 'sharp';
import { mkdirSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const ICON_SRC = join(ROOT, 'attachments/9d07baf6-8019-4546-8891-7d5704f6495a/pajoeit-convert-icon.png');
const LOGO_SRC = join(ROOT, 'attachments/9d07baf6-8019-4546-8891-7d5704f6495a/pajoeit-convert-logo.png');

const PUBLIC = join(ROOT, 'public');
const ASSETS = join(PUBLIC, 'assets');

async function main() {
  mkdirSync(ASSETS, { recursive: true });

  // Get source image dimensions
  const iconMeta = await sharp(ICON_SRC).metadata();
  const logoMeta = await sharp(LOGO_SRC).metadata();
  console.log(`Icon source: ${iconMeta.width}x${iconMeta.height}, format=${iconMeta.format}, hasAlpha=${iconMeta.hasAlpha}`);
  console.log(`Logo source: ${logoMeta.width}x${logoMeta.height}, format=${logoMeta.format}, hasAlpha=${logoMeta.hasAlpha}`);

  // 1. Copy full-size icon to public/pajoeit-convert-icon.png and public/assets/
  await sharp(ICON_SRC)
    .resize(1024, 1024, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(join(PUBLIC, 'pajoeit-convert-icon.png'));
  console.log('✓ public/pajoeit-convert-icon.png (1024x1024)');

  await sharp(ICON_SRC)
    .resize(1024, 1024, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(join(ASSETS, 'pajoeit-convert-icon.png'));
  console.log('✓ public/assets/pajoeit-convert-icon.png (1024x1024)');

  // 2. Copy logo to public/pajoeit-convert-logo.png and public/assets/
  await sharp(LOGO_SRC)
    .png()
    .toFile(join(PUBLIC, 'pajoeit-convert-logo.png'));
  console.log('✓ public/pajoeit-convert-logo.png');

  await sharp(LOGO_SRC)
    .png()
    .toFile(join(ASSETS, 'pajoeit-convert-logo.png'));
  console.log('✓ public/assets/pajoeit-convert-logo.png');

  // 3. Generate PWA icons from icon source
  await sharp(ICON_SRC)
    .resize(192, 192, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(join(PUBLIC, 'pwa-192x192.png'));
  console.log('✓ public/pwa-192x192.png (192x192)');

  await sharp(ICON_SRC)
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(join(PUBLIC, 'pwa-512x512.png'));
  console.log('✓ public/pwa-512x512.png (512x512)');

  // 4. Maskable icon (needs safe zone padding - icon centered in 80% of canvas)
  // For maskable, use dark background to match theme
  await sharp(ICON_SRC)
    .resize(410, 410, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({
      top: 51,
      bottom: 51,
      left: 51,
      right: 51,
      background: { r: 9, g: 13, b: 22, alpha: 255 } // #090d16
    })
    .resize(512, 512)
    .png()
    .toFile(join(PUBLIC, 'pwa-maskable-512x512.png'));
  console.log('✓ public/pwa-maskable-512x512.png (512x512, maskable with safe zone)');

  // 5. Apple touch icon (180x180, opaque background recommended)
  await sharp(ICON_SRC)
    .resize(180, 180, { fit: 'contain', background: { r: 9, g: 13, b: 22, alpha: 255 } })
    .png()
    .toFile(join(PUBLIC, 'apple-touch-icon.png'));
  console.log('✓ public/apple-touch-icon.png (180x180)');

  // 6. Generate favicon.ico (from 32x32 and 16x16)
  // Since sharp can't produce multi-size ICO, we'll generate a 32x32 PNG-based ICO
  const favicon32 = await sharp(ICON_SRC)
    .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  
  // Create ICO file manually (single 32x32 PNG entry)
  const icoHeader = Buffer.alloc(6);
  icoHeader.writeUInt16LE(0, 0); // Reserved
  icoHeader.writeUInt16LE(1, 2); // ICO type
  icoHeader.writeUInt16LE(1, 4); // Number of images

  const dirEntry = Buffer.alloc(16);
  dirEntry.writeUInt8(32, 0);    // Width
  dirEntry.writeUInt8(32, 1);    // Height
  dirEntry.writeUInt8(0, 2);     // Color palette
  dirEntry.writeUInt8(0, 3);     // Reserved
  dirEntry.writeUInt16LE(1, 4);  // Color planes
  dirEntry.writeUInt16LE(32, 6); // Bits per pixel
  dirEntry.writeUInt32LE(favicon32.length, 8);  // Size of image data
  dirEntry.writeUInt32LE(22, 12); // Offset (6 + 16 = 22)

  const icoBuffer = Buffer.concat([icoHeader, dirEntry, favicon32]);
  
  const { writeFileSync } = await import('fs');
  writeFileSync(join(PUBLIC, 'favicon.ico'), icoBuffer);
  console.log('✓ public/favicon.ico (32x32 ICO)');

  console.log('\n✅ All icon assets generated successfully!');
}

main().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
