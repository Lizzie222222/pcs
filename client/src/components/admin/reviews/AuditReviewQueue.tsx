import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  FileText,
  CheckCircle,
  XCircle,
  MapPin,
  Calendar,
  Loader2,
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { EmptyState } from "@/components/ui/states";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from 'react-i18next';
import type { PendingAudit } from "@/components/admin/shared/types";

interface AuditReviewQueueProps {
  activeTab: string;
  auditsPending: PendingAudit[];
  auditsLoading: boolean;
  auditReviewData: {
    auditId: string;
    action: 'approved' | 'rejected';
    notes: string;
  } | null;
  setAuditReviewData: (data: {
    auditId: string;
    action: 'approved' | 'rejected';
    notes: string;
  } | null) => void;
  reviewAuditMutation: any;
}

export default function AuditReviewQueue({
  activeTab,
  auditsPending,
  auditsLoading,
  auditReviewData,
  setAuditReviewData,
  reviewAuditMutation,
}: AuditReviewQueueProps) {
  const { toast } = useToast();
  const { t } = useTranslation('admin');

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t('reviews.audit.title')}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {auditsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="border rounded-lg p-4 animate-pulse">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="h-6 bg-gray-200 rounded w-48"></div>
                        <div className="h-6 bg-gray-200 rounded w-20"></div>
                        <div className="h-6 bg-gray-200 rounded w-20"></div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="h-4 bg-gray-200 rounded w-32"></div>
                        <div className="h-4 bg-gray-200 rounded w-28"></div>
                      </div>
                      <div className="h-24 bg-gray-200 rounded"></div>
                      <div className="flex gap-2">
                        <div className="h-9 bg-gray-200 rounded w-24"></div>
                        <div className="h-9 bg-gray-200 rounded w-24"></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : auditsPending.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={t('reviews.audit.noPending')}
              description={t('reviews.audit.allReviewed')}
            />
          ) : (
            <div className="space-y-4">
              {auditsPending.map((audit) => (
                <div
                  key={audit.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                  data-testid={`audit-card-${audit.id}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="font-semibold text-navy text-lg" data-testid={`text-school-name-${audit.id}`}>
                          {audit.school?.name || 'Unknown School'}
                        </h3>
                        <Badge variant="outline" data-testid={`text-school-country-${audit.id}`}>
                          <MapPin className="h-3 w-3 mr-1" />
                          {audit.school?.country || 'Unknown'}
                        </Badge>
                        <Badge className="bg-blue-500 text-white" data-testid={`text-audit-status-${audit.id}`}>
                          {audit.status}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                        <span data-testid={`text-submitted-by-${audit.id}`}>
                          {t('reviews.audit.labels.submittedBy')} {audit.submitter?.firstName || 'Unknown'} {audit.submitter?.lastName || ''}
                        </span>
                        <span data-testid={`text-submitted-at-${audit.id}`}>
                          <Calendar className="h-3 w-3 inline mr-1" />
                          {new Date(audit.submittedAt).toLocaleDateString()}
                        </span>
                      </div>

                      <Accordion type="single" collapsible className="w-full bg-white rounded-lg border" data-testid={`accordion-audit-${audit.id}`}>
                        <AccordionItem value="part1" className="border-b">
                          <AccordionTrigger className="px-4 hover:bg-gray-50" data-testid={`accordion-trigger-part1-${audit.id}`}>
                            {t('reviews.audit.parts.part1')}
                          </AccordionTrigger>
                          <AccordionContent className="px-4 pb-4" data-testid={`accordion-content-part1-${audit.id}`}>
                            {audit.part1Data ? (
                              <div className="space-y-2 text-sm">
                                <div><strong>{t('reviews.audit.part1.schoolName')}</strong> {audit.part1Data.schoolName}</div>
                                {audit.part1Data.studentCount && <div><strong>{t('reviews.audit.part1.studentCount')}</strong> {audit.part1Data.studentCount}</div>}
                                {audit.part1Data.staffCount && <div><strong>{t('reviews.audit.part1.staffCount')}</strong> {audit.part1Data.staffCount}</div>}
                                <div><strong>{t('reviews.audit.part1.auditDate')}</strong> {audit.part1Data.auditDate}</div>
                                {audit.part1Data.auditTeam && <div><strong>{t('reviews.audit.part1.auditTeam')}</strong> {audit.part1Data.auditTeam}</div>}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500">{t('reviews.audit.part1.noData')}</p>
                            )}
                          </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="part2" className="border-b">
                          <AccordionTrigger className="px-4 hover:bg-gray-50" data-testid={`accordion-trigger-part2-${audit.id}`}>
                            {t('reviews.audit.parts.part2')}
                          </AccordionTrigger>
                          <AccordionContent className="px-4 pb-4" data-testid={`accordion-content-part2-${audit.id}`}>
                            {audit.part2Data ? (
                              <div className="space-y-4">
                                <div>
                                  <h4 className="font-semibold mb-2 text-navy">{t('reviews.audit.part2.lunchroom')}</h4>
                                  <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>{t('reviews.audit.part2.plasticBottles')} {audit.part2Data.lunchroomPlasticBottles || 0}</div>
                                    <div>{t('reviews.audit.part2.plasticCups')} {audit.part2Data.lunchroomPlasticCups || 0}</div>
                                    <div>{t('reviews.audit.part2.plasticCutlery')} {audit.part2Data.lunchroomPlasticCutlery || 0}</div>
                                    <div>{t('reviews.audit.part2.plasticStraws')} {audit.part2Data.lunchroomPlasticStraws || 0}</div>
                                    <div>{t('reviews.audit.part2.foodPackaging')} {audit.part2Data.lunchroomFoodPackaging || 0}</div>
                                    <div>{t('reviews.audit.part2.clingFilm')} {audit.part2Data.lunchroomClingFilm || 0}</div>
                                  </div>
                                </div>
                                <div>
                                  <h4 className="font-semibold mb-2 text-navy">{t('reviews.audit.part2.staffroom')}</h4>
                                  <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>{t('reviews.audit.part2.plasticBottles')} {audit.part2Data.staffroomPlasticBottles || 0}</div>
                                    <div>{t('reviews.audit.part2.plasticCups')} {audit.part2Data.staffroomPlasticCups || 0}</div>
                                    <div>{t('reviews.audit.part2.foodPackaging')} {audit.part2Data.staffroomFoodPackaging || 0}</div>
                                  </div>
                                </div>
                                {audit.part2Data.lunchroomNotes && (
                                  <div className="text-sm">
                                    <strong>{t('reviews.audit.part2.additionalNotes')}</strong> {audit.part2Data.lunchroomNotes}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500">{t('reviews.audit.part2.noData')}</p>
                            )}
                          </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="part3" className="border-b">
                          <AccordionTrigger className="px-4 hover:bg-gray-50" data-testid={`accordion-trigger-part3-${audit.id}`}>
                            {t('reviews.audit.parts.part3')}
                          </AccordionTrigger>
                          <AccordionContent className="px-4 pb-4" data-testid={`accordion-content-part3-${audit.id}`}>
                            {audit.part3Data ? (
                              <div className="space-y-4">
                                <div>
                                  <h4 className="font-semibold mb-2 text-navy">{t('reviews.audit.part3.classrooms')}</h4>
                                  <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>{t('reviews.audit.part3.pensPencils')} {audit.part3Data.classroomPensPencils || 0}</div>
                                    <div>{t('reviews.audit.part3.stationeryItems')} {audit.part3Data.classroomStationery || 0}</div>
                                    <div>{t('reviews.audit.part3.bottlesCups')} {audit.part3Data.classroomBottles || 0}</div>
                                    <div>{t('reviews.audit.part3.otherItems')} {audit.part3Data.classroomOther || 0}</div>
                                  </div>
                                </div>
                                <div>
                                  <h4 className="font-semibold mb-2 text-navy">{t('reviews.audit.part3.bathrooms')}</h4>
                                  <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>{t('reviews.audit.part3.soapDispensers')} {audit.part3Data.bathroomSoap || 0}</div>
                                    <div>{t('reviews.audit.part3.otherItems')} {audit.part3Data.bathroomOther || 0}</div>
                                  </div>
                                </div>
                                {audit.part3Data.classroomNotes && (
                                  <div className="text-sm">
                                    <strong>{t('reviews.audit.part3.additionalNotes')}</strong> {audit.part3Data.classroomNotes}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500">{t('reviews.audit.part3.noData')}</p>
                            )}
                          </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="part4">
                          <AccordionTrigger className="px-4 hover:bg-gray-50" data-testid={`accordion-trigger-part4-${audit.id}`}>
                            {t('reviews.audit.parts.part4')}
                          </AccordionTrigger>
                          <AccordionContent className="px-4 pb-4" data-testid={`accordion-content-part4-${audit.id}`}>
                            {audit.part4Data ? (
                              <div className="space-y-2 text-sm">
                                <div>
                                  <strong>{t('reviews.audit.part4.hasRecyclingSystem')}</strong> {audit.part4Data.hasRecyclingSystem ? t('reviews.audit.part4.yes') : t('reviews.audit.part4.no')}
                                </div>
                                {audit.part4Data.recyclingBinLocations && (
                                  <div>
                                    <strong>{t('reviews.audit.part4.recyclingBinLocations')}</strong> {audit.part4Data.recyclingBinLocations}
                                  </div>
                                )}
                                <div>
                                  <strong>{t('reviews.audit.part4.plasticWasteDestination')}</strong> {audit.part4Data.plasticWasteDestination}
                                </div>
                                <div>
                                  <strong>{t('reviews.audit.part4.compostsOrganicWaste')}</strong> {audit.part4Data.compostsOrganicWaste ? t('reviews.audit.part4.yes') : t('reviews.audit.part4.no')}
                                </div>
                                <div>
                                  <strong>{t('reviews.audit.part4.hasPlasticReductionPolicy')}</strong> {audit.part4Data.hasPlasticReductionPolicy ? t('reviews.audit.part4.yes') : t('reviews.audit.part4.no')}
                                </div>
                                {audit.part4Data.reductionPolicyDetails && (
                                  <div>
                                    <strong>{t('reviews.audit.part4.policyDetails')}</strong> {audit.part4Data.reductionPolicyDetails}
                                  </div>
                                )}
                                {audit.part4Data.wasteManagementNotes && (
                                  <div>
                                    <strong>{t('reviews.audit.part4.additionalNotes')}</strong> {audit.part4Data.wasteManagementNotes}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500">{t('reviews.audit.part4.noData')}</p>
                            )}
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>

                      {audit.totalPlasticItems !== undefined && (
                        <div className="mt-4 bg-gray-50 rounded-lg p-3 border">
                          <p className="text-sm font-medium text-gray-700">
                            {t('reviews.audit.labels.totalPlasticItems')} <span className="text-pcs_blue font-semibold text-lg">{audit.totalPlasticItems}</span>
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        className="bg-green-500 hover:bg-green-600"
                        onClick={() => setAuditReviewData({
                          auditId: audit.id,
                          action: 'approved',
                          notes: ''
                        })}
                        disabled={reviewAuditMutation.isPending}
                        data-testid={`button-approve-audit-${audit.id}`}
                      >
                        {reviewAuditMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <CheckCircle className="h-4 w-4 mr-1" />
                        )}
                        {t('reviews.audit.buttons.approve')}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setAuditReviewData({
                          auditId: audit.id,
                          action: 'rejected',
                          notes: ''
                        })}
                        disabled={reviewAuditMutation.isPending}
                        data-testid={`button-reject-audit-${audit.id}`}
                      >
                        {reviewAuditMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <XCircle className="h-4 w-4 mr-1" />
                        )}
                        {t('reviews.audit.buttons.reject')}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Audit Review Modal */}
      {auditReviewData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-between z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-navy mb-4">
              {auditReviewData.action === 'approved' ? t('reviews.audit.modal.approveTitle') : t('reviews.audit.modal.rejectTitle')}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('reviews.audit.modal.reviewNotes')} {auditReviewData.action === 'rejected' && <span className="text-red-500">{t('reviews.audit.modal.reviewNotesRequired')}</span>}
                </label>
                <Textarea
                  value={auditReviewData.notes}
                  onChange={(e) => setAuditReviewData(auditReviewData ? { ...auditReviewData, notes: e.target.value } : null)}
                  placeholder={
                    auditReviewData.action === 'approved'
                      ? t('reviews.audit.modal.feedbackOptional')
                      : t('reviews.audit.modal.feedbackRequired')
                  }
                  rows={4}
                  data-testid="textarea-audit-review-notes"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setAuditReviewData(null)}
                  className="flex-1"
                  data-testid="button-cancel-audit-review"
                >
                  {t('reviews.audit.modal.cancel')}
                </Button>
                <Button
                  className={`flex-1 ${auditReviewData.action === 'approved' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}`}
                  onClick={() => {
                    if (auditReviewData.action === 'rejected' && !auditReviewData.notes.trim()) {
                      toast({
                        title: t('reviews.audit.toasts.reviewNotesRequired'),
                        description: t('reviews.audit.toasts.feedbackRequired'),
                        variant: "destructive",
                      });
                      return;
                    }
                    reviewAuditMutation.mutate({
                      auditId: auditReviewData.auditId,
                      approved: auditReviewData.action === 'approved',
                      reviewNotes: auditReviewData.notes,
                    });
                  }}
                  disabled={reviewAuditMutation.isPending}
                  data-testid="button-confirm-audit-review"
                >
                  {reviewAuditMutation.isPending ? t('reviews.audit.modal.processing') : t('reviews.audit.modal.confirm')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
