import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Lock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import type { DocumentLock } from '@/hooks/useCollaboration';
import { LockCountdown } from './LockCountdown';

interface DocumentLockWarningProps {
  lock: DocumentLock;
  documentType: 'case_study' | 'event';
  onTakeOver?: () => void;
  className?: string;
}

export default function DocumentLockWarning({ lock, documentType, onTakeOver, className = '' }: DocumentLockWarningProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.isAdmin;
  
  const lockAge = lock.lockedAt 
    ? formatDistanceToNow(new Date(lock.lockedAt), { addSuffix: true })
    : '';

  const documentTypeLabel = documentType === 'case_study' ? 'case study' : 'event';

  return (
    <Alert variant="destructive" className={className} data-testid="alert-document-locked">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle className="flex items-center gap-2">
        <Lock className="h-4 w-4" />
        <span data-testid="lock-title">Document Locked</span>
      </AlertTitle>
      <AlertDescription className="mt-2 space-y-2">
        <p data-testid="lock-message">
          <strong>{lock.lockedByName}</strong> is currently editing this {documentTypeLabel}.
          Changes are read-only until they finish.
        </p>
        {lockAge && (
          <p className="text-sm opacity-80" data-testid="lock-time">
            Locked {lockAge}
          </p>
        )}
        <LockCountdown expiresAt={lock.expiresAt} className="mt-2" />
        {isAdmin && onTakeOver && (
          <div className="mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={onTakeOver}
              className="bg-white hover:bg-gray-50 text-destructive border-destructive/50"
              data-testid="button-take-over"
            >
              Take Over Editing
            </Button>
            <p className="text-xs mt-1 opacity-70">
              This will release their lock and allow you to edit
            </p>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}
