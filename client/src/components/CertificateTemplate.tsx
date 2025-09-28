import { forwardRef } from 'react';
import { Certificate, School } from '@shared/schema';
import { formatDistanceToNow } from 'date-fns';

interface CertificateTemplateProps {
  certificate: Certificate & { school: School };
  showBorder?: boolean;
}

export const CertificateTemplate = forwardRef<HTMLDivElement, CertificateTemplateProps>(
  ({ certificate, showBorder = true }, ref) => {
    const { school } = certificate;
    
    const stageConfig = {
      inspire: {
        title: 'Inspire Stage Achievement',
        color: 'from-blue-500 to-blue-600',
        icon: '🌟',
        description: 'Building awareness and motivation for environmental action'
      },
      investigate: {
        title: 'Investigate Stage Achievement', 
        color: 'from-teal-500 to-teal-600',
        icon: '🔍',
        description: 'Researching and analyzing environmental challenges'
      },
      act: {
        title: 'Act Stage Achievement',
        color: 'from-coral-500 to-coral-600', 
        icon: '🚀',
        description: 'Taking concrete action for environmental change'
      }
    };

    const config = stageConfig[certificate.stage];
    const completedDate = certificate.completedDate ? new Date(certificate.completedDate) : new Date();
    const issuedDate = certificate.issuedDate ? new Date(certificate.issuedDate) : new Date();

    return (
      <div 
        ref={ref}
        className={`bg-white ${showBorder ? 'border-2 border-gray-200' : ''} relative overflow-hidden`}
        style={{
          width: '11in',
          height: '8.5in',
          aspectRatio: '11/8.5'
        }}
        data-testid="certificate-template"
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="cert-pattern" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
                <circle cx="50" cy="50" r="20" fill="currentColor" opacity="0.1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#cert-pattern)" />
          </svg>
        </div>

        {/* Header Border */}
        <div className={`h-16 bg-gradient-to-r ${config.color} relative`}>
          <div className="absolute inset-0 bg-white/10">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="header-pattern" x="0" y="0" width="50" height="50" patternUnits="userSpaceOnUse">
                  <rect width="50" height="50" fill="transparent"/>
                  <path d="M0 50 L50 0 M-10 10 L10 -10 M40 60 L60 40" stroke="white" strokeWidth="1" opacity="0.2"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#header-pattern)" />
            </svg>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-16 py-12 h-full flex flex-col justify-between">
          {/* Header Section */}
          <div className="text-center space-y-6">
            <div className="space-y-2">
              <h1 className="text-5xl font-bold text-navy mb-2">
                Certificate of Achievement
              </h1>
              <div className="text-2xl text-gray-600 font-light">
                Plastic Clever Schools Program
              </div>
            </div>

            <div className="space-y-4">
              <div className="text-xl text-gray-700">
                This certifies that
              </div>
              
              {/* School Name - Main Focus */}
              <div className="py-6 px-8 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border-2 border-dashed border-gray-300">
                <div className="text-4xl font-bold text-navy text-center">
                  {school.name}
                </div>
                <div className="text-lg text-gray-600 text-center mt-2">
                  {school.country}
                </div>
              </div>
            </div>
          </div>

          {/* Achievement Details */}
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-xl text-gray-700 mb-4">
                has successfully completed the
              </div>
              
              <div className={`inline-flex items-center gap-4 px-8 py-4 bg-gradient-to-r ${config.color} text-white rounded-lg shadow-lg`}>
                <span className="text-3xl">{config.icon}</span>
                <div className="text-left">
                  <div className="text-2xl font-bold">{config.title}</div>
                  <div className="text-sm opacity-90">{config.description}</div>
                </div>
              </div>
            </div>

            {/* Achievement Stats */}
            <div className="flex justify-center gap-8 text-center">
              <div className="bg-gray-50 px-6 py-4 rounded-lg">
                <div className="text-2xl font-bold text-navy">{certificate.certificateNumber}</div>
                <div className="text-sm text-gray-600">Certificate Number</div>
              </div>
              <div className="bg-gray-50 px-6 py-4 rounded-lg">
                <div className="text-2xl font-bold text-navy">
                  {completedDate.toLocaleDateString()}
                </div>
                <div className="text-sm text-gray-600">Completion Date</div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-between items-end">
            <div className="text-left">
              <div className="text-sm text-gray-500 mb-1">Issued:</div>
              <div className="text-lg font-medium text-gray-700">
                {issuedDate.toLocaleDateString()}
              </div>
              <div className="text-sm text-gray-500">
                {formatDistanceToNow(issuedDate, { addSuffix: true })}
              </div>
            </div>
            
            <div className="text-center">
              <div className="w-32 border-t-2 border-gray-400 mb-2"></div>
              <div className="text-sm font-medium text-gray-600">
                Plastic Clever Schools
              </div>
              <div className="text-xs text-gray-500">
                Environmental Education Program
              </div>
            </div>
            
            <div className="text-right">
              <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-blue-100 rounded-full flex items-center justify-center border-2 border-gray-300">
                <div className="text-xs font-bold text-gray-600 text-center leading-tight">
                  VERIFIED<br/>ACHIEVEMENT
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Corner Decorations */}
        <div className="absolute top-4 left-4 w-8 h-8">
          <div className={`w-full h-full bg-gradient-to-br ${config.color} rounded-full opacity-30`}></div>
        </div>
        <div className="absolute top-4 right-4 w-8 h-8">
          <div className={`w-full h-full bg-gradient-to-br ${config.color} rounded-full opacity-30`}></div>
        </div>
        <div className="absolute bottom-4 left-4 w-8 h-8">
          <div className={`w-full h-full bg-gradient-to-br ${config.color} rounded-full opacity-30`}></div>
        </div>
        <div className="absolute bottom-4 right-4 w-8 h-8">
          <div className={`w-full h-full bg-gradient-to-br ${config.color} rounded-full opacity-30`}></div>
        </div>
      </div>
    );
  }
);

CertificateTemplate.displayName = 'CertificateTemplate';