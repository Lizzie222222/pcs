import { UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { ObjectUploader } from "@/components/ObjectUploader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, Trash2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { UploadResult } from "@uppy/core";

interface BeforeAfterBuilderProps {
  form: UseFormReturn<any>;
}

export function BeforeAfterBuilder({ form }: BeforeAfterBuilderProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const beforeImage = form.watch("beforeImage");
  const afterImage = form.watch("afterImage");

  const handleImageUpload = async () => {
    try {
      const response = await fetch('/api/case-studies/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      const data = await response.json();
      return {
        method: 'PUT' as const,
        url: data.uploadURL,
      };
    } catch (error) {
      toast({
        title: "Upload Error",
        description: "Failed to get upload URL",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleImageComplete = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>, type: 'before' | 'after') => {
    if (result.successful && result.successful.length > 0) {
      const uploadedFile = result.successful[0];
      const imageUrl = uploadedFile.uploadURL?.split('?')[0] || '';

      try {
        if (!user?.id) {
          throw new Error("User not authenticated");
        }

        const aclResponse = await fetch('/api/case-studies/set-acl', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileURL: imageUrl,
            visibility: 'public',
            filename: `case-study-${type}-${Date.now()}.jpg`,
            owner: user.id,
          }),
        });

        if (!aclResponse.ok) {
          const errorData = await aclResponse.json();
          throw new Error(errorData.message || 'Failed to set ACL');
        }

        if (type === 'before') {
          form.setValue('beforeImage', imageUrl);
        } else {
          form.setValue('afterImage', imageUrl);
        }

        toast({
          title: `${type === 'before' ? 'Before' : 'After'} Image Uploaded`,
          description: "Image has been successfully uploaded",
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to set image permissions";
        toast({
          title: "Upload Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    }
  };

  const isComplete = beforeImage && afterImage;

  return (
    <div className="space-y-6">
      {/* Status Alert */}
      {!isComplete && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Both Before and After images are required for the Visual Story template
          </AlertDescription>
        </Alert>
      )}

      {isComplete && (
        <Alert className="border-green-200 bg-green-50 text-green-900">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription>
            ✓ Before & After comparison is complete
          </AlertDescription>
        </Alert>
      )}

      {/* Side-by-side upload areas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Before Image */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Before Image</h4>
            {beforeImage && <CheckCircle2 className="h-4 w-4 text-green-600" />}
          </div>
          
          {beforeImage ? (
            <div className="relative group">
              <img
                src={beforeImage}
                alt="Before"
                className="w-full h-64 object-cover rounded-lg border-2 border-border"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => form.setValue('beforeImage', '')}
                  data-testid="button-remove-before-image"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove
                </Button>
              </div>
              <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs font-medium">
                BEFORE
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center bg-muted/20">
              <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-4">
                Upload the "before" state of your project
              </p>
              <ObjectUploader
                maxNumberOfFiles={1}
                onGetUploadParameters={handleImageUpload}
                onComplete={(result) => handleImageComplete(result, 'before')}
                buttonClassName="w-full"
                dataTestId="uploader-before-image"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Before Image
              </ObjectUploader>
            </div>
          )}
        </div>

        {/* After Image */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">After Image</h4>
            {afterImage && <CheckCircle2 className="h-4 w-4 text-green-600" />}
          </div>
          
          {afterImage ? (
            <div className="relative group">
              <img
                src={afterImage}
                alt="After"
                className="w-full h-64 object-cover rounded-lg border-2 border-primary"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => form.setValue('afterImage', '')}
                  data-testid="button-remove-after-image"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove
                </Button>
              </div>
              <div className="absolute top-2 left-2 bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-medium">
                AFTER
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center bg-muted/20">
              <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-4">
                Upload the "after" state showing the transformation
              </p>
              <ObjectUploader
                maxNumberOfFiles={1}
                onGetUploadParameters={handleImageUpload}
                onComplete={(result) => handleImageComplete(result, 'after')}
                buttonClassName="w-full"
                dataTestId="uploader-after-image"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload After Image
              </ObjectUploader>
            </div>
          )}
        </div>
      </div>

      {/* Visual comparison preview (if both uploaded) */}
      {isComplete && (
        <div className="border-t pt-6">
          <h4 className="text-sm font-semibold mb-3">Comparison Preview</h4>
          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <img src={beforeImage} alt="Before" className="w-full h-32 object-cover rounded" />
              <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs py-1 text-center">
                Before
              </div>
            </div>
            <div className="relative">
              <img src={afterImage} alt="After" className="w-full h-32 object-cover rounded" />
              <div className="absolute bottom-0 left-0 right-0 bg-primary text-primary-foreground text-xs py-1 text-center">
                After
              </div>
            </div>
          </div>
        </div>
      )}

      <p className="text-sm text-muted-foreground italic">
        💡 Tip: Choose images that clearly show the transformation your school achieved
      </p>
    </div>
  );
}
