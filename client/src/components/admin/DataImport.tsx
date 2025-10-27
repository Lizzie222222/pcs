import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Download, AlertTriangle, CheckCircle, FileSpreadsheet, Users, Building, Link as LinkIcon, Loader2 } from 'lucide-react';

type ImportStep = 'upload' | 'importing' | 'results';

interface ValidationResult {
  success: boolean;
  headers: string[];
  rowCount: number;
  preview: Record<string, any>[];
  message?: string;
  validation?: {
    recordsProcessed: number;
    errors: string[];
    errorCount: number;
  };
}

interface ImportResult {
  success: boolean;
  batchId: string;
  results: {
    schools: { processed: number; succeeded: number; failed: number };
    users: { processed: number; succeeded: number; failed: number; newUsers: number };
    relationships: { processed: number; succeeded: number; failed: number };
  };
  errors: any[];
}

export default function DataImport() {
  const { t } = useTranslation('admin');
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<ImportStep>('upload');
  const [activeTab, setActiveTab] = useState('schools');
  
  // File states
  const [schoolsFile, setSchoolsFile] = useState<File | null>(null);
  const [usersFile, setUsersFile] = useState<File | null>(null);
  const [relationshipsFile, setRelationshipsFile] = useState<File | null>(null);
  
  // Validation states
  const [schoolsValidation, setSchoolsValidation] = useState<ValidationResult | null>(null);
  const [usersValidation, setUsersValidation] = useState<ValidationResult | null>(null);
  const [relationshipsValidation, setRelationshipsValidation] = useState<ValidationResult | null>(null);
  
  // Import states
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const handleFileSelect = async (type: 'schools' | 'users' | 'relationships', file: File | null) => {
    if (!file) return;
    
    // Set the file
    if (type === 'schools') setSchoolsFile(file);
    if (type === 'users') setUsersFile(file);
    if (type === 'relationships') setRelationshipsFile(file);
    
    // Validate the file
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);
      
      const response = await fetch('/api/admin/import/validate', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      
      const result = await response.json();
      
      // Store validation result regardless of success/failure
      if (type === 'schools') setSchoolsValidation(result);
      if (type === 'users') setUsersValidation(result);
      if (type === 'relationships') setRelationshipsValidation(result);
      
      if (result.success) {
        toast({
          title: t('dataImport.toasts.fileValidated.title'),
          description: t('dataImport.toasts.fileValidated.description', { rowCount: result.rowCount }),
        });
      } else {
        const errorCount = result.validation?.errorCount || 0;
        toast({
          title: t('dataImport.toasts.validationErrors.title'),
          description: t('dataImport.toasts.validationErrors.description', { count: errorCount, plural: errorCount !== 1 ? 's' : '', filename: file.name }),
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: t('dataImport.toasts.validationFailed.title'),
        description: error instanceof Error ? error.message : t('dataImport.toasts.validationFailed.description'),
        variant: 'destructive',
      });
      
      // Clear file and validation on parsing failure
      if (type === 'schools') { setSchoolsFile(null); setSchoolsValidation(null); }
      if (type === 'users') { setUsersFile(null); setUsersValidation(null); }
      if (type === 'relationships') { setRelationshipsFile(null); setRelationshipsValidation(null); }
    }
  };

  const handleImport = async () => {
    if (!schoolsFile && !usersFile && !relationshipsFile) {
      toast({
        title: t('dataImport.toasts.noFilesSelected.title'),
        description: t('dataImport.toasts.noFilesSelected.description'),
        variant: 'destructive',
      });
      return;
    }
    
    setCurrentStep('importing');
    setIsImporting(true);
    
    try {
      const formData = new FormData();
      if (schoolsFile) formData.append('schoolsFile', schoolsFile);
      if (usersFile) formData.append('usersFile', usersFile);
      if (relationshipsFile) formData.append('relationshipsFile', relationshipsFile);
      
      const response = await fetch('/api/admin/import/execute', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      
      const result = await response.json();
      
      setImportResult(result);
      setCurrentStep('results');
      
      if (result.success) {
        toast({
          title: t('dataImport.toasts.importSuccess.title'),
          description: t('dataImport.toasts.importSuccess.description', { count: result.results.schools.succeeded + result.results.users.succeeded + result.results.relationships.succeeded }),
        });
      } else {
        toast({
          title: t('dataImport.toasts.importWithErrors.title'),
          description: t('dataImport.toasts.importWithErrors.description', { count: result.errors.length }),
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: t('dataImport.toasts.importFailed.title'),
        description: error instanceof Error ? error.message : t('dataImport.toasts.importFailed.description'),
        variant: 'destructive',
      });
      setCurrentStep('upload');
    } finally {
      setIsImporting(false);
    }
  };

  const handleDownloadTemplate = async (type: 'schools' | 'users' | 'relationships') => {
    try {
      const response = await fetch(`/api/admin/import/template/${type}`, {
        credentials: 'include',
      });
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${type}_template.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: t('dataImport.toasts.templateDownloaded.title'),
        description: t('dataImport.toasts.templateDownloaded.description', { type }),
      });
    } catch (error) {
      toast({
        title: t('dataImport.toasts.downloadFailed.title'),
        description: t('dataImport.toasts.downloadFailed.description'),
        variant: 'destructive',
      });
    }
  };

  const resetImport = () => {
    setCurrentStep('upload');
    setSchoolsFile(null);
    setUsersFile(null);
    setRelationshipsFile(null);
    setSchoolsValidation(null);
    setUsersValidation(null);
    setRelationshipsValidation(null);
    setImportResult(null);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-navy">{t('dataImport.title')}</CardTitle>
          <p className="text-gray-600 mt-2">
            {t('dataImport.subtitle')}
          </p>
        </CardHeader>
      </Card>

      {currentStep === 'upload' && (
        <>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>{t('dataImport.alerts.important.title')}</strong> {t('dataImport.alerts.important.description')}
              <ul className="list-disc list-inside mt-2 ml-2">
                <li>{t('dataImport.alerts.important.schools')}</li>
                <li>{t('dataImport.alerts.important.users')}</li>
                <li>{t('dataImport.alerts.important.relationships')}</li>
              </ul>
              <p className="mt-2">{t('dataImport.alerts.important.note')}</p>
            </AlertDescription>
          </Alert>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="schools" data-testid="tab-import-schools">
                <Building className="h-4 w-4 mr-2" />
                {t('dataImport.tabs.schools')} {schoolsFile && <CheckCircle className="h-4 w-4 ml-2 text-green-500" />}
              </TabsTrigger>
              <TabsTrigger value="users" data-testid="tab-import-users">
                <Users className="h-4 w-4 mr-2" />
                {t('dataImport.tabs.users')} {usersFile && <CheckCircle className="h-4 w-4 ml-2 text-green-500" />}
              </TabsTrigger>
              <TabsTrigger value="relationships" data-testid="tab-import-relationships">
                <LinkIcon className="h-4 w-4 mr-2" />
                {t('dataImport.tabs.relationships')} {relationshipsFile && <CheckCircle className="h-4 w-4 ml-2 text-green-500" />}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="schools" className="space-y-4">
              <FileUploadSection
                t={t}
                title={t('dataImport.fileUpload.titles.schools')}
                description={t('dataImport.fileUpload.descriptions.schools')}
                file={schoolsFile}
                validation={schoolsValidation}
                onFileSelect={(file) => handleFileSelect('schools', file)}
                onDownloadTemplate={() => handleDownloadTemplate('schools')}
              />
            </TabsContent>

            <TabsContent value="users" className="space-y-4">
              <FileUploadSection
                t={t}
                title={t('dataImport.fileUpload.titles.users')}
                description={t('dataImport.fileUpload.descriptions.users')}
                file={usersFile}
                validation={usersValidation}
                onFileSelect={(file) => handleFileSelect('users', file)}
                onDownloadTemplate={() => handleDownloadTemplate('users')}
              />
            </TabsContent>

            <TabsContent value="relationships" className="space-y-4">
              <FileUploadSection
                t={t}
                title={t('dataImport.fileUpload.titles.relationships')}
                description={t('dataImport.fileUpload.descriptions.relationships')}
                file={relationshipsFile}
                validation={relationshipsValidation}
                onFileSelect={(file) => handleFileSelect('relationships', file)}
                onDownloadTemplate={() => handleDownloadTemplate('relationships')}
              />
            </TabsContent>
          </Tabs>

          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-gray-700">{t('dataImport.status.readyToImport')}</p>
                  <p className="text-sm text-gray-500">
                    {(() => {
                      const filesUploaded = [schoolsFile, usersFile, relationshipsFile].filter(Boolean).length;
                      const hasValidationErrors = 
                        (schoolsValidation && !schoolsValidation.success) ||
                        (usersValidation && !usersValidation.success) ||
                        (relationshipsValidation && !relationshipsValidation.success);
                      
                      if (hasValidationErrors) {
                        return t('dataImport.status.fixErrors');
                      } else if (schoolsFile && usersFile && relationshipsFile) {
                        return t('dataImport.status.allFilesUploaded');
                      } else {
                        return t('dataImport.status.filesUploaded', { count: filesUploaded });
                      }
                    })()}
                  </p>
                </div>
                <Button
                  onClick={handleImport}
                  disabled={
                    (!schoolsFile && !usersFile && !relationshipsFile) ||
                    (schoolsValidation && !schoolsValidation.success) ||
                    (usersValidation && !usersValidation.success) ||
                    (relationshipsValidation && !relationshipsValidation.success)
                  }
                  className="bg-pcs_blue hover:bg-pcs_blue/90"
                  data-testid="button-start-import"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {t('dataImport.buttons.startImport')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {currentStep === 'importing' && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-16 w-16 animate-spin text-pcs_blue mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">{t('dataImport.importing.title')}</h3>
              <p className="text-gray-500">{t('dataImport.importing.description')}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 'results' && importResult && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {importResult.success ? (
                  <>
                    <CheckCircle className="h-6 w-6 text-green-500" />
                    {t('dataImport.results.successTitle')}
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-6 w-6 text-yellow-500" />
                    {t('dataImport.results.errorTitle')}
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ResultCard
                  t={t}
                  title={t('dataImport.results.sections.schools')}
                  icon={<Building className="h-5 w-5" />}
                  processed={importResult.results.schools.processed}
                  succeeded={importResult.results.schools.succeeded}
                  failed={importResult.results.schools.failed}
                />
                <ResultCard
                  t={t}
                  title={t('dataImport.results.sections.users')}
                  icon={<Users className="h-5 w-5" />}
                  processed={importResult.results.users.processed}
                  succeeded={importResult.results.users.succeeded}
                  failed={importResult.results.users.failed}
                  extra={
                    importResult.results.users.newUsers > 0 ? (
                      <p className="text-sm text-blue-600 mt-2">
                        {t('dataImport.results.newUsersCreated', { count: importResult.results.users.newUsers })}
                      </p>
                    ) : undefined
                  }
                />
                <ResultCard
                  t={t}
                  title={t('dataImport.results.sections.relationships')}
                  icon={<LinkIcon className="h-5 w-5" />}
                  processed={importResult.results.relationships.processed}
                  succeeded={importResult.results.relationships.succeeded}
                  failed={importResult.results.relationships.failed}
                />
              </div>

              {importResult.errors.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-semibold text-gray-700 mb-3">{t('dataImport.results.errorsCount', { count: importResult.errors.length })}</h4>
                  <div className="max-h-96 overflow-y-auto border rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="text-left p-3 font-semibold">{t('dataImport.results.tableHeaders.row')}</th>
                          <th className="text-left p-3 font-semibold">{t('dataImport.results.tableHeaders.field')}</th>
                          <th className="text-left p-3 font-semibold">{t('dataImport.results.tableHeaders.error')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importResult.errors.map((error, index) => (
                          <tr key={index} className="border-t hover:bg-gray-50">
                            <td className="p-3">{error.row}</td>
                            <td className="p-3 font-mono text-xs">{error.field}</td>
                            <td className="p-3 text-gray-600">{error.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <Button
                  onClick={resetImport}
                  variant="outline"
                  data-testid="button-import-another"
                >
                  {t('dataImport.buttons.importAnother')}
                </Button>
                <Button
                  onClick={() => window.location.reload()}
                  className="bg-pcs_blue hover:bg-pcs_blue/90"
                  data-testid="button-view-data"
                >
                  {t('dataImport.buttons.viewData')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

interface FileUploadSectionProps {
  t: any;
  title: string;
  description: string;
  file: File | null;
  validation: ValidationResult | null;
  onFileSelect: (file: File | null) => void;
  onDownloadTemplate: () => void;
}

function FileUploadSection({ t, title, description, file, validation, onFileSelect, onDownloadTemplate }: FileUploadSectionProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <p className="text-sm text-gray-500 mt-1">{description}</p>
          </div>
          <Button
            onClick={onDownloadTemplate}
            variant="outline"
            size="sm"
            data-testid="button-download-template"
          >
            <Download className="h-4 w-4 mr-2" />
            {t('dataImport.buttons.downloadTemplate')}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <label className="flex-1">
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={(e) => onFileSelect(e.target.files?.[0] || null)}
              className="hidden"
              data-testid="input-file-upload"
            />
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-pcs_blue cursor-pointer transition-colors">
              <FileSpreadsheet className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              {file ? (
                <div>
                  <p className="font-medium text-gray-700">{file.name}</p>
                  <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
                </div>
              ) : (
                <div>
                  <p className="font-medium text-gray-700">{t('dataImport.fileUpload.labels.clickToUpload')}</p>
                  <p className="text-sm text-gray-500">{t('dataImport.fileUpload.labels.formatNote')}</p>
                </div>
              )}
            </div>
          </label>
        </div>

        {validation && (
          <div className={validation.success ? "bg-green-50 border border-green-200 rounded-lg p-4" : "bg-red-50 border border-red-200 rounded-lg p-4"}>
            <div className="flex items-start gap-2">
              {validation.success ? (
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
              )}
              <div className="flex-1">
                <p className={validation.success ? "font-medium text-green-900" : "font-medium text-red-900"}>
                  {validation.success ? t('dataImport.fileUpload.validation.success') : t('dataImport.fileUpload.validation.failed')}
                </p>
                <p className={validation.success ? "text-sm text-green-700 mt-1" : "text-sm text-red-700 mt-1"}>
                  {t('dataImport.fileUpload.validation.rowsFound', { rowCount: validation.rowCount, headerCount: validation.headers.length })}
                </p>
                
                {validation.validation && validation.validation.errorCount > 0 && (
                  <div className="mt-3 bg-white rounded border border-red-200 p-3">
                    <p className="text-xs font-semibold text-red-900 mb-2">
                      {t('dataImport.fileUpload.validation.errorsTitle', { count: validation.validation.errorCount })}
                    </p>
                    <ul className="text-xs text-red-700 space-y-1 list-disc list-inside max-h-40 overflow-y-auto">
                      {validation.validation.errors.slice(0, 20).map((error, idx) => (
                        <li key={idx}>{error}</li>
                      ))}
                      {validation.validation.errors.length > 20 && (
                        <li className="font-semibold">{t('dataImport.fileUpload.validation.moreErrors', { count: validation.validation.errors.length - 20 })}</li>
                      )}
                    </ul>
                  </div>
                )}
                
                {validation.success && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-green-900 mb-2">{t('dataImport.fileUpload.validation.previewTitle')}</p>
                    <div className="bg-white rounded border border-green-200 overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-green-50">
                            {validation.headers.map((header) => (
                              <th key={header} className="text-left p-2 font-semibold text-green-900 whitespace-nowrap">
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {validation.preview.slice(0, 5).map((row, idx) => (
                            <tr key={idx} className="border-t border-green-100">
                              {validation.headers.map((header) => (
                                <td key={header} className="p-2 text-gray-700 whitespace-nowrap">
                                  {String(row[header] || '')}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface ResultCardProps {
  t: any;
  title: string;
  icon: React.ReactNode;
  processed: number;
  succeeded: number;
  failed: number;
  extra?: React.ReactNode;
}

function ResultCard({ t, title, icon, processed, succeeded, failed, extra }: ResultCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="text-gray-600">{icon}</div>
          <h4 className="font-semibold text-gray-700">{title}</h4>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">{t('dataImport.results.stats.processed')}</span>
            <span className="font-medium">{processed}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-green-600">{t('dataImport.results.stats.succeeded')}</span>
            <Badge className="bg-green-500">{succeeded}</Badge>
          </div>
          {failed > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-red-600">{t('dataImport.results.stats.failed')}</span>
              <Badge className="bg-red-500">{failed}</Badge>
            </div>
          )}
          {extra}
        </div>
      </CardContent>
    </Card>
  );
}
