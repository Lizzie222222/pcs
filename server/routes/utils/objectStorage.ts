import { ObjectStorageService } from '../../objectStorage';
import { ObjectPermission } from '../../objectAcl';

/**
 * Upload a file to object storage and set ACL policy
 * @param fileBuffer - File buffer to upload
 * @param mimeType - MIME type of the file
 * @param filename - Original filename
 * @param userId - ID of the user uploading
 * @param visibility - ACL visibility ('public' or 'private')
 * @returns Object storage path
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

  return objectPath;
}

/**
 * Helper to create ACL policy for object storage
 */
export function createAclPolicy(
  userId: string,
  visibility: 'public' | 'private' = 'private'
): ObjectPermission {
  return {
    owner: userId,
    visibility,
  };
}
