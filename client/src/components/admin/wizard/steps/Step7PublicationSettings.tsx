import { UseFormReturn } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Star, Eye, Search } from "lucide-react";

interface Step7PublicationSettingsProps {
  form: UseFormReturn<any>;
}

export function Step7PublicationSettings({ form }: Step7PublicationSettingsProps) {
  const metaDescription = form.watch("metaDescription");
  const metaKeywords = form.watch("metaKeywords");
  const featured = form.watch("featured");
  const priority = form.watch("priority");
  const imageUrl = form.watch("imageUrl");
  const images = form.watch("images") || [];

  return (
    <div className="space-y-8">
      <div>
        <h2 id="step-7-heading" className="text-2xl font-semibold">Step 7 · Publication Settings</h2>
        <p className="text-muted-foreground mt-2">
          Configure SEO, visibility, and display settings for your case study
        </p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          These settings control how your case study appears in search results and on the inspiration page.
        </AlertDescription>
      </Alert>

      {/* SEO Settings */}
      <Card data-testid="card-seo-settings">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="h-5 w-5" />
            SEO & Metadata
          </CardTitle>
          <CardDescription>
            Optimize your case study for search engines and social media
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Meta Description */}
          <FormField
            control={form.control}
            name="metaDescription"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Meta Description</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    value={field.value || ""}
                    placeholder="A compelling summary of your case study (150-160 characters recommended)"
                    rows={3}
                    maxLength={300}
                    data-testid="textarea-meta-description"
                  />
                </FormControl>
                <FormDescription>
                  {metaDescription?.length || 0} / 160 characters (optimal for search results)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Meta Keywords */}
          <FormField
            control={form.control}
            name="metaKeywords"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Meta Keywords</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value || ""}
                    placeholder="plastic waste, recycling, school sustainability (comma-separated)"
                    data-testid="input-meta-keywords"
                  />
                </FormControl>
                <FormDescription>
                  Add relevant keywords separated by commas
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      {/* Hero Image */}
      <Card data-testid="card-hero-image">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Hero Image
          </CardTitle>
          <CardDescription>
            Select the main image that will appear at the top of your case study
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            control={form.control}
            name="imageUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hero Image URL</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value || ""}
                    placeholder="Leave empty to use the first gallery image"
                    data-testid="input-image-url"
                  />
                </FormControl>
                <FormDescription>
                  The hero image appears at the top of the case study page. If not set, the first gallery image will be used.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Preview current hero image */}
          {(imageUrl || images[0]?.url) && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Preview:</p>
              <div className="relative aspect-video rounded-lg overflow-hidden border bg-muted max-w-md">
                <img
                  src={imageUrl || images[0]?.url}
                  alt="Hero image preview"
                  className="w-full h-full object-cover"
                  crossOrigin="anonymous"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {imageUrl ? "Custom hero image" : "Using first gallery image"}
              </p>
            </div>
          )}

          {!imageUrl && images.length === 0 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Add images in the Media step to have a hero image for your case study.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Visibility Settings */}
      <Card data-testid="card-visibility-settings">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Star className="h-5 w-5" />
            Visibility & Priority
          </CardTitle>
          <CardDescription>
            Control how prominently this case study is displayed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Featured Toggle */}
          <FormField
            control={form.control}
            name="featured"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Featured Case Study</FormLabel>
                  <FormDescription>
                    Display this case study prominently on the inspiration page
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    data-testid="switch-featured"
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {/* Priority Slider */}
          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>Display Priority</FormLabel>
                  <span className="text-sm text-muted-foreground">
                    {field.value || 0}
                  </span>
                </div>
                <FormControl>
                  <Slider
                    min={0}
                    max={100}
                    step={1}
                    value={[field.value || 0]}
                    onValueChange={(vals) => field.onChange(vals[0])}
                    className="w-full"
                    data-testid="slider-priority"
                  />
                </FormControl>
                <FormDescription>
                  Higher priority case studies appear first in listings (0 = default, 100 = highest)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {featured && (
            <Alert className="border-blue-200 bg-blue-50">
              <Star className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-900">
                <strong>Featured case studies</strong> appear in the featured section on the inspiration page and have enhanced visibility.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
