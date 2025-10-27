import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { Download, Users, CheckCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import type { Event } from "@shared/schema";
import type { EventRegistrationWithDetails } from "./types";

interface EventRegistrationsProps {
  viewingEvent: Event | null;
  setViewingEvent: (event: Event | null) => void;
  registrations: EventRegistrationWithDetails[];
  registrationsLoading: boolean;
  registrationStatusFilter: string;
  setRegistrationStatusFilter: (status: string) => void;
  updateRegistrationMutation: {
    mutate: (data: { id: string; status: string }) => void;
    isPending: boolean;
  };
}

export default function EventRegistrations({
  viewingEvent,
  setViewingEvent,
  registrations,
  registrationsLoading,
  registrationStatusFilter,
  setRegistrationStatusFilter,
  updateRegistrationMutation,
}: EventRegistrationsProps) {
  const handleExportCSV = () => {
    if (!viewingEvent) return;
    
    const headers = ['Name', 'Email', 'School', 'Country', 'Status', 'Registered Date'];
    const rows = registrations.map(reg => [
      `${reg.user.firstName} ${reg.user.lastName}`,
      reg.user.email,
      reg.school?.name || 'N/A',
      reg.school?.country || 'N/A',
      reg.status,
      reg.registeredAt ? format(new Date(reg.registeredAt), 'd MMM yyyy HH:mm') : 'N/A'
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${viewingEvent.title.replace(/\s+/g, '_')}_registrations.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={viewingEvent !== null} onOpenChange={(open) => !open && setViewingEvent(null)}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle data-testid="text-registrations-title">
            Registrations for {viewingEvent?.title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">
                Filter by Status:
              </label>
              <select
                value={registrationStatusFilter}
                onChange={(e) => setRegistrationStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md"
                data-testid="select-registration-status-filter"
              >
                <option value="all">All</option>
                <option value="registered">Registered</option>
                <option value="attended">Attended</option>
                <option value="cancelled">Cancelled</option>
                <option value="waitlisted">Waitlisted</option>
              </select>
            </div>
            <Button
              variant="outline"
              onClick={handleExportCSV}
              data-testid="button-export-csv"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
          
          {registrationsLoading ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Email</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">School</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Registered</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4, 5].map(i => (
                    <tr key={i} className="border-b animate-pulse">
                      <td className="px-4 py-3">
                        <div className="h-4 bg-gray-200 rounded w-32"></div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-4 bg-gray-200 rounded w-40"></div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-4 bg-gray-200 rounded w-36"></div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-6 bg-gray-200 rounded-full w-24"></div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-4 bg-gray-200 rounded w-28"></div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-8 w-20 bg-gray-200 rounded"></div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : registrations.length === 0 ? (
            <EmptyState
              title="No registrations yet"
              description="This event has no registrations"
              icon={Users}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="table-registrations">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Email</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">School</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Registered</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.map((registration) => (
                    <tr key={registration.id} className="border-b hover:bg-gray-50" data-testid={`row-registration-${registration.id}`}>
                      <td className="px-4 py-3 text-sm text-gray-900" data-testid={`text-name-${registration.id}`}>
                        {registration.user.firstName} {registration.user.lastName}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600" data-testid={`text-email-${registration.id}`}>
                        {registration.user.email}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600" data-testid={`text-school-${registration.id}`}>
                        {registration.school?.name || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm" data-testid={`text-status-${registration.id}`}>
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          registration.status === 'attended' ? 'bg-green-100 text-green-700' :
                          registration.status === 'registered' ? 'bg-blue-100 text-blue-700' :
                          registration.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {registration.status ? registration.status.charAt(0).toUpperCase() + registration.status.slice(1) : 'Unknown'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600" data-testid={`text-date-${registration.id}`}>
                        {registration.registeredAt ? format(new Date(registration.registeredAt), 'd MMM yyyy') : 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {registration.status === 'registered' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              updateRegistrationMutation.mutate({ id: registration.id, status: 'attended' });
                            }}
                            disabled={updateRegistrationMutation.isPending}
                            data-testid={`button-mark-attended-${registration.id}`}
                          >
                            {updateRegistrationMutation.isPending ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                              <CheckCircle className="h-4 w-4 mr-1" />
                            )}
                            Mark Attended
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
