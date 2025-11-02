import { generateCertificatePDF } from '../server/certificateService';
import { storage } from '../server/storage';

async function testCertificate() {
  console.log('Testing certificate generation with background...');
  
  // Get a test school
  const school = await storage.getSchool('eb32f546-4eb1-4dbc-a91f-50979eab9ec5');
  if (!school) {
    console.error('School not found');
    process.exit(1);
  }
  
  console.log(`Using school: ${school.name}`);
  
  // Create a test certificate
  const certificate = await storage.createCertificate({
    schoolId: school.id,
    stage: 'act' as const,
    title: 'Test Certificate',
    completedDate: new Date(),
    metadata: { round: 1, test: true },
  });
  
  console.log(`Certificate created: ${certificate.id}`);
  console.log(`Certificate number: ${certificate.certificateNumber}`);
  
  // Generate PDF
  console.log('Generating PDF with background...');
  const pdfUrl = await generateCertificatePDF(certificate.id);
  
  console.log(`PDF generated: ${pdfUrl}`);
  
  // Update certificate with PDF URL
  await storage.updateCertificate(certificate.id, { shareableUrl: pdfUrl });
  
  console.log(`✅ Test certificate created successfully!`);
  console.log(`Certificate ID: ${certificate.id}`);
  console.log(`Download at: http://localhost:5000/api/certificates/${certificate.id}/download`);
  
  process.exit(0);
}

testCertificate().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
