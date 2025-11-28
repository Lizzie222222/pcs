import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, ArrowRight } from "lucide-react";

interface DuplicateSchoolsAlertProps {
  onViewDuplicates: () => void;
}

export default function DuplicateSchoolsAlert({ onViewDuplicates }: DuplicateSchoolsAlertProps) {
  const { data: counts, isLoading } = useQuery<{
    new: number;
    reviewed: number;
    dismissed: number;
    merged: number;
    total: number;
  }>({
    queryKey: ['/api/admin/duplicates/counts'],
    refetchInterval: 300000,
  });

  if (isLoading || !counts || counts.new === 0) {
    return null;
  }

  return (
    <Alert className="border-amber-200 bg-amber-50 mb-4" data-testid="alert-duplicate-schools">
      <Copy className="h-5 w-5 text-amber-600" />
      <AlertTitle className="text-amber-800 flex items-center gap-2">
        Potential Duplicate Schools Detected
        <Badge variant="destructive" className="text-xs" data-testid="badge-duplicate-count">
          {counts.new} new
        </Badge>
      </AlertTitle>
      <AlertDescription className="text-amber-700">
        <div className="flex items-center justify-between mt-2">
          <span>
            There {counts.new === 1 ? 'is' : 'are'} {counts.new} potential duplicate school{counts.new !== 1 ? 's' : ''} that {counts.new === 1 ? 'needs' : 'need'} review. 
            Schools may have registered multiple times with the same email domain or postcode.
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={onViewDuplicates}
            className="ml-4 border-amber-400 text-amber-800 hover:bg-amber-100"
            data-testid="button-view-duplicates-alert"
          >
            Review Duplicates
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
