import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generatePDFReport } from './pdfGenerator';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generate a PDF from an HTML template
 * @param templateName - Name of the template file (without .html extension)
 * @returns PDF buffer
 */
export async function generatePrintableForm(templateName: 'audit-form' | 'action-plan-form'): Promise<Buffer> {
  try {
    const templatePath = path.join(__dirname, 'templates', `${templateName}.html`);
    const htmlContent = await fs.readFile(templatePath, 'utf-8');
    
    console.log(`[Printable Forms] Generating PDF for ${templateName}...`);
    const pdfBuffer = await generatePDFReport(htmlContent);
    console.log(`[Printable Forms] PDF generated successfully for ${templateName}`);
    
    return pdfBuffer;
  } catch (error) {
    console.error(`[Printable Forms] Error generating ${templateName}:`, error);
    throw new Error(`Failed to generate printable form: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get the filename for a printable form PDF
 */
export function getPrintableFormFilename(formType: 'audit' | 'action-plan'): string {
  const date = new Date().toISOString().split('T')[0];
  return `plastic-clever-${formType}-form-${date}.pdf`;
}
