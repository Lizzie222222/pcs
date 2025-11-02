import fs from 'fs';
import { objectStorageClient, parseObjectPath, ObjectStorageService } from '../server/objectStorage';
import { db } from '../server/db';
import { settings } from '@shared/schema';
import { sql } from 'drizzle-orm';

/**
 * Script to restore the certificate PDF background
 * Uploads the PDF to object storage and sets the database setting
 */
async function restoreCertificateBackground() {
  try {
    console.log('Starting certificate background restoration...');

    // 1. Read the PDF file from attached_assets
    const pdfPath = 'attached_assets/Blue Yellow Cute Playful Kids Science Competition Certificate_1762095554284.pdf';
    console.log(`Reading PDF from: ${pdfPath}`);
    
    if (!fs.existsSync(pdfPath)) {
      throw new Error(`PDF file not found at: ${pdfPath}`);
    }
    
    const pdfBuffer = fs.readFileSync(pdfPath);
    console.log(`PDF loaded, size: ${pdfBuffer.length} bytes`);

    // 2. Upload to object storage in public directory
    const objectStorageService = new ObjectStorageService();
    const publicPaths = objectStorageService.getPublicObjectSearchPaths();
    const firstPublicPath = publicPaths[0];
    
    console.log(`Public paths: ${publicPaths.join(', ')}`);
    console.log(`Using public path: ${firstPublicPath}`);
    
    // Parse the bucket name from the public path
    const { bucketName } = parseObjectPath(firstPublicPath);
    console.log(`Bucket name: ${bucketName}`);
    
    // Create the file path in the bucket
    const objectName = 'public/certificate-backgrounds/default-background.pdf';
    console.log(`Uploading to: ${bucketName}/${objectName}`);
    
    const bucket = objectStorageClient.bucket(bucketName);
    const file = bucket.file(objectName);
    
    // Upload the PDF
    await file.save(pdfBuffer, {
      metadata: {
        contentType: 'application/pdf',
        cacheControl: 'public, max-age=31536000', // Cache for 1 year
      },
    });
    
    console.log('PDF uploaded successfully (will be served through /objects/ endpoint)');

    // 3. Set the database setting
    const normalizedPath = '/objects/public/certificate-backgrounds/default-background.pdf';
    console.log(`Setting database configuration to: ${normalizedPath}`);
    
    // Insert or update the setting
    await db.insert(settings)
      .values({
        key: 'certificateBackgroundUrl',
        value: normalizedPath,
      })
      .onConflictDoUpdate({
        target: settings.key,
        set: { 
          value: normalizedPath,
          updatedAt: sql`now()`
        },
      });
    
    console.log('Database setting updated successfully');
    
    // 4. Verify the setting
    const result = await db.select()
      .from(settings)
      .where(sql`${settings.key} = 'certificateBackgroundUrl'`)
      .limit(1);
    
    if (result.length > 0) {
      console.log('\n✅ Certificate background restored successfully!');
      console.log(`Database setting: ${result[0].key} = ${result[0].value}`);
      console.log(`PDF location: ${bucketName}/${objectName}`);
      console.log(`Public URL: ${normalizedPath}`);
    } else {
      console.error('⚠️ Setting not found after update');
    }

  } catch (error) {
    console.error('Error restoring certificate background:', error);
    throw error;
  }
}

// Run the script
restoreCertificateBackground()
  .then(() => {
    console.log('\nScript completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nScript failed:', error);
    process.exit(1);
  });
