import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, X } from 'lucide-react';
import { useState } from 'react';

interface MigratedUserNoticeProps {
  needsEvidenceResubmission: boolean;
}

export function MigratedUserNotice({ needsEvidenceResubmission }: MigratedUserNoticeProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || !needsEvidenceResubmission) {
    return null;
  }

  return (
    <Alert className="mb-6 bg-yellow-50 border-yellow-200" data-testid="alert-migrated-user">
      <AlertTriangle className="h-5 w-5 text-yellow-600" />
      <div className="flex-1">
        <AlertTitle className="text-yellow-900 font-semibold">
          Welcome Back! Your Account Has Been Migrated
        </AlertTitle>
        <AlertDescription className="text-yellow-800 mt-2">
          <p className="mb-2">
            We've successfully migrated your account from the old system to our new platform. 
            You're now set up with enhanced features and better tools to support your plastic reduction journey!
          </p>
          <p className="font-semibold">
            Important: Evidence Resubmission Required
          </p>
          <p className="mt-1">
            Due to system changes, any evidence you previously submitted needs to be resubmitted in the new platform. 
            Please re-upload your evidence to continue your progression through the Plastic Clever Schools program.
          </p>
          <div className="mt-4 flex gap-3">
            <Button
              size="sm"
              onClick={() => window.location.href = '/dashboard'}
              className="bg-yellow-600 hover:bg-yellow-700"
              data-testid="button-go-dashboard"
            >
              Go to Dashboard
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDismissed(true)}
              data-testid="button-dismiss"
            >
              Dismiss
            </Button>
          </div>
        </AlertDescription>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2"
        onClick={() => setDismissed(true)}
        data-testid="button-close"
      >
        <X className="h-4 w-4" />
      </Button>
    </Alert>
  );
}
