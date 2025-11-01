import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { School, Search, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from 'react-i18next';

interface SchoolsFiltersProps {
  schoolFilters: {
    search: string;
    country: string;
    stage: string;
    language: string;
    sortByDate: string;
    joinedMonth: string;
    joinedYear: string;
    interactionStatus: string;
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
  const { t } = useTranslation('admin');
  
  return (
    <CardHeader className="p-3 sm:p-4 lg:p-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <School className="h-5 w-5" />
            {t('schools.title')}
            <span className="text-sm font-normal text-gray-500 ml-2">
              ({schoolsCount} {schoolsCount === 1 ? 'school' : 'schools'})
            </span>
          </CardTitle>
        </div>

        {selectedSchools.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <span className="text-sm text-gray-600">
              {t('schools.filters.selected', { count: selectedSchools.length })}
            </span>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                size="sm"
                className="bg-pcs_blue hover:bg-blue-600 min-h-11 px-3 sm:px-4"
                onClick={onBulkUpdate}
                data-testid="button-bulk-update-schools"
              >
                <Edit className="h-4 w-4 mr-1" />
                {t('schools.buttons.bulkUpdate')}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="min-h-11 px-3 sm:px-4"
                onClick={onBulkDelete}
                data-testid="button-bulk-delete-schools"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                {t('schools.buttons.deleteSchools')}
              </Button>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder={t('schools.filters.searchPlaceholder')}
              value={schoolFilters.search}
              onChange={(e) => setSchoolFilters((prev: typeof schoolFilters) => ({ ...prev, search: e.target.value }))}
              className="pl-10 w-full min-h-11"
              data-testid="input-search-schools"
            />
          </div>
          <Select 
            value={schoolFilters.country} 
            onValueChange={(value) => setSchoolFilters((prev: typeof schoolFilters) => ({ ...prev, country: value }))}
          >
            <SelectTrigger className="w-full sm:w-48 min-h-11" data-testid="select-country-filter">
              <SelectValue placeholder={t('schools.filters.allCountries')} />
            </SelectTrigger>
            <SelectContent position="popper" sideOffset={5} className="max-h-[300px]">
              {countryOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select 
            value={schoolFilters.stage} 
            onValueChange={(value) => setSchoolFilters((prev: typeof schoolFilters) => ({ ...prev, stage: value }))}
          >
            <SelectTrigger className="w-full sm:w-48 min-h-11" data-testid="select-stage-filter">
              <SelectValue placeholder="All Stages" />
            </SelectTrigger>
            <SelectContent position="popper" sideOffset={5}>
              <SelectItem value="all">All Stages</SelectItem>
              <SelectItem value="inspire">Inspire</SelectItem>
              <SelectItem value="investigate">Investigate</SelectItem>
              <SelectItem value="act">Act</SelectItem>
            </SelectContent>
          </Select>
          <Select 
            value={schoolFilters.language} 
            onValueChange={(value) => setSchoolFilters((prev: typeof schoolFilters) => ({ ...prev, language: value }))}
          >
            <SelectTrigger className="w-full sm:w-48 min-h-11" data-testid="select-language-filter">
              <SelectValue placeholder="All Languages" />
            </SelectTrigger>
            <SelectContent position="popper" sideOffset={5} className="max-h-[300px]">
              <SelectItem value="all">All Languages</SelectItem>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="es">Spanish</SelectItem>
              <SelectItem value="fr">French</SelectItem>
              <SelectItem value="de">German</SelectItem>
              <SelectItem value="it">Italian</SelectItem>
              <SelectItem value="pt">Portuguese</SelectItem>
              <SelectItem value="nl">Dutch</SelectItem>
              <SelectItem value="el">Greek</SelectItem>
              <SelectItem value="id">Indonesian</SelectItem>
              <SelectItem value="zh">Chinese</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
          <Select 
            value={schoolFilters.sortByDate} 
            onValueChange={(value) => setSchoolFilters((prev: typeof schoolFilters) => ({ ...prev, sortByDate: value }))}
          >
            <SelectTrigger className="w-full sm:w-48 min-h-11" data-testid="select-sort-date-filter">
              <SelectValue placeholder="Sort by Date" />
            </SelectTrigger>
            <SelectContent position="popper" sideOffset={5}>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
            </SelectContent>
          </Select>
          <Select 
            value={schoolFilters.joinedMonth} 
            onValueChange={(value) => setSchoolFilters((prev: typeof schoolFilters) => ({ ...prev, joinedMonth: value }))}
          >
            <SelectTrigger className="w-full sm:w-48 min-h-11" data-testid="select-month-filter">
              <SelectValue placeholder="All Months" />
            </SelectTrigger>
            <SelectContent position="popper" sideOffset={5} className="max-h-[300px]">
              <SelectItem value="all">All Months</SelectItem>
              <SelectItem value="1">January</SelectItem>
              <SelectItem value="2">February</SelectItem>
              <SelectItem value="3">March</SelectItem>
              <SelectItem value="4">April</SelectItem>
              <SelectItem value="5">May</SelectItem>
              <SelectItem value="6">June</SelectItem>
              <SelectItem value="7">July</SelectItem>
              <SelectItem value="8">August</SelectItem>
              <SelectItem value="9">September</SelectItem>
              <SelectItem value="10">October</SelectItem>
              <SelectItem value="11">November</SelectItem>
              <SelectItem value="12">December</SelectItem>
            </SelectContent>
          </Select>
          <Select 
            value={schoolFilters.joinedYear} 
            onValueChange={(value) => setSchoolFilters((prev: typeof schoolFilters) => ({ ...prev, joinedYear: value }))}
          >
            <SelectTrigger className="w-full sm:w-48 min-h-11" data-testid="select-year-filter">
              <SelectValue placeholder="All Years" />
            </SelectTrigger>
            <SelectContent position="popper" sideOffset={5} className="max-h-[300px]">
              <SelectItem value="all">All Years</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2023">2023</SelectItem>
              <SelectItem value="2022">2022</SelectItem>
              <SelectItem value="2021">2021</SelectItem>
              <SelectItem value="2020">2020</SelectItem>
              <SelectItem value="2019">2019</SelectItem>
              <SelectItem value="2018">2018</SelectItem>
            </SelectContent>
          </Select>
          <Select 
            value={schoolFilters.interactionStatus} 
            onValueChange={(value) => setSchoolFilters((prev: typeof schoolFilters) => ({ ...prev, interactionStatus: value }))}
          >
            <SelectTrigger className="w-full sm:w-48 min-h-11" data-testid="select-interaction-filter">
              <SelectValue placeholder="User Interaction" />
            </SelectTrigger>
            <SelectContent position="popper" sideOffset={5}>
              <SelectItem value="all">All Schools</SelectItem>
              <SelectItem value="interacted">With Interacted Users</SelectItem>
              <SelectItem value="not-interacted">Without Interacted Users</SelectItem>
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
            {t('schools.filters.selectAll', { count: schoolsCount })}
          </label>
        </div>
      )}
    </CardHeader>
  );
}
