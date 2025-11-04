import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Upload, CheckCircle2, XCircle, AlertCircle, FileText, Loader2, Play, Pause } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ValidationResult {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errors: { row: number; schoolName: string; message: string }[];
  warnings: { row: number; schoolName: string; message: string }[];
  preview: {
    schoolName: string;
    country: string;
    requirementsToApprove: string[];
  }[];
}

interface ImportProgress {
  status: 'idle' | 'validating' | 'processing' | 'completed' | 'error';
  currentSchool?: string;
  processedSchools: number;
  totalSchools: number;
  successCount: number;
  errorCount: number;
  errors: string[];
  startTime?: number;
  endTime?: number;
}

export default function EvidenceImport() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [testMode, setTestMode] = useState(false);

  // Poll for progress updates
  useEffect(() => {
    if (!batchId || !progress || progress.status === 'completed' || progress.status === 'error') {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/admin/import/evidence/progress/${batchId}`, {
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          setProgress(data);
        }
      } catch (error) {
        console.error('Failed to fetch progress:', error);
      }
    }, 1000); // Poll every second

    return () => clearInterval(interval);
  }, [batchId, progress?.status]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setValidation(null);
    setProgress(null);
    setBatchId(null);
    setIsValidating(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('/api/admin/import/evidence/validate', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Validation failed');
      }

      const result = await response.json();
      setValidation(result);

      toast({
        title: 'Validation Complete',
        description: `${result.validRows} valid rows found, ${result.invalidRows} invalid rows`,
      });
    } catch (error) {
      toast({
        title: 'Validation Failed',
        description: error instanceof Error ? error.message : 'Failed to validate CSV',
        variant: 'destructive',
      });
      setFile(null);
    } finally {
      setIsValidating(false);
    }
  };

  const handleImport = async (isTest: boolean, schoolIndex: number = 0) => {
    if (!file || !validation) return;

    setTestMode(isTest);
    setProgress({
      status: 'processing',
      processedSchools: 0,
      totalSchools: isTest ? 1 : validation.validRows,
      successCount: 0,
      errorCount: 0,
      errors: [],
      startTime: Date.now(),
    });

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('testMode', isTest.toString());
      formData.append('testSchoolIndex', schoolIndex.toString());

      const response = await fetch('/api/admin/import/evidence/process', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Import failed to start');
      }

      const result = await response.json();
      setBatchId(result.batchId);

      toast({
        title: isTest ? 'Test Import Started' : 'Import Started',
        description: isTest 
          ? 'Processing first school only...' 
          : `Processing ${validation.validRows} schools...`,
      });
    } catch (error) {
      toast({
        title: 'Import Failed',
        description: error instanceof Error ? error.message : 'Failed to start import',
        variant: 'destructive',
      });
      setProgress(null);
    }
  };

  const handleReset = () => {
    setFile(null);
    setValidation(null);
    setProgress(null);
    setBatchId(null);
    setTestMode(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getProgressPercentage = () => {
    if (!progress) return 0;
    if (progress.totalSchools === 0) return 0;
    return Math.round((progress.processedSchools / progress.totalSchools) * 100);
  };

  const getElapsedTime = () => {
    if (!progress?.startTime) return '';
    const elapsed = Math.round((Date.now() - progress.startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    return `${minutes}m ${seconds}s`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-navy mb-2">Evidence Approval Import</h2>
        <p className="text-gray-600">
          Import evidence completions from legacy system CSV. This will mark specific requirements 
          as approved for each school and update their progress.
        </p>
      </div>

      {/* Upload Section */}
      {!validation && !progress && (
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Upload CSV File</CardTitle>
            <CardDescription>
              Select your evidence CSV file. It will be validated before import.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-pcs_blue transition-colors">
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-gray-500">CSV files only</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
                data-testid="input-evidence-csv"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isValidating}
                className="mt-4"
                data-testid="button-upload-csv"
              >
                {isValidating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Validating...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    Choose CSV File
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Validation Results */}
      {validation && !progress && (
        <div className="space-y-4">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Validation Results</CardTitle>
              <CardDescription>Review the validation before proceeding</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{validation.totalRows}</div>
                  <div className="text-sm text-gray-600">Total Rows</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{validation.validRows}</div>
                  <div className="text-sm text-gray-600">Valid Schools</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{validation.invalidRows}</div>
                  <div className="text-sm text-gray-600">Invalid Rows</div>
                </div>
              </div>

              {/* Errors */}
              {validation.errors.length > 0 && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-semibold mb-2">
                      {validation.errors.length} error(s) found:
                    </div>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {validation.errors.slice(0, 10).map((error, i) => (
                        <div key={i} className="text-sm">
                          Row {error.row} ({error.schoolName}): {error.message}
                        </div>
                      ))}
                      {validation.errors.length > 10 && (
                        <div className="text-sm italic">
                          ...and {validation.errors.length - 10} more errors
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Warnings */}
              {validation.warnings.length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-semibold mb-2">
                      {validation.warnings.length} warning(s):
                    </div>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {validation.warnings.slice(0, 5).map((warning, i) => (
                        <div key={i} className="text-sm">
                          Row {warning.row} ({warning.schoolName}): {warning.message}
                        </div>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Preview */}
              {validation.preview.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Preview (first {validation.preview.length} schools with evidence):</h4>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {validation.preview.map((item, i) => (
                      <div key={i} className="p-3 bg-gray-50 rounded border border-gray-200 hover:border-pcs_blue transition-colors">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="font-medium text-sm text-navy">
                              {item.schoolName} ({item.country})
                            </div>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {item.requirementsToApprove.map((req, j) => (
                                <Badge key={j} variant="secondary" className="text-xs">
                                  {req}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleImport(true, i)}
                            className="shrink-0"
                            data-testid={`button-test-school-${i}`}
                          >
                            <Play className="w-3 h-3 mr-1" />
                            Test
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  onClick={handleReset}
                  variant="outline"
                  data-testid="button-cancel-import"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleImport(true)}
                  variant="outline"
                  disabled={validation.validRows === 0}
                  data-testid="button-test-single-school"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Test on First School
                </Button>
                <Button
                  onClick={() => handleImport(false)}
                  disabled={validation.validRows === 0 || validation.invalidRows > 0}
                  className="flex-1"
                  data-testid="button-start-full-import"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Import All {validation.validRows} Schools
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Progress */}
      {progress && (
        <Card>
          <CardHeader>
            <CardTitle>
              {testMode ? 'Test Import' : 'Import'} In Progress
            </CardTitle>
            <CardDescription>
              {progress.status === 'completed' 
                ? 'Import completed successfully' 
                : progress.status === 'error'
                ? 'Import encountered errors'
                : 'Please wait while we process the schools...'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">
                  {progress.processedSchools} of {progress.totalSchools} schools processed
                </span>
                <span className="font-medium">{getProgressPercentage()}%</span>
              </div>
              <Progress value={getProgressPercentage()} className="h-2" />
            </div>

            {/* Current School */}
            {progress.currentSchool && progress.status === 'processing' && (
              <Alert>
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertDescription>
                  <span className="font-medium">Processing:</span> {progress.currentSchool}
                </AlertDescription>
              </Alert>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{progress.successCount}</div>
                <div className="text-sm text-gray-600">Successful</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{progress.errorCount}</div>
                <div className="text-sm text-gray-600">Errors</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{getElapsedTime()}</div>
                <div className="text-sm text-gray-600">Elapsed</div>
              </div>
            </div>

            {/* Errors */}
            {progress.errors.length > 0 && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-semibold mb-2">Errors occurred:</div>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {progress.errors.map((error, i) => (
                      <div key={i} className="text-sm">{error}</div>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Completion */}
            {progress.status === 'completed' && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <div className="font-semibold">
                    {testMode ? 'Test completed successfully!' : 'Import completed successfully!'}
                  </div>
                  <div className="text-sm mt-1">
                    {progress.successCount} school(s) processed. You can now check the school dashboards to verify the evidence is showing as approved.
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Action Button */}
            {(progress.status === 'completed' || progress.status === 'error') && (
              <div className="flex justify-end pt-4 border-t">
                <Button
                  onClick={handleReset}
                  data-testid="button-start-new-import"
                >
                  Start New Import
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
