import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import SchoolsFilters from "./SchoolsFilters";
import SchoolsTable from "./SchoolsTable";
import BulkSchoolActions from "./BulkSchoolActions";
import AwardCompletionBanner from "../AwardCompletionBanner";
import type { AdminStats, SchoolData } from "@/components/admin/shared/types";
import { useTranslation } from 'react-i18next';

interface SchoolsSectionProps {
  activeTab: string;
  stats: AdminStats | undefined;
  approvePhotoConsentMutation: any;
  rejectPhotoConsentMutation: any;
  photoConsentRejectDialogOpen: boolean;
  setPhotoConsentRejectDialogOpen: (open: boolean) => void;
  photoConsentRejectNotes: string;
  setPhotoConsentRejectNotes: (notes: string) => void;
  schoolFilters: {
    search: string;
    country: string;
    stage: string;
    language: string;
    sortByDate: string;
    joinedMonth: string;
    joinedYear: string;
    interactionStatus: string;
    completionStatus: string;
  };
  setSchoolFilters: (filters: any) => void;
  countryOptions: any[];
}

export default function SchoolsSection({ 
  activeTab, 
  stats,
  approvePhotoConsentMutation,
  rejectPhotoConsentMutation,
  photoConsentRejectDialogOpen,
  setPhotoConsentRejectDialogOpen,
  photoConsentRejectNotes,
  setPhotoConsentRejectNotes,
  schoolFilters,
  setSchoolFilters,
  countryOptions
}: SchoolsSectionProps) {
  // School management state
  const [selectedSchools, setSelectedSchools] = useState<string[]>([]);
  const [deletingSchool, setDeletingSchool] = useState<SchoolData | null>(null);
  const [bulkSchoolDialogOpen, setBulkSchoolDialogOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<{
    type: 'update' | 'delete';
    updates?: Record<string, any>;
  } | null>(null);
  const [expandedSchools, setExpandedSchools] = useState<Set<string>>(new Set());
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  
  // Sorting state
  const [sortBy, setSortBy] = useState<'name' | 'country' | 'progress' | 'joinDate' | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Debounced school filters to prevent refetch on every keystroke
  const [debouncedSchoolFilters, setDebouncedSchoolFilters] = useState(schoolFilters);

  // Debounce school filters (300ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSchoolFilters(schoolFilters);
    }, 300);
    return () => clearTimeout(timer);
  }, [schoolFilters]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
    setSelectedSchools([]); // Clear selected schools when filters change
  }, [debouncedSchoolFilters]);

  // Helper function to clean filters (convert "all" values to empty strings)
  const cleanFilters = (filters: typeof schoolFilters) => {
    return Object.fromEntries(
      Object.entries(filters).map(([key, value]) => [key, value === 'all' ? '' : value])
    );
  };

  // Schools query - uses debounced filters to prevent refetch on every keystroke
  const { data: paginatedData, isLoading: schoolsLoading } = useQuery<{
    schools: SchoolData[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>({
    queryKey: ['/api/admin/schools', cleanFilters(debouncedSchoolFilters), page, limit, sortBy, sortOrder],
    queryFn: async () => {
      const filters = cleanFilters(debouncedSchoolFilters);
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      if (sortBy) {
        params.append('sortBy', sortBy);
        params.append('sortOrder', sortOrder);
      }
      const url = `/api/admin/schools?${params.toString()}`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return res.json();
    },
    enabled: activeTab === 'schools',
    retry: false,
  });
  
  const schools = paginatedData?.schools;
  const totalSchools = paginatedData?.total || 0;
  const totalPages = paginatedData?.totalPages || 1;

  // Helper functions
  const toggleSelectAllSchools = () => {
    if (selectedSchools.length === schools?.length) {
      setSelectedSchools([]);
    } else {
      setSelectedSchools(schools?.map(s => s.id) || []);
    }
  };

  const handleBulkUpdate = () => {
    setBulkAction({ 
      type: 'update', 
      updates: { currentStage: 'act' } 
    });
    setBulkSchoolDialogOpen(true);
  };

  const handleBulkDelete = () => {
    setBulkAction({ type: 'delete' });
    setBulkSchoolDialogOpen(true);
  };
  
  const handleSort = (column: 'name' | 'country' | 'progress' | 'joinDate') => {
    if (sortBy === column) {
      // Toggle sort order if same column
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new column with ascending order
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  return (
    <>
      <AwardCompletionBanner activeTab={activeTab} />
      
      <Card>
        <SchoolsFilters
          schoolFilters={schoolFilters}
          setSchoolFilters={setSchoolFilters}
          countryOptions={countryOptions}
          selectedSchools={selectedSchools}
          schoolsCount={totalSchools}
          toggleSelectAllSchools={toggleSelectAllSchools}
          onBulkUpdate={handleBulkUpdate}
          onBulkDelete={handleBulkDelete}
        />
        <SchoolsTable
          schools={schools}
          schoolsLoading={schoolsLoading}
          selectedSchools={selectedSchools}
          setSelectedSchools={setSelectedSchools}
          setDeletingSchool={setDeletingSchool}
          expandedSchools={expandedSchools}
          setExpandedSchools={setExpandedSchools}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          page={page}
          totalPages={totalPages}
          totalSchools={totalSchools}
          limit={limit}
          onPageChange={setPage}
        />
      </Card>

      <BulkSchoolActions
        selectedSchools={selectedSchools}
        setSelectedSchools={setSelectedSchools}
        bulkSchoolDialogOpen={bulkSchoolDialogOpen}
        setBulkSchoolDialogOpen={setBulkSchoolDialogOpen}
        bulkAction={bulkAction}
        setBulkAction={setBulkAction}
        deletingSchool={deletingSchool}
        setDeletingSchool={setDeletingSchool}
      />
    </>
  );
}
