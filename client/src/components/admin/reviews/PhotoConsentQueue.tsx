import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Shield,
  CheckCircle,
  XCircle,
  MapPin,
  Clock,
  Eye,
} from "lucide-react";
import { EmptyState } from "@/components/ui/states";

interface PhotoConsentQueueProps {
  activeTab: string;
  photoConsentPending: Array<{
    id: string;
    name: string;
    country: string;
    photoConsentDocumentUrl: string | null;
    photoConsentUploadedAt: Date | null;
    photoConsentStatus: string | null;
  }>;
  photoConsentLoading: boolean;
  approvePhotoConsentMutation: any;
  rejectPhotoConsentMutation: any;
}

export default function PhotoConsentQueue({
  activeTab,
  photoConsentPending,
  photoConsentLoading,
  approvePhotoConsentMutation,
  rejectPhotoConsentMutation,
}: PhotoConsentQueueProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Photo Consent Review Queue
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {photoConsentPending.length === 0 ? (
          <EmptyState
            icon={Shield}
            title="No Pending Photo Consent"
            description="All photo consent submissions have been reviewed!"
          />
        ) : (
          <div className="space-y-4">
            {photoConsentPending.map((school) => (
              <div key={school.id} className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">{school.name}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {school.country}
                      </span>
                      {school.photoConsentUploadedAt && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {new Date(school.photoConsentUploadedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {school.photoConsentDocumentUrl && (
                      <div className="mt-2">
                        <a
                          href={school.photoConsentDocumentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-pcs_blue hover:underline text-sm"
                          data-testid={`link-view-consent-${school.id}`}
                        >
                          <Eye className="h-4 w-4" />
                          View Document
                        </a>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      className="bg-green-500 hover:bg-green-600"
                      onClick={() => {
                        if (confirm(`Approve photo consent for ${school.name}?`)) {
                          approvePhotoConsentMutation.mutate({ schoolId: school.id, notes: '' });
                        }
                      }}
                      data-testid={`button-approve-consent-${school.id}`}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        const notes = prompt(`Rejection notes for ${school.name}:`);
                        if (notes && notes.trim()) {
                          rejectPhotoConsentMutation.mutate({ schoolId: school.id, notes });
                        } else if (notes !== null) {
                          alert('Rejection notes are required');
                        }
                      }}
                      data-testid={`button-reject-consent-${school.id}`}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
