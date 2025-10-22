import { UseFormReturn } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { X, Plus, Info } from "lucide-react";
import { useState } from "react";

interface Step6CategoriesTagsProps {
  form: UseFormReturn<any>;
}

const SUGGESTED_CATEGORIES = [
  "Waste Reduction",
  "Recycling Initiative",
  "Student Leadership",
  "Community Engagement",
  "School Policy",
  "Education & Awareness",
  "Plastic-Free Events",
  "Sustainable Practices",
];

const SUGGESTED_TAGS = [
  "plastic-free",
  "recycling",
  "zero-waste",
  "sustainability",
  "student-led",
  "eco-warriors",
  "green-school",
  "environmental-education",
  "community-action",
  "policy-change",
];

export function Step6CategoriesTags({ form }: Step6CategoriesTagsProps) {
  const [categoryInput, setCategoryInput] = useState("");
  const [tagInput, setTagInput] = useState("");

  const categories = form.watch("categories") || [];
  const tags = form.watch("tags") || [];

  const addCategory = (category: string) => {
    const trimmed = category.trim();
    if (trimmed && !categories.includes(trimmed)) {
      form.setValue("categories", [...categories, trimmed], { shouldDirty: true });
      setCategoryInput("");
    }
  };

  const removeCategory = (category: string) => {
    form.setValue(
      "categories",
      categories.filter((c: string) => c !== category),
      { shouldDirty: true }
    );
  };

  const addTag = (tag: string) => {
    const trimmed = tag.trim().toLowerCase().replace(/\s+/g, '-');
    if (trimmed && !tags.includes(trimmed)) {
      form.setValue("tags", [...tags, trimmed], { shouldDirty: true });
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    form.setValue(
      "tags",
      tags.filter((t: string) => t !== tag),
      { shouldDirty: true }
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 id="step-6-heading" className="text-2xl font-semibold">Step 6 · Categories & Tags</h2>
        <p className="text-muted-foreground mt-2">
          Organize your case study with categories and tags for better discovery
        </p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Categories and tags help users find relevant case studies. They are optional but recommended for better visibility.
        </AlertDescription>
      </Alert>

      {/* Categories Section */}
      <Card data-testid="card-categories">
        <CardHeader>
          <CardTitle className="text-lg">Categories</CardTitle>
          <CardDescription>
            Broad topics that describe the main focus of your case study
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add custom category */}
          <div className="flex gap-2">
            <Input
              value={categoryInput}
              onChange={(e) => setCategoryInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addCategory(categoryInput);
                }
              }}
              placeholder="Add a custom category..."
              data-testid="input-add-category"
            />
            <Button
              type="button"
              onClick={() => addCategory(categoryInput)}
              disabled={!categoryInput.trim()}
              data-testid="button-add-category"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>

          {/* Suggested categories */}
          <div>
            <p className="text-sm font-medium mb-2">Suggested Categories:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_CATEGORIES.map((cat) => (
                <Button
                  key={cat}
                  type="button"
                  variant={categories.includes(cat) ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    if (categories.includes(cat)) {
                      removeCategory(cat);
                    } else {
                      addCategory(cat);
                    }
                  }}
                  data-testid={`button-category-${cat}`}
                >
                  {cat}
                  {categories.includes(cat) && <X className="h-3 w-3 ml-2" />}
                </Button>
              ))}
            </div>
          </div>

          {/* Selected categories */}
          {categories.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Selected Categories ({categories.length}):</p>
              <div className="flex flex-wrap gap-2">
                {categories.map((category: string) => (
                  <Badge key={category} variant="secondary" className="pl-3 pr-1">
                    {category}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-auto p-1 ml-1 hover:bg-transparent"
                      onClick={() => removeCategory(category)}
                      data-testid={`button-remove-category-${category}`}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tags Section */}
      <Card data-testid="card-tags">
        <CardHeader>
          <CardTitle className="text-lg">Tags</CardTitle>
          <CardDescription>
            Specific keywords that make your case study searchable and discoverable
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add custom tag */}
          <div className="flex gap-2">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag(tagInput);
                }
              }}
              placeholder="Add a custom tag..."
              data-testid="input-add-tag"
            />
            <Button
              type="button"
              onClick={() => addTag(tagInput)}
              disabled={!tagInput.trim()}
              data-testid="button-add-tag"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>

          {/* Suggested tags */}
          <div>
            <p className="text-sm font-medium mb-2">Suggested Tags:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_TAGS.map((tag) => (
                <Button
                  key={tag}
                  type="button"
                  variant={tags.includes(tag) ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    if (tags.includes(tag)) {
                      removeTag(tag);
                    } else {
                      addTag(tag);
                    }
                  }}
                  data-testid={`button-tag-${tag}`}
                >
                  #{tag}
                  {tags.includes(tag) && <X className="h-3 w-3 ml-2" />}
                </Button>
              ))}
            </div>
          </div>

          {/* Selected tags */}
          {tags.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Selected Tags ({tags.length}):</p>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag: string) => (
                  <Badge key={tag} variant="secondary" className="pl-3 pr-1">
                    #{tag}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-auto p-1 ml-1 hover:bg-transparent"
                      onClick={() => removeTag(tag)}
                      data-testid={`button-remove-tag-${tag}`}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
