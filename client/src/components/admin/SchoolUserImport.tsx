import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Upload, CheckCircle2, XCircle, AlertCircle, FileText, Loader2, Users, Building } from "lucide-react";
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
    userEmail: string;
  }[];
}

interface ImportResult {
  success: boolean;
  schoolsCreated: number;
  usersCreated: number;
  errors: string[];
  skipped: number;
  skipReasons: string[];
}

export default function SchoolUserImport() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setValidation(null);
      setResult(null);
    }
  };

  const handleValidate = async () => {
    if (!file) return;

    setIsValidating(true);
    setValidation(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/admin/school-user-import/validate', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Validation failed');
      }

      const data = await response.json();
      setValidation(data);

      toast({
        title: "Validation Complete",
        description: `${data.validRows} schools ready to import, ${data.invalidRows} errors found.`,
      });
    } catch (error) {
      toast({
        title: "Validation Error",
        description: error instanceof Error ? error.message : "Failed to validate file",
        variant: "destructive",
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleImport = async () => {
    if (!file || !validation || validation.invalidRows > 0) return;

    setIsImporting(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/admin/school-user-import/process', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Import failed');
      }

      const data = await response.json();
      setResult(data);

      toast({
        title: "Import Complete",
        description: `Created ${data.schoolsCreated} schools and ${data.usersCreated} users`,
      });
    } catch (error) {
      toast({
        title: "Import Error",
        description: error instanceof Error ? error.message : "Failed to import data",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setValidation(null);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="w-5 h-5" />
            Import Schools & Users
          </CardTitle>
          <CardDescription>
            Upload a CSV file to create schools and users in bulk. Each row should contain school information and the primary contact email.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* CSV Format Info */}
          <Alert>
            <FileText className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-semibold">Required CSV columns:</p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  <li><code>school_name</code> - Name of the school</li>
                  <li><code>country</code> - Country code (e.g., GB, US, FR)</li>
                  <li><code>user_email</code> - Email of the primary contact</li>
                </ul>
                <p className="text-sm mt-2">Optional columns: district, phone_number, school_type</p>
              </div>
            </AlertDescription>
          </Alert>

          {/* File Upload */}
          {!file && !result && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                data-testid="input-csv-file"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="w-full"
                size="lg"
                data-testid="button-upload-csv"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload CSV File
              </Button>
            </div>
          )}

          {/* File Selected - Validation Step */}
          {file && !validation && !result && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded border border-gray-200">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-pcs_blue" />
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleReset} data-testid="button-remove-file">
                    Remove
                  </Button>
                  <Button onClick={handleValidate} disabled={isValidating} data-testid="button-validate">
                    {isValidating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Validating...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Validate
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Validation Results */}
          {validation && !result && (
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded border border-blue-200">
                  <div className="text-2xl font-bold text-blue-700">{validation.totalRows}</div>
                  <div className="text-sm text-blue-600">Total Rows</div>
                </div>
                <div className="p-4 bg-green-50 rounded border border-green-200">
                  <div className="text-2xl font-bold text-green-700">{validation.validRows}</div>
                  <div className="text-sm text-green-600">Ready to Import</div>
                </div>
                <div className="p-4 bg-red-50 rounded border border-red-200">
                  <div className="text-2xl font-bold text-red-700">{validation.invalidRows}</div>
                  <div className="text-sm text-red-600">Errors</div>
                </div>
              </div>

              {/* Errors */}
              {validation.errors.length > 0 && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-semibold">Found {validation.errors.length} errors:</p>
                      <div className="max-h-60 overflow-y-auto space-y-1">
                        {validation.errors.slice(0, 20).map((error, i) => (
                          <div key={i} className="text-sm">
                            Row {error.row}: {error.schoolName} - {error.message}
                          </div>
                        ))}
                        {validation.errors.length > 20 && (
                          <div className="text-sm italic">
                            ... and {validation.errors.length - 20} more errors
                          </div>
                        )}
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Warnings */}
              {validation.warnings.length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-semibold">Found {validation.warnings.length} warnings:</p>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {validation.warnings.slice(0, 10).map((warning, i) => (
                          <div key={i} className="text-sm">
                            Row {warning.row}: {warning.schoolName} - {warning.message}
                          </div>
                        ))}
                        {validation.warnings.length > 10 && (
                          <div className="text-sm italic">
                            ... and {validation.warnings.length - 10} more warnings
                          </div>
                        )}
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Preview */}
              {validation.preview.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Preview (first {validation.preview.length} schools):</h4>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {validation.preview.map((item, i) => (
                      <div key={i} className="p-3 bg-gray-50 rounded border border-gray-200">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="font-medium text-sm text-navy">
                              {item.schoolName} ({item.country})
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                              <Users className="w-3 h-3" />
                              {item.userEmail}
                            </div>
                          </div>
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
                  onClick={handleImport}
                  disabled={validation.validRows === 0 || validation.invalidRows > 0 || isImporting}
                  className="flex-1"
                  data-testid="button-start-import"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Importing {validation.validRows} schools...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Import {validation.validRows} Schools & Users
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Import Results */}
          {result && (
            <div className="space-y-4">
              <Alert className={result.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                {result.success ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-semibold">
                      {result.success ? "Import Completed Successfully!" : "Import Completed with Errors"}
                    </p>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4" />
                        <span>{result.schoolsCreated} schools created</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <span>{result.usersCreated} users created</span>
                      </div>
                      {result.skipped > 0 && (
                        <div className="text-gray-600">
                          {result.skipped} schools skipped (already exist)
                        </div>
                      )}
                    </div>
                  </div>
                </AlertDescription>
              </Alert>

              {result.skipReasons.length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-semibold">Skipped rows:</p>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {result.skipReasons.slice(0, 10).map((reason, i) => (
                          <div key={i} className="text-sm">{reason}</div>
                        ))}
                        {result.skipReasons.length > 10 && (
                          <div className="text-sm italic">
                            ... and {result.skipReasons.length - 10} more skipped
                          </div>
                        )}
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {result.errors.length > 0 && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-semibold">Errors during import:</p>
                      <div className="max-h-60 overflow-y-auto space-y-1">
                        {result.errors.map((error, i) => (
                          <div key={i} className="text-sm">{error}</div>
                        ))}
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <Button onClick={handleReset} className="w-full" data-testid="button-import-another">
                Import Another File
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
