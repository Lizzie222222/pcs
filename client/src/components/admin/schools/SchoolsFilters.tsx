import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { School, Search, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SchoolsFiltersProps {
  schoolFilters: {
    search: string;
    country: string;
    stage: string;
    language: string;
  };
  setSchoolFilters: (filters: any) => void;
  countryOptions: Array<{ value: string; label: string }>;
  selectedSchools: string[];
  schoolsCount: number;
  toggleSelectAllSchools: () => void;
  onBulkUpdate: () => void;
  onBulkDelete: () => void;
}

export default function SchoolsFilters({
  schoolFilters,
  setSchoolFilters,
  countryOptions,
  selectedSchools,
  schoolsCount,
  toggleSelectAllSchools,
  onBulkUpdate,
  onBulkDelete,
}: SchoolsFiltersProps) {
  return (
    <CardHeader>
      <div className="flex items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <School className="h-5 w-5" />
          School Management
        </CardTitle>
        {selectedSchools.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">
              {selectedSchools.length} selected
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="bg-pcs_blue hover:bg-blue-600"
                onClick={onBulkUpdate}
                data-testid="button-bulk-update-schools"
              >
                <Edit className="h-4 w-4 mr-1" />
                Bulk Update
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={onBulkDelete}
                data-testid="button-bulk-delete-schools"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete Schools
              </Button>
            </div>
          </div>
        )}
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search schools..."
              value={schoolFilters.search}
              onChange={(e) => setSchoolFilters((prev: typeof schoolFilters) => ({ ...prev, search: e.target.value }))}
              className="pl-10 w-64"
              data-testid="input-search-schools"
            />
          </div>
          <Select 
            value={schoolFilters.country} 
            onValueChange={(value) => setSchoolFilters((prev: typeof schoolFilters) => ({ ...prev, country: value }))}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Countries" />
            </SelectTrigger>
            <SelectContent>
              {countryOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {schoolsCount > 0 && (
        <div className="flex items-center gap-2 mt-4">
          <input
            type="checkbox"
            checked={selectedSchools.length === schoolsCount}
            onChange={toggleSelectAllSchools}
            className="rounded border-gray-300"
            data-testid="checkbox-select-all-schools"
          />
          <label className="text-sm text-gray-600">
            Select All ({schoolsCount} schools)
          </label>
        </div>
      )}
    </CardHeader>
  );
}
