import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Download, Upload, AlertTriangle, CheckCircle, Info, FileText } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function MigrationPage() {
  const { toast } = useToast();
  const [csvContent, setCsvContent] = useState('');
  const [selectedLog, setSelectedLog] = useState<string | null>(null);

  const { data: migrationLogs, isLoading: logsLoading } = useQuery({
    queryKey: ['/api/admin/migration/logs'],
  });

  const { data: migratedUsers } = useQuery({
    queryKey: ['/api/admin/migration/users'],
  });

  const { data: selectedLogDetail } = useQuery({
    queryKey: ['/api/admin/migration/logs', selectedLog],
    enabled: !!selectedLog,
  });

  const runMigrationMutation = useMutation({
    mutationFn: async ({ dryRun }: { dryRun: boolean }) => {
      const response = await fetch('/api/admin/migration/run', {
        method: 'POST',
        body: JSON.stringify({ csvContent, dryRun }),
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Migration failed');
      }
      return response.json();
    },
    onSuccess: (data: any, variables) => {
      toast({
        title: variables.dryRun ? 'Dry Run Complete' : 'Migration Complete',
        description: `Processed ${data.result.processedRows} rows. Created ${data.result.usersCreated} users and ${data.result.schoolsCreated} schools.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/migration/logs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/migration/users'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Migration Failed',
        description: error.message || 'An error occurred during migration',
        variant: 'destructive',
      });
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setCsvContent(text);
        toast({
          title: 'CSV Loaded',
          description: `File "${file.name}" loaded successfully`,
        });
      };
      reader.readAsText(file);
    }
  };

  const downloadCredentials = (reportData: any) => {
    if (!reportData?.userCredentials) return;

    const csvData = [
      ['Email', 'Temporary Password', 'School Name'],
      ...reportData.userCredentials.map((u: any) => [u.email, u.temporaryPassword, u.schoolName])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `migration-credentials-${new Date().toISOString()}.csv`;
    a.click();
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="heading-migration">User Migration</h1>
        <p className="text-muted-foreground">Import users from the legacy system</p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          This tool migrates users from the old WordPress system. It will parse the CSV, filter valid users (with stage_1 data and valid emails), create schools and users, and generate temporary passwords.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upload" data-testid="tab-upload">Upload & Run</TabsTrigger>
          <TabsTrigger value="logs" data-testid="tab-logs">Migration Logs</TabsTrigger>
          <TabsTrigger value="users" data-testid="tab-users">Migrated Users</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle data-testid="heading-upload">Upload CSV File</CardTitle>
              <CardDescription>Select the user export CSV file from the old system</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="mb-4"
                  data-testid="input-csv-file"
                />
                
                {csvContent && (
                  <div className="space-y-4">
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        CSV file loaded successfully. {csvContent.split('\n').length - 1} rows detected.
                      </AlertDescription>
                    </Alert>

                    <Textarea
                      value={csvContent.substring(0, 500) + '...'}
                      readOnly
                      className="h-32 font-mono text-xs"
                      placeholder="CSV preview will appear here..."
                      data-testid="textarea-csv-preview"
                    />

                    <div className="flex gap-4">
                      <Button
                        onClick={() => runMigrationMutation.mutate({ dryRun: true })}
                        disabled={runMigrationMutation.isPending}
                        data-testid="button-dry-run"
                      >
                        <Info className="h-4 w-4 mr-2" />
                        Dry Run (Preview Only)
                      </Button>

                      <Button
                        onClick={() => runMigrationMutation.mutate({ dryRun: false })}
                        disabled={runMigrationMutation.isPending}
                        variant="destructive"
                        data-testid="button-run-migration"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Run Migration
                      </Button>
                    </div>

                    {runMigrationMutation.isPending && (
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>Processing migration... This may take a few minutes.</AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle data-testid="heading-logs">Migration History</CardTitle>
              <CardDescription>View all migration runs and their results</CardDescription>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <p>Loading logs...</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Users Created</TableHead>
                      <TableHead>Schools Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(migrationLogs as any[] || []).map((log: any) => (
                      <TableRow key={log.id} data-testid={`row-log-${log.id}`}>
                        <TableCell>{new Date(log.startedAt).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={log.status === 'completed' ? 'default' : log.status === 'failed' ? 'destructive' : 'secondary'}>
                            {log.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.dryRun ? 'Dry Run' : 'Live'}</Badge>
                        </TableCell>
                        <TableCell data-testid={`text-users-${log.id}`}>{log.usersCreated}</TableCell>
                        <TableCell data-testid={`text-schools-${log.id}`}>{log.schoolsCreated}</TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedLog(log.id)}
                            data-testid={`button-view-${log.id}`}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {selectedLogDetail && (selectedLogDetail as any).totalRows !== undefined && (
                <div className="mt-6 p-4 border rounded-lg space-y-4" data-testid="section-log-details">
                  <h3 className="font-semibold text-lg">Migration Details</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Rows</p>
                      <p className="text-2xl font-bold" data-testid="text-total-rows">{(selectedLogDetail as any).totalRows}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Valid Rows</p>
                      <p className="text-2xl font-bold" data-testid="text-valid-rows">{(selectedLogDetail as any).validRows}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Skipped Rows</p>
                      <p className="text-2xl font-bold" data-testid="text-skipped-rows">{(selectedLogDetail as any).skippedRows}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Failed Rows</p>
                      <p className="text-2xl font-bold" data-testid="text-failed-rows">{(selectedLogDetail as any).failedRows}</p>
                    </div>
                  </div>

                  {(selectedLogDetail as any).reportData && !(selectedLogDetail as any).dryRun && (
                    <Button
                      onClick={() => downloadCredentials((selectedLogDetail as any).reportData)}
                      data-testid="button-download-credentials"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Credentials CSV
                    </Button>
                  )}

                  {(selectedLogDetail as any).errorLog && (selectedLogDetail as any).errorLog.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                        Errors ({(selectedLogDetail as any).errorLog.length})
                      </h4>
                      <div className="max-h-48 overflow-y-auto space-y-2">
                        {(selectedLogDetail as any).errorLog.slice(0, 10).map((error: any, idx: number) => (
                          <div key={idx} className="text-sm p-2 bg-destructive/10 rounded" data-testid={`error-${idx}`}>
                            <p className="font-mono">Row {error.row}: {error.email}</p>
                            <p className="text-muted-foreground">{error.reason}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle data-testid="heading-migrated-users">Migrated Users</CardTitle>
              <CardDescription>
                All users imported from the old system ({(migratedUsers as any)?.total || 0} total)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Migrated At</TableHead>
                    <TableHead>Legacy ID</TableHead>
                    <TableHead>Needs Evidence Resubmission</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {((migratedUsers as any)?.users || []).map((user: any) => (
                    <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                      <TableCell data-testid={`text-email-${user.id}`}>{user.email}</TableCell>
                      <TableCell>{user.firstName} {user.lastName}</TableCell>
                      <TableCell>{new Date(user.migratedAt).toLocaleString()}</TableCell>
                      <TableCell className="font-mono text-sm">{user.legacyUserId}</TableCell>
                      <TableCell>
                        {user.needsEvidenceResubmission ? (
                          <Badge variant="outline" className="bg-yellow-100">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Yes
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">No</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
