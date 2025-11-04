import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ProductionSync() {
  const [schoolsFile, setSchoolsFile] = useState<File | null>(null);
  const [schoolUsersFile, setSchoolUsersFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const handleSync = async () => {
    if (!schoolsFile || !schoolUsersFile) {
      toast({
        title: "Missing files",
        description: "Please select both CSV files before syncing.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('schoolsFile', schoolsFile);
      formData.append('schoolUsersFile', schoolUsersFile);

      const response = await fetch('/api/admin/sync/production', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
        toast({
          title: "Sync successful",
          description: `Imported ${data.results.schoolsImported} schools, ${data.results.usersImported} users, and ${data.results.relationshipsImported} relationships.`,
        });
      } else {
        throw new Error(data.message || 'Sync failed');
      }
    } catch (error) {
      toast({
        title: "Sync failed",
        description: error instanceof Error ? error.message : "Failed to sync production data",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Production Data Sync</h1>
        <p className="text-muted-foreground">
          Replace staging database with production data from CSV exports
        </p>
      </div>

      <Alert className="mb-6 border-destructive/50 bg-destructive/10">
        <AlertTriangle className="h-4 w-4 text-destructive" />
        <AlertDescription className="text-destructive">
          <strong>Warning:</strong> This will completely erase all existing schools, users, and relationships in the staging database and replace them with the uploaded data. This action cannot be undone.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Upload CSV Files</CardTitle>
          <CardDescription>
            Export your production data and upload the CSV files below. Both files are required.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="schools-file" data-testid="label-schools-file">
              Schools CSV File
            </Label>
            <Input
              id="schools-file"
              type="file"
              accept=".csv,.xlsx"
              onChange={(e) => setSchoolsFile(e.target.files?.[0] || null)}
              disabled={isUploading}
              data-testid="input-schools-file"
            />
            {schoolsFile && (
              <p className="text-sm text-muted-foreground" data-testid="text-schools-filename">
                Selected: {schoolsFile.name}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="school-users-file" data-testid="label-school-users-file">
              School Users CSV File
            </Label>
            <Input
              id="school-users-file"
              type="file"
              accept=".csv,.xlsx"
              onChange={(e) => setSchoolUsersFile(e.target.files?.[0] || null)}
              disabled={isUploading}
              data-testid="input-school-users-file"
            />
            {schoolUsersFile && (
              <p className="text-sm text-muted-foreground" data-testid="text-school-users-filename">
                Selected: {schoolUsersFile.name}
              </p>
            )}
          </div>

          <Button
            onClick={handleSync}
            disabled={!schoolsFile || !schoolUsersFile || isUploading}
            className="w-full"
            data-testid="button-sync"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Syncing data...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Sync Production Data
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Sync Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2" data-testid="results-summary">
              <p><strong>Schools imported:</strong> {result.results.schoolsImported}</p>
              <p><strong>Users imported:</strong> {result.results.usersImported}</p>
              <p><strong>Relationships imported:</strong> {result.results.relationshipsImported}</p>
              <p><strong>Total errors:</strong> {result.results.totalErrors}</p>
            </div>

            {result.results.errors && result.results.errors.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold mb-2">Errors (first 20):</h4>
                <div className="bg-muted p-3 rounded-md max-h-60 overflow-y-auto">
                  <pre className="text-xs whitespace-pre-wrap">
                    {JSON.stringify(result.results.errors, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
