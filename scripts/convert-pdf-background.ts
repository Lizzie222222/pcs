import puppeteer from 'puppeteer';
import { objectStorageClient, parseObjectPath, ObjectStorageService } from '../server/objectStorage';
import { db } from '../server/db';
import { settings } from '../shared/schema';
import { eq, sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

async function convertPDFToImage() {
  console.log('Converting PDF background to PNG image...');
  
  // Read the PDF file
  const pdfPath = path.join(process.cwd(), 'attached_assets', 'Blue Yellow Cute Playful Kids Science Competition Certificate_1762095554284.pdf');
  
  if (!fs.existsSync(pdfPath)) {
    throw new Error(`PDF file not found at ${pdfPath}`);
  }
  
  console.log(`Reading PDF from: ${pdfPath}`);
  
  // Find Chromium
  const findChromiumPath = (): string => {
    const possiblePaths = [
      '/nix/store/*-chromium-*/bin/chromium',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      process.env.PUPPETEER_EXECUTABLE_PATH || '',
    ];

    for (const pathPattern of possiblePaths) {
      if (pathPattern.includes('*')) {
        const matches = require('child_process')
          .execSync(`ls ${pathPattern} 2>/dev/null || true`)
          .toString()
          .trim()
          .split('\n')
          .filter(Boolean);

        if (matches.length > 0) {
          return matches[0];
        }
      } else if (pathPattern && fs.existsSync(pathPattern)) {
        return pathPattern;
      }
    }

    throw new Error('Chromium not found');
  };

  // Launch Puppeteer to convert PDF to image
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: findChromiumPath(),
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  
  // Set viewport to certificate size (11in x 8.5in at 96 DPI)
  await page.setViewport({
    width: 1056,
    height: 816,
  });

  // Load the PDF
  const pdfDataUrl = `data:application/pdf;base64,${fs.readFileSync(pdfPath).toString('base64')}`;
  
  // Create an HTML page that displays the PDF
  await page.setContent(`
    <html>
      <body style="margin: 0; padding: 0; overflow: hidden;">
        <embed src="${pdfDataUrl}" width="1056" height="816" type="application/pdf" />
      </body>
    </html>
  `, { waitUntil: 'networkidle0' });

  // Wait a bit for PDF to render
  await page.waitForTimeout(2000);

  // Take a screenshot
  const imageBuffer = await page.screenshot({
    type: 'png',
    fullPage: true,
  });

  await browser.close();

  console.log(`PNG generated, size: ${imageBuffer.length} bytes`);

  // Upload to object storage
  const objectStorageService = new ObjectStorageService();
  const publicPaths = objectStorageService.getPublicObjectSearchPaths();
  const firstPublicPath = publicPaths[0];
  const { bucketName } = parseObjectPath(firstPublicPath);
  
  const bucket = objectStorageClient.bucket(bucketName);
  const file = bucket.file('public/certificate-backgrounds/default-background.png');

  await file.save(imageBuffer, {
    metadata: {
      contentType: 'image/png',
    },
  });

  console.log('PNG uploaded to object storage');

  // Update database setting
  const backgroundUrl = '/objects/public/certificate-backgrounds/default-background.png';
  
  await db
    .insert(settings)
    .values({
      key: 'certificateBackgroundUrl',
      value: backgroundUrl,
    })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: backgroundUrl },
    });

  console.log(`✅ Background set to: ${backgroundUrl}`);
  console.log('Done!');
  
  process.exit(0);
}

convertPDFToImage().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
