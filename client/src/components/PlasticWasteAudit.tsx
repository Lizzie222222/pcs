import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ClipboardCheck, ChevronRight, ChevronLeft, Save, Send, CheckCircle, Plus, Trash2 } from "lucide-react";
import type { AuditResponse, ReductionPromise } from "@shared/schema";

interface PlasticWasteAuditProps {
  schoolId: string;
  onClose?: () => void;
}

// Form schemas for each part
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

const promiseItemSchema = z.object({
  plasticItemType: z.string().min(1, "Item type required"),
  plasticItemLabel: z.string().min(1, "Item label required"),
  baselineQuantity: z.coerce.number().min(1, "Baseline must be at least 1"),
  targetQuantity: z.coerce.number().min(0, "Target must be 0 or more"),
  timeframeUnit: z.enum(['week', 'month', 'year']),
  notes: z.string().optional(),
});

const part5Schema = z.object({
  promises: z.array(promiseItemSchema).min(2, "At least 2 promises required")
});

type Part1Data = z.infer<typeof part1Schema>;
type Part2Data = z.infer<typeof part2Schema>;
type Part3Data = z.infer<typeof part3Schema>;
type Part4Data = z.infer<typeof part4Schema>;
type Part5Data = z.infer<typeof part5Schema>;
type PromiseItem = z.infer<typeof promiseItemSchema>;

export function PlasticWasteAudit({ schoolId, onClose }: PlasticWasteAuditProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [auditId, setAuditId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const hasLoadedInitialData = useRef(false);

  // Fetch existing audit if any
  const { data: existingAudit } = useQuery<AuditResponse>({
    queryKey: [`/api/audits/school/${schoolId}`],
    enabled: !!schoolId,
  });

  // Fetch school data for pre-population
  const { data: schoolData } = useQuery<{ id: string; name: string; studentCount: number | null }>({
    queryKey: [`/api/schools/${schoolId}`],
    enabled: !!schoolId,
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

  const form5 = useForm<Part5Data>({
    resolver: zodResolver(part5Schema),
    defaultValues: {
      promises: [
        {
          plasticItemType: "",
          plasticItemLabel: "",
          baselineQuantity: 0,
          targetQuantity: 0,
          timeframeUnit: "month" as const,
          notes: "",
        },
        {
          plasticItemType: "",
          plasticItemLabel: "",
          baselineQuantity: 0,
          targetQuantity: 0,
          timeframeUnit: "month" as const,
          notes: "",
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form5.control,
    name: "promises",
  });

  // Fetch existing promises if audit exists
  const { data: existingPromises } = useQuery<ReductionPromise[]>({
    queryKey: [`/api/reduction-promises/audit/${auditId}`],
    enabled: !!auditId,
  });

  // Helper function to extract audit items from part2 and part3 data
  const extractAuditItems = () => {
    const part2 = form2.getValues();
    const part3 = form3.getValues();
    
    const items: Array<{ type: string; label: string; quantity: number }> = [];
    
    // Part 2 - Lunchroom & Staffroom items
    const lunchroomBottles = parseInt(part2.lunchroomPlasticBottles || "0");
    const staffroomBottles = parseInt(part2.staffroomPlasticBottles || "0");
    if (lunchroomBottles > 0) items.push({ type: "plastic_bottles", label: "Plastic Bottles (Lunchroom)", quantity: lunchroomBottles });
    if (staffroomBottles > 0) items.push({ type: "plastic_bottles", label: "Plastic Bottles (Staffroom)", quantity: staffroomBottles });
    
    const lunchroomCups = parseInt(part2.lunchroomPlasticCups || "0");
    const staffroomCups = parseInt(part2.staffroomPlasticCups || "0");
    if (lunchroomCups > 0) items.push({ type: "plastic_cups", label: "Plastic Cups (Lunchroom)", quantity: lunchroomCups });
    if (staffroomCups > 0) items.push({ type: "plastic_cups", label: "Plastic Cups (Staffroom)", quantity: staffroomCups });
    
    const lunchroomCutlery = parseInt(part2.lunchroomPlasticCutlery || "0");
    if (lunchroomCutlery > 0) items.push({ type: "plastic_cutlery", label: "Plastic Cutlery", quantity: lunchroomCutlery });
    
    const lunchroomStraws = parseInt(part2.lunchroomPlasticStraws || "0");
    if (lunchroomStraws > 0) items.push({ type: "plastic_straws", label: "Plastic Straws", quantity: lunchroomStraws });
    
    const lunchroomPackaging = parseInt(part2.lunchroomFoodPackaging || "0");
    const staffroomPackaging = parseInt(part2.staffroomFoodPackaging || "0");
    if (lunchroomPackaging > 0) items.push({ type: "food_packaging", label: "Food Packaging (Lunchroom)", quantity: lunchroomPackaging });
    if (staffroomPackaging > 0) items.push({ type: "food_packaging", label: "Food Packaging (Staffroom)", quantity: staffroomPackaging });
    
    const clingFilm = parseInt(part2.lunchroomClingFilm || "0");
    if (clingFilm > 0) items.push({ type: "cling_film", label: "Cling Film", quantity: clingFilm });
    
    // Part 3 - Classroom & Bathroom items
    const pensPencils = parseInt(part3.classroomPensPencils || "0");
    if (pensPencils > 0) items.push({ type: "pens_pencils", label: "Pens & Pencils", quantity: pensPencils });
    
    const stationery = parseInt(part3.classroomStationery || "0");
    if (stationery > 0) items.push({ type: "stationery", label: "Stationery Items", quantity: stationery });
    
    const displayMaterials = parseInt(part3.classroomDisplayMaterials || "0");
    if (displayMaterials > 0) items.push({ type: "display_materials", label: "Display Materials", quantity: displayMaterials });
    
    const toys = parseInt(part3.classroomToys || "0");
    if (toys > 0) items.push({ type: "toys", label: "Toys/Equipment", quantity: toys });
    
    const soapBottles = parseInt(part3.bathroomSoapBottles || "0");
    if (soapBottles > 0) items.push({ type: "soap_bottles", label: "Soap Bottles", quantity: soapBottles });
    
    const binLiners = parseInt(part3.bathroomBinLiners || "0");
    if (binLiners > 0) items.push({ type: "bin_liners", label: "Bin Liners", quantity: binLiners });
    
    const cupsPaper = parseInt(part3.bathroomCupsPaper || "0");
    if (cupsPaper > 0) items.push({ type: "cups_dispensers", label: "Cups/Dispensers", quantity: cupsPaper });
    
    return items;
  };

  // Load existing audit data or pre-populate from school data
  useEffect(() => {
    if (existingAudit && !hasLoadedInitialData.current) {
      setAuditId(existingAudit.id);
      setCurrentStep(existingAudit.currentPart || 1);
      
      if (existingAudit.part1Data) {
        form1.reset(existingAudit.part1Data);
      }
      if (existingAudit.part2Data) {
        form2.reset(existingAudit.part2Data);
      }
      if (existingAudit.part3Data) {
        form3.reset(existingAudit.part3Data);
      }
      if (existingAudit.part4Data) {
        form4.reset(existingAudit.part4Data);
      }
      hasLoadedInitialData.current = true;
    } else if (!existingAudit && schoolData && !hasLoadedInitialData.current) {
      // Pre-populate form with school data if no existing audit
      form1.reset({
        schoolName: schoolData.name,
        studentCount: schoolData.studentCount !== null ? String(schoolData.studentCount) : "",
        staffCount: "",
        auditDate: new Date().toISOString().split('T')[0],
        auditTeam: "",
      });
      hasLoadedInitialData.current = true;
    }
  }, [existingAudit, schoolData]);

  // Load existing promises
  useEffect(() => {
    if (existingPromises && existingPromises.length > 0) {
      const formattedPromises = existingPromises.map(p => ({
        plasticItemType: p.plasticItemType,
        plasticItemLabel: p.plasticItemLabel,
        baselineQuantity: p.baselineQuantity,
        targetQuantity: p.targetQuantity,
        timeframeUnit: p.timeframeUnit as 'week' | 'month' | 'year',
        notes: p.notes || "",
      }));
      form5.reset({ promises: formattedPromises });
    }
  }, [existingPromises]);

  // Auto-save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/audits', data);
      return res.json() as Promise<AuditResponse>;
    },
    onSuccess: (data) => {
      if (!auditId && data) {
        setAuditId(data.id);
      }
      queryClient.invalidateQueries({ queryKey: [`/api/audits/school/${schoolId}`] });
      toast({
        title: "Progress saved",
        description: "Your audit progress has been saved automatically.",
      });
    },
  });

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('POST', `/api/audits/${id}/submit`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/audits/school/${schoolId}`] });
      toast({
        title: "Audit submitted!",
        description: "Your plastic waste audit has been submitted for review.",
      });
      onClose?.();
    },
  });

  // Calculate results
  const calculateResults = () => {
    const part2Values = form2.getValues();
    const part3Values = form3.getValues();

    const plasticCounts = {
      'Plastic bottles': parseInt(part2Values.lunchroomPlasticBottles || "0") + parseInt(part2Values.staffroomPlasticBottles || "0"),
      'Plastic cups': parseInt(part2Values.lunchroomPlasticCups || "0") + parseInt(part2Values.staffroomPlasticCups || "0"),
      'Plastic cutlery': parseInt(part2Values.lunchroomPlasticCutlery || "0"),
      'Plastic straws': parseInt(part2Values.lunchroomPlasticStraws || "0"),
      'Food packaging': parseInt(part2Values.lunchroomFoodPackaging || "0") + parseInt(part2Values.staffroomFoodPackaging || "0"),
      'Cling film': parseInt(part2Values.lunchroomClingFilm || "0"),
      'Pens & pencils': parseInt(part3Values.classroomPensPencils || "0"),
      'Stationery items': parseInt(part3Values.classroomStationery || "0"),
      'Display materials': parseInt(part3Values.classroomDisplayMaterials || "0"),
      'Toys': parseInt(part3Values.classroomToys || "0"),
      'Soap bottles': parseInt(part3Values.bathroomSoapBottles || "0"),
      'Bin liners': parseInt(part3Values.bathroomBinLiners || "0"),
    };

    const total = Object.values(plasticCounts).reduce((sum, count) => sum + count, 0);
    const topItems = Object.entries(plasticCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .filter(([, count]) => count > 0);

    return {
      totalPlasticItems: total,
      topProblemPlastics: topItems.map(([name, count]) => ({ name, count })),
      plasticCounts,
    };
  };

  // Save progress
  const handleSaveProgress = async () => {
    const currentForm = getCurrentForm();
    const isValid = await currentForm.trigger();
    
    if (!isValid) return;

    const results = calculateResults();
    
    const auditData = {
      schoolId,
      currentPart: currentStep,
      status: 'draft',
      part1Data: form1.getValues(),
      part2Data: form2.getValues(),
      part3Data: form3.getValues(),
      part4Data: form4.getValues(),
      resultsData: results,
      totalPlasticItems: results.totalPlasticItems,
      topProblemPlastics: results.topProblemPlastics,
    };

    saveMutation.mutate(auditData);
  };

  // Next step
  const handleNext = async () => {
    const currentForm = getCurrentForm();
    const isValid = await currentForm.trigger();
    
    if (!isValid) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields before continuing.",
        variant: "destructive",
      });
      return;
    }

    await handleSaveProgress();
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  // Previous step
  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Submit audit
  const handleSubmit = async () => {
    const isValid = await form5.trigger();
    
    if (!isValid) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields before submitting.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Save audit first
      await handleSaveProgress();
      
      if (!auditId) {
        throw new Error("Audit ID not found");
      }
      
      // Submit audit
      await submitMutation.mutateAsync(auditId);
      
      // Create promises
      const promisesData = form5.getValues().promises;
      const promisePromises = promisesData.map(promise => {
        const reductionAmount = promise.baselineQuantity - promise.targetQuantity;
        return apiRequest('POST', '/api/reduction-promises', {
          schoolId,
          auditId,
          plasticItemType: promise.plasticItemType,
          plasticItemLabel: promise.plasticItemLabel,
          baselineQuantity: promise.baselineQuantity,
          targetQuantity: promise.targetQuantity,
          reductionAmount,
          timeframeUnit: promise.timeframeUnit,
          notes: promise.notes || "",
        });
      });
      
      await Promise.all(promisePromises);
      
      queryClient.invalidateQueries({ queryKey: [`/api/reduction-promises/audit/${auditId}`] });
      
      toast({
        title: "Audit and Promises Submitted!",
        description: `Your plastic waste audit and ${promisesData.length} reduction promises have been submitted for review.`,
      });
      
      onClose?.();
    } catch (error) {
      console.error("Error submitting audit and promises:", error);
      toast({
        title: "Submission Error",
        description: "There was an error submitting your audit. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCurrentForm = () => {
    switch (currentStep) {
      case 1: return form1;
      case 2: return form2;
      case 3: return form3;
      case 4: return form4;
      case 5: return form5;
      default: return form1;
    }
  };

  const progress = (currentStep / 5) * 100;

  // Check if audit is already submitted
  if (existingAudit?.status === 'submitted') {
    const part1 = existingAudit.part1Data as Part1Data | null;
    const part2 = existingAudit.part2Data as Part2Data | null;
    const part3 = existingAudit.part3Data as Part3Data | null;
    const part4 = existingAudit.part4Data as Part4Data | null;
    
    return (
      <Card className="border-2 border-yellow-300 bg-yellow-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-navy">
            <ClipboardCheck className="h-6 w-6 text-yellow-600" />
            Audit Under Review
          </CardTitle>
          <CardDescription className="text-gray-700">
            Your plastic waste audit has been submitted and is currently under review by an administrator.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full bg-white rounded-lg border border-yellow-200" data-testid="accordion-audit-review">
            <AccordionItem value="part1" className="border-b border-yellow-100">
              <AccordionTrigger className="px-4 hover:bg-yellow-50" data-testid="accordion-trigger-part1">
                Part 1: School Information
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4" data-testid="accordion-content-part1">
                {part1 ? (
                  <div className="space-y-2 text-sm">
                    <div><strong>School Name:</strong> {part1.schoolName}</div>
                    {part1.studentCount && <div><strong>Number of Students:</strong> {part1.studentCount}</div>}
                    {part1.staffCount && <div><strong>Number of Staff:</strong> {part1.staffCount}</div>}
                    <div><strong>Audit Date:</strong> {part1.auditDate}</div>
                    {part1.auditTeam && <div><strong>Audit Team Members:</strong> {part1.auditTeam}</div>}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No data available</p>
                )}
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="part2" className="border-b border-yellow-100">
              <AccordionTrigger className="px-4 hover:bg-yellow-50" data-testid="accordion-trigger-part2">
                Part 2: Lunchroom & Staffroom
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4" data-testid="accordion-content-part2">
                {part2 ? (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2 text-navy">Lunchroom</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>Plastic Bottles: {part2.lunchroomPlasticBottles || 0}</div>
                        <div>Plastic Cups: {part2.lunchroomPlasticCups || 0}</div>
                        <div>Plastic Cutlery: {part2.lunchroomPlasticCutlery || 0}</div>
                        <div>Plastic Straws: {part2.lunchroomPlasticStraws || 0}</div>
                        <div>Food Packaging: {part2.lunchroomFoodPackaging || 0}</div>
                        <div>Cling Film: {part2.lunchroomClingFilm || 0}</div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2 text-navy">Staffroom</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>Plastic Bottles: {part2.staffroomPlasticBottles || 0}</div>
                        <div>Plastic Cups: {part2.staffroomPlasticCups || 0}</div>
                        <div>Food Packaging: {part2.staffroomFoodPackaging || 0}</div>
                      </div>
                    </div>
                    {part2.lunchroomNotes && (
                      <div className="text-sm">
                        <strong>Additional Notes:</strong> {part2.lunchroomNotes}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No data available</p>
                )}
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="part3" className="border-b border-yellow-100">
              <AccordionTrigger className="px-4 hover:bg-yellow-50" data-testid="accordion-trigger-part3">
                Part 3: Classrooms & Bathrooms
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4" data-testid="accordion-content-part3">
                {part3 ? (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2 text-navy">Classrooms</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>Pens & Pencils: {part3.classroomPensPencils || 0}</div>
                        <div>Stationery Items: {part3.classroomStationery || 0}</div>
                        <div>Display Materials: {part3.classroomDisplayMaterials || 0}</div>
                        <div>Toys/Equipment: {part3.classroomToys || 0}</div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2 text-navy">Bathrooms</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>Soap Bottles: {part3.bathroomSoapBottles || 0}</div>
                        <div>Bin Liners: {part3.bathroomBinLiners || 0}</div>
                        <div>Cups/Dispensers: {part3.bathroomCupsPaper || 0}</div>
                      </div>
                    </div>
                    {part3.classroomNotes && (
                      <div className="text-sm">
                        <strong>Additional Notes:</strong> {part3.classroomNotes}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No data available</p>
                )}
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="part4" className="border-b border-yellow-100">
              <AccordionTrigger className="px-4 hover:bg-yellow-50" data-testid="accordion-trigger-part4">
                Part 4: Waste Management Practices
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4" data-testid="accordion-content-part4">
                {part4 ? (
                  <div className="space-y-3 text-sm">
                    <div>
                      <strong>Has Recycling Bins:</strong> {part4.hasRecyclingBins ? 'Yes' : 'No'}
                    </div>
                    {part4.recyclingBinLocations && (
                      <div>
                        <strong>Recycling Bin Locations:</strong> {part4.recyclingBinLocations}
                      </div>
                    )}
                    <div>
                      <strong>Plastic Waste Destination:</strong> {part4.plasticWasteDestination}
                    </div>
                    <div>
                      <strong>Composts Organic Waste:</strong> {part4.compostsOrganicWaste ? 'Yes' : 'No'}
                    </div>
                    <div>
                      <strong>Has Plastic Reduction Policy:</strong> {part4.hasPlasticReductionPolicy ? 'Yes' : 'No'}
                    </div>
                    {part4.reductionPolicyDetails && (
                      <div>
                        <strong>Policy Details:</strong> {part4.reductionPolicyDetails}
                      </div>
                    )}
                    {part4.wasteManagementNotes && (
                      <div>
                        <strong>Additional Notes:</strong> {part4.wasteManagementNotes}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No data available</p>
                )}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="promises" className="border-none">
              <AccordionTrigger className="px-4 hover:bg-yellow-50" data-testid="accordion-trigger-promises">
                Part 5: Reduction Promises
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4" data-testid="accordion-content-promises">
                {existingPromises && existingPromises.length > 0 ? (
                  <div className="space-y-3">
                    {existingPromises.map((promise, idx) => (
                      <div key={promise.id} className="bg-green-50 p-3 rounded border border-green-200 text-sm">
                        <p className="font-semibold text-navy">{promise.plasticItemLabel}</p>
                        <div className="mt-2 space-y-1 text-gray-700">
                          <div>Baseline: {promise.baselineQuantity} items per {promise.timeframeUnit}</div>
                          <div>Target: {promise.targetQuantity} items per {promise.timeframeUnit}</div>
                          <div className="font-semibold text-green-700">Reduction: {promise.reductionAmount} items per {promise.timeframeUnit}</div>
                          {promise.notes && <div className="mt-2 text-sm italic">{promise.notes}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No promises have been set for this audit yet.</p>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    );
  }

  if (existingAudit?.status === 'approved') {
    const topPlastics = existingAudit.topProblemPlastics as Array<{ name: string; count: number }> | null;
    
    return (
      <Card className="border-2 border-green-300 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-navy">
            <CheckCircle className="h-6 w-6 text-green-600" />
            Audit Approved
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 mb-4">
            Your plastic waste audit has been approved! Check the results below.
          </p>
          <div className="bg-white p-4 rounded-lg border border-green-200">
            <h4 className="font-semibold text-navy mb-2">Audit Results</h4>
            <p className="text-sm text-gray-600">
              Total plastic items identified: <span className="font-bold">{existingAudit.totalPlasticItems || 0}</span>
            </p>
            {topPlastics && topPlastics.length > 0 && (
              <div className="mt-3">
                <p className="text-sm font-semibold text-gray-700 mb-1">Top Problem Plastics:</p>
                <ul className="text-sm text-gray-600 space-y-1">
                  {topPlastics.map((item, idx) => (
                    <li key={idx}>• {item.name}: {item.count}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (existingAudit?.status === 'rejected') {
    return (
      <Card className="border-2 border-red-300 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-navy">
            <ClipboardCheck className="h-6 w-6 text-red-600" />
            Audit Needs Revision
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 mb-2">
            Your audit submission needs revision. Please review the feedback and resubmit.
          </p>
          {existingAudit.reviewNotes && (
            <div className="bg-white p-3 rounded border border-red-200 mb-4">
              <p className="text-sm font-semibold text-gray-700">Admin Feedback:</p>
              <p className="text-sm text-gray-600 mt-1">{existingAudit.reviewNotes}</p>
            </div>
          )}
          <Button
            onClick={() => setCurrentStep(1)}
            data-testid="button-revise-audit"
          >
            Revise Audit
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-blue-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-navy">
          <ClipboardCheck className="h-6 w-6 text-blue-600" />
          Plastic Waste Audit
        </CardTitle>
        <CardDescription>
          Step {currentStep} of 5: {
            currentStep === 1 ? "About Your School" :
            currentStep === 2 ? "Lunchroom & Staffroom" :
            currentStep === 3 ? "Classrooms & Bathrooms" :
            currentStep === 4 ? "Waste Management" :
            "Reduction Promises"
          }
        </CardDescription>
        <Progress value={progress} className="mt-2" />
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Step 1: About Your School */}
        {currentStep === 1 && (
          <Form {...form1}>
            <div className="space-y-4">
              <FormField
                control={form1.control}
                name="schoolName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>School Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-school-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form1.control}
                name="studentCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Students</FormLabel>
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
                    <FormLabel>Number of Staff</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} data-testid="input-staff-count" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form1.control}
                name="auditDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Audit Date</FormLabel>
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
                    <FormLabel>Audit Team Members</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="List the names of team members who conducted this audit"
                        data-testid="input-audit-team"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </Form>
        )}

        {/* Step 2: Lunchroom & Staffroom */}
        {currentStep === 2 && (
          <Form {...form2}>
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-navy mb-3">Lunchroom</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form2.control}
                    name="lunchroomPlasticBottles"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Plastic Bottles (daily count)</FormLabel>
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
                        <FormLabel>Food Packaging Items</FormLabel>
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
                        <FormLabel>Cling Film Uses</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-lunchroom-clingfilm" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-navy mb-3">Staffroom</h3>
                <div className="grid grid-cols-2 gap-4">
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
                    <FormLabel>Additional Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Any observations about plastic use in lunchroom/staffroom areas?"
                        data-testid="input-lunchroom-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </Form>
        )}

        {/* Step 3: Classrooms & Bathrooms */}
        {currentStep === 3 && (
          <Form {...form3}>
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-navy mb-3">Classrooms</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form3.control}
                    name="classroomPensPencils"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Plastic Pens & Pencils</FormLabel>
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
                        <FormLabel>Other Plastic Stationery</FormLabel>
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
                        <FormLabel>Plastic Display Materials</FormLabel>
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
                        <FormLabel>Plastic Toys/Equipment</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-classroom-toys" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-navy mb-3">Bathrooms</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form3.control}
                    name="bathroomSoapBottles"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Plastic Soap Bottles</FormLabel>
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
                        <FormLabel>Plastic Bin Liners</FormLabel>
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
                        <FormLabel>Plastic Cups/Dispensers</FormLabel>
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
                    <FormLabel>Additional Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Any observations about plastic use in classrooms/bathrooms?"
                        data-testid="input-classroom-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </Form>
        )}

        {/* Step 4: Waste Management & Results */}
        {currentStep === 4 && (
          <Form {...form4}>
            <div className="space-y-6">
              <h3 className="font-semibold text-navy mb-3">Waste Management Practices</h3>
              
              <FormField
                control={form4.control}
                name="hasRecyclingBins"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-recycling-bins"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>School has recycling bins</FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form4.control}
                name="recyclingBinLocations"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recycling Bin Locations (if applicable)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="E.g., classrooms, hallways, cafeteria" data-testid="input-bin-locations" />
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
                    <FormLabel>Where does plastic waste go?</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-waste-destination">
                          <SelectValue placeholder="Select destination" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="general-waste">General Waste (Landfill)</SelectItem>
                        <SelectItem value="recycling-center">Recycling Center</SelectItem>
                        <SelectItem value="mixed">Mixed (Some recycled, some to landfill)</SelectItem>
                        <SelectItem value="unknown">Unknown</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form4.control}
                name="compostsOrganicWaste"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-composting"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>School composts organic waste</FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form4.control}
                name="hasPlasticReductionPolicy"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-reduction-policy"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>School has a plastic reduction policy</FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form4.control}
                name="reductionPolicyDetails"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Policy Details (if applicable)</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Describe your school's plastic reduction policy"
                        data-testid="input-policy-details"
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
                    <FormLabel>Additional Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Any other observations about waste management?"
                        data-testid="input-waste-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Results Preview */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mt-6">
                <h4 className="font-semibold text-navy mb-2">Audit Results Preview</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Based on your responses, here's a summary of plastic use in your school:
                </p>
                <div className="bg-white p-3 rounded">
                  <p className="text-sm font-semibold text-gray-700">
                    Total Plastic Items: <span className="text-blue-600">{calculateResults().totalPlasticItems}</span>
                  </p>
                  {calculateResults().topProblemPlastics.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm font-semibold text-gray-700 mb-1">Top Problem Areas:</p>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {calculateResults().topProblemPlastics.map((item, idx) => (
                          <li key={idx}>• {item.name}: {item.count}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Form>
        )}

        {/* Step 5: Reduction Promises */}
        {currentStep === 5 && (
          <Form {...form5}>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-navy mb-2">Your Reduction Promises</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Based on your audit, commit to reducing at least 2 types of plastic. Set realistic targets!
                </p>
              </div>

              {fields.map((field, index) => {
                const availableItems = extractAuditItems();
                const selectedItem = form5.watch(`promises.${index}.plasticItemType`);
                const selectedItemData = availableItems.find(item => item.type === selectedItem);

                return (
                  <Card key={field.id} className="p-4 bg-gray-50 border border-gray-200" data-testid={`card-promise-${index}`}>
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="font-semibold text-navy">Promise {index + 1}</h4>
                      {fields.length > 2 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => remove(index)}
                          data-testid={`button-remove-promise-${index}`}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>

                    <div className="grid gap-4">
                      <FormField
                        control={form5.control}
                        name={`promises.${index}.plasticItemType`}
                        render={({ field: formField }) => (
                          <FormItem>
                            <FormLabel>Plastic Item Type</FormLabel>
                            <Select
                              onValueChange={(value) => {
                                formField.onChange(value);
                                const item = availableItems.find(i => i.type === value);
                                if (item) {
                                  form5.setValue(`promises.${index}.plasticItemLabel`, item.label);
                                  form5.setValue(`promises.${index}.baselineQuantity`, item.quantity);
                                }
                              }}
                              value={formField.value}
                            >
                              <FormControl>
                                <SelectTrigger data-testid={`select-promise-type-${index}`}>
                                  <SelectValue placeholder="Select plastic item" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {availableItems.map((item) => (
                                  <SelectItem key={item.type + item.label} value={item.type}>
                                    {item.label} ({item.quantity} items)
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {selectedItemData && (
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form5.control}
                            name={`promises.${index}.baselineQuantity`}
                            render={({ field: formField }) => (
                              <FormItem>
                                <FormLabel>Current Usage (Baseline)</FormLabel>
                                <FormControl>
                                  <Input
                                    {...formField}
                                    type="number"
                                    min="1"
                                    data-testid={`input-promise-baseline-${index}`}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form5.control}
                            name={`promises.${index}.targetQuantity`}
                            render={({ field: formField }) => (
                              <FormItem>
                                <FormLabel>Target Reduction</FormLabel>
                                <FormControl>
                                  <Input
                                    {...formField}
                                    type="number"
                                    min="0"
                                    data-testid={`input-promise-target-${index}`}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}

                      <FormField
                        control={form5.control}
                        name={`promises.${index}.timeframeUnit`}
                        render={({ field: formField }) => (
                          <FormItem>
                            <FormLabel>Timeframe</FormLabel>
                            <Select onValueChange={formField.onChange} value={formField.value}>
                              <FormControl>
                                <SelectTrigger data-testid={`select-promise-timeframe-${index}`}>
                                  <SelectValue placeholder="Select timeframe" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="week">Per Week</SelectItem>
                                <SelectItem value="month">Per Month</SelectItem>
                                <SelectItem value="year">Per Year</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form5.control}
                        name={`promises.${index}.notes`}
                        render={({ field: formField }) => (
                          <FormItem>
                            <FormLabel>Notes (Optional)</FormLabel>
                            <FormControl>
                              <Textarea
                                {...formField}
                                placeholder="How will you achieve this reduction?"
                                data-testid={`input-promise-notes-${index}`}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {selectedItemData && form5.watch(`promises.${index}.baselineQuantity`) > 0 && (
                        <div className="bg-blue-50 p-3 rounded border border-blue-200">
                          <p className="text-sm font-semibold text-navy">
                            Reduction: {form5.watch(`promises.${index}.baselineQuantity`) - form5.watch(`promises.${index}.targetQuantity`)} items per {form5.watch(`promises.${index}.timeframeUnit`)}
                          </p>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}

              <Button
                type="button"
                variant="outline"
                onClick={() => append({
                  plasticItemType: "",
                  plasticItemLabel: "",
                  baselineQuantity: 0,
                  targetQuantity: 0,
                  timeframeUnit: "month" as const,
                  notes: "",
                })}
                data-testid="button-add-promise"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Another Promise
              </Button>

              {form5.formState.errors.promises?.root && (
                <p className="text-sm text-red-500">{form5.formState.errors.promises.root.message}</p>
              )}

              {/* Promises Summary */}
              {fields.length > 0 && (
                <div className="bg-green-50 p-4 rounded-lg border border-green-200 mt-6">
                  <h4 className="font-semibold text-navy mb-2">Your Promises Summary</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    You're committing to reduce {fields.length} types of plastic items:
                  </p>
                  <div className="space-y-2">
                    {fields.map((field, index) => {
                      const promise = form5.watch(`promises.${index}`);
                      const reduction = promise.baselineQuantity - promise.targetQuantity;
                      return promise.plasticItemLabel ? (
                        <div key={field.id} className="text-sm bg-white p-2 rounded">
                          <span className="font-semibold">{promise.plasticItemLabel}:</span> Reduce by {reduction} items per {promise.timeframeUnit}
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </div>
          </Form>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-4 border-t">
          <div>
            {currentStep > 1 && (
              <Button
                variant="outline"
                onClick={handlePrevious}
                data-testid="button-previous"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleSaveProgress}
              disabled={saveMutation.isPending}
              data-testid="button-save-progress"
            >
              <Save className="h-4 w-4 mr-1" />
              Save Progress
            </Button>
            {currentStep < 5 ? (
              <Button
                onClick={handleNext}
                data-testid="button-next"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || submitMutation.isPending}
                data-testid="button-submit-audit"
              >
                <Send className="h-4 w-4 mr-1" />
                Submit for Review
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
