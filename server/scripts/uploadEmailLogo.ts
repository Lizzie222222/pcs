import { readFileSync } from 'fs';
import { ObjectStorageService } from '../objectStorage';

async function uploadEmailLogo() {
  try {
    const logoPath = '../attached_assets/PCSWhite_1761216344335.png';
    const logoBuffer = readFileSync(logoPath);
    const mimeType = 'image/png';
    const filename = 'pcs-logo-white-email.png';
    
    console.log('Uploading logo to object storage...');
    
    const objectStorageService = new ObjectStorageService();
    
    // Get upload URL
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    console.log('Got upload URL');
    
    // Upload file
    const uploadResponse = await fetch(uploadURL, {
      method: 'PUT',
      body: logoBuffer,
      headers: {
        'Content-Type': mimeType,
        'Content-Length': logoBuffer.length.toString(),
      },
    });
    
    if (!uploadResponse.ok) {
      throw new Error(`Failed to upload: ${uploadResponse.statusText}`);
    }
    
    console.log('File uploaded successfully');
    
    // Set as public
    const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
      uploadURL.split('?')[0],
      {
        owner: 'system',
        visibility: 'public',
      },
      filename,
    );
    
    console.log('\n✓ Logo uploaded successfully!');
    console.log('Object Path:', objectPath);
    console.log('\nTo get the public URL, you can access it via the object storage public path.');
    console.log('Use this path in your email templates:', objectPath);
    
    // Try to get the public URL
    const publicPaths = objectStorageService.getPublicObjectSearchPaths();
    console.log('Public search paths:', publicPaths);
    
    return objectPath;
  } catch (error) {
    console.error('Error uploading logo:', error);
    throw error;
  }
}

// Run immediately
uploadEmailLogo()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

export { uploadEmailLogo };
