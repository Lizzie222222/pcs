import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sourceImage = join(__dirname, '..', 'attached_assets', '1W0A3542_1759747398974.jpg');
const outputDir = join(__dirname, '..', 'attached_assets');

// Configuration for different screen sizes
const sizes = [
  { width: 640, quality: 75, suffix: 'mobile' },
  { width: 1024, quality: 80, suffix: 'tablet' },
  { width: 1920, quality: 85, suffix: 'desktop' }
];

async function optimizeImage() {
  console.log('Starting hero image optimization...\n');
  
  // Check if source file exists
  if (!fs.existsSync(sourceImage)) {
    console.error(`Source image not found: ${sourceImage}`);
    process.exit(1);
  }

  // Get original file size
  const originalStats = fs.statSync(sourceImage);
  console.log(`Original image size: ${(originalStats.size / 1024 / 1024).toFixed(2)} MB\n`);

  for (const size of sizes) {
    try {
      // WebP version
      const webpOutput = join(outputDir, `hero-${size.suffix}.webp`);
      await sharp(sourceImage)
        .resize(size.width, null, {
          withoutEnlargement: true,
          fit: 'inside'
        })
        .webp({ quality: size.quality })
        .toFile(webpOutput);

      const webpStats = fs.statSync(webpOutput);
      console.log(`✓ Created ${size.suffix} WebP (${size.width}px): ${(webpStats.size / 1024).toFixed(2)} KB`);

      // JPEG fallback version
      const jpegOutput = join(outputDir, `hero-${size.suffix}.jpg`);
      await sharp(sourceImage)
        .resize(size.width, null, {
          withoutEnlargement: true,
          fit: 'inside'
        })
        .jpeg({ quality: size.quality, progressive: true })
        .toFile(jpegOutput);

      const jpegStats = fs.statSync(jpegOutput);
      console.log(`✓ Created ${size.suffix} JPEG (${size.width}px): ${(jpegStats.size / 1024).toFixed(2)} KB`);
      console.log('');
    } catch (error) {
      console.error(`Error processing ${size.suffix}:`, error);
    }
  }

  console.log('\n✅ Image optimization complete!');
  console.log('Files created in attached_assets directory:');
  console.log('  - hero-mobile.webp / hero-mobile.jpg (640px)');
  console.log('  - hero-tablet.webp / hero-tablet.jpg (1024px)');
  console.log('  - hero-desktop.webp / hero-desktop.jpg (1920px)');
}

optimizeImage().catch(console.error);
