import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ClipboardCheck } from "lucide-react";

interface UploadAuditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: string;
}

// Form schemas for each part (matching PlasticWasteAudit.tsx)
const part1Schema = z.object({
  schoolName: z.string().min(1, "School name is required"),
  studentCount: z.string().optional(),
  staffCount: z.string().optional(),
  auditDate: z.string().min(1, "Audit date is required"),
  auditTeam: z.string().optional(),
});

const part2Schema = z.object({
  lunchroomPlasticBottles: z.string().default("0"),
  lunchroomPlasticCups: z.string().default("0"),
  lunchroomPlasticCutlery: z.string().default("0"),
  lunchroomPlasticStraws: z.string().default("0"),
  lunchroomFoodPackaging: z.string().default("0"),
  lunchroomClingFilm: z.string().default("0"),
  staffroomPlasticBottles: z.string().default("0"),
  staffroomPlasticCups: z.string().default("0"),
  staffroomFoodPackaging: z.string().default("0"),
  lunchroomNotes: z.string().optional(),
});

const part3Schema = z.object({
  classroomPensPencils: z.string().default("0"),
  classroomStationery: z.string().default("0"),
  classroomDisplayMaterials: z.string().default("0"),
  classroomToys: z.string().default("0"),
  bathroomSoapBottles: z.string().default("0"),
  bathroomBinLiners: z.string().default("0"),
  bathroomCupsPaper: z.string().default("0"),
  classroomNotes: z.string().optional(),
});

const part4Schema = z.object({
  hasRecyclingBins: z.boolean().default(false),
  recyclingBinLocations: z.string().optional(),
  plasticWasteDestination: z.string().min(1, "Please specify where plastic waste goes"),
  compostsOrganicWaste: z.boolean().default(false),
  hasPlasticReductionPolicy: z.boolean().default(false),
  reductionPolicyDetails: z.string().optional(),
  wasteManagementNotes: z.string().optional(),
});

type Part1Data = z.infer<typeof part1Schema>;
type Part2Data = z.infer<typeof part2Schema>;
type Part3Data = z.infer<typeof part3Schema>;
type Part4Data = z.infer<typeof part4Schema>;

export function UploadAuditDialog({
  open,
  onOpenChange,
  schoolId,
}: UploadAuditDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch school data for pre-population
  const { data: schoolData } = useQuery<{ id: string; name: string; studentCount: number | null }>({
    queryKey: [`/api/schools/${schoolId}`],
    enabled: !!schoolId && open,
  });

  // Forms for each part
  const form1 = useForm<Part1Data>({
    resolver: zodResolver(part1Schema),
    defaultValues: {
      schoolName: "",
      studentCount: "",
      staffCount: "",
      auditDate: new Date().toISOString().split('T')[0],
      auditTeam: "",
    },
  });

  const form2 = useForm<Part2Data>({
    resolver: zodResolver(part2Schema),
    defaultValues: {
      lunchroomPlasticBottles: "0",
      lunchroomPlasticCups: "0",
      lunchroomPlasticCutlery: "0",
      lunchroomPlasticStraws: "0",
      lunchroomFoodPackaging: "0",
      lunchroomClingFilm: "0",
      staffroomPlasticBottles: "0",
      staffroomPlasticCups: "0",
      staffroomFoodPackaging: "0",
      lunchroomNotes: "",
    },
  });

  const form3 = useForm<Part3Data>({
    resolver: zodResolver(part3Schema),
    defaultValues: {
      classroomPensPencils: "0",
      classroomStationery: "0",
      classroomDisplayMaterials: "0",
      classroomToys: "0",
      bathroomSoapBottles: "0",
      bathroomBinLiners: "0",
      bathroomCupsPaper: "0",
      classroomNotes: "",
    },
  });

  const form4 = useForm<Part4Data>({
    resolver: zodResolver(part4Schema),
    defaultValues: {
      hasRecyclingBins: false,
      recyclingBinLocations: "",
      plasticWasteDestination: "",
      compostsOrganicWaste: false,
      hasPlasticReductionPolicy: false,
      reductionPolicyDetails: "",
      wasteManagementNotes: "",
    },
  });

  // Pre-populate form with school data
  useEffect(() => {
    if (schoolData && open) {
      form1.reset({
        schoolName: schoolData.name,
        studentCount: schoolData.studentCount !== null ? String(schoolData.studentCount) : "",
        staffCount: "",
        auditDate: new Date().toISOString().split('T')[0],
        auditTeam: "",
      });
    }
  }, [schoolData, open]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      // Validate all forms
      const isValid1 = await form1.trigger();
      const isValid2 = await form2.trigger();
      const isValid3 = await form3.trigger();
      const isValid4 = await form4.trigger();

      if (!isValid1 || !isValid2 || !isValid3 || !isValid4) {
        throw new Error("Please fill in all required fields");
      }

      const part1Data = form1.getValues();
      const part2Data = form2.getValues();
      const part3Data = form3.getValues();
      const part4Data = form4.getValues();

      return await apiRequest("POST", "/api/audits", {
        schoolId,
        status: "submitted",
        part1Data,
        part2Data,
        part3Data,
        part4Data,
      });
    },
    onSuccess: () => {
      toast({
        title: "Audit submitted",
        description: "Audit has been submitted and approved for this school",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/audits/school/${schoolId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/schools", schoolId] });
      onOpenChange(false);
      resetForms();
    },
    onError: (error: Error) => {
      toast({
        title: "Submission failed",
        description: error.message || "Failed to submit audit",
        variant: "destructive",
      });
    },
  });

  const resetForms = () => {
    form1.reset();
    form2.reset();
    form3.reset();
    form4.reset();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    submitMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5" />
            Submit Audit for School
          </DialogTitle>
          <DialogDescription>
            Complete all sections of the plastic waste audit. Admin submissions are automatically approved.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Accordion type="multiple" defaultValue={["part1", "part2", "part3", "part4"]} className="w-full">
            {/* Part 1 - School Information */}
            <AccordionItem value="part1">
              <AccordionTrigger className="text-base font-semibold">
                Part 1: School Information
              </AccordionTrigger>
              <AccordionContent>
                <Form {...form1}>
                  <div className="space-y-4 pt-2">
                    <FormField
                      control={form1.control}
                      name="schoolName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>School Name *</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-school-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form1.control}
                        name="studentCount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Student Count</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} data-testid="input-student-count" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form1.control}
                        name="staffCount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Staff Count</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} data-testid="input-staff-count" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form1.control}
                      name="auditDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Audit Date *</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-audit-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form1.control}
                      name="auditTeam"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Audit Team</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="Names of team members involved"
                              data-testid="input-audit-team"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </Form>
              </AccordionContent>
            </AccordionItem>

            {/* Part 2 - Lunchroom & Staffroom */}
            <AccordionItem value="part2">
              <AccordionTrigger className="text-base font-semibold">
                Part 2: Lunchroom & Staffroom
              </AccordionTrigger>
              <AccordionContent>
                <Form {...form2}>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">Lunchroom Items</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <FormField
                          control={form2.control}
                          name="lunchroomPlasticBottles"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Plastic Bottles</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} data-testid="input-lunchroom-bottles" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form2.control}
                          name="lunchroomPlasticCups"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Plastic Cups</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} data-testid="input-lunchroom-cups" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form2.control}
                          name="lunchroomPlasticCutlery"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Plastic Cutlery</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} data-testid="input-lunchroom-cutlery" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form2.control}
                          name="lunchroomPlasticStraws"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Plastic Straws</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} data-testid="input-lunchroom-straws" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form2.control}
                          name="lunchroomFoodPackaging"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Food Packaging</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} data-testid="input-lunchroom-packaging" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form2.control}
                          name="lunchroomClingFilm"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Cling Film</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} data-testid="input-lunchroom-clingfilm" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">Staffroom Items</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <FormField
                          control={form2.control}
                          name="staffroomPlasticBottles"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Plastic Bottles</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} data-testid="input-staffroom-bottles" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form2.control}
                          name="staffroomPlasticCups"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Plastic Cups</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} data-testid="input-staffroom-cups" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form2.control}
                          name="staffroomFoodPackaging"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Food Packaging</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} data-testid="input-staffroom-packaging" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <FormField
                      control={form2.control}
                      name="lunchroomNotes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Additional Notes</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              placeholder="Any additional observations..."
                              rows={3}
                              data-testid="textarea-lunchroom-notes"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </Form>
              </AccordionContent>
            </AccordionItem>

            {/* Part 3 - Classrooms & Bathrooms */}
            <AccordionItem value="part3">
              <AccordionTrigger className="text-base font-semibold">
                Part 3: Classrooms & Bathrooms
              </AccordionTrigger>
              <AccordionContent>
                <Form {...form3}>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">Classroom Items</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <FormField
                          control={form3.control}
                          name="classroomPensPencils"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Pens & Pencils</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} data-testid="input-classroom-pens" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form3.control}
                          name="classroomStationery"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Stationery Items</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} data-testid="input-classroom-stationery" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form3.control}
                          name="classroomDisplayMaterials"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Display Materials</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} data-testid="input-classroom-display" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form3.control}
                          name="classroomToys"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Toys/Equipment</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} data-testid="input-classroom-toys" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">Bathroom Items</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <FormField
                          control={form3.control}
                          name="bathroomSoapBottles"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Soap Bottles</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} data-testid="input-bathroom-soap" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form3.control}
                          name="bathroomBinLiners"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Bin Liners</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} data-testid="input-bathroom-binliners" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form3.control}
                          name="bathroomCupsPaper"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Cups/Dispensers</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} data-testid="input-bathroom-cups" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <FormField
                      control={form3.control}
                      name="classroomNotes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Additional Notes</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              placeholder="Any additional observations..."
                              rows={3}
                              data-testid="textarea-classroom-notes"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </Form>
              </AccordionContent>
            </AccordionItem>

            {/* Part 4 - Waste Management */}
            <AccordionItem value="part4">
              <AccordionTrigger className="text-base font-semibold">
                Part 4: Waste Management
              </AccordionTrigger>
              <AccordionContent>
                <Form {...form4}>
                  <div className="space-y-4 pt-2">
                    <FormField
                      control={form4.control}
                      name="hasRecyclingBins"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-recycling-bins"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>
                              School has recycling bins
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form4.control}
                      name="recyclingBinLocations"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Recycling Bin Locations</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="Where are the recycling bins located?"
                              data-testid="input-recycling-locations"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form4.control}
                      name="plasticWasteDestination"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Where does plastic waste go? *</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="e.g., General waste, Recycling center, etc."
                              data-testid="input-waste-destination"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form4.control}
                      name="compostsOrganicWaste"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-composts-organic"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>
                              School composts organic waste
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form4.control}
                      name="hasPlasticReductionPolicy"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-reduction-policy"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>
                              School has a plastic reduction policy
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form4.control}
                      name="reductionPolicyDetails"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Policy Details</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              placeholder="Describe the plastic reduction policy..."
                              rows={3}
                              data-testid="textarea-policy-details"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form4.control}
                      name="wasteManagementNotes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Additional Notes</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              placeholder="Any additional observations..."
                              rows={3}
                              data-testid="textarea-waste-notes"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </Form>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="bg-blue-50 border border-blue-200 rounded p-3 mt-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Admin submissions are automatically approved. Part 5 (Reduction Promises) can be added separately after the audit is submitted.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitMutation.isPending}
              data-testid="button-submit"
            >
              {submitMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit & Approve"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
