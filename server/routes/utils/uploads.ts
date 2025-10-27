import multer from 'multer';

/**
 * Configure multer for bulk resource uploads
 * - Memory storage for direct upload to object storage
 * - 150MB max file size
 * - Supports up to 50 files at once
 */
export const bulkResourceUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 157286400 } // 150MB max per file
});

/**
 * Configure multer for photo consent document uploads
 * - Memory storage
 * - 10MB max file size
 * - Only allows PDF, JPG, PNG, and DOCX files
 */
export const photoConsentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10485760 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/pdf', 
      'image/jpeg', 
      'image/jpg', 
      'image/png',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // .docx
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, JPG, PNG, and DOCX files are allowed.'));
    }
  },
});

/**
 * Configure multer for evidence file uploads with compression
 * - Memory storage to allow image compression before upload
 * - 150MB max file size
 */
export const uploadCompression = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 157286400 } // 150MB max
});

/**
 * Configure multer for general file imports
 * - Memory storage
 * - Used for CSV/Excel imports
 */
export const importUpload = multer({ 
  storage: multer.memoryStorage() 
});
