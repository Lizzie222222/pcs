import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ClipboardCheck } from "lucide-react";

interface AuditQuizPlaceholderProps {
  onClose?: () => void;
}

export function AuditQuizPlaceholder({ onClose }: AuditQuizPlaceholderProps) {
  return (
    <Card className="border-2 border-blue-300 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-navy">
          <ClipboardCheck className="h-6 w-6 text-blue-600" />
          Audit Quiz
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3 bg-white p-4 rounded-lg border border-blue-200">
          <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-navy mb-2">Coming Soon</p>
            <p className="text-sm text-gray-600 mb-3">
              The audit quiz is required to complete the Investigate stage. 
              This feature will be implemented once the quiz content is ready.
            </p>
            <div className="bg-blue-50 p-3 rounded border border-blue-200">
              <p className="text-xs font-semibold text-blue-900 mb-1">Required for progression:</p>
              <p className="text-xs text-blue-800">
                To advance from Investigate to Act, you need:
              </p>
              <ul className="text-xs text-blue-800 list-disc list-inside mt-1 space-y-1">
                <li>2 approved evidence submissions</li>
                <li>Completed audit quiz (when available)</li>
              </ul>
            </div>
          </div>
        </div>
        {onClose && (
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={onClose}
              data-testid="button-close-quiz-placeholder"
            >
              Close
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
