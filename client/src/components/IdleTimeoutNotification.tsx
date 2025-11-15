import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useCollaboration } from "@/contexts/CollaborationContext";
import { WifiOff, RefreshCw } from "lucide-react";

export function IdleTimeoutNotification() {
  const { isIdleDisconnected, reconnect, connectionState } = useCollaboration();

  // Don't show notification if not idle-disconnected
  if (!isIdleDisconnected) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md animate-in slide-in-from-top-2" data-testid="idle-timeout-notification">
      <Alert className="bg-amber-50 border-amber-200 shadow-lg">
        <WifiOff className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-900">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="font-medium mb-1">
                Disconnected due to inactivity
              </div>
              <div className="text-sm text-amber-700 mb-3">
                You were idle for 30 minutes and have been disconnected to save resources. Click below to reconnect and resume real-time collaboration.
              </div>
              <Button
                onClick={reconnect}
                size="sm"
                className="bg-amber-600 hover:bg-amber-700"
                disabled={connectionState === 'connecting' || connectionState === 'connected'}
                data-testid="button-reconnect"
              >
                <RefreshCw className="h-3 w-3 mr-2" />
                {connectionState === 'connecting' ? 'Reconnecting...' : 'Reconnect Now'}
              </Button>
            </div>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}
