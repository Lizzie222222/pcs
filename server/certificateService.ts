import { storage } from './storage';
import { objectStorageClient, ObjectStorageService } from './objectStorage';
import puppeteer, { Browser } from 'puppeteer';
import ReactDOMServer from 'react-dom/server';
import { CertificateTemplate } from '../client/src/components/CertificateTemplate';
import { Certificate, School } from '@shared/schema';

/**
 * Generate a PDF from a certificate and upload it to Google Cloud Storage
 * @param certificateId - The ID of the certificate to generate PDF for
 * @param customBackgroundUrl - Optional custom background image URL
 * @returns The public URL of the uploaded PDF
 */
export async function generateCertificatePDF(
  certificateId: string,
  customBackgroundUrl?: string
): Promise<string> {
  let browser: Browser | null = null;

  try {
    console.log(`[Certificate PDF] Starting PDF generation for certificate ${certificateId}`);

    // 1. Fetch certificate and school data from database
    const certificateWithSchool = await storage.getCertificate(certificateId);
    
    if (!certificateWithSchool) {
      throw new Error(`Certificate with ID ${certificateId} not found`);
    }

    console.log(`[Certificate PDF] Fetched certificate data for school: ${certificateWithSchool.school.name}`);

    // 1.5. Fetch custom background from settings if not provided
    let backgroundUrl = customBackgroundUrl;
    if (!backgroundUrl) {
      try {
        backgroundUrl = await storage.getSetting('certificateBackgroundUrl') || undefined;
        if (backgroundUrl) {
          console.log(`[Certificate PDF] Using custom background from settings: ${backgroundUrl}`);
        }
      } catch (error) {
        console.warn('[Certificate PDF] Failed to fetch custom background setting, using default');
      }
    }

    // 2. Render the CertificateTemplate React component to HTML
    const certificateHTML = renderCertificateHTML(certificateWithSchool, backgroundUrl);

    // 3. Use Puppeteer to convert HTML to PDF
    console.log('[Certificate PDF] Launching Puppeteer browser...');
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    const page = await browser.newPage();
    
    // Set viewport to match certificate dimensions
    await page.setViewport({
      width: 1056, // 11 inches * 96 DPI
      height: 816,  // 8.5 inches * 96 DPI
    });

    // Set content and wait for images to load
    await page.setContent(certificateHTML, {
      waitUntil: ['networkidle0', 'load'],
    });

    console.log('[Certificate PDF] Generating PDF...');
    
    // Generate PDF with landscape orientation (11in x 8.5in)
    const pdfUint8Array = await page.pdf({
      format: 'Letter',
      landscape: true,
      width: '11in',
      height: '8.5in',
      printBackground: true,
      margin: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
      },
    });

    // Convert Uint8Array to Buffer
    const pdfBuffer = Buffer.from(pdfUint8Array);

    console.log(`[Certificate PDF] PDF generated, size: ${pdfBuffer.length} bytes`);

    // 4. Upload PDF to Google Cloud Storage in public/certificates/ directory
    const publicUrl = await uploadCertificatePDF(
      certificateId,
      pdfBuffer,
      certificateWithSchool.school.name
    );

    console.log(`[Certificate PDF] PDF uploaded successfully: ${publicUrl}`);

    return publicUrl;

  } catch (error) {
    console.error('[Certificate PDF] Error generating certificate PDF:', error);
    throw new Error(`Failed to generate certificate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    // Clean up Puppeteer browser instance
    if (browser) {
      try {
        await browser.close();
        console.log('[Certificate PDF] Browser closed successfully');
      } catch (closeError) {
        console.error('[Certificate PDF] Error closing browser:', closeError);
      }
    }
  }
}

/**
 * Render the CertificateTemplate component to a complete HTML page
 */
function renderCertificateHTML(
  certificateWithSchool: Certificate & { school: School },
  customBackgroundUrl?: string
): string {
  // Create a props object for the CertificateTemplate
  const templateProps = {
    certificate: certificateWithSchool,
    showBorder: false, // No border for PDF
    backgroundUrl: customBackgroundUrl,
  };

  // Render the React component to HTML string
  const componentHTML = ReactDOMServer.renderToString(
    CertificateTemplate(templateProps)
  );

  // Wrap in a complete HTML document with necessary styles
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Certificate</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          margin: 0;
          padding: 0;
          width: 11in;
          height: 8.5in;
          overflow: hidden;
        }
        
        /* Tailwind-like utility classes used by the component */
        .relative { position: relative; }
        .absolute { position: absolute; }
        .inset-0 { top: 0; right: 0; bottom: 0; left: 0; }
        .flex { display: flex; }
        .items-center { align-items: center; }
        .justify-center { justify-content: center; }
        .text-center { text-align: center; }
        .overflow-hidden { overflow: hidden; }
        .shadow-2xl { box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); }
        .gap-2 { gap: 0.5rem; }
        .gap-4 { gap: 1rem; }
        .gap-6 { gap: 1.5rem; }
        .mb-4 { margin-bottom: 1rem; }
        .mb-6 { margin-bottom: 1.5rem; }
        .mt-4 { margin-top: 1rem; }
        .px-8 { padding-left: 2rem; padding-right: 2rem; }
        .space-y-2 > * + * { margin-top: 0.5rem; }
        
        /* Text sizes */
        .text-6xl { font-size: 3.75rem; line-height: 1; }
        .text-2xl { font-size: 1.5rem; line-height: 2rem; }
        .text-xl { font-size: 1.25rem; line-height: 1.75rem; }
        .text-lg { font-size: 1.125rem; line-height: 1.75rem; }
        .text-base { font-size: 1rem; line-height: 1.5rem; }
        .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
        
        /* Font weights */
        .font-bold { font-weight: 700; }
        .font-semibold { font-weight: 600; }
        .font-medium { font-weight: 500; }
        .font-mono { font-family: ui-monospace, monospace; }
        
        /* Colors */
        .text-gray-800 { color: rgb(31, 41, 55); }
        .text-gray-700 { color: rgb(55, 65, 81); }
        .text-gray-600 { color: rgb(75, 85, 99); }
        .text-gray-500 { color: rgb(107, 114, 128); }
        .text-green-600 { color: rgb(22, 163, 74); }
        
        /* Effects */
        .drop-shadow-lg {
          filter: drop-shadow(0 10px 8px rgb(0 0 0 / 0.04)) 
                  drop-shadow(0 4px 3px rgb(0 0 0 / 0.1));
        }
      </style>
    </head>
    <body>
      ${componentHTML}
    </body>
    </html>
  `;
}

/**
 * Upload certificate PDF to Google Cloud Storage
 */
async function uploadCertificatePDF(
  certificateId: string,
  pdfBuffer: Buffer,
  schoolName: string
): Promise<string> {
  const objectStorageService = new ObjectStorageService();
  
  // Get the public object search paths from environment
  const publicPaths = objectStorageService.getPublicObjectSearchPaths();
  
  if (!publicPaths || publicPaths.length === 0) {
    throw new Error('PUBLIC_OBJECT_SEARCH_PATHS not configured');
  }

  // Parse the first public path to get bucket name
  // Format: /bucket-name/public
  const firstPublicPath = publicPaths[0];
  const pathParts = firstPublicPath.split('/').filter(p => p);
  
  if (pathParts.length < 1) {
    throw new Error('Invalid PUBLIC_OBJECT_SEARCH_PATHS format');
  }

  const bucketName = pathParts[0];
  const objectName = `public/certificates/${certificateId}.pdf`;

  console.log(`[Certificate PDF] Uploading to bucket: ${bucketName}, object: ${objectName}`);

  // Get the bucket and file reference
  const bucket = objectStorageClient.bucket(bucketName);
  const file = bucket.file(objectName);

  // Upload the PDF buffer
  await file.save(pdfBuffer, {
    metadata: {
      contentType: 'application/pdf',
      metadata: {
        certificateId,
        schoolName,
        generatedAt: new Date().toISOString(),
      },
    },
  });

  // Make the file publicly accessible
  await file.makePublic();

  console.log('[Certificate PDF] File made public');

  // Generate the public URL
  const publicUrl = `https://storage.googleapis.com/${bucketName}/${objectName}`;

  return publicUrl;
}
