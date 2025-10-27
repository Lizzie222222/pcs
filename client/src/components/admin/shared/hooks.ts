import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

/**
 * Hook for managing bulk operations dialogs
 */
export function useBulkDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [action, setAction] = useState<{
    type: 'approve' | 'reject' | 'delete' | 'update';
    notes?: string;
    updates?: Record<string, any>;
  } | null>(null);

  const openDialog = useCallback((actionData: typeof action) => {
    setAction(actionData);
    setIsOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setIsOpen(false);
    setAction(null);
  }, []);

  return {
    isOpen,
    action,
    openDialog,
    closeDialog,
    setAction,
  };
}

/**
 * Hook for managing export operations
 */
export function useExport() {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel'>('csv');

  const handleExport = useCallback(async (type: 'schools' | 'evidence' | 'users') => {
    setIsExporting(true);
    try {
      const response = await fetch(`/api/admin/export/${type}?format=${exportFormat}`, {
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_export_${new Date().toISOString().split('T')[0]}.${exportFormat === 'csv' ? 'csv' : 'xlsx'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Export Successful",
        description: `${type.charAt(0).toUpperCase() + type.slice(1)} data has been exported.`,
      });
      
      setExportDialogOpen(false);
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  }, [exportFormat, toast]);

  return {
    isExporting,
    exportDialogOpen,
    setExportDialogOpen,
    exportFormat,
    setExportFormat,
    handleExport,
  };
}

/**
 * Hook for managing filter state
 */
export function useFilters<T extends Record<string, any>>(initialFilters: T) {
  const [filters, setFilters] = useState<T>(initialFilters);

  const updateFilter = useCallback((key: keyof T, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  const cleanFilters = useCallback((filtersToClean: T) => {
    return Object.fromEntries(
      Object.entries(filtersToClean).map(([key, value]) => [
        key,
        value === 'all' ? '' : value,
      ])
    );
  }, []);

  return {
    filters,
    setFilters,
    updateFilter,
    resetFilters,
    cleanFilters,
  };
}
