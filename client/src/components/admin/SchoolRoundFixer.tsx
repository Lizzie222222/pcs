import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { RefreshCcw, AlertTriangle, CheckCircle, FileCheck, Activity, Loader2 } from 'lucide-react';

interface AuditSummary {
  totalSchools: number;
  logicalSchools: number;
  illogicalSchools: number;
  byIssueType: {
    excessiveProgress: number;
    roundMismatch: number;
  };
  byRound: {
    [key: number]: {
      total: number;
      logical: number;
      illogical: number;
      avgProgress: number;
    };
  };
}

interface SchoolAuditResult {
  id: string;
  name: string;
  country: string;
  currentRound: number;
  roundsCompleted: number;
  inspireCompleted: boolean;
  investigateCompleted: boolean;
  actCompleted: boolean;
  awardCompleted: boolean;
  progressPercentage: number;
  currentStage: string;
  status: 'logical' | 'illogical_excessive_progress' | 'illogical_round_mismatch';
  issue?: string;
  recommendedFix?: any;
}

export default function SchoolRoundFixer() {
  const [isAuditing, setIsAuditing] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [auditSummary, setAuditSummary] = useState<AuditSummary | null>(null);
  const [illogicalSchools, setIllogicalSchools] = useState<SchoolAuditResult[]>([]);
  const [fixResult, setFixResult] = useState<any>(null);
  const { toast } = useToast();

  // Mutation for recalculating Round 2+ schools progress
  const recalculateRoundProgressMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/admin/migration/recalculate-round-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to recalculate progress');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Recalculation Complete",
        description: `Processed ${data.total} schools. Updated: ${data.updated}, Skipped: ${data.skipped}`,
      });
      // Re-run audit after recalculation
      setTimeout(() => handleAudit(), 1000);
    },
    onError: (error: Error) => {
      toast({
        title: "Recalculation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAudit = async () => {
    setIsAuditing(true);
    setAuditSummary(null);
    setIllogicalSchools([]);
    setFixResult(null);

    try {
      const response = await fetch('/api/admin/migration/audit-school-rounds', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Audit failed');
      }

      const data = await response.json();
      setAuditSummary(data.summary);
      
      // Filter to show only illogical schools
      const illogical = data.schools.filter((s: SchoolAuditResult) => s.status !== 'logical');
      setIllogicalSchools(illogical);

      toast({
        title: "Audit Complete",
        description: `Found ${data.summary.illogicalSchools} schools with illogical round states`,
        variant: data.summary.illogicalSchools > 0 ? "destructive" : "default",
      });
    } catch (error) {
      toast({
        title: "Audit Error",
        description: error instanceof Error ? error.message : "Failed to audit schools",
        variant: "destructive",
      });
    } finally {
      setIsAuditing(false);
    }
  };

  const handleFix = async (dryRun: boolean = false) => {
    if (!illogicalSchools || illogicalSchools.length === 0) {
      toast({
        title: "No Schools to Fix",
        description: "Run an audit first to identify schools that need fixing",
        variant: "destructive",
      });
      return;
    }

    setIsFixing(true);
    setFixResult(null);

    try {
      const schoolIds = illogicalSchools.map(s => s.id);
      
      const response = await fetch('/api/admin/migration/fix-school-rounds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolIds, dryRun }),
      });

      if (!response.ok) {
        throw new Error('Fix failed');
      }

      const data = await response.json();
      setFixResult(data);

      if (dryRun) {
        toast({
          title: "Dry Run Complete",
          description: `Would fix ${data.wouldFix} schools. No changes made.`,
        });
      } else {
        toast({
          title: "Fix Complete",
          description: `Successfully fixed ${data.fixed} schools`,
        });
        // Re-run audit to see updated state
        setTimeout(() => handleAudit(), 1000);
      }
    } catch (error) {
      toast({
        title: "Fix Error",
        description: error instanceof Error ? error.message : "Failed to fix schools",
        variant: "destructive",
      });
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Recalculate Round 2+ Progress Tool */}
      <Card className="border-2 border-orange-500/20 bg-gradient-to-br from-orange-50/30 to-white dark:from-orange-900/10 dark:to-gray-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
            <RefreshCcw className="w-5 h-5" />
            Recalculate Round 2+ Schools Progress
          </CardTitle>
          <CardDescription>
            Fixes Round 2+ schools showing incorrect progress percentages. Recalculates progress based on actual evidence, not stale completion flags.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-orange-200 bg-orange-50/50 dark:bg-orange-900/20">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription>
              <strong>What this fixes:</strong> Round 2+ schools may show 100% progress even when they have no evidence in their current round.
              This happens when old completion flags from previous rounds are incorrectly used in progress calculation.
              <br /><br />
              <strong>What it does:</strong> Recalculates progress for all Round 2+ schools using their actual evidence counts, 
              ignoring any stale completion flags. Progress will correctly show 0-100% based on evidence submitted in the current round.
            </AlertDescription>
          </Alert>

          <Button 
            onClick={() => recalculateRoundProgressMutation.mutate()}
            disabled={recalculateRoundProgressMutation.isPending}
            className="w-full bg-orange-600 hover:bg-orange-700"
            data-testid="button-recalculate-round-progress"
          >
            {recalculateRoundProgressMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Recalculating Round 2+ Progress...
              </>
            ) : (
              <>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Recalculate Round 2+ Progress
              </>
            )}
          </Button>

          {recalculateRoundProgressMutation.isSuccess && recalculateRoundProgressMutation.data && (
            <Alert className="bg-orange-50 border-orange-200 dark:bg-orange-900/20">
              <CheckCircle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800 dark:text-orange-200">
                <strong className="block mb-2">Recalculation Complete</strong>
                <div className="space-y-1 text-sm">
                  <div>• Total schools processed: {recalculateRoundProgressMutation.data.total}</div>
                  <div>• Schools updated: {recalculateRoundProgressMutation.data.updated}</div>
                  <div>• Schools skipped (no changes): {recalculateRoundProgressMutation.data.skipped}</div>
                  {recalculateRoundProgressMutation.data.progressChanges && recalculateRoundProgressMutation.data.progressChanges.length > 0 && (
                    <div className="mt-2">
                      <strong>Progress Changes (first 5):</strong>
                      <ul className="ml-4 mt-1">
                        {recalculateRoundProgressMutation.data.progressChanges.slice(0, 5).map((change: any, idx: number) => (
                          <li key={idx}>
                            {change.schoolName}: {change.oldProgress}% → {change.newProgress}%
                          </li>
                        ))}
                        {recalculateRoundProgressMutation.data.progressChanges.length > 5 && (
                          <li className="font-semibold">
                            ...and {recalculateRoundProgressMutation.data.progressChanges.length - 5} more
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            School Round Integrity Check
          </CardTitle>
          <CardDescription>
            Audit schools to identify those with illogical progress percentages (e.g., Round 2 schools with 153% progress, Round 3 schools with 273% progress),
            then fix them by resetting progress to 0% while PRESERVING their round achievements (currentRound and roundsCompleted remain intact).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>What this fixes:</strong> The migration incorrectly used cumulative progress percentages 
              (Round 2 = 153%, Round 3 = 273%). This tool resets progress to 0% and clears completion flags for the current round,
              while <strong>PRESERVING</strong> their round achievements (schools stay in Round 2/3, roundsCompleted is kept).
              <br /><br />
              <strong>What is preserved:</strong> currentRound, roundsCompleted, legacyEvidenceCount
              <br />
              <strong>What is reset:</strong> progressPercentage (to 0%), currentStage (to 'inspire'), all completion flags (to false)
            </AlertDescription>
          </Alert>

          <div className="flex gap-3">
            <Button 
              onClick={handleAudit} 
              disabled={isAuditing}
              data-testid="button-audit-rounds"
            >
              {isAuditing ? (
                <>
                  <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
                  Auditing...
                </>
              ) : (
                <>
                  <FileCheck className="mr-2 h-4 w-4" />
                  Run Audit
                </>
              )}
            </Button>

            {illogicalSchools && illogicalSchools.length > 0 && (
              <>
                <Button 
                  onClick={() => handleFix(true)} 
                  disabled={isFixing}
                  variant="outline"
                  data-testid="button-dry-run"
                >
                  <FileCheck className="mr-2 h-4 w-4" />
                  Dry Run
                </Button>
                
                <Button 
                  onClick={() => handleFix(false)} 
                  disabled={isFixing}
                  variant="destructive"
                  data-testid="button-fix-rounds"
                >
                  {isFixing ? (
                    <>
                      <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
                      Fixing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Fix All Issues
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Audit Summary */}
      {auditSummary && (
        <Card>
          <CardHeader>
            <CardTitle>Audit Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-3xl font-bold text-blue-600">{auditSummary.totalSchools}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Schools</div>
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-3xl font-bold text-green-600">{auditSummary.logicalSchools}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Logical State</div>
              </div>
              <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="text-3xl font-bold text-red-600">{auditSummary.illogicalSchools}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Need Fixing</div>
              </div>
            </div>

            {auditSummary.illogicalSchools > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold">Issues Found:</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded">
                    <span className="text-sm">Excessive Progress (&gt;100%)</span>
                    <Badge variant="destructive">{auditSummary.byIssueType.excessiveProgress}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded">
                    <span className="text-sm">Round Mismatch</span>
                    <Badge variant="destructive">{auditSummary.byIssueType.roundMismatch}</Badge>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <h4 className="font-semibold">By Round:</h4>
              {Object.entries(auditSummary.byRound).map(([round, stats]) => (
                <div key={round} className="flex items-center gap-3">
                  <span className="w-32 text-sm font-medium">Round {round}:</span>
                  <Progress 
                    value={(stats.logical / stats.total) * 100} 
                    className="flex-1"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                    {stats.logical}/{stats.total} logical
                    {stats.illogical > 0 && (
                      <span className="text-red-600 ml-2">
                        ({stats.illogical} issues, avg {stats.avgProgress.toFixed(1)}%)
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fix Result */}
      {fixResult && (
        <Card>
          <CardHeader>
            <CardTitle>
              {fixResult.dryRun ? 'Dry Run Results' : 'Fix Results'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {fixResult.dryRun ? (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Dry run complete - No changes were made.</strong>
                  <br />
                  Would fix {fixResult.wouldFix} schools if executed.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Successfully fixed {fixResult.fixed} schools
                    {fixResult.errors && fixResult.errors.length > 0 && (
                      <span className="text-red-600"> ({fixResult.errors.length} errors)</span>
                    )}
                  </AlertDescription>
                </Alert>

                {fixResult.details && fixResult.details.length > 0 && (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    <h4 className="font-semibold">Changes Made:</h4>
                    {fixResult.details.slice(0, 20).map((detail: any, idx: number) => (
                      <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-800 rounded text-sm">
                        <div className="font-medium">{detail.name}</div>
                        <div className="text-gray-600 dark:text-gray-400">
                          Progress: {detail.before.progressPercentage}% → {detail.after.progressPercentage}%
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          Round {detail.before.currentRound} (preserved), 
                          Stage: {detail.before.currentStage} → {detail.after.currentStage}
                        </div>
                      </div>
                    ))}
                    {fixResult.details.length > 20 && (
                      <div className="text-sm text-gray-600 dark:text-gray-400 text-center">
                        ...and {fixResult.details.length - 20} more schools
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Illogical Schools List */}
      {illogicalSchools && illogicalSchools.length > 0 && !fixResult && (
        <Card>
          <CardHeader>
            <CardTitle>Schools Needing Fixes ({illogicalSchools.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {illogicalSchools.slice(0, 50).map((school) => (
                <div key={school.id} className="p-3 bg-red-50 dark:bg-red-900/20 rounded">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium">{school.name}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {school.issue}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        Current state: Round {school.currentRound}, {school.progressPercentage.toFixed(1)}% progress, 
                        {school.roundsCompleted} rounds completed
                      </div>
                      {school.recommendedFix && (
                        <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                          Will fix to: Round {school.recommendedFix.currentRound} (preserved), 
                          {school.recommendedFix.progressPercentage}% progress, stage '{school.recommendedFix.currentStage}'
                        </div>
                      )}
                    </div>
                    <Badge variant="destructive" className="ml-2 whitespace-nowrap">
                      {school.status.replace('illogical_', '').replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              ))}
              {illogicalSchools.length > 50 && (
                <div className="text-sm text-gray-600 dark:text-gray-400 text-center">
                  ...and {illogicalSchools.length - 50} more schools
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
