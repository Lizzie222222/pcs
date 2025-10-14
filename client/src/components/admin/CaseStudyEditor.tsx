import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/ui/states";
import { 
  Save, 
  Eye, 
  X, 
  FileText, 
  Image as ImageIcon, 
  MessageSquare, 
  BarChart3, 
  Calendar, 
  Tag, 
  Settings 
} from "lucide-react";
import type { 
  CaseStudy, 
  CaseStudyImage, 
  CaseStudyVideo, 
  StudentQuote, 
  ImpactMetric, 
  TimelineSection 
} from "@shared/schema";
import { 
  caseStudyImageSchema,
  caseStudyVideoSchema,
  studentQuoteSchema,
  impactMetricSchema,
  timelineSectionSchema
} from "@shared/schema";

import { RichTextSection } from "./case-study-sections/RichTextSection";
import { MediaGallerySection } from "./case-study-sections/MediaGallerySection";
import { QuotesManager } from "./case-study-sections/QuotesManager";
import { ImpactMetricsBuilder } from "./case-study-sections/ImpactMetricsBuilder";
import { TimelineBuilder } from "./case-study-sections/TimelineBuilder";
import { CategorisationSection } from "./case-study-sections/CategorisationSection";
import { TemplateStatusSection } from "./case-study-sections/TemplateStatusSection";

interface CaseStudyEditorProps {
  caseStudy?: CaseStudy;
  onSave: (data: any) => void;
  onCancel: () => void;
}

const caseStudyFormSchema = z.object({
  evidenceId: z.string().optional().nullable(),
  schoolId: z.string().min(1, "School is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().nullable(),
  stage: z.enum(["inspire", "investigate", "act"], {
    required_error: "Program stage is required",
  }),
  impact: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  featured: z.boolean().default(false),
  priority: z.number().default(0),
  images: z.array(caseStudyImageSchema).optional().default([]),
  videos: z.array(caseStudyVideoSchema).optional().default([]),
  studentQuotes: z.array(studentQuoteSchema).optional().default([]),
  impactMetrics: z.array(impactMetricSchema).optional().default([]),
  timelineSections: z.array(timelineSectionSchema).optional().default([]),
  categories: z.array(z.string()).optional().default([]),
  tags: z.array(z.string()).optional().default([]),
  status: z.enum(["draft", "published"], {
    required_error: "Status is required",
  }),
  templateType: z.string().optional().nullable(),
  beforeImage: z.string().optional().nullable(),
  afterImage: z.string().optional().nullable(),
  metaDescription: z.string().optional().nullable(),
  metaKeywords: z.string().optional().nullable(),
  createdBy: z.string().min(1, "Creator is required"),
}).refine((data) => {
  if (data.status === "published") {
    return (
      (data.images && data.images.length > 0) ||
      data.beforeImage ||
      data.afterImage ||
      data.imageUrl
    );
  }
  return true;
}, {
  message: "At least one image is required when publishing",
  path: ["images"],
});

type CaseStudyFormData = z.infer<typeof caseStudyFormSchema>;

export function CaseStudyEditor({ caseStudy, onSave, onCancel }: CaseStudyEditorProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("content");

  const form = useForm<CaseStudyFormData>({
    resolver: zodResolver(caseStudyFormSchema),
    defaultValues: caseStudy ? {
      evidenceId: caseStudy.evidenceId || null,
      schoolId: caseStudy.schoolId,
      title: caseStudy.title,
      description: caseStudy.description || "",
      stage: caseStudy.stage,
      impact: caseStudy.impact || "",
      imageUrl: caseStudy.imageUrl || null,
      featured: caseStudy.featured || false,
      priority: caseStudy.priority || 0,
      images: (caseStudy.images as CaseStudyImage[]) || [],
      videos: (caseStudy.videos as CaseStudyVideo[]) || [],
      studentQuotes: (caseStudy.studentQuotes as StudentQuote[]) || [],
      impactMetrics: (caseStudy.impactMetrics as ImpactMetric[]) || [],
      timelineSections: (caseStudy.timelineSections as TimelineSection[]) || [],
      categories: Array.isArray(caseStudy.categories) ? caseStudy.categories : [],
      tags: Array.isArray(caseStudy.tags) ? caseStudy.tags : [],
      status: caseStudy.status || "draft",
      templateType: caseStudy.templateType || "standard",
      beforeImage: caseStudy.beforeImage || null,
      afterImage: caseStudy.afterImage || null,
      metaDescription: caseStudy.metaDescription || "",
      metaKeywords: caseStudy.metaKeywords || "",
      createdBy: caseStudy.createdBy,
    } : {
      evidenceId: null,
      schoolId: "",
      title: "",
      description: "",
      stage: "inspire" as const,
      impact: "",
      imageUrl: null,
      featured: false,
      priority: 0,
      images: [],
      videos: [],
      studentQuotes: [],
      impactMetrics: [],
      timelineSections: [],
      categories: [],
      tags: [],
      status: "draft" as const,
      templateType: "standard",
      beforeImage: null,
      afterImage: null,
      metaDescription: "",
      metaKeywords: "",
      createdBy: "",
    },
  });

  const handleSave = async (data: CaseStudyFormData, publishStatus?: "draft" | "published") => {
    try {
      setIsSaving(true);
      
      const saveData = {
        ...data,
        status: publishStatus || data.status,
      };

      await onSave(saveData);
      
      toast({
        title: publishStatus === "published" ? "Published!" : "Saved!",
        description: `Case study has been ${publishStatus === "published" ? "published" : "saved as draft"} successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save case study",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const onSubmit = (data: CaseStudyFormData) => {
    handleSave(data);
  };

  const handlePublish = () => {
    const data = form.getValues();
    
    // Validate for publishing
    if (!data.images?.length && !data.beforeImage && !data.afterImage && !data.imageUrl) {
      toast({
        title: "Validation Error",
        description: "At least one image is required to publish",
        variant: "destructive",
      });
      setActiveTab("media");
      return;
    }

    form.setValue("status", "published");
    handleSave(data, "published");
  };

  const handleSaveDraft = () => {
    const data = form.getValues();
    form.setValue("status", "draft");
    handleSave(data, "draft");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-background border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-editor-title">
                {caseStudy ? "Edit Case Study" : "Create Case Study"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {form.watch("title") || "Untitled Case Study"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSaving}
                data-testid="button-cancel"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleSaveDraft}
                disabled={isSaving}
                data-testid="button-save-draft"
              >
                {isSaving ? (
                  <LoadingSpinner className="h-4 w-4 mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Draft
              </Button>
              <Button
                type="button"
                onClick={handlePublish}
                disabled={isSaving}
                data-testid="button-publish"
              >
                {isSaving ? (
                  <LoadingSpinner className="h-4 w-4 mr-2" />
                ) : (
                  <Eye className="h-4 w-4 mr-2" />
                )}
                Publish
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-7 mb-8" data-testid="tabs-navigation">
                <TabsTrigger value="content" data-testid="tab-content">
                  <FileText className="h-4 w-4 mr-2" />
                  Content
                </TabsTrigger>
                <TabsTrigger value="media" data-testid="tab-media">
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Media
                </TabsTrigger>
                <TabsTrigger value="quotes" data-testid="tab-quotes">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Quotes
                </TabsTrigger>
                <TabsTrigger value="metrics" data-testid="tab-metrics">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Metrics
                </TabsTrigger>
                <TabsTrigger value="timeline" data-testid="tab-timeline">
                  <Calendar className="h-4 w-4 mr-2" />
                  Timeline
                </TabsTrigger>
                <TabsTrigger value="categorisation" data-testid="tab-categorisation">
                  <Tag className="h-4 w-4 mr-2" />
                  Tags
                </TabsTrigger>
                <TabsTrigger value="settings" data-testid="tab-settings">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </TabsTrigger>
              </TabsList>

              <TabsContent value="content" className="mt-0">
                <Card>
                  <CardContent className="pt-6">
                    <RichTextSection form={form} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="media" className="mt-0">
                <Card>
                  <CardContent className="pt-6">
                    <MediaGallerySection form={form} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="quotes" className="mt-0">
                <Card>
                  <CardContent className="pt-6">
                    <QuotesManager form={form} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="metrics" className="mt-0">
                <Card>
                  <CardContent className="pt-6">
                    <ImpactMetricsBuilder form={form} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="timeline" className="mt-0">
                <Card>
                  <CardContent className="pt-6">
                    <TimelineBuilder form={form} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="categorisation" className="mt-0">
                <Card>
                  <CardContent className="pt-6">
                    <CategorisationSection form={form} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="settings" className="mt-0">
                <Card>
                  <CardContent className="pt-6">
                    <TemplateStatusSection form={form} />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </form>
        </Form>
      </div>
    </div>
  );
}
