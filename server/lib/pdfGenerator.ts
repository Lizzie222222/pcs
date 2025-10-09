import puppeteer from 'puppeteer';
import type { ReportData } from './reportTemplate';

/**
 * Generate PDF from HTML report using Puppeteer
 * 
 * This function launches a headless browser, renders the HTML report,
 * and converts it to a high-quality PDF document.
 * 
 * @param htmlContent - HTML string of the report to convert to PDF
 * @returns Promise<Buffer> - PDF file as buffer
 */
export async function generatePDFReport(htmlContent: string): Promise<Buffer> {
  let browser = null;
  
  try {
    console.log('[PDF Generator] Launching headless browser...');
    
    // Launch headless browser with proper args for Replit environment
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer'
      ]
    });

    console.log('[PDF Generator] Browser launched successfully');
    
    // Create new page
    const page = await browser.newPage();
    
    // Set content from HTML string
    await page.setContent(htmlContent, {
      waitUntil: 'networkidle2'
    });
    
    console.log('[PDF Generator] HTML content loaded, generating PDF...');
    
    // Generate PDF with proper configuration
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      },
      preferCSSPageSize: true
    });
    
    console.log('[PDF Generator] PDF generated successfully');
    
    // Close browser
    await browser.close();
    browser = null;
    
    // Convert Uint8Array to Buffer
    return Buffer.from(pdfBuffer);
    
  } catch (error) {
    console.error('[PDF Generator] Error generating PDF:', error);
    
    // Ensure browser is closed even on error
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('[PDF Generator] Error closing browser:', closeError);
      }
    }
    
    throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
