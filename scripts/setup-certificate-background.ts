import { objectStorageClient, parseObjectPath, ObjectStorageService } from '../server/objectStorage';
import { db } from '../server/db';
import { settings } from '../shared/schema';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';

async function setupBackground() {
  console.log('Setting up certificate background...');
  
  // Check if PNG version exists, otherwise use PDF
  const pngPath = path.join(process.cwd(), 'attached_assets', 'certificate.png');
  const pdfPath = path.join(process.cwd(), 'attached_assets', 'Blue Yellow Cute Playful Kids Science Competition Certificate_1762095554284.pdf');
  
  let imageBuffer: Buffer;
  let filename: string;
  
  if (fs.existsSync(pngPath)) {
    console.log('Using existing PNG file...');
    imageBuffer = fs.readFileSync(pngPath);
    filename = 'default-background.png';
  } else if (fs.existsSync(pdfPath)) {
    console.log('PDF found, but we need to use an image format for CSS backgrounds');
    console.log('Please provide a PNG or JPG version of your certificate background');
    process.exit(1);
  } else {
    throw new Error('No background file found');
  }

  // Resize to certificate dimensions if needed (11in x 8.5in at 150 DPI = 1650 x 1275)
  const resizedBuffer = await sharp(imageBuffer)
    .resize(1650, 1275, {
      fit: 'cover',
      position: 'center'
    })
    .png()
    .toBuffer();

  console.log(`Image processed, size: ${resizedBuffer.length} bytes`);

  // Upload to object storage
  const objectStorageService = new ObjectStorageService();
  const publicPaths = objectStorageService.getPublicObjectSearchPaths();
  const firstPublicPath = publicPaths[0];
  const { bucketName } = parseObjectPath(firstPublicPath);
  
  const bucket = objectStorageClient.bucket(bucketName);
  const file = bucket.file(`public/certificate-backgrounds/${filename}`);

  await file.save(resizedBuffer, {
    metadata: {
      contentType: 'image/png',
    },
  });

  // Make it actually public
  try {
    await file.makePublic();
    console.log('File made public in GCS');
  } catch (error) {
    console.warn('Could not make file public:', error);
  }

  console.log('Image uploaded to object storage');

  // Get the FULL URL that Puppeteer can access
  const [metadata] = await file.getMetadata();
  const fullUrl = `https://storage.googleapis.com/${bucketName}/public/certificate-backgrounds/${filename}`;
  
  console.log(`Full URL: ${fullUrl}`);

  // Update database setting with FULL URL
  await db
    .insert(settings)
    .values({
      key: 'certificateBackgroundUrl',
      value: fullUrl,
    })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: fullUrl },
    });

  console.log(`✅ Background set to: ${fullUrl}`);
  console.log('Done!');
  
  process.exit(0);
}

setupBackground().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
