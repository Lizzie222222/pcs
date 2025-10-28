import { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, Lock, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useCollaboration } from '@/hooks/useCollaboration';
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
  const { toast } = useToast();
  const collaboration = useCollaboration();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [unlockReason, setUnlockReason] = useState('');
  
  const isAdmin = user?.role === 'admin' || user?.isAdmin;
  const isLockedByOther = user?.id !== lock.lockedBy;
  
  const lockAge = lock.lockedAt 
    ? formatDistanceToNow(new Date(lock.lockedAt), { addSuffix: true })
    : '';

  const documentTypeLabel = documentType === 'case_study' ? 'case study' : 'event';

  const forceUnlockMutation = useMutation({
    mutationFn: async ({ documentId, documentType, reason }: {
      documentId: string;
      documentType: string;
      reason?: string;
    }) => {
      const res = await fetch('/api/collaboration/locks/force-unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ documentId, documentType, reason }),
      });
      if (!res.ok) throw new Error('Failed to force unlock');
      return res.json();
    },
    onSuccess: () => {
      toast({ 
        title: 'Lock removed', 
        description: 'The document has been unlocked.' 
      });
      setDialogOpen(false);
      setUnlockReason('');
    },
    onError: () => {
      toast({ 
        title: 'Error', 
        description: 'Failed to remove lock', 
        variant: 'destructive' 
      });
    }
  });

  const handleForceUnlock = () => {
    forceUnlockMutation.mutate({
      documentId: lock.documentId,
      documentType: lock.documentType,
      reason: unlockReason || undefined,
    });
  };

  const takeControlMutation = useMutation({
    mutationFn: async () => {
      // Release the current lock
      await collaboration.releaseDocumentLock(lock.documentId, lock.documentType);
      
      // Wait 100ms
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Re-acquire the lock
      const result = await collaboration.requestDocumentLock(lock.documentId, lock.documentType);
      
      if (!result.success) {
        throw new Error('Failed to re-acquire lock');
      }
      
      return result;
    },
    onSuccess: () => {
      toast({
        title: 'Lock refreshed',
        description: 'Your editing lock has been refreshed successfully.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to refresh lock',
        variant: 'destructive',
      });
    }
  });

  return (
    <>
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
          {!isLockedByOther && (
            <div className="mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => takeControlMutation.mutate()}
                disabled={takeControlMutation.isPending}
                data-testid="button-take-control"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${takeControlMutation.isPending ? 'animate-spin' : ''}`} />
                {takeControlMutation.isPending ? 'Refreshing...' : 'Take Control'}
              </Button>
              <p className="text-xs mt-1 opacity-70">
                Refresh your editing lock to continue working
              </p>
            </div>
          )}
          {isAdmin && isLockedByOther && (
            <div className="mt-3">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDialogOpen(true)}
                data-testid="button-force-unlock"
              >
                Force Unlock
              </Button>
              <p className="text-xs mt-1 opacity-70">
                Remove {lock.lockedByName}'s lock (use with caution)
              </p>
            </div>
          )}
        </AlertDescription>
      </Alert>

      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Force Unlock Document?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {lock.lockedByName}'s lock. They may lose unsaved changes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="py-4">
            <label htmlFor="unlock-reason" className="text-sm font-medium mb-2 block">
              Reason (optional)
            </label>
            <Textarea
              id="unlock-reason"
              placeholder="Enter a reason for forcing unlock..."
              value={unlockReason}
              onChange={(e) => setUnlockReason(e.target.value)}
              className="min-h-[80px]"
              data-testid="input-unlock-reason"
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleForceUnlock}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={forceUnlockMutation.isPending}
              data-testid="button-confirm-force-unlock"
            >
              {forceUnlockMutation.isPending ? 'Unlocking...' : 'Force Unlock'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
