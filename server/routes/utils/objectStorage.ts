import { ObjectStorageService } from '../../objectStorage';
import { ObjectAclPolicy } from '../../objectAcl';
import { normalizeObjectStorageUrl } from './urlNormalization';

/**
 * Upload a file to object storage and set ACL policy
 * @param fileBuffer - File buffer to upload
 * @param mimeType - MIME type of the file
 * @param filename - Original filename
 * @param userId - ID of the user uploading
 * @param visibility - ACL visibility ('public' or 'private')
 * @returns Normalized object storage URL with /api/objects prefix
 */
export async function uploadToObjectStorage(
  fileBuffer: Buffer,
  mimeType: string,
  filename: string,
  userId: string,
  visibility: 'public' | 'private' = 'private'
): Promise<string> {
  const objectStorageService = new ObjectStorageService();
  
  // Get upload URL
  const uploadURL = await objectStorageService.getObjectEntityUploadURL();
  
  // Upload file
  const uploadResponse = await fetch(uploadURL, {
    method: 'PUT',
    body: fileBuffer,
    headers: {
      'Content-Type': mimeType,
      'Content-Length': fileBuffer.length.toString(),
    },
  });

  if (!uploadResponse.ok) {
    throw new Error(`Failed to upload file: ${uploadResponse.statusText}`);
  }

  // Set ACL policy
  const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
    uploadURL.split('?')[0],
    {
      owner: userId,
      visibility,
    },
    filename,
  );

  // Normalize the URL to include /api/objects prefix for CORS
  return normalizeObjectStorageUrl(objectPath);
}

/**
 * Helper to create ACL policy for object storage
 */
export function createAclPolicy(
  userId: string,
  visibility: 'public' | 'private' = 'private'
): ObjectAclPolicy {
  return {
    owner: userId,
    visibility,
  };
}
