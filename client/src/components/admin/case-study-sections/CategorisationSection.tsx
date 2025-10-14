import { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Tag, FolderTree } from "lucide-react";

interface CategorisationSectionProps {
  form: UseFormReturn<any>;
}

const SUGGESTED_CATEGORIES = [
  "Plastic Reduction",
  "Recycling Initiative",
  "Student Leadership",
  "Community Engagement",
  "Educational Campaign",
  "Waste Audit",
  "Policy Change",
  "Innovation",
];

const SUGGESTED_TAGS = [
  "single-use-plastic",
  "recycling",
  "composting",
  "awareness",
  "students",
  "teachers",
  "community",
  "impact",
  "sustainability",
  "ocean-conservation",
];

export function CategorisationSection({ form }: CategorisationSectionProps) {
  const [categoryInput, setCategoryInput] = useState("");
  const [tagInput, setTagInput] = useState("");

  const categories = form.watch("categories") || [];
  const tags = form.watch("tags") || [];

  const addCategory = (category: string) => {
    const trimmed = category.trim();
    if (trimmed && !categories.includes(trimmed)) {
      form.setValue("categories", [...categories, trimmed]);
      setCategoryInput("");
    }
  };

  const removeCategory = (category: string) => {
    form.setValue(
      "categories",
      categories.filter((c: string) => c !== category)
    );
  };

  const addTag = (tag: string) => {
    const trimmed = tag.trim().toLowerCase().replace(/\s+/g, '-');
    if (trimmed && !tags.includes(trimmed)) {
      form.setValue("tags", [...tags, trimmed]);
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    form.setValue(
      "tags",
      tags.filter((t: string) => t !== tag)
    );
  };

  return (
    <div className="space-y-6">
      {/* Categories */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <FolderTree className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Categories</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Organize your case study by selecting relevant categories
        </p>

        <FormField
          control={form.control}
          name="categories"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Add Categories</FormLabel>
              <FormControl>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter a category"
                    value={categoryInput}
                    onChange={(e) => setCategoryInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCategory(categoryInput);
                      }
                    }}
                    data-testid="input-category"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => addCategory(categoryInput)}
                    data-testid="button-add-category"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </FormControl>
              <FormDescription>
                Press Enter or click + to add a category
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Suggested Categories */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Suggested Categories:</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_CATEGORIES.filter((cat) => !categories.includes(cat)).map((category) => (
              <Badge
                key={category}
                variant="outline"
                className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                onClick={() => addCategory(category)}
                data-testid={`badge-suggest-category-${category}`}
              >
                {category}
              </Badge>
            ))}
          </div>
        </div>

        {/* Selected Categories */}
        {categories.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Selected Categories:</p>
            <div className="flex flex-wrap gap-2">
              {categories.map((category: string) => (
                <Badge
                  key={category}
                  className="gap-1"
                  data-testid={`badge-category-${category}`}
                >
                  {category}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeCategory(category)}
                    data-testid={`button-remove-category-${category}`}
                  />
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tags */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Tag className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Tags</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Add tags to help others discover your case study
        </p>

        <FormField
          control={form.control}
          name="tags"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Add Tags</FormLabel>
              <FormControl>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter a tag (will be converted to lowercase-with-dashes)"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTag(tagInput);
                      }
                    }}
                    data-testid="input-tag"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => addTag(tagInput)}
                    data-testid="button-add-tag"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </FormControl>
              <FormDescription>
                Press Enter or click + to add a tag
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Suggested Tags */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Suggested Tags:</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_TAGS.filter((tag) => !tags.includes(tag)).map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                onClick={() => addTag(tag)}
                data-testid={`badge-suggest-tag-${tag}`}
              >
                #{tag}
              </Badge>
            ))}
          </div>
        </div>

        {/* Selected Tags */}
        {tags.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Selected Tags:</p>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag: string) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="gap-1"
                  data-testid={`badge-tag-${tag}`}
                >
                  #{tag}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeTag(tag)}
                    data-testid={`button-remove-tag-${tag}`}
                  />
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
