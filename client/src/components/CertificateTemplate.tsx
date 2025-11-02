import { forwardRef } from 'react';
import { Certificate, School } from '@shared/schema';
import certificateBgUrl from "@assets/certificate.png";

interface CertificateTemplateProps {
  certificate: Certificate & { school: School };
  showBorder?: boolean;
}

export const CertificateTemplate = forwardRef<HTMLDivElement, CertificateTemplateProps>(
  ({ certificate, showBorder = true }, ref) => {
    const { school } = certificate;

    return (
      <div 
        ref={ref}
        className={`${showBorder ? 'border-8 border-gray-300' : ''} relative overflow-hidden shadow-2xl`}
        style={{
          width: '11in',
          height: '8.5in',
          aspectRatio: '11/8.5',
          backgroundImage: `url(${certificateBgUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
        data-testid="certificate-template"
      >
        {/* School Name in Center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl font-bold text-gray-800 drop-shadow-lg px-8 py-4">
              {school.name}
            </div>
          </div>
        </div>
      </div>
    );
  }
);

CertificateTemplate.displayName = 'CertificateTemplate';
