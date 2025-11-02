import React, { forwardRef } from 'react';
import { Certificate, School } from '@shared/schema';

interface CertificateTemplateProps {
  certificate: Certificate & { school: School };
  showBorder?: boolean;
  backgroundUrl?: string;
}

export const CertificateTemplate = forwardRef<HTMLDivElement, CertificateTemplateProps>(
  ({ certificate, showBorder = true, backgroundUrl }, ref) => {
    const { school } = certificate;
    
    // Extract round number from metadata or default to 1
    const roundNumber = (certificate.metadata as any)?.round || 1;
    
    // Format the completion date
    const completionDate = new Date(certificate.completedDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return (
      <div 
        ref={ref}
        className={`${showBorder ? 'border-8 border-gray-300' : ''} relative overflow-hidden shadow-2xl`}
        style={{
          width: '11in',
          height: '8.5in',
          aspectRatio: '11/8.5',
          ...(backgroundUrl && {
            backgroundImage: `url(${backgroundUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }),
          ...(!backgroundUrl && {
            background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #dbeafe 100%)'
          })
        }}
        data-testid="certificate-template"
      >
        {/* School Name and Details in Center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center px-8">
            {/* School Name - Prominent */}
            <div className="text-6xl font-bold text-gray-800 drop-shadow-lg mb-6">
              {school.name}
            </div>
            
            {/* Round and Completion Info - Smaller */}
            <div className="space-y-2 mb-4">
              <div className="text-2xl font-semibold text-gray-700">
                Round {roundNumber} Completion Certificate
              </div>
              <div className="text-lg text-gray-600">
                {completionDate}
              </div>
            </div>
            
            {/* Achievement Stages - Smaller */}
            <div className="flex items-center justify-center gap-6 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-green-600 text-xl font-bold">✓</span>
                <span className="text-base font-medium text-gray-700">Inspire</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-600 text-xl font-bold">✓</span>
                <span className="text-base font-medium text-gray-700">Investigate</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-600 text-xl font-bold">✓</span>
                <span className="text-base font-medium text-gray-700">Act</span>
              </div>
            </div>
            
            {/* Certificate Number - Smallest */}
            <div className="text-sm text-gray-500 font-mono mt-4">
              Certificate No: {certificate.certificateNumber}
            </div>
          </div>
        </div>
      </div>
    );
  }
);

CertificateTemplate.displayName = 'CertificateTemplate';
