import { forwardRef } from 'react';
import { Certificate, School } from '@shared/schema';
import { formatDistanceToNow } from 'date-fns';
import pcsLogoUrl from "@assets/PSC Logo - Blue_1761334524895.png";

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
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        icon: '🌟',
        description: 'Building awareness and motivation for environmental action'
      },
      investigate: {
        title: 'Investigate Stage Achievement', 
        color: 'from-teal-500 to-teal-600',
        bgColor: 'bg-teal-50',
        borderColor: 'border-teal-200',
        icon: '🔍',
        description: 'Researching and analyzing environmental challenges'
      },
      act: {
        title: 'Act Stage Achievement',
        color: 'from-coral-500 to-coral-600',
        bgColor: 'bg-coral-50',
        borderColor: 'border-coral-200',
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
        className={`bg-gradient-to-br from-white via-gray-50 to-blue-50 ${showBorder ? 'border-4 border-pcs_blue' : ''} relative overflow-hidden`}
        style={{
          width: '11in',
          height: '8.5in',
          aspectRatio: '11/8.5'
        }}
        data-testid="certificate-template"
      >
        {/* Decorative Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="cert-pattern" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
                <circle cx="50" cy="50" r="20" fill="#0066CC" opacity="0.1"/>
                <circle cx="25" cy="75" r="15" fill="#00A896" opacity="0.1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#cert-pattern)" />
          </svg>
        </div>

        {/* Colorful Top Border with Logo */}
        <div className={`h-24 bg-gradient-to-r ${config.color} relative flex items-center justify-between px-12`}>
          {/* Logo */}
          <div className="bg-white rounded-lg p-3 shadow-md">
            <img src={pcsLogoUrl} alt="Plastic Clever Schools" className="h-14 w-auto" />
          </div>
          
          {/* Program Title */}
          <div className="text-white text-center">
            <div className="text-2xl font-bold tracking-wide">PLASTIC CLEVER SCHOOLS</div>
            <div className="text-sm font-light opacity-90">Environmental Education Program</div>
          </div>
          
          {/* Stage Icon */}
          <div className="bg-white rounded-full w-16 h-16 flex items-center justify-center text-3xl shadow-md">
            {config.icon}
          </div>
        </div>

        {/* Main Content */}
        <div className="px-16 py-10 h-full flex flex-col justify-between">
          {/* Header Section */}
          <div className="text-center space-y-6">
            <div className="space-y-3">
              <h1 className="text-6xl font-bold text-pcs_blue mb-2 tracking-tight">
                Certificate of Achievement
              </h1>
            </div>

            <div className="space-y-5">
              <div className="text-2xl text-gray-700 font-medium">
                This certifies that
              </div>
              
              {/* School Name - Main Focus with Colorful Design */}
              <div className={`py-8 px-10 bg-gradient-to-r ${config.color} rounded-2xl shadow-xl border-4 border-white relative overflow-hidden`}>
                <div className="absolute inset-0 bg-white/20"></div>
                <div className="relative">
                  <div className="text-5xl font-bold text-white text-center drop-shadow-md">
                    {school.name}
                  </div>
                  <div className="text-xl text-white text-center mt-3 font-medium opacity-95">
                    {school.country}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Achievement Details */}
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-2xl text-gray-700 mb-5 font-medium">
                has successfully completed the
              </div>
              
              <div className={`inline-flex items-center gap-4 px-10 py-5 ${config.bgColor} ${config.borderColor} border-3 rounded-2xl shadow-lg`}>
                <span className="text-4xl">{config.icon}</span>
                <div className="text-left">
                  <div className="text-3xl font-bold text-pcs_blue">{config.title}</div>
                  <div className="text-base text-gray-700 mt-1">{config.description}</div>
                </div>
              </div>
            </div>

            {/* Achievement Stats with Color */}
            <div className="flex justify-center gap-6 text-center">
              <div className={`${config.bgColor} px-8 py-5 rounded-xl border-2 ${config.borderColor} shadow-md`}>
                <div className="text-xs text-gray-600 mb-1 uppercase tracking-wide font-semibold">Certificate Number</div>
                <div className="text-xl font-bold text-pcs_blue">{certificate.certificateNumber}</div>
              </div>
              <div className={`${config.bgColor} px-8 py-5 rounded-xl border-2 ${config.borderColor} shadow-md`}>
                <div className="text-xs text-gray-600 mb-1 uppercase tracking-wide font-semibold">Completion Date</div>
                <div className="text-xl font-bold text-pcs_blue">
                  {completedDate.toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-between items-end pt-6 border-t-2 border-gray-200">
            <div className="text-left">
              <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide font-semibold">Issued Date</div>
              <div className="text-lg font-bold text-pcs_blue">
                {issuedDate.toLocaleDateString()}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {formatDistanceToNow(issuedDate, { addSuffix: true })}
              </div>
            </div>
            
            <div className="text-center">
              <div className={`w-40 border-t-3 ${config.borderColor} mb-3`}></div>
              <div className="text-base font-bold text-pcs_blue">
                Authorized Signature
              </div>
              <div className="text-xs text-gray-600 mt-1">
                Program Director
              </div>
            </div>
            
            <div className="text-right">
              <div className={`w-24 h-24 bg-gradient-to-br ${config.color} rounded-full flex items-center justify-center border-4 border-white shadow-lg`}>
                <div className="text-xs font-bold text-white text-center leading-tight">
                  VERIFIED<br/>
                  <span className="text-2xl">✓</span><br/>
                  ACHIEVEMENT
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Colorful Corner Decorations */}
        <div className="absolute top-28 left-4 w-12 h-12">
          <div className={`w-full h-full bg-gradient-to-br ${config.color} rounded-full opacity-40 shadow-lg`}></div>
        </div>
        <div className="absolute top-28 right-4 w-12 h-12">
          <div className={`w-full h-full bg-gradient-to-br ${config.color} rounded-full opacity-40 shadow-lg`}></div>
        </div>
        <div className="absolute bottom-4 left-8 w-16 h-16">
          <div className={`w-full h-full bg-gradient-to-br ${config.color} rounded-full opacity-30 shadow-lg`}></div>
        </div>
        <div className="absolute bottom-4 right-8 w-16 h-16">
          <div className={`w-full h-full bg-gradient-to-br ${config.color} rounded-full opacity-30 shadow-lg`}></div>
        </div>
        
        {/* Additional decorative elements */}
        <div className="absolute bottom-48 left-0 w-3 h-32 bg-gradient-to-b from-transparent via-pcs_blue to-transparent opacity-20"></div>
        <div className="absolute bottom-48 right-0 w-3 h-32 bg-gradient-to-b from-transparent via-pcs_blue to-transparent opacity-20"></div>
      </div>
    );
  }
);

CertificateTemplate.displayName = 'CertificateTemplate';