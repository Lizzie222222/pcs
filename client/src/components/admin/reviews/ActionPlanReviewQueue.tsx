import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Target,
  CheckCircle,
  XCircle,
  Building,
  Search,
  LayoutGrid,
  List,
  Calendar,
  X,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import { EmptyState } from "@/components/ui/states";
import SchoolQuickViewDialog from "../SchoolQuickViewDialog";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from 'react-i18next';
import { useCountries } from "@/hooks/useCountries";
import { useDebounce } from "@/hooks/useDebounce";
import type { PendingActionPlan } from "@/components/admin/shared/types";
import { format } from "date-fns";

interface ActionPlanReviewQueueProps {
  activeTab: string;
  actionPlansPending: PendingActionPlan[] | undefined;
  actionPlansLoading: boolean;
  reviewData: {
    actionPlanId: string;
    action: 'approved' | 'rejected';
    notes: string;
  } | null;
  setReviewData: (data: {
    actionPlanId: string;
    action: 'approved' | 'rejected';
    notes: string;
  } | null) => void;
  reviewActionPlanMutation: any;
  bulkActionPlanReviewMutation: any;
  bulkActionPlanDialogOpen: boolean;
  setBulkActionPlanDialogOpen: (open: boolean) => void;
  bulkAction: {
    type: 'approve' | 'reject';
    notes?: string;
  } | null;
  setBulkAction: (action: {
    type: 'approve' | 'reject';
    notes?: string;
  } | null) => void;
  selectedActionPlans: string[];
  setSelectedActionPlans: (ids: string[]) => void;
  actionPlanStatusFilter: 'all' | 'pending' | 'approved' | 'rejected';
  setActionPlanStatusFilter: (filter: 'all' | 'pending' | 'approved' | 'rejected') => void;
  actionPlanSearchQuery: string;
  setActionPlanSearchQuery: (query: string) => void;
  actionPlanSortBy: 'newest' | 'oldest' | 'schoolName' | 'reductionAmount';
  setActionPlanSortBy: (sortBy: 'newest' | 'oldest' | 'schoolName' | 'reductionAmount') => void;
  actionPlanCountryFilter: string;
  setActionPlanCountryFilter: (filter: string) => void;
  actionPlanRoundFilter: string;
  setActionPlanRoundFilter: (filter: string) => void;
  actionPlanViewMode: 'card' | 'table';
  setActionPlanViewMode: (mode: 'card' | 'table') => void;
}

export default function ActionPlanReviewQueue({
  activeTab,
  actionPlansPending,
  actionPlansLoading,
  reviewData,
  setReviewData,
  reviewActionPlanMutation,
  bulkActionPlanReviewMutation,
  bulkActionPlanDialogOpen,
  setBulkActionPlanDialogOpen,
  bulkAction,
  setBulkAction,
  selectedActionPlans,
  setSelectedActionPlans,
  actionPlanStatusFilter,
  setActionPlanStatusFilter,
  actionPlanSearchQuery,
  setActionPlanSearchQuery,
  actionPlanSortBy,
  setActionPlanSortBy,
  actionPlanCountryFilter,
  setActionPlanCountryFilter,
  actionPlanRoundFilter,
  setActionPlanRoundFilter,
  actionPlanViewMode,
  setActionPlanViewMode,
}: ActionPlanReviewQueueProps) {
  const { toast } = useToast();
  const { t } = useTranslation('admin');
  const [previewActionPlan, setPreviewActionPlan] = useState<PendingActionPlan | null>(null);
  
  // School History Dialog state
  const [schoolHistoryDialogOpen, setSchoolHistoryDialogOpen] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<PendingActionPlan['school'] | null>(null);
  
  // Debounce search query
  const debouncedSearchQuery = useDebounce(actionPlanSearchQuery, 300);

  const { data: countries } = useCountries();

  // Helper functions
  const toggleActionPlanSelection = (actionPlanId: string) => {
    setSelectedActionPlans(
      selectedActionPlans.includes(actionPlanId)
        ? selectedActionPlans.filter(id => id !== actionPlanId)
        : [...selectedActionPlans, actionPlanId]
    );
  };

  const toggleSelectAllActionPlans = () => {
    if (selectedActionPlans.length === actionPlansPending?.length) {
      setSelectedActionPlans([]);
    } else {
      setSelectedActionPlans(actionPlansPending?.map(ap => ap.id) || []);
    }
  };

  const handleSchoolClick = (e: React.MouseEvent | PendingActionPlan['school'], school?: PendingActionPlan['school']) => {
    let actualSchool: PendingActionPlan['school'];
    if (school) {
      if (e && typeof e === 'object' && 'stopPropagation' in e) {
        e.stopPropagation();
        e.preventDefault();
      }
      actualSchool = school;
    } else {
      actualSchool = e as PendingActionPlan['school'];
    }
    setSelectedSchool(actualSchool);
    setSchoolHistoryDialogOpen(true);
  };

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (actionPlanSearchQuery) count++;
    if (actionPlanCountryFilter !== 'all') count++;
    if (actionPlanRoundFilter !== 'all') count++;
    return count;
  }, [
    actionPlanSearchQuery,
    actionPlanCountryFilter,
    actionPlanRoundFilter
  ]);

  // Clear all filters
  const clearAllFilters = () => {
    setActionPlanSearchQuery('');
    setActionPlanCountryFilter('all');
    setActionPlanRoundFilter('all');
    setActionPlanSortBy('newest');
  };

  // Group action plans by school
  const groupedActionPlans = useMemo(() => {
    if (!actionPlansPending) return [];
    
    const grouped = new Map<string, PendingActionPlan[]>();
    
    actionPlansPending.forEach(plan => {
      const schoolKey = `${plan.schoolId}-${plan.roundNumber}`;
      if (!grouped.has(schoolKey)) {
        grouped.set(schoolKey, []);
      }
      grouped.get(schoolKey)!.push(plan);
    });
    
    return Array.from(grouped.values());
  }, [actionPlansPending]);

  // Table View Component
  const ActionPlanTableView = ({ actionPlans }: { actionPlans: PendingActionPlan[] }) => (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <input
                type="checkbox"
                checked={selectedActionPlans.length === actionPlans.length}
                onChange={toggleSelectAllActionPlans}
                className="rounded border-gray-300"
                data-testid="checkbox-select-all-table"
              />
            </TableHead>
            <TableHead>School</TableHead>
            <TableHead>Round</TableHead>
            <TableHead>Plastic Item</TableHead>
            <TableHead>Baseline → Target</TableHead>
            <TableHead>Reduction</TableHead>
            <TableHead>Timeframe</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Submitted Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {actionPlans.map((plan) => (
            <TableRow
              key={plan.id}
              className={selectedActionPlans.includes(plan.id) ? 'bg-blue-50' : ''}
              data-testid={`table-row-action-plan-${plan.id}`}
            >
              <TableCell>
                <input
                  type="checkbox"
                  checked={selectedActionPlans.includes(plan.id)}
                  onChange={() => toggleActionPlanSelection(plan.id)}
                  className="rounded border-gray-300"
                  data-testid={`checkbox-table-action-plan-${plan.id}`}
                />
              </TableCell>
              <TableCell className="font-medium">
                <button
                  onClick={(e) => handleSchoolClick(e, plan.school)}
                  className="flex items-center gap-1 text-left hover:text-pcs_blue transition-colors group"
                  data-testid={`button-school-history-${plan.id}`}
                >
                  <Building className="h-3 w-3 text-gray-400 group-hover:text-pcs_blue transition-colors" />
                  <span className="text-sm underline decoration-transparent group-hover:decoration-pcs_blue transition-all">{plan.school?.name || 'Unknown'}</span>
                </button>
              </TableCell>
              <TableCell>
                <Badge className="bg-navy text-white" data-testid={`badge-table-round-${plan.id}`}>
                  Round {plan.roundNumber}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="max-w-xs">
                  <div className="font-medium text-sm">{plan.plasticItemType}</div>
                  <div className="text-xs text-gray-500">{plan.plasticItemLabel}</div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{plan.baselineQuantity}</span>
                  <ArrowRight className="h-3 w-3 text-gray-400" />
                  <span className="font-medium text-green-600">{plan.targetQuantity}</span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1 text-sm font-medium text-green-600">
                  <TrendingUp className="h-3 w-3" />
                  {plan.reductionAmount}
                </div>
              </TableCell>
              <TableCell>
                <span className="text-sm capitalize">{plan.timeframeUnit}</span>
              </TableCell>
              <TableCell>
                <Badge 
                  variant="outline" 
                  className={
                    plan.reviewStatus === 'approved' ? 'bg-green-50 text-green-700 border-green-200' :
                    plan.reviewStatus === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                    'bg-yellow-50 text-yellow-700 border-yellow-200'
                  }
                  data-testid={`badge-status-${plan.id}`}
                >
                  {plan.reviewStatus}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-gray-600">
                {format(new Date(plan.createdAt), 'dd/MM/yyyy HH:mm')}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex gap-1 justify-end">
                  <Button
                    size="sm"
                    className="bg-green-500 hover:bg-green-600 h-8 px-2"
                    onClick={() => setReviewData({
                      actionPlanId: plan.id,
                      action: 'approved',
                      notes: ''
                    })}
                    data-testid={`button-table-approve-${plan.id}`}
                  >
                    <CheckCircle className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-8 px-2"
                    onClick={() => setReviewData({
                      actionPlanId: plan.id,
                      action: 'rejected',
                      notes: ''
                    })}
                    data-testid={`button-table-reject-${plan.id}`}
                  >
                    <XCircle className="h-3 w-3" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  // Card View Component - Grouped by School
  const ActionPlanCardView = ({ actionPlans }: { actionPlans: PendingActionPlan[] }) => {
    // Group by school for card view
    const schoolGroups = useMemo(() => {
      const grouped = new Map<string, PendingActionPlan[]>();
      
      actionPlans.forEach(plan => {
        const schoolKey = `${plan.schoolId}-${plan.roundNumber}`;
        if (!grouped.has(schoolKey)) {
          grouped.set(schoolKey, []);
        }
        grouped.get(schoolKey)!.push(plan);
      });
      
      return Array.from(grouped.values());
    }, [actionPlans]);

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {schoolGroups.map((schoolPlans) => {
          const firstPlan = schoolPlans[0];
          const allSelected = schoolPlans.every(p => selectedActionPlans.includes(p.id));
          const someSelected = schoolPlans.some(p => selectedActionPlans.includes(p.id));
          
          const toggleSchoolSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
            e.stopPropagation();
            if (allSelected) {
              setSelectedActionPlans(selectedActionPlans.filter(id => !schoolPlans.map(p => p.id).includes(id)));
            } else {
              const combined = [...selectedActionPlans, ...schoolPlans.map(p => p.id)];
              setSelectedActionPlans(Array.from(new Set(combined)));
            }
          };

          const approveAllSchoolPlans = async (e: React.MouseEvent) => {
            e.stopPropagation();
            const planIds = schoolPlans.map(p => p.id);
            // Instant approval without dialog
            try {
              await bulkActionPlanReviewMutation.mutateAsync({
                actionPlanIds: planIds,
                reviewStatus: 'approved',
                reviewNotes: '',
              });
              toast({
                title: "Success",
                description: `Approved all ${planIds.length} action plan(s) for ${firstPlan.school?.name || 'this school'}.`,
              });
            } catch (error: any) {
              toast({
                title: "Approval Failed",
                description: error.message || "Failed to approve action plans.",
                variant: "destructive",
              });
            }
          };

          const rejectAllSchoolPlans = async (e: React.MouseEvent) => {
            e.stopPropagation();
            const planIds = schoolPlans.map(p => p.id);
            // Instant rejection without dialog
            try {
              await bulkActionPlanReviewMutation.mutateAsync({
                actionPlanIds: planIds,
                reviewStatus: 'rejected',
                reviewNotes: '',
              });
              toast({
                title: "Success",
                description: `Rejected all ${planIds.length} action plan(s) for ${firstPlan.school?.name || 'this school'}.`,
              });
            } catch (error: any) {
              toast({
                title: "Rejection Failed",
                description: error.message || "Failed to reject action plans.",
                variant: "destructive",
              });
            }
          };

          return (
            <div
              key={`${firstPlan.schoolId}-${firstPlan.roundNumber}`}
              className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${
                someSelected ? 'ring-2 ring-pcs_blue bg-blue-50' : ''
              }`}
              data-testid={`card-action-plan-group-${firstPlan.schoolId}`}
            >
              {/* School Header */}
              <div className="flex items-start justify-between mb-4 pb-3 border-b">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someSelected && !allSelected;
                      }}
                      onChange={toggleSchoolSelection}
                      className="rounded border-gray-300"
                      data-testid={`checkbox-school-${firstPlan.schoolId}`}
                    />
                    <button
                      onClick={(e) => handleSchoolClick(e, firstPlan.school)}
                      className="font-semibold text-lg text-navy hover:text-pcs_blue transition-colors"
                      data-testid={`text-school-name-${firstPlan.schoolId}`}
                    >
                      {firstPlan.school?.name || 'Unknown School'}
                    </button>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className="bg-navy text-white">
                      Round {firstPlan.roundNumber}
                    </Badge>
                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                      {schoolPlans.length} {schoolPlans.length === 1 ? 'item' : 'items'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Action Plan Items */}
              <div className="space-y-3 mb-4">
                {schoolPlans.map((plan, index) => (
                  <div
                    key={plan.id}
                    className={`p-3 rounded-md border ${
                      selectedActionPlans.includes(plan.id) ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                    }`}
                    data-testid={`action-plan-item-${plan.id}`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedActionPlans.includes(plan.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleActionPlanSelection(plan.id);
                        }}
                        className="rounded border-gray-300 mt-1"
                        data-testid={`checkbox-item-${plan.id}`}
                      />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-semibold text-navy">{plan.plasticItemType}</div>
                            <div className="text-sm text-gray-600">{plan.plasticItemLabel}</div>
                          </div>
                          <Badge 
                            variant="outline"
                            className={
                              plan.reviewStatus === 'approved' ? 'bg-green-50 text-green-700 border-green-200' :
                              plan.reviewStatus === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                              'bg-yellow-50 text-yellow-700 border-yellow-200'
                            }
                          >
                            {plan.reviewStatus}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-sm">
                          <div>
                            <div className="text-gray-600">Baseline</div>
                            <div className="font-semibold">{plan.baselineQuantity}</div>
                          </div>
                          <div>
                            <div className="text-gray-600">Target</div>
                            <div className="font-semibold text-green-600">{plan.targetQuantity}</div>
                          </div>
                          <div>
                            <div className="text-gray-600">Reduction</div>
                            <div className="flex items-center gap-1 font-semibold text-green-600">
                              <TrendingUp className="h-3 w-3" />
                              {plan.reductionAmount}
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 capitalize">
                          Timeframe: {plan.timeframeUnit}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bulk Actions for this School */}
              <div className="flex items-center justify-between pt-3 border-t">
                <div className="text-xs text-gray-500">
                  <Calendar className="h-3 w-3 inline mr-1" />
                  {format(new Date(firstPlan.createdAt), 'dd/MM/yyyy')}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-green-500 hover:bg-green-600 h-8"
                    onClick={approveAllSchoolPlans}
                    data-testid={`button-approve-all-${firstPlan.schoolId}`}
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Approve All
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-8"
                    onClick={rejectAllSchoolPlans}
                    data-testid={`button-reject-all-${firstPlan.schoolId}`}
                  >
                    <XCircle className="h-3 w-3 mr-1" />
                    Reject All
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Action Plans Review
            </CardTitle>
            {selectedActionPlans.length > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">
                  {selectedActionPlans.length} selected
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-green-500 hover:bg-green-600"
                    onClick={() => {
                      setBulkAction({ type: 'approve', notes: '' });
                      setBulkActionPlanDialogOpen(true);
                    }}
                    data-testid="button-bulk-approve"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Bulk Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      setBulkAction({ type: 'reject', notes: '' });
                      setBulkActionPlanDialogOpen(true);
                    }}
                    data-testid="button-bulk-reject"
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Bulk Reject
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Filters */}
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                {/* Status Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Status:</span>
                  <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                    <button
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        actionPlanStatusFilter === 'pending'
                          ? 'bg-white text-navy shadow-sm'
                          : 'text-gray-600 hover:text-navy'
                      }`}
                      onClick={() => setActionPlanStatusFilter('pending')}
                      data-testid="filter-status-pending"
                    >
                      Pending
                    </button>
                    <button
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        actionPlanStatusFilter === 'approved'
                          ? 'bg-green-500 text-white shadow-sm'
                          : 'text-gray-600 hover:text-navy'
                      }`}
                      onClick={() => setActionPlanStatusFilter('approved')}
                      data-testid="filter-status-approved"
                    >
                      Approved
                    </button>
                    <button
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        actionPlanStatusFilter === 'rejected'
                          ? 'bg-red-500 text-white shadow-sm'
                          : 'text-gray-600 hover:text-navy'
                      }`}
                      onClick={() => setActionPlanStatusFilter('rejected')}
                      data-testid="filter-status-rejected"
                    >
                      Rejected
                    </button>
                    <button
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        actionPlanStatusFilter === 'all'
                          ? 'bg-white text-navy shadow-sm'
                          : 'text-gray-600 hover:text-navy'
                      }`}
                      onClick={() => setActionPlanStatusFilter('all')}
                      data-testid="filter-status-all"
                    >
                      All
                    </button>
                  </div>
                </div>

                {/* View Toggle */}
                <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
                  <button
                    className={`p-2 rounded-md transition-colors ${
                      actionPlanViewMode === 'card'
                        ? 'bg-white text-navy shadow-sm'
                        : 'text-gray-600 hover:text-navy'
                    }`}
                    onClick={() => setActionPlanViewMode('card')}
                    data-testid="button-view-card"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                  <button
                    className={`p-2 rounded-md transition-colors ${
                      actionPlanViewMode === 'table'
                        ? 'bg-white text-navy shadow-sm'
                        : 'text-gray-600 hover:text-navy'
                    }`}
                    onClick={() => setActionPlanViewMode('table')}
                    data-testid="button-view-table"
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Search and Additional Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[250px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by school name or plastic item..."
                  value={actionPlanSearchQuery}
                  onChange={(e) => setActionPlanSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>

              <Select value={actionPlanCountryFilter} onValueChange={setActionPlanCountryFilter}>
                <SelectTrigger className="w-[180px]" data-testid="select-country">
                  <SelectValue placeholder="Country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Countries</SelectItem>
                  {countries?.map((country) => (
                    <SelectItem key={country.code} value={country.name}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={actionPlanRoundFilter} onValueChange={setActionPlanRoundFilter}>
                <SelectTrigger className="w-[150px]" data-testid="select-round">
                  <SelectValue placeholder="Round" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Rounds</SelectItem>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(round => (
                    <SelectItem key={round} value={round.toString()}>
                      Round {round}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={actionPlanSortBy} onValueChange={(value: any) => setActionPlanSortBy(value)}>
                <SelectTrigger className="w-[180px]" data-testid="select-sort">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="schoolName">School Name</SelectItem>
                  <SelectItem value="reductionAmount">Reduction Amount</SelectItem>
                </SelectContent>
              </Select>

              {activeFiltersCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  data-testid="button-clear-filters"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear ({activeFiltersCount})
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {actionPlansLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="border rounded-lg p-4 animate-pulse">
                  <div className="space-y-3">
                    <div className="h-6 bg-gray-200 rounded w-48"></div>
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                    <div className="flex gap-2">
                      <div className="h-4 bg-gray-200 rounded w-20"></div>
                      <div className="h-4 bg-gray-200 rounded w-20"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : actionPlansPending?.length === 0 ? (
            <EmptyState
              icon={Target}
              title="No Action Plans"
              description="No action plans match your filters."
            />
          ) : (
            <>
              {actionPlanViewMode === 'table' ? (
                <ActionPlanTableView actionPlans={actionPlansPending || []} />
              ) : (
                <ActionPlanCardView actionPlans={actionPlansPending || []} />
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <AlertDialog open={!!reviewData} onOpenChange={(open) => !open && setReviewData(null)}>
        <AlertDialogContent data-testid="dialog-review-action-plan">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {reviewData?.action === 'approved' ? 'Approve' : 'Reject'} Action Plan
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {reviewData?.action === 'approved' ? 'approve' : 'reject'} this action plan?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Review Notes {reviewData?.action === 'rejected' && <span className="text-red-500">*</span>}
            </label>
            <Textarea
              placeholder="Add notes about your decision..."
              value={reviewData?.notes || ''}
              onChange={(e) => reviewData && setReviewData({ ...reviewData, notes: e.target.value })}
              rows={4}
              data-testid="textarea-review-notes"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-review">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (reviewData) {
                  reviewActionPlanMutation.mutate({
                    actionPlanId: reviewData.actionPlanId,
                    reviewStatus: reviewData.action,
                    reviewNotes: reviewData.notes,
                  });
                }
              }}
              disabled={reviewActionPlanMutation.isPending}
              className={reviewData?.action === 'approved' ? 'bg-green-500 hover:bg-green-600' : ''}
              data-testid="button-confirm-review"
            >
              {reviewActionPlanMutation.isPending && <span className="mr-2">⏳</span>}
              {reviewData?.action === 'approved' ? 'Approve' : 'Reject'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Review Dialog */}
      <AlertDialog open={bulkActionPlanDialogOpen} onOpenChange={setBulkActionPlanDialogOpen}>
        <AlertDialogContent data-testid="dialog-bulk-review">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Bulk {bulkAction?.type === 'approve' ? 'Approve' : 'Reject'} Action Plans
            </AlertDialogTitle>
            <AlertDialogDescription>
              You are about to {bulkAction?.type} {selectedActionPlans.length} action plan(s). 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Review Notes
            </label>
            <Textarea
              placeholder="Add notes about your decision..."
              value={bulkAction?.notes || ''}
              onChange={(e) => bulkAction && setBulkAction({ ...bulkAction, notes: e.target.value })}
              rows={4}
              data-testid="textarea-bulk-notes"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-bulk">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (bulkAction) {
                  bulkActionPlanReviewMutation.mutate({
                    actionPlanIds: selectedActionPlans,
                    reviewStatus: bulkAction.type === 'approve' ? 'approved' : 'rejected',
                    reviewNotes: bulkAction.notes || '',
                  });
                }
              }}
              disabled={bulkActionPlanReviewMutation.isPending}
              className={bulkAction?.type === 'approve' ? 'bg-green-500 hover:bg-green-600' : ''}
              data-testid="button-confirm-bulk"
            >
              {bulkActionPlanReviewMutation.isPending && <span className="mr-2">⏳</span>}
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Detail Preview Dialog */}
      <Dialog open={!!previewActionPlan} onOpenChange={(open) => !open && setPreviewActionPlan(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" data-testid="dialog-action-plan-detail">
          <DialogHeader>
            <DialogTitle>Action Plan Details</DialogTitle>
          </DialogHeader>
          {previewActionPlan && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-gray-700">School</div>
                  <div className="text-base">{previewActionPlan.school?.name || 'Unknown'}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700">Country</div>
                  <div className="text-base">{previewActionPlan.school?.country || 'Unknown'}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700">Round Number</div>
                  <div className="text-base">Round {previewActionPlan.roundNumber}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700">Review Status</div>
                  <Badge 
                    className={
                      previewActionPlan.reviewStatus === 'approved' ? 'bg-green-500 text-white' :
                      previewActionPlan.reviewStatus === 'rejected' ? 'bg-red-500 text-white' :
                      'bg-yellow-500 text-white'
                    }
                  >
                    {previewActionPlan.reviewStatus}
                  </Badge>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="text-sm font-medium text-gray-700 mb-2">Plastic Item</div>
                <div className="text-lg font-semibold">{previewActionPlan.plasticItemType}</div>
                <div className="text-gray-600">{previewActionPlan.plasticItemLabel}</div>
              </div>

              <div className="grid grid-cols-3 gap-4 border-t pt-4">
                <div>
                  <div className="text-sm font-medium text-gray-700">Baseline Quantity</div>
                  <div className="text-2xl font-bold">{previewActionPlan.baselineQuantity}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700">Target Quantity</div>
                  <div className="text-2xl font-bold text-green-600">{previewActionPlan.targetQuantity}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700">Reduction Amount</div>
                  <div className="text-2xl font-bold text-green-600 flex items-center gap-1">
                    <TrendingUp className="h-5 w-5" />
                    {previewActionPlan.reductionAmount}
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="text-sm font-medium text-gray-700">Timeframe</div>
                <div className="text-lg capitalize">{previewActionPlan.timeframeUnit}</div>
              </div>

              {previewActionPlan.notes && (
                <div className="border-t pt-4">
                  <div className="text-sm font-medium text-gray-700 mb-2">Notes</div>
                  <div className="text-sm bg-gray-50 p-3 rounded">{previewActionPlan.notes}</div>
                </div>
              )}

              <div className="border-t pt-4">
                <div className="text-sm font-medium text-gray-700 mb-2">Submission Info</div>
                <div className="space-y-1 text-sm">
                  <div><span className="font-medium">Submitted by:</span> {previewActionPlan.submitter?.firstName} {previewActionPlan.submitter?.lastName}</div>
                  <div><span className="font-medium">Submitted on:</span> {format(new Date(previewActionPlan.createdAt), 'dd/MM/yyyy HH:mm')}</div>
                </div>
              </div>

              {previewActionPlan.reviewedBy && (
                <div className="border-t pt-4">
                  <div className="text-sm font-medium text-gray-700 mb-2">Review Info</div>
                  <div className="space-y-1 text-sm">
                    {previewActionPlan.reviewer && (
                      <div><span className="font-medium">Reviewed by:</span> {previewActionPlan.reviewer.firstName} {previewActionPlan.reviewer.lastName}</div>
                    )}
                    {previewActionPlan.reviewedAt && (
                      <div><span className="font-medium">Reviewed on:</span> {format(new Date(previewActionPlan.reviewedAt), 'dd/MM/yyyy HH:mm')}</div>
                    )}
                    {previewActionPlan.reviewNotes && (
                      <div className="mt-2">
                        <span className="font-medium">Review Notes:</span>
                        <div className="mt-1 bg-gray-50 p-2 rounded">{previewActionPlan.reviewNotes}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {previewActionPlan.reviewStatus === 'pending' && (
                <div className="border-t pt-4 flex gap-2">
                  <Button
                    className="flex-1 bg-green-500 hover:bg-green-600"
                    onClick={() => {
                      setPreviewActionPlan(null);
                      setReviewData({
                        actionPlanId: previewActionPlan.id,
                        action: 'approved',
                        notes: ''
                      });
                    }}
                    data-testid="button-preview-approve"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => {
                      setPreviewActionPlan(null);
                      setReviewData({
                        actionPlanId: previewActionPlan.id,
                        action: 'rejected',
                        notes: ''
                      });
                    }}
                    data-testid="button-preview-reject"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* School Quick View Dialog */}
      {selectedSchool && (
        <SchoolQuickViewDialog
          schoolId={selectedSchool.id}
          schoolName={selectedSchool.name}
          open={schoolHistoryDialogOpen}
          onOpenChange={setSchoolHistoryDialogOpen}
        />
      )}
    </>
  );
}
