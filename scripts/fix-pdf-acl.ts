import { objectStorageClient } from "../server/objectStorage";
import { setObjectAclPolicy } from "../server/objectAcl";

const PDF_FILES_TO_FIX = [
  "897d6fe6-de74-47e6-8f01-0c88c0d00584",
  "1a6212a8-a420-41b3-8147-a77f8eca163a"
];

async function fixPdfAcl() {
  const bucketName = process.env.BUCKET_NAME || 'default-bucket';
  const bucket = objectStorageClient.bucket(bucketName);

  for (const fileId of PDF_FILES_TO_FIX) {
    const filePath = `uploads/${fileId}`;
    const file = bucket.file(filePath);

    try {
      const [exists] = await file.exists();
      if (!exists) {
        console.log(`❌ File not found: ${filePath}`);
        continue;
      }

      await setObjectAclPolicy(file, {
        owner: 'system',
        visibility: 'public',
      });

      console.log(`✅ Set public ACL for: ${filePath}`);
    } catch (error) {
      console.error(`❌ Error setting ACL for ${filePath}:`, error);
    }
  }

  console.log('\n✨ ACL update complete!');
}

fixPdfAcl().catch(console.error);
